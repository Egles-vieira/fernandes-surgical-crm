import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para garantir ordem exata dos campos no payload Datasul
function serializeOrderPayload(data: any): string {
  const orderedKeys = {
    pedido: [
      'cod-emitente', 'tipo-pedido', 'cotacao', 'cod-estabel', 
      'nat-operacao', 'cod-cond-pag', 'cod-transp', 'vl-frete-inf',
      'cod-rep', 'nr-tabpre', 'perc-desco1', 'fat-parcial', 'item'
    ],
    item: [
      'nr-sequencia', 'it-codigo', 'cod-refer', 'nat-operacao',
      'qt-pedida', 'vl-preuni', 'vl-pretab', 'vl-preori',
      'vl-preco-base', 'per-des-item'
    ]
  };

  function sortObject(obj: any, keys: string[]): any {
    const sorted: any = {};
    keys.forEach(key => {
      if (key in obj) {
        sorted[key] = obj[key];
      }
    });
    return sorted;
  }

  const ordered = {
    pedido: data.pedido.map((order: any) => {
      const sortedOrder = sortObject(order, orderedKeys.pedido);
      
      if (sortedOrder.item && Array.isArray(sortedOrder.item)) {
        sortedOrder.item = sortedOrder.item.map((item: any) => 
          sortObject(item, orderedKeys.item)
        );
      }
      
      return sortedOrder;
    })
  };

  return JSON.stringify(ordered, null, 2);
}

/**
 * Remove o IPI do preço
 * @param preco - Preço com IPI incluído (tb-preco)
 * @param aliquotaIpi - Alíquota do IPI em percentual (ex: 5.2 para 5.2%)
 * @returns Preço sem IPI
 */
function removerIPI(preco: number, aliquotaIpi: number): number {
  if (!aliquotaIpi || aliquotaIpi === 0) {
    return preco;
  }
  return preco / (1 + aliquotaIpi / 100);
}

