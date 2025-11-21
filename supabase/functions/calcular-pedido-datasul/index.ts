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

    // Dividir em lotes de 25 itens
    const TAMANHO_LOTE = 25;
    const lotesDeItens = dividirEmLotes(itensValidados, TAMANHO_LOTE);
    const totalLotes = lotesDeItens.length;

    console.log(`${itensValidados.length} itens em ${totalLotes} lote(s)`);

    const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);
    const resultadosLotes: any[] = [];
    let tempoTotalMs = 0;

    // Processar cada lote
    for (let i = 0; i < totalLotes; i++) {
      const lote = lotesDeItens[i];
      const numeroLote = i + 1;
      
      console.log(`Processando lote ${numeroLote}/${totalLotes}`);

      const itensPayload = lote.map((item: any) => {
        // Calcular preço sem IPI usando a alíquota do produto
        const aliquotaIpi = item.produtos.aliquota_ipi || 0;
        const precoTabela = item.preco_tabela ?? 0;
        const precoSemIpi = removerIPI(precoTabela, aliquotaIpi);
        
        console.log(`Item ${item.sequencia_item}: preço_tabela=${precoTabela}, aliquota_ipi=${aliquotaIpi}%, preco_sem_ipi=${precoSemIpi.toFixed(6)}`);
        
        return {
          "nr-sequencia": item.sequencia_item,
          "it-codigo": item.produtos.referencia_interna,
          "cod-refer": "",
          "nat-operacao": empresa.natureza_operacao,
          "qt-pedida": item.quantidade,
          "vl-preuni": precoSemIpi,
          "vl-pretab": precoTabela, // Mantém o preço de tabela original
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

      // Tentar até 3 vezes
      let sucesso = false;
      let datasulData: any = null;

      for (let tentativa = 0; tentativa < 3 && !sucesso; tentativa++) {
        try {
          if (tentativa > 0) {
            await new Promise(r => setTimeout(r, 2000 * tentativa));
          }

          const fetchStart = Date.now();
          const response = await fetch(DATASUL_PROXY_URL, {
            method: "POST",
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/json",
            },
            body: payloadOrdenado,
            signal: AbortSignal.timeout(40000),
          });

          const fetchTime = Date.now() - fetchStart;
          tempoTotalMs += fetchTime;
          const text = await response.text();

          // Salvar log
          await supabase.from("integracoes_totvs_calcula_pedido").insert({
            venda_id,
            numero_venda: `${venda.numero_venda}-L${numeroLote}`,
            request_payload: payloadOrdenado,
            response_payload: response.ok ? text : null,
            status: response.ok ? "sucesso" : "erro",
            error_message: response.ok ? null : `HTTP ${response.status}: ${text.substring(0, 500)}`,
            tempo_resposta_ms: fetchTime,
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

          // Atualizar itens
          if (Array.isArray(retornoArray)) {
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

          resultadosLotes.push({ lote: numeroLote, tempo_ms: fetchTime });
        } catch (error) {
          console.error(`Lote ${numeroLote} tentativa ${tentativa+1} erro:`, error);
          if (tentativa === 2) {
            resultadosLotes.push({ lote: numeroLote, erro: String(error) });
          }
        }
      }
    }

    // Atualizar status da venda
    const todosOK = resultadosLotes.every(r => !r.erro);
    await supabase.from("vendas").update({
      ultima_integracao_datasul_em: new Date().toISOString(),
      ultima_integracao_datasul_status: todosOK ? "sucesso_completo" : "parcial",
      ultima_integracao_datasul_resposta: { lotes: resultadosLotes },
    }).eq("id", venda_id);

    const tempoTotal = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        venda_id,
        numero_venda: venda.numero_venda,
        resumo: {
          total_itens: itensValidados.length,
          total_lotes: totalLotes,
          lotes_processados: resultadosLotes.filter(r => !r.erro).length,
          tempo_resposta_ms: tempoTotal,
        },
        processamento_completo: true,
        lotes: resultadosLotes,
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
