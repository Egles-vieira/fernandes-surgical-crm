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

  // Função auxiliar para ordenar objeto conforme array de chaves
  function sortObject(obj: any, keys: string[]): any {
    const sorted: any = {};
    keys.forEach(key => {
      if (key in obj) {
        sorted[key] = obj[key];
      }
    });
    return sorted;
  }

  // Processar payload mantendo ordem estrita
  const ordered = {
    pedido: data.pedido.map((order: any) => {
      const sortedOrder = sortObject(order, orderedKeys.pedido);
      
      // Ordenar itens dentro do pedido
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

// Função para dividir array em lotes
function dividirEmLotes<T>(array: T[], tamanhoLote: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < array.length; i += tamanhoLote) {
    lotes.push(array.slice(i, i + tamanhoLote));
  }
  return lotes;
}

interface VendaData {
  id: string;
  numero_venda: string;
  faturamento_parcial: string | null;
  tipo_pedido_id: string | null;
  condicao_pagamento_id: string | null;
  vendedor_id: string | null;
  cliente_id: string | null;
}

interface EmpresaData {
  codigo_estabelecimento: string;
  natureza_operacao: string;
}

interface TipoPedidoData {
  nome: string;
}

interface CondicaoPagamentoData {
  codigo_integracao: number;
}

interface PerfilData {
  codigo_vendedor: number;
}

interface VendaItemData {
  sequencia_item: number;
  quantidade: number;
  preco_tabela: number;
  desconto: number;
  produto_id: string;
  produtos: {
    referencia_interna: string;
    cod_trib_icms: string | null;
    aliquota_ipi: number | null;
  } | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Obter variáveis de ambiente
    const DATASUL_USER = Deno.env.get("DATASUL_USER");
    const DATASUL_PASS = Deno.env.get("DATASUL_PASS");
    const DATASUL_PROXY_URL = Deno.env.get("DATASUL_PROXY_URL");
    
    if (!DATASUL_USER || !DATASUL_PASS) {
      throw new Error("Credenciais Datasul não configuradas");
    }
    
    if (!DATASUL_PROXY_URL) {
      throw new Error("URL do proxy Datasul não configurada. Configure DATASUL_PROXY_URL nas variáveis de ambiente.");
    }

    // Obter venda_id do body
    const { venda_id } = await req.json();

    if (!venda_id) {
      return new Response(JSON.stringify({ error: "venda_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Iniciando cálculo de pedido para venda:", venda_id);

    // 1. Buscar dados da venda
    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .select("id, numero_venda, faturamento_parcial, tipo_pedido_id, condicao_pagamento_id, vendedor_id, cliente_id")
      .eq("id", venda_id)
      .maybeSingle<VendaData>();

    if (vendaError || !venda) {
      throw new Error(`Venda não encontrada: ${vendaError?.message || "ID inválido"}`);
    }

    // Validar campos obrigatórios da venda
    if (!venda.tipo_pedido_id) {
      throw new Error("Venda sem tipo de pedido definido. Por favor, selecione um tipo de pedido.");
    }
    if (!venda.condicao_pagamento_id) {
      throw new Error("Venda sem condição de pagamento definida. Por favor, selecione uma condição de pagamento.");
    }
    if (!venda.vendedor_id) {
      throw new Error("Venda sem vendedor definido. Por favor, selecione um vendedor.");
    }
    if (!venda.cliente_id) {
      throw new Error("Venda sem cliente definido. Por favor, selecione um cliente.");
    }

    // 2. Buscar dados do cliente (cod_emitente)
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("cod_emitente")
      .eq("id", venda.cliente_id)
      .maybeSingle();

    if (clienteError || !cliente) {
      throw new Error(`Cliente não encontrado (ID: ${venda.cliente_id}). Verifique se o cliente existe.`);
    }

    if (!cliente.cod_emitente) {
      throw new Error("Cliente sem código de emitente definido. Configure o código do emitente no cadastro do cliente.");
    }

    // 3. Buscar dados da empresa (assumindo uma empresa única)
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("codigo_estabelecimento, natureza_operacao")
      .limit(1)
      .maybeSingle<EmpresaData>();

    if (empresaError || !empresa) {
      throw new Error("Dados da empresa não encontrados. Configure a empresa no sistema.");
    }

    // 4. Buscar tipo de pedido
    const { data: tipoPedido, error: tipoPedidoError } = await supabase
      .from("tipos_pedido")
      .select("nome")
      .eq("id", venda.tipo_pedido_id)
      .maybeSingle<TipoPedidoData>();

    if (tipoPedidoError || !tipoPedido) {
      throw new Error(
        `Tipo de pedido não encontrado (ID: ${venda.tipo_pedido_id}). Verifique se o tipo de pedido existe.`,
      );
    }

    // 5. Buscar condição de pagamento
    const { data: condicaoPagamento, error: condicaoPagamentoError } = await supabase
      .from("condicoes_pagamento")
      .select("codigo_integracao")
      .eq("id", venda.condicao_pagamento_id)
      .maybeSingle<CondicaoPagamentoData>();

    if (condicaoPagamentoError || !condicaoPagamento) {
      throw new Error(
        `Condição de pagamento não encontrada (ID: ${venda.condicao_pagamento_id}). Verifique se a condição de pagamento existe.`,
      );
    }

    // 6. Buscar dados do vendedor
    const { data: perfil, error: perfilError } = await supabase
      .from("perfis_usuario")
      .select("codigo_vendedor")
      .eq("id", venda.vendedor_id)
      .maybeSingle<PerfilData>();

    if (perfilError || !perfil) {
      throw new Error(`Vendedor não encontrado (ID: ${venda.vendedor_id}). Verifique se o vendedor existe.`);
    }

    if (!perfil.codigo_vendedor) {
      throw new Error("Vendedor sem código de vendedor definido. Configure o código no perfil do vendedor.");
    }

    // 7. Buscar itens da venda com produtos
    const { data: rawItens, error: itensError } = await supabase
      .from("vendas_itens")
      .select(
        `
        sequencia_item,
        quantidade,
        preco_tabela,
        desconto,
        produto_id,
        produtos (
          referencia_interna,
          cod_trib_icms,
          aliquota_ipi
        )
      `,
      )
      .eq("venda_id", venda_id)
      .order("sequencia_item");

    if (itensError) {
      console.error("Erro ao buscar itens:", itensError);
      throw new Error(`Erro ao buscar itens: ${itensError.message}`);
    }

    if (!rawItens || rawItens.length === 0) {
      throw new Error("Nenhum item encontrado na venda");
    }

    // Type cast para o tipo correto
    const itens = rawItens as unknown as VendaItemData[];

    console.log(`📦 Total de itens a calcular: ${itens.length}`);

    // Validar se todos os itens têm produto e referência
    const itensSemProduto = itens.filter((item) => !item.produtos || !item.produtos.referencia_interna);
    if (itensSemProduto.length > 0) {
      throw new Error(
        `Itens sem produto ou referência interna: ${itensSemProduto.map((i) => i.sequencia_item).join(", ")}`,
      );
    }

    // Validar campos obrigatórios
    const camposFaltando = [];
    if (!empresa.codigo_estabelecimento) camposFaltando.push("código do estabelecimento");
    if (!empresa.natureza_operacao) camposFaltando.push("natureza de operação");
    if (!condicaoPagamento.codigo_integracao) camposFaltando.push("código da condição de pagamento");
    if (!perfil.codigo_vendedor) camposFaltando.push("código do vendedor");

    if (camposFaltando.length > 0) {
      throw new Error(`Campos obrigatórios faltando: ${camposFaltando.join(", ")}`);
    }

    // 8. BATCHING: Dividir itens em lotes de 50 (reduzido para evitar timeout do proxy)
    const TAMANHO_LOTE = 50;
    const lotesDeItens = dividirEmLotes(itens, TAMANHO_LOTE);
    const totalLotes = lotesDeItens.length;
    
    console.log(`🔄 Dividindo ${itens.length} itens em ${totalLotes} lote(s) de até ${TAMANHO_LOTE} itens`);

    const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);
    const respostasConsolidadas: any[] = [];
    let errorNumber: number | null = null;
    let errorDescription: string | null = null;
    let msgCredito: string | null = null;
    let indCreCli: string | null = null;
    let limiteDisponivel: number | null = null;

    // Função para processar um lote
    const processarLote = async (indiceLote: number) => {
      const lote = lotesDeItens[indiceLote];
      const numeroLote = indiceLote + 1;
      
      console.log(`\n📨 Processando lote ${numeroLote}/${totalLotes} (${lote.length} itens)`);
      
      const inicioLote = Date.now();

      // Processar itens do lote atual
      const itensProcessados: any[] = [];
      const itensTributados = lote.filter(item => item.produtos?.cod_trib_icms && item.produtos.cod_trib_icms.trim() !== "");
      
      const itensPayload = lote.map((item) => {
        const produto = item.produtos;
        const produtoRef = produto?.referencia_interna || "";
        const precoOriginal = Number(item.preco_tabela);
        let precoParaEnviar = precoOriginal;
        const infoItem: any = { seq: item.sequencia_item, ref: produtoRef };

        if (!produtoRef) {
          infoItem.aviso = "sem_referencia";
        }

        // Calcular IPI se produto tributado
        if (produto?.cod_trib_icms && produto.cod_trib_icms.trim() !== "") {
          const aliquotaIpi = Number(produto.aliquota_ipi || 0);
          
          if (aliquotaIpi > 0) {
            precoParaEnviar = precoOriginal / (1 + aliquotaIpi / 100);
            infoItem.tributado = true;
            infoItem.ipi = aliquotaIpi;
            infoItem.preco_original = precoOriginal;
            infoItem.preco_ajustado = precoParaEnviar;
          } else {
            infoItem.tributado = true;
            infoItem.sem_aliquota = true;
          }
        }
        
        itensProcessados.push(infoItem);

        return {
          "nr-sequencia": Number(item.sequencia_item),
          "it-codigo": String(produtoRef),
          "cod-refer": "",
          "nat-operacao": String(empresa.natureza_operacao),
          "qt-pedida": Number(item.quantidade),
          "vl-preuni": precoParaEnviar,
          "vl-pretab": precoParaEnviar,
          "vl-preori": precoParaEnviar,
          "vl-preco-base": precoParaEnviar,
          "per-des-item": Number(item.desconto),
        };
      });

      const itensComIPI = itensProcessados.filter(i => i.ipi);
      const itensProblema = itensProcessados.filter(i => i.aviso || i.sem_aliquota);

      console.log(`  ├─ Itens processados: ${itensProcessados.length}`);
      console.log(`  ├─ Com IPI retirado: ${itensComIPI.length}`);
      console.log(`  └─ Com avisos: ${itensProblema.length}`);

      // Montar payload para este lote
      const datasulPayload = {
        pedido: [
          {
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
          },
        ],
      };

      const payloadOrdenado = serializeOrderPayload(datasulPayload);

      // Enviar para Datasul
      console.log(`  📡 Enviando lote ${numeroLote} para Datasul...`);
      
      const datasulResponse = await fetch(DATASUL_PROXY_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: payloadOrdenado,
        signal: AbortSignal.timeout(25000), // 25 segundos para não exceder timeout do proxy (30s)
      });

      const tempoLote = Date.now() - inicioLote;
      console.log(`  ⏱️ Lote ${numeroLote} processado em ${tempoLote}ms`);

      let datasulData = null;
      let responseText = "";

      try {
        responseText = await datasulResponse.text();
        datasulData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`  ❌ Erro ao parsear resposta do lote ${numeroLote}:`, parseError);
        datasulData = { raw: responseText };
      }

      // Log do lote
      const logData = {
        venda_id: venda.id,
        numero_venda: `${venda.numero_venda}-LOTE${numeroLote}`,
        request_payload: payloadOrdenado,
        response_payload: datasulData,
        status: datasulResponse.ok ? "sucesso" : "erro",
        error_message: datasulResponse.ok ? null : `HTTP ${datasulResponse.status}: ${responseText}`,
        tempo_resposta_ms: tempoLote,
      };

      await supabase.from("integracoes_totvs_calcula_pedido").insert(logData);

      // Se erro, abortar tudo
      if (!datasulResponse.ok) {
        throw new Error(`Lote ${numeroLote}/${totalLotes} falhou: HTTP ${datasulResponse.status} - ${responseText}`);
      }

      // Extrair informações do primeiro lote (usado para validações de crédito)
      if (numeroLote === 1) {
        try {
          if (datasulData && typeof datasulData === 'object') {
            const retornoArray = datasulData.retorno || datasulData.pedido;
            
            if (Array.isArray(retornoArray) && retornoArray.length > 0) {
              const itemRetorno = retornoArray[0];
              
              if (itemRetorno.errornumber !== undefined && itemRetorno.errornumber !== null) {
                const errorNum = Number(itemRetorno.errornumber);
                errorNumber = isNaN(errorNum) ? null : errorNum;
              }
              
              if (itemRetorno.errordescription !== undefined && itemRetorno.errordescription !== null) {
                const desc = String(itemRetorno.errordescription).trim();
                errorDescription = desc === "" ? null : desc;
              }
              
              if (itemRetorno["msg-credito"] !== undefined && itemRetorno["msg-credito"] !== null) {
                msgCredito = String(itemRetorno["msg-credito"]).trim() || null;
              }
              
              if (itemRetorno["ind-cre-cli"] !== undefined && itemRetorno["ind-cre-cli"] !== null) {
                indCreCli = String(itemRetorno["ind-cre-cli"]).trim() || null;
              }
              
              if (itemRetorno["limite-disponivel"] !== undefined && itemRetorno["limite-disponivel"] !== null) {
                const limite = Number(itemRetorno["limite-disponivel"]);
                limiteDisponivel = isNaN(limite) ? null : limite;
              }
            }
          }
        } catch (extractError) {
          console.error("Erro ao extrair dados do lote 1:", extractError);
        }
      }

      // Armazenar resposta consolidada
      respostasConsolidadas.push({
        lote: numeroLote,
        resposta: datasulData,
        tempo_ms: tempoLote,
      });

      console.log(`  ✅ Lote ${numeroLote} concluído com sucesso`);
      
      return {
        lote: numeroLote,
        resposta: datasulData,
        tempo_ms: tempoLote,
        success: true,
      };
    };

    // Processar APENAS o primeiro lote de forma síncrona
    console.log("\n🚀 Processando primeiro lote de forma síncrona...");
    
    try {
      const resultadoPrimeiroLote = await processarLote(0);
      respostasConsolidadas.push(resultadoPrimeiroLote);
      
      // Se houver mais lotes, processar em background
      if (totalLotes > 1) {
        console.log(`\n⏳ ${totalLotes - 1} lote(s) restante(s) serão processados em background`);
        
        // Background task para processar lotes restantes
        const processarLotesRestantes = async () => {
          try {
            for (let i = 1; i < totalLotes; i++) {
              const resultado = await processarLote(i);
              
              // Atualizar itens deste lote
              const datasulData = resultado.resposta;
              if (datasulData && typeof datasulData === 'object') {
                const retornoArray = datasulData.retorno || datasulData.pedido;
                
                if (Array.isArray(retornoArray) && retornoArray.length > 0) {
                  for (const itemDatasul of retornoArray) {
                    const nrSequencia = itemDatasul["nr-sequencia"];
                    
                    if (nrSequencia !== undefined && nrSequencia !== null) {
                      const updateItemData: any = {
                        datasul_dep_exp: itemDatasul["dep-exp"] ? Number(itemDatasul["dep-exp"]) : null,
                        datasul_custo: itemDatasul["custo"] ? Number(itemDatasul["custo"]) : null,
                        datasul_divisao: itemDatasul["divisao"] ? Number(itemDatasul["divisao"]) : null,
                        datasul_vl_tot_item: itemDatasul["vl-tot-item"] ? Number(itemDatasul["vl-tot-item"]) : null,
                        datasul_vl_merc_liq: itemDatasul["vl-merc-liq"] ? Number(itemDatasul["vl-merc-liq"]) : null,
                        datasul_lote_mulven: itemDatasul["lote-mulven"] ? Number(itemDatasul["lote-mulven"]) : null,
                      };
                      
                      await supabase
                        .from("vendas_itens")
                        .update(updateItemData)
                        .eq("venda_id", venda.id)
                        .eq("sequencia_item", nrSequencia);
                    }
                  }
                }
              }
            }
            
            console.log(`\n🎉 Todos os ${totalLotes} lote(s) processados com sucesso em background`);
            
            // Atualizar venda com status final
            await supabase.from("vendas").update({
              ultima_integracao_datasul_status: "sucesso_completo",
            }).eq("id", venda.id);
            
          } catch (bgError) {
            console.error("Erro ao processar lotes em background:", bgError);
            
            // Marcar como parcialmente processado
            await supabase.from("vendas").update({
              ultima_integracao_datasul_status: "parcial",
            }).eq("id", venda.id);
          }
        };
        
        // Iniciar processamento em background (não bloqueia a resposta)
        // No Deno, a promise continua rodando mesmo após retornar resposta
        processarLotesRestantes().catch(err => {
          console.error("Erro crítico no processamento background:", err);
        });
      }
      
    } catch (erro) {
      // Se o primeiro lote falhar, lançar erro imediatamente
      throw erro;
    }

    const tempoTotal = Date.now() - startTime;
    console.log(`\n⚡ Primeiro lote processado em ${tempoTotal}ms. ${totalLotes > 1 ? `${totalLotes - 1} lote(s) continuarão em background.` : ""}`);

    // 9. Atualizar venda com dados do primeiro lote
    const statusIntegracao = totalLotes > 1 ? "processando" : "sucesso";
    
    const updateData = {
      ultima_integracao_datasul_em: new Date().toISOString(),
      ultima_integracao_datasul_resposta: respostasConsolidadas,
      ultima_integracao_datasul_status: statusIntegracao,
      datasul_errornumber: errorNumber,
      datasul_errordescription: errorDescription,
      datasul_msg_credito: msgCredito,
      datasul_ind_cre_cli: indCreCli,
      datasul_limite_disponivel: limiteDisponivel,
    };

    await supabase.from("vendas").update(updateData).eq("id", venda.id);

    // 10. Atualizar itens do primeiro lote
    const primeiroLote = respostasConsolidadas[0];
    if (primeiroLote?.resposta) {
      const datasulData = primeiroLote.resposta;
      
      if (datasulData && typeof datasulData === 'object') {
        const retornoArray = datasulData.retorno || datasulData.pedido;
        
        if (Array.isArray(retornoArray) && retornoArray.length > 0) {
          for (const itemDatasul of retornoArray) {
            const nrSequencia = itemDatasul["nr-sequencia"];
            
            if (nrSequencia !== undefined && nrSequencia !== null) {
              const updateItemData: any = {
                datasul_dep_exp: itemDatasul["dep-exp"] ? Number(itemDatasul["dep-exp"]) : null,
                datasul_custo: itemDatasul["custo"] ? Number(itemDatasul["custo"]) : null,
                datasul_divisao: itemDatasul["divisao"] ? Number(itemDatasul["divisao"]) : null,
                datasul_vl_tot_item: itemDatasul["vl-tot-item"] ? Number(itemDatasul["vl-tot-item"]) : null,
                datasul_vl_merc_liq: itemDatasul["vl-merc-liq"] ? Number(itemDatasul["vl-merc-liq"]) : null,
                datasul_lote_mulven: itemDatasul["lote-mulven"] ? Number(itemDatasul["lote-mulven"]) : null,
              };
              
              await supabase
                .from("vendas_itens")
                .update(updateItemData)
                .eq("venda_id", venda.id)
                .eq("sequencia_item", nrSequencia);
            }
          }
        }
      }
    }

    // 11. Retornar sucesso imediato (lotes adicionais processando em background)
    return new Response(
      JSON.stringify({
        success: true,
        venda_id: venda.id,
        numero_venda: venda.numero_venda,
        resumo: {
          total_itens: itens.length,
          total_lotes: totalLotes,
          lotes_processados: 1,
          lotes_em_background: totalLotes - 1,
          tempo_resposta_ms: tempoTotal,
        },
        processamento_completo: totalLotes === 1,
        mensagem: totalLotes > 1 
          ? `Primeiro lote (${TAMANHO_LOTE} itens) calculado. ${totalLotes - 1} lote(s) restante(s) sendo processados em background.`
          : "Cálculo concluído com sucesso.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const tempoDecorrido = Date.now() - startTime;
    console.error("Erro ao processar cálculo de pedido:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    let userFriendlyMessage = errorMessage;

    // Mensagens amigáveis para erros específicos
    if (error instanceof Error && (error.name === "TimeoutError" || errorMessage.includes("Signal timed out"))) {
      userFriendlyMessage =
        "Timeout: O sistema Datasul não respondeu em tempo hábil. Tente novamente ou contate o suporte.";
    } else if (errorMessage.includes("fetch failed") || errorMessage.includes("network")) {
      userFriendlyMessage = "Erro de conexão com o sistema Datasul. Verifique a conectividade de rede.";
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: userFriendlyMessage,
        technical_error: errorMessage,
        tempo_resposta_ms: tempoDecorrido,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