function dividirEmLotes<T>(array: T[], tamanhoLote: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < array.length; i += tamanhoLote) {
    lotes.push(array.slice(i, i + tamanhoLote));
  }
  return lotes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let tempoPreparacao = 0;
  let tempoApi = 0;
  let tempoTratamento = 0;

  try {
    const { venda_id } = await req.json();
    if (!venda_id) {
      return new Response(JSON.stringify({ error: "venda_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const DATASUL_USER = Deno.env.get("DATASUL_USER");
    const DATASUL_PASS = Deno.env.get("DATASUL_PASS");
    const DATASUL_PROXY_URL = Deno.env.get("DATASUL_PROXY_URL");

    if (!DATASUL_USER || !DATASUL_PASS || !DATASUL_PROXY_URL) {
      throw new Error("Credenciais ou URL do Datasul não configuradas");
    }

    console.log("Iniciando cálculo para venda:", venda_id);
    
    // ============ INÍCIO: PREPARAÇÃO DOS DADOS ============
    const inicioPreparacao = Date.now();

    // Buscar todos os dados necessários
    const { data: venda } = await supabase.from("vendas").select("*").eq("id", venda_id).single();
    if (!venda) throw new Error("Venda não encontrada");

    console.log("Venda encontrada:", { id: venda.id, cliente_id: venda.cliente_id, vendedor_id: venda.vendedor_id });

    const { data: cliente } = await supabase.from("clientes").select("cod_emitente").eq("id", venda.cliente_id).single();
    const { data: empresa } = await supabase.from("empresas").select("*").limit(1).single();
    const { data: tipoPedido } = await supabase.from("tipos_pedido").select("nome").eq("id", venda.tipo_pedido_id).single();
    const { data: condicaoPagamento } = await supabase.from("condicoes_pagamento").select("codigo_integracao").eq("id", venda.condicao_pagamento_id).single();
    const { data: perfil } = await supabase.from("perfis_usuario").select("codigo_vendedor").eq("id", venda.vendedor_id).single();
    const { data: itens } = await supabase.from("vendas_itens").select("*, produtos(*)").eq("venda_id", venda_id).order("sequencia_item");

    // Log detalhado de quais dados foram encontrados
    console.log("Dados encontrados:", {
      cliente: !!cliente,
      empresa: !!empresa,
      tipoPedido: !!tipoPedido,
      condicaoPagamento: !!condicaoPagamento,
      perfil: !!perfil,
      itens: itens?.length || 0
    });

    // Validação detalhada para melhor diagnóstico
    const dadosFaltantes = [];
    if (!cliente) dadosFaltantes.push("cliente");
    if (!empresa) dadosFaltantes.push("empresa");
    if (!tipoPedido) dadosFaltantes.push("tipoPedido");
    if (!condicaoPagamento) dadosFaltantes.push("condicaoPagamento");
    if (!perfil) dadosFaltantes.push("perfil (vendedor)");
    if (!itens?.length) dadosFaltantes.push("itens");

    if (dadosFaltantes.length > 0) {
      const mensagemErro = `Dados incompletos para calcular pedido. Faltando: ${dadosFaltantes.join(", ")}`;
      console.error(mensagemErro);
      throw new Error(mensagemErro);
    }

    // Garantir que TypeScript entenda que os dados não são null após validação
    const clienteValidado = cliente!;
    const empresaValidada = empresa!;
    const tipoPedidoValidado = tipoPedido!;
    const condicaoPagamentoValidada = condicaoPagamento!;
    const perfilValidado = perfil!;
    const itensValidados = itens!;

    console.log(`Processando ${itensValidados.length} itens em uma única requisição`);

    const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);

    const itensPayload = itensValidados.map((item: any) => {
      // Calcular preço sem IPI usando a alíquota do produto
      const aliquotaIpi = item.produtos.aliquota_ipi || 0;
      const precoTabela = item.preco_tabela ?? 0;
      const precoSemIpi = removerIPI(precoTabela, aliquotaIpi);
      
      return {
        "nr-sequencia": item.sequencia_item,
        "it-codigo": item.produtos.referencia_interna,
        "cod-refer": "",
        "nat-operacao": empresaValidada.natureza_operacao,
        "qt-pedida": item.quantidade,
        "vl-preuni": precoSemIpi,
        "vl-pretab": precoTabela,
        "vl-preori": precoSemIpi,
        "vl-preco-base": precoSemIpi,
        "per-des-item": item.desconto ?? 0,
      };
    });

    const payload = {
      pedido: [{
        "cod-emitente": Number(clienteValidado.cod_emitente),
        "tipo-pedido": tipoPedidoValidado.nome.toLowerCase(),
        "cotacao": venda.numero_venda,
        "cod-estabel": String(empresaValidada.codigo_estabelecimento),
        "nat-operacao": String(empresaValidada.natureza_operacao),
        "cod-cond-pag": Number(condicaoPagamentoValidada.codigo_integracao),
        "cod-transp": 24249,
        "vl-frete-inf": 0,
        "cod-rep": Number(perfilValidado.codigo_vendedor),
        "nr-tabpre": "SE-CFI",
        "perc-desco1": 0,
        "fat-parcial": venda.faturamento_parcial === "YES",
        "item": itensPayload,
      }]
    };

    const payloadOrdenado = serializeOrderPayload(payload);
    
    tempoPreparacao = Date.now() - inicioPreparacao;
    console.log(`✅ Preparação dos dados concluída em ${tempoPreparacao}ms`);
    // ============ FIM: PREPARAÇÃO DOS DADOS ============

    // Tentar até 3 vezes
    let sucesso = false;
    let datasulData: any = null;
    let tempoResposta = 0;

    for (let tentativa = 0; tentativa < 3 && !sucesso; tentativa++) {
      try {
        if (tentativa > 0) {
          console.log(`Tentativa ${tentativa + 1} após falha anterior`);
          await new Promise(r => setTimeout(r, 2000 * tentativa));
        }

        // ============ INÍCIO: CHAMADA API ============
        const fetchStart = Date.now();
        const response = await fetch(DATASUL_PROXY_URL, {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: payloadOrdenado,
          signal: AbortSignal.timeout(120000), // 2 minutos de timeout para processar tudo
        });

        tempoApi = Date.now() - fetchStart;
        console.log(`✅ API Datasul respondeu em ${tempoApi}ms`);
        // ============ FIM: CHAMADA API ============
        
        const text = await response.text();

        // Salvar log (sem as métricas ainda, serão atualizadas no final)
        await supabase.from("integracoes_totvs_calcula_pedido").insert({
          venda_id,
          numero_venda: venda.numero_venda,
          request_payload: payloadOrdenado,
          response_payload: response.ok ? text : null,
          status: response.ok ? "sucesso" : "erro",
          error_message: response.ok ? null : `HTTP ${response.status}: ${text.substring(0, 500)}`,
          tempo_resposta_ms: Date.now() - startTime,
          tempo_preparacao_dados_ms: tempoPreparacao,
          tempo_api_ms: tempoApi,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
        }

        datasulData = JSON.parse(text);
        
        // Verificar se há erros de negócio no retorno do Datasul
        const retornoArray = datasulData.retorno || datasulData.pedido;
        if (Array.isArray(retornoArray) && retornoArray.length > 0) {
          const primeiroItem = retornoArray[0];
          
          // Detectar erros de negócio
          if (primeiroItem.errornumber && primeiroItem.errornumber !== 0) {
            const mensagemErro = primeiroItem.errordescription || primeiroItem["msg-credito"] || "Erro desconhecido no Datasul";
            console.error(`Erro de negócio Datasul: ${primeiroItem.errornumber} - ${mensagemErro}`);
            
            // Retornar erro estruturado com status 200 para que o frontend receba os dados
            return new Response(
              JSON.stringify({
                success: false,
                error: mensagemErro,
                error_code: String(primeiroItem.errornumber),
                error_category: 'negocio',
                error_details: primeiroItem,
              }),
              { 
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              }
            );
          }
        }
        
        sucesso = true;

        // ============ INÍCIO: TRATAMENTO DOS DADOS ============
        const inicioTratamento = Date.now();
        
        // Atualizar itens
        if (Array.isArray(retornoArray)) {
          console.log(`Atualizando ${retornoArray.length} itens no banco de dados`);
          for (const itemDS of retornoArray) {
            const seq = itemDS["nr-sequencia"];
            if (seq) {
              await supabase.from("vendas_itens").update({
                datasul_dep_exp: Number(itemDS["dep-exp"]) || null,
                datasul_custo: Number(itemDS["custo"]) || null,
                datasul_divisao: Number(itemDS["divisao"]) || null,
                datasul_vl_tot_item: Number(itemDS["vl-tot-item"]) || null,
                datasul_vl_merc_liq: Number(itemDS["vl-merc-liq"]) || null,
                datasul_lote_mulven: Number(itemDS["lote-mulven"]) || null,
              }).eq("venda_id", venda_id).eq("sequencia_item", seq);
            }
          }
        }
        
        tempoTratamento = Date.now() - inicioTratamento;
        console.log(`✅ Tratamento dos dados concluído em ${tempoTratamento}ms`);
        // ============ FIM: TRATAMENTO DOS DADOS ============
      } catch (error) {
        console.error(`Tentativa ${tentativa + 1} erro:`, error);
        if (tentativa === 2) {
          throw error; // Última tentativa falhou, propagar o erro
        }
      }
    }

    // Atualizar status da venda
    await supabase.from("vendas").update({
      ultima_integracao_datasul_em: new Date().toISOString(),
      ultima_integracao_datasul_status: "sucesso_completo",
      ultima_integracao_datasul_resposta: datasulData,
    }).eq("id", venda_id);

    const tempoTotal = Date.now() - startTime;
    
    // Atualizar log com tempo de tratamento
    await supabase
      .from("integracoes_totvs_calcula_pedido")
      .update({ 
        tempo_tratamento_dados_ms: tempoTratamento,
        tempo_resposta_ms: tempoTotal,
      })
      .eq("venda_id", venda_id)
      .order("created_at", { ascending: false })
      .limit(1);
    
    console.log(`🎉 Processo completo em ${tempoTotal}ms (Prep: ${tempoPreparacao}ms | API: ${tempoApi}ms | Trat: ${tempoTratamento}ms)`);

    return new Response(
      JSON.stringify({
        success: true,
        venda_id,
        numero_venda: venda.numero_venda,
        resumo: {
          total_itens: itensValidados.length,
          tempo_resposta_ms: tempoTotal,
          tempo_preparacao_dados_ms: tempoPreparacao,
          tempo_api_ms: tempoApi,
          tempo_tratamento_dados_ms: tempoTratamento,
        },
        processamento_completo: true,
        datasul_response: datasulData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    
    // Determinar categoria do erro
    let errorCategory = 'tecnico';
    let errorCode = null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('obrigatório') || errorMessage.includes('inválido')) {
      errorCategory = 'validacao';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      errorCategory = 'rede';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        error_code: errorCode,
        error_category: errorCategory,
        error_details: error instanceof Error ? error.toString() : String(error),
        tempo_resposta_ms: Date.now() - startTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
