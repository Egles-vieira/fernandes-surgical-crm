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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let tempoPreparacao = 0;
  let tempoApi = 0;
  let tempoTratamento = 0;

  try {
    const { oportunidade_id } = await req.json();
    if (!oportunidade_id) {
      return new Response(JSON.stringify({ error: "oportunidade_id é obrigatório" }), {
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

    console.log("[OPORTUNIDADE-DATASUL] Iniciando cálculo para oportunidade:", oportunidade_id);
    
    // ============ INÍCIO: PREPARAÇÃO DOS DADOS ============
    const inicioPreparacao = Date.now();

    // Buscar oportunidade com campos customizados
    const { data: oportunidade } = await supabase
      .from("oportunidades")
      .select("*")
      .eq("id", oportunidade_id)
      .single();
    
    if (!oportunidade) throw new Error("Oportunidade não encontrada");

    console.log("[OPORTUNIDADE-DATASUL] Oportunidade encontrada:", { 
      id: oportunidade.id, 
      codigo: oportunidade.codigo,
      cliente_id: oportunidade.cliente_id,
      vendedor_id: oportunidade.vendedor_id
    });

    // Extrair dados dos campos customizados
    const camposCustomizados = oportunidade.campos_customizados as Record<string, any> || {};
    const tipoPedidoId = oportunidade.tipo_pedido_id || camposCustomizados.tipo_pedido_id;
    const condicaoPagamentoId = oportunidade.condicao_pagamento_id || camposCustomizados.condicao_pagamento_id;

    // Buscar todos os dados necessários
    const { data: cliente } = await supabase
      .from("clientes")
      .select("cod_emitente")
      .eq("id", oportunidade.cliente_id)
      .single();
    
    const { data: empresa } = await supabase
      .from("empresas")
      .select("*")
      .limit(1)
      .single();
    
    const { data: tipoPedido } = tipoPedidoId 
      ? await supabase.from("tipos_pedido").select("nome").eq("id", tipoPedidoId).single()
      : { data: null };
    
    const { data: condicaoPagamento } = condicaoPagamentoId
      ? await supabase.from("condicoes_pagamento").select("codigo_integracao").eq("id", condicaoPagamentoId).single()
      : { data: null };
    
    const { data: perfil } = await supabase
      .from("perfis_usuario")
      .select("codigo_vendedor")
      .eq("id", oportunidade.vendedor_id)
      .single();
    
    const { data: itens } = await supabase
      .from("itens_linha_oportunidade")
      .select("*, produtos:produto_id(*)")
      .eq("oportunidade_id", oportunidade_id)
      .order("ordem_linha");

    // Log detalhado de quais dados foram encontrados
    console.log("[OPORTUNIDADE-DATASUL] Dados encontrados:", {
      cliente: !!cliente,
      cod_emitente: cliente?.cod_emitente,
      empresa: !!empresa,
      tipoPedido: !!tipoPedido,
      tipoPedidoId,
      condicaoPagamento: !!condicaoPagamento,
      condicaoPagamentoId,
      perfil: !!perfil,
      itens: itens?.length || 0
    });

    // Validação detalhada para melhor diagnóstico
    const dadosFaltantes = [];
    if (!cliente) dadosFaltantes.push("cliente");
    if (!cliente?.cod_emitente) dadosFaltantes.push("código emitente do cliente");
    if (!empresa) dadosFaltantes.push("empresa");
    if (!tipoPedido) dadosFaltantes.push("tipo de pedido");
    if (!condicaoPagamento) dadosFaltantes.push("condição de pagamento");
    if (!perfil) dadosFaltantes.push("perfil (vendedor)");
    if (!itens?.length) dadosFaltantes.push("itens");

    if (dadosFaltantes.length > 0) {
      const mensagemErro = `Dados incompletos para calcular oportunidade. Faltando: ${dadosFaltantes.join(", ")}`;
      console.error("[OPORTUNIDADE-DATASUL]", mensagemErro);
      throw new Error(mensagemErro);
    }

    // Garantir que TypeScript entenda que os dados não são null após validação
    const clienteValidado = cliente!;
    const empresaValidada = empresa!;
    const tipoPedidoValidado = tipoPedido!;
    const condicaoPagamentoValidada = condicaoPagamento!;
    const perfilValidado = perfil!;
    const itensValidados = itens!;

    console.log(`[OPORTUNIDADE-DATASUL] Processando ${itensValidados.length} itens`);

    const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);

    const itensPayload = itensValidados.map((item: any, index: number) => {
      // Verificar se tem produto vinculado
      if (!item.produtos) {
        console.warn(`[OPORTUNIDADE-DATASUL] Item ${index + 1} sem produto vinculado`);
      }

      // 1. Determinar o preço base
      const precoBase = item.preco_unitario ?? 0;
      
      // 2. Obter alíquota de IPI do produto
      const aliquotaIpi = item.produtos?.aliquota_ipi ?? 0;
      
      // 3. Calcular preço sem IPI
      const precoSemIpi = removerIPI(precoBase, aliquotaIpi);
      
      // 4. Log para debug
      console.log(`[OPORTUNIDADE-DATASUL] Item ${item.ordem_linha || index + 1} [${item.produtos?.referencia_interna || 'SEM_REF'}]:`, {
        preco_unitario: item.preco_unitario,
        precoBase,
        aliquotaIpi: `${aliquotaIpi}%`,
        precoSemIpi,
        quantidade: item.quantidade,
        desconto: item.percentual_desconto
      });
      
      return {
        "nr-sequencia": item.ordem_linha || index + 1,
        "it-codigo": item.produtos?.referencia_interna || "",
        "cod-refer": "",
        "nat-operacao": empresaValidada.natureza_operacao,
        "qt-pedida": item.quantidade,
        "vl-preuni": precoSemIpi,
        "vl-pretab": precoBase,
        "vl-preori": precoBase,
        "vl-preco-base": precoSemIpi,
        "per-des-item": item.percentual_desconto ?? 0,
      };
    });

    // Validar se todos os itens têm referência interna
    const itensSemReferencia = itensPayload.filter(i => !i["it-codigo"]);
    if (itensSemReferencia.length > 0) {
      const mensagemErro = `${itensSemReferencia.length} item(ns) sem referência interna do produto`;
      console.error("[OPORTUNIDADE-DATASUL]", mensagemErro);
      throw new Error(mensagemErro);
    }

    // Validar se todos os itens têm preços válidos
    const itensComPrecoZero = itensPayload.filter(i => i["vl-preuni"] === 0 || i["vl-pretab"] === 0);
    if (itensComPrecoZero.length > 0) {
      console.warn(`[OPORTUNIDADE-DATASUL] ⚠️ ATENÇÃO: ${itensComPrecoZero.length} itens com preço zero:`, 
        itensComPrecoZero.map(i => `Seq ${i["nr-sequencia"]}`).join(", ")
      );
    }

    const payload = {
      pedido: [{
        "cod-emitente": Number(clienteValidado.cod_emitente),
        "tipo-pedido": tipoPedidoValidado.nome.toLowerCase(),
        "cotacao": oportunidade.codigo || oportunidade_id.substring(0, 8),
        "cod-estabel": String(empresaValidada.codigo_estabelecimento),
        "nat-operacao": String(empresaValidada.natureza_operacao),
        "cod-cond-pag": Number(condicaoPagamentoValidada.codigo_integracao),
        "cod-transp": 24249,
        "vl-frete-inf": 0,
        "cod-rep": Number(perfilValidado.codigo_vendedor),
        "nr-tabpre": "SE-CFI",
        "perc-desco1": 0,
        "fat-parcial": false,
        "item": itensPayload,
      }]
    };

    const payloadOrdenado = serializeOrderPayload(payload);
    
    tempoPreparacao = Date.now() - inicioPreparacao;
    console.log(`[OPORTUNIDADE-DATASUL] ✅ Preparação dos dados concluída em ${tempoPreparacao}ms`);
    // ============ FIM: PREPARAÇÃO DOS DADOS ============

    // Tentar até 3 vezes
    let sucesso = false;
    let datasulData: any = null;

    for (let tentativa = 0; tentativa < 3 && !sucesso; tentativa++) {
      try {
        if (tentativa > 0) {
          console.log(`[OPORTUNIDADE-DATASUL] Tentativa ${tentativa + 1} após falha anterior`);
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
          signal: AbortSignal.timeout(120000),
        });

        tempoApi = Date.now() - fetchStart;
        console.log(`[OPORTUNIDADE-DATASUL] ✅ API Datasul respondeu em ${tempoApi}ms`);
        // ============ FIM: CHAMADA API ============
        
        const text = await response.text();

        // Salvar log
        await supabase.from("integracoes_totvs_calcula_pedido").insert({
          oportunidade_id,
          numero_venda: oportunidade.codigo || null,
          codigo_oportunidade: oportunidade.codigo,
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
            console.error(`[OPORTUNIDADE-DATASUL] Erro de negócio Datasul: ${primeiroItem.errornumber} - ${mensagemErro}`);
            
            // Atualizar status na oportunidade
            await supabase.from("oportunidades").update({
              ultima_integracao_datasul_em: new Date().toISOString(),
              ultima_integracao_datasul_status: "erro",
              ultima_integracao_datasul_resposta: JSON.stringify(primeiroItem),
            }).eq("id", oportunidade_id);
            
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
        
        // Usar batch update RPC
        if (Array.isArray(retornoArray) && retornoArray.length > 0) {
          console.log(`[OPORTUNIDADE-DATASUL] Atualizando ${retornoArray.length} itens via batch RPC`);
          
          // Mapear dados para formato do RPC
          const itemsParaAtualizar = retornoArray
            .filter((itemDS: any) => itemDS["nr-sequencia"])
            .map((itemDS: any) => ({
              ordem_linha: itemDS["nr-sequencia"],
              datasul_dep_exp: Number(itemDS["dep-exp"]) || 0,
              datasul_custo: Number(itemDS["custo"]) || 0,
              datasul_divisao: Number(itemDS["divisao"]) || 0,
              datasul_vl_tot_item: Number(itemDS["vl-tot-item"]) || 0,
              datasul_vl_merc_liq: Number(itemDS["vl-merc-liq"]) || 0,
              datasul_lote_mulven: Number(itemDS["lote-mulven"]) || 0,
            }));
          
          // Executar batch update
          const { data: updatedCount, error: batchError } = await supabase.rpc(
            "batch_update_itens_oportunidade",
            {
              p_oportunidade_id: oportunidade_id,
              p_items: itemsParaAtualizar,
            }
          );
          
          if (batchError) {
            console.error("[OPORTUNIDADE-DATASUL] Erro no batch update:", batchError);
            // Fallback para update individual se RPC falhar
            for (const itemDS of retornoArray) {
              const seq = itemDS["nr-sequencia"];
              if (seq) {
                await supabase.from("itens_linha_oportunidade").update({
                  datasul_dep_exp: Number(itemDS["dep-exp"]) || null,
                  datasul_custo: Number(itemDS["custo"]) || null,
                  datasul_divisao: Number(itemDS["divisao"]) || null,
                  datasul_vl_tot_item: Number(itemDS["vl-tot-item"]) || null,
                  datasul_vl_merc_liq: Number(itemDS["vl-merc-liq"]) || null,
                  datasul_lote_mulven: Number(itemDS["lote-mulven"]) || null,
                }).eq("oportunidade_id", oportunidade_id).eq("ordem_linha", seq);
              }
            }
          } else {
            console.log(`[OPORTUNIDADE-DATASUL] ✅ Batch update concluído: ${updatedCount} itens atualizados`);
          }
        }
        
        tempoTratamento = Date.now() - inicioTratamento;
        console.log(`[OPORTUNIDADE-DATASUL] ✅ Tratamento dos dados concluído em ${tempoTratamento}ms`);
        // ============ FIM: TRATAMENTO DOS DADOS ============
      } catch (error) {
        console.error(`[OPORTUNIDADE-DATASUL] Tentativa ${tentativa + 1} erro:`, error);
        if (tentativa === 2) {
          throw error;
        }
      }
    }

    // Atualizar status da oportunidade
    await supabase.from("oportunidades").update({
      ultima_integracao_datasul_em: new Date().toISOString(),
      ultima_integracao_datasul_status: "sucesso",
      ultima_integracao_datasul_resposta: JSON.stringify(datasulData),
    }).eq("id", oportunidade_id);

    const tempoTotal = Date.now() - startTime;
    
    // Atualizar log com tempo de tratamento
    await supabase
      .from("integracoes_totvs_calcula_pedido")
      .update({ 
        tempo_tratamento_dados_ms: tempoTratamento,
        tempo_resposta_ms: tempoTotal,
      })
      .eq("oportunidade_id", oportunidade_id)
      .order("created_at", { ascending: false })
      .limit(1);
    
    console.log(`[OPORTUNIDADE-DATASUL] 🎉 Processo completo em ${tempoTotal}ms (Prep: ${tempoPreparacao}ms | API: ${tempoApi}ms | Trat: ${tempoTratamento}ms)`);

    return new Response(
      JSON.stringify({
        success: true,
        oportunidade_id,
        codigo_oportunidade: oportunidade.codigo,
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
    console.error("[OPORTUNIDADE-DATASUL] Erro:", error);
    
    // Determinar categoria do erro
    let errorCategory = 'tecnico';
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('obrigatório') || errorMessage.includes('inválido') || errorMessage.includes('Faltando')) {
      errorCategory = 'validacao';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      errorCategory = 'rede';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
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
