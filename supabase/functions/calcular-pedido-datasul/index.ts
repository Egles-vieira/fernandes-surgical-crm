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

    // Marcar como processando ANTES de fazer qualquer outra coisa
    await supabase.from("vendas").update({
      ultima_integracao_datasul_em: new Date().toISOString(),
      ultima_integracao_datasul_status: "processando",
    }).eq("id", venda_id);

    // Processar TUDO em background - não bloquear a resposta
    const processarTodosLotes = async () => {
      try {
        const DATASUL_USER = Deno.env.get("DATASUL_USER");
        const DATASUL_PASS = Deno.env.get("DATASUL_PASS");
        const DATASUL_PROXY_URL = Deno.env.get("DATASUL_PROXY_URL");
        
        // Debug de credenciais (sem expor valores)
        console.log("Background: Credenciais configuradas:", {
          user: !!DATASUL_USER,
          pass: !!DATASUL_PASS,
          url: !!DATASUL_PROXY_URL
        });
        
        if (!DATASUL_USER || !DATASUL_PASS || !DATASUL_PROXY_URL) {
          throw new Error("Credenciais ou URL do Datasul não configuradas");
        }

        console.log("Background: Iniciando cálculo para venda:", venda_id);
        console.log("Background: URL do Datasul:", DATASUL_PROXY_URL);

        // Buscar todos os dados necessários
        const { data: venda } = await supabase.from("vendas").select("*").eq("id", venda_id).single();
        if (!venda) throw new Error("Venda não encontrada");

        const { data: cliente } = await supabase.from("clientes").select("cod_emitente").eq("id", venda.cliente_id).single();
        const { data: empresa } = await supabase.from("empresas").select("*").limit(1).single();
        const { data: tipoPedido } = await supabase.from("tipos_pedido").select("nome").eq("id", venda.tipo_pedido_id).single();
        const { data: condicaoPagamento } = await supabase.from("condicoes_pagamento").select("codigo_integracao").eq("id", venda.condicao_pagamento_id).single();
        const { data: perfil } = await supabase.from("perfis_usuario").select("codigo_vendedor").eq("id", venda.vendedor_id).single();
        const { data: itens } = await supabase.from("vendas_itens").select("*, produtos(*)").eq("venda_id", venda_id).order("sequencia_item");

        if (!cliente || !empresa || !tipoPedido || !condicaoPagamento || !perfil || !itens?.length) {
          throw new Error("Dados incompletos para calcular pedido");
        }

        // Dividir em lotes de 25 itens
        const TAMANHO_LOTE = 25;
        const lotesDeItens = dividirEmLotes(itens, TAMANHO_LOTE);
        const totalLotes = lotesDeItens.length;

        console.log(`Background: ${itens.length} itens em ${totalLotes} lote(s)`);

        const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);
        const resultados: any[] = [];

        for (let i = 0; i < totalLotes; i++) {
          const lote = lotesDeItens[i];
          const numeroLote = i + 1;
          
          console.log(`Background: Lote ${numeroLote}/${totalLotes}`);

          const itensPayload = lote.map((item: any) => ({
            "nr-sequencia": item.sequencia_item,
            "it-codigo": item.produtos.referencia_interna,
            "cod-refer": "",
            "nat-operacao": empresa.natureza_operacao,
            "qt-pedida": item.quantidade,
            "vl-preuni": item.preco_tabela,
            "vl-pretab": item.preco_tabela,
            "vl-preori": item.preco_tabela,
            "vl-preco-base": item.preco_tabela,
            "per-des-item": item.desconto,
          }));

          const payload = {
            pedido: [{
              "cod-emitente": Number(cliente.cod_emitente),
              "tipo-pedido": tipoPedido.nome.toLowerCase(),
              "cotacao": venda.numero_venda,
              "cod-estabel": String(empresa.codigo_estabelecimento),
              "nat-operacao": String(empresa.natureza_operacao),
              "cod-cond-pag": Number(condicaoPagamento.codigo_integracao),
              "cod-transp": 24249,
              "vl-frete-inf": 0,
              "cod-rep": Number(perfil.codigo_vendedor),
              "nr-tabpre": "SE-CFI",
              "perc-desco1": 0,
              "fat-parcial": venda.faturamento_parcial === "YES",
              "item": itensPayload,
            }]
          };

          const payloadOrdenado = serializeOrderPayload(payload);

          // Tentar até 3 vezes com timeout de 40s
          let sucesso = false;
          let datasulData: any = null;

          for (let tentativa = 0; tentativa < 3 && !sucesso; tentativa++) {
            try {
              if (tentativa > 0) {
                console.log(`Background: Lote ${numeroLote} - Aguardando ${2000 * tentativa}ms antes da tentativa ${tentativa+1}`);
                await new Promise(r => setTimeout(r, 2000 * tentativa));
              }

              const fetchStartTime = Date.now();
              const response = await fetch(DATASUL_PROXY_URL, {
                method: "POST",
                headers: {
                  Authorization: `Basic ${authHeader}`,
                  "Content-Type": "application/json",
                },
                body: payloadOrdenado,
                signal: AbortSignal.timeout(40000),
              });

              const responseTime = Date.now() - fetchStartTime;
              const text = await response.text();
              
              // Log detalhado da resposta
              console.log(`Background: Lote ${numeroLote} tentativa ${tentativa+1} - Status: ${response.status} ${response.statusText}`);
              console.log(`Background: Tempo de resposta: ${responseTime}ms`);
              console.log(`Background: Content-Type: ${response.headers.get("content-type")}`);
              console.log(`Background: Primeiros 200 chars da resposta: ${text.substring(0, 200)}`);

              // Salvar log no banco ANTES de fazer parse (para capturar erros)
              const isResponseOk = response.ok && response.status >= 200 && response.status < 300;
              
              await supabase.from("integracoes_totvs_calcula_pedido").insert({
                venda_id,
                numero_venda: `${venda.numero_venda}-L${numeroLote}-T${tentativa+1}`,
                request_payload: payloadOrdenado,
                response_payload: isResponseOk ? text : null,
                status: isResponseOk ? "sucesso" : "erro",
                error_message: isResponseOk ? null : `HTTP ${response.status} ${response.statusText}: ${text.substring(0, 1000)}`,
                tempo_resposta_ms: responseTime,
              });

              if (!isResponseOk) {
                throw new Error(`Datasul retornou status ${response.status} ${response.statusText}. Resposta: ${text.substring(0, 500)}`);
              }

              // Tentar fazer parse do JSON apenas se a resposta for OK
              try {
                datasulData = JSON.parse(text);
                console.log(`Background: Lote ${numeroLote} - JSON parseado com sucesso`);
              } catch (parseError) {
                const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
                console.error(`Background: Lote ${numeroLote} - Erro ao fazer parse do JSON:`, parseError);
                console.error(`Background: Resposta completa (primeiros 1000 chars): ${text.substring(0, 1000)}`);
                throw new Error(`Resposta não é JSON válido. Parse error: ${parseErrorMsg}. Resposta: ${text.substring(0, 200)}`);
              }

              sucesso = true;
              
              // Atualizar itens com dados do Datasul
              const retornoArray = datasulData.retorno || datasulData.pedido;
              if (Array.isArray(retornoArray)) {
                console.log(`Background: Lote ${numeroLote} - Atualizando ${retornoArray.length} itens`);
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
                console.log(`Background: Lote ${numeroLote} - Itens atualizados com sucesso`);
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`Background: Lote ${numeroLote} tentativa ${tentativa+1} falhou: ${errorMsg}`);
              
              // Se for a última tentativa, garantir que salvamos o erro
              if (tentativa === 2) {
                await supabase.from("integracoes_totvs_calcula_pedido").insert({
                  venda_id,
                  numero_venda: `${venda.numero_venda}-L${numeroLote}-ERRO-FINAL`,
                  request_payload: payloadOrdenado,
                  response_payload: null,
                  status: "erro",
                  error_message: `Falhou após 3 tentativas. Último erro: ${errorMsg}`,
                  tempo_resposta_ms: null,
                });
              }
            }
          }

          if (sucesso) {
            resultados.push({ lote: numeroLote, success: true });
          } else {
            console.error(`Background: Lote ${numeroLote} falhou após 3 tentativas`);
          }
        }

        // Atualizar status final
        const todosOK = resultados.length === totalLotes && resultados.every(r => r.success);
        
        await supabase.from("vendas").update({
          ultima_integracao_datasul_status: todosOK ? "sucesso_completo" : "parcial",
          ultima_integracao_datasul_resposta: resultados,
        }).eq("id", venda_id);

        console.log(`Background: Concluído ${resultados.length}/${totalLotes} lotes`);
      } catch (error) {
        console.error("Background: Erro fatal:", error);
        await supabase.from("vendas").update({
          ultima_integracao_datasul_status: "erro",
          ultima_integracao_datasul_resposta: { error: String(error) },
        }).eq("id", venda_id);
      }
    };

    // Registrar tarefa em background para garantir execução completa
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) {
      runtime.waitUntil(processarTodosLotes());
      console.log("Background task registered with EdgeRuntime.waitUntil");
    } else {
      // Fallback para desenvolvimento local
      processarTodosLotes();
      console.log("Background task started without EdgeRuntime");
    }

    // Retornar resposta IMEDIATA
    const tempoResposta = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        venda_id,
        mensagem: "Cálculo iniciado em background. Você será notificado quando concluir.",
        tempo_resposta_ms: tempoResposta,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        tempo_resposta_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
