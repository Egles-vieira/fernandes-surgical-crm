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

    if (!DATASUL_USER || !DATASUL_PASS) {
      throw new Error("Credenciais Datasul não configuradas");
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

    console.log("Itens carregados:", JSON.stringify(itens, null, 2));

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

    // 8. Montar payload para Datasul (ordem rigorosamente mantida)
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
          "item": (() => {
            const itensProcessados: any[] = [];
            
            const itensPayload = itens.map((item) => {
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

            // Log consolidado após processamento
            const itensTributados = itensProcessados.filter(i => i.tributado);
            const itensComIPI = itensProcessados.filter(i => i.ipi);
            const itensProblema = itensProcessados.filter(i => i.aviso || i.sem_aliquota);

            console.log(`📦 Processamento de ${itensProcessados.length} itens concluído:`, {
              total_itens: itensProcessados.length,
              com_ipi_retirado: itensComIPI.length,
              tributados_sem_aliquota: itensTributados.filter(i => i.sem_aliquota).length,
              nao_tributados: itensProcessados.length - itensTributados.length,
              avisos: itensProblema.length
            });

            if (itensComIPI.length > 0) {
              console.log(`💰 Itens com IPI retirado (${itensComIPI.length}):`, 
                itensComIPI.map(i => ({
                  seq: i.seq,
                  ref: i.ref,
                  ipi: i.ipi + "%",
                  original: i.preco_original.toFixed(2),
                  ajustado: i.preco_ajustado.toFixed(2)
                }))
              );
            }

            if (itensProblema.length > 0) {
              console.log(`⚠️ Itens com avisos (${itensProblema.length}):`, itensProblema);
            }

            return itensPayload;
          })(),
        },
      ],
    };

    const payloadOrdenado = serializeOrderPayload(datasulPayload);
    console.log("Payload montado (ordem garantida):", payloadOrdenado);

    // 9. Enviar para Datasul
    const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);

    console.log("Enviando requisição para Datasul via proxy:", DATASUL_PROXY_URL);

    const datasulResponse = await fetch(DATASUL_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: payloadOrdenado,
      signal: AbortSignal.timeout(60000), // 60 segundos timeout
    });

    const tempoResposta = Date.now() - startTime;

    let datasulData = null;
    let responseText = "";

    try {
      responseText = await datasulResponse.text();
      datasulData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta:", parseError);
      datasulData = { raw: responseText };
    }

    console.log("Resposta Datasul recebida:", datasulResponse.status);

    // 10. Armazenar log da integração
    // IMPORTANTE: Armazenamos a string JSON diretamente para preservar a ordem dos campos
    const logData = {
      venda_id: venda.id,
      numero_venda: venda.numero_venda,
      request_payload: payloadOrdenado,
      response_payload: datasulData,
      status: datasulResponse.ok ? "sucesso" : "erro",
      error_message: datasulResponse.ok ? null : `HTTP ${datasulResponse.status}: ${responseText}`,
      tempo_resposta_ms: tempoResposta,
    };

    const { error: logError } = await supabase.from("integracoes_totvs_calcula_pedido").insert(logData);

    if (logError) {
      console.error("Erro ao salvar log:", logError);
    }

    // 11. Extrair informações do retorno do cálculo
    // CRÍTICO: Sempre extrair e armazenar informações do último cálculo
    let errorNumber: number | null = null;
    let errorDescription: string | null = null;
    let msgCredito: string | null = null;
    let indCreCli: string | null = null;
    let limiteDisponivel: number | null = null;

    try {
      if (datasulData && typeof datasulData === 'object') {
        // A resposta do Datasul vem com "retorno" e não "pedido"
        const retornoArray = datasulData.retorno || datasulData.pedido;
        
        console.log("Estrutura da resposta Datasul:", { 
          temRetorno: !!datasulData.retorno, 
          temPedido: !!datasulData.pedido,
          tipo: Array.isArray(retornoArray) ? 'array' : typeof retornoArray
        });
        
        if (Array.isArray(retornoArray) && retornoArray.length > 0) {
          // Pegar primeiro item do array de retorno
          const itemRetorno = retornoArray[0];
          
          console.log("Primeiro item do retorno:", {
            errornumber: itemRetorno.errornumber,
            errordescription: itemRetorno.errordescription,
            msgCredito: itemRetorno["msg-credito"],
            indCreCli: itemRetorno["ind-cre-cli"],
            limiteDisp: itemRetorno["limite-disponivel"]
          });
          
          // Extrair errornumber (pode ser number ou string)
          if (itemRetorno.errornumber !== undefined && itemRetorno.errornumber !== null) {
            const errorNum = Number(itemRetorno.errornumber);
            errorNumber = isNaN(errorNum) ? null : errorNum;
          }
          
          // Extrair errordescription
          if (itemRetorno.errordescription !== undefined && itemRetorno.errordescription !== null) {
            const desc = String(itemRetorno.errordescription).trim();
            errorDescription = desc === "" ? null : desc;
          }
          
          // Extrair msg-credito
          if (itemRetorno["msg-credito"] !== undefined && itemRetorno["msg-credito"] !== null) {
            msgCredito = String(itemRetorno["msg-credito"]).trim() || null;
          }
          
          // Extrair ind-cre-cli (CRÍTICO - sempre salvar)
          if (itemRetorno["ind-cre-cli"] !== undefined && itemRetorno["ind-cre-cli"] !== null) {
            indCreCli = String(itemRetorno["ind-cre-cli"]).trim() || null;
          }
          
          // Extrair limite-disponivel
          if (itemRetorno["limite-disponivel"] !== undefined && itemRetorno["limite-disponivel"] !== null) {
            const limite = Number(itemRetorno["limite-disponivel"]);
            limiteDisponivel = isNaN(limite) ? null : limite;
          }
          
          console.log("Dados extraídos do retorno Datasul:", {
            errorNumber,
            errorDescription,
            msgCredito,
            indCreCli,
            limiteDisponivel
          });
        } else {
          console.warn("Resposta Datasul sem array de retorno válido");
        }
      }
    } catch (extractError) {
      console.error("Erro ao extrair dados do retorno Datasul:", extractError);
      // Continua mesmo com erro na extração para não quebrar o fluxo
    }

    // 12. Atualizar campos de última integração na venda
    // CRÍTICO: Usar múltiplas tentativas para garantir que os dados sejam salvos
    let updateSuccess = false;
    let updateAttempts = 0;
    const maxUpdateAttempts = 3;
    
    while (!updateSuccess && updateAttempts < maxUpdateAttempts) {
      updateAttempts++;
      
      try {
        const updateData = {
          ultima_integracao_datasul_em: new Date().toISOString(),
          ultima_integracao_datasul_requisicao: payloadOrdenado,
          ultima_integracao_datasul_resposta: datasulData,
          ultima_integracao_datasul_status: datasulResponse.ok ? "sucesso" : "erro",
          datasul_errornumber: errorNumber,
          datasul_errordescription: errorDescription,
          datasul_msg_credito: msgCredito,
          datasul_ind_cre_cli: indCreCli,
          datasul_limite_disponivel: limiteDisponivel,
        };
        
        console.log(`Tentativa ${updateAttempts} de ${maxUpdateAttempts} de atualizar venda com dados do cálculo`);
        
        const { error: updateError } = await supabase
          .from("vendas")
          .update(updateData)
          .eq("id", venda.id);

        if (updateError) {
          console.error(`Erro na tentativa ${updateAttempts}:`, updateError);
          
          if (updateAttempts >= maxUpdateAttempts) {
            // Última tentativa falhou - logar erro crítico mas não quebrar fluxo
            console.error("ERRO CRÍTICO: Falha ao atualizar venda após todas as tentativas:", updateError);
          } else {
            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 500 * updateAttempts));
          }
        } else {
          updateSuccess = true;
          console.log("Venda atualizada com sucesso com dados do cálculo Datasul");
        }
      } catch (updateException) {
        console.error(`Exceção na tentativa ${updateAttempts}:`, updateException);
        
        if (updateAttempts >= maxUpdateAttempts) {
          console.error("ERRO CRÍTICO: Exceção ao atualizar venda após todas as tentativas:", updateException);
        } else {
          await new Promise(resolve => setTimeout(resolve, 500 * updateAttempts));
        }
      }
    }

    // 13. Se houve erro no Datasul, retornar erro
    if (!datasulResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro Datasul: HTTP ${datasulResponse.status}`,
          details: responseText,
          log_id: logData,
        }),
        {
          status: datasulResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 14. Atualizar itens com dados do retorno Datasul
    try {
      if (datasulData && typeof datasulData === 'object') {
        const retornoArray = datasulData.retorno || datasulData.pedido;
        
        if (Array.isArray(retornoArray) && retornoArray.length > 0) {
          const itemRetorno = retornoArray[0];
          
          // Verificar se há array de itens no retorno
          if (itemRetorno.item && Array.isArray(itemRetorno.item)) {
            console.log(`Atualizando ${itemRetorno.item.length} itens com dados do retorno Datasul`);
            
            // Atualizar cada item individualmente
            for (const itemDatasul of itemRetorno.item) {
              const nrSequencia = itemDatasul["nr-sequencia"];
              
              if (nrSequencia !== undefined && nrSequencia !== null) {
                const updateItemData: any = {
                  datasul_dep_exp: null,
                  datasul_custo: null,
                  datasul_divisao: null,
                  datasul_vl_tot_item: null,
                  datasul_vl_merc_liq: null,
                  datasul_lote_mulven: null,
                };
                
                // Extrair campos se existirem
                if (itemDatasul["dep-exp"] !== undefined && itemDatasul["dep-exp"] !== null) {
                  const depExp = Number(itemDatasul["dep-exp"]);
                  updateItemData.datasul_dep_exp = isNaN(depExp) ? null : depExp;
                }
                
                if (itemDatasul["custo"] !== undefined && itemDatasul["custo"] !== null) {
                  const custo = Number(itemDatasul["custo"]);
                  updateItemData.datasul_custo = isNaN(custo) ? null : custo;
                }
                
                if (itemDatasul["divisao"] !== undefined && itemDatasul["divisao"] !== null) {
                  const divisao = Number(itemDatasul["divisao"]);
                  updateItemData.datasul_divisao = isNaN(divisao) ? null : divisao;
                }
                
                if (itemDatasul["vl-tot-item"] !== undefined && itemDatasul["vl-tot-item"] !== null) {
                  const vlTotItem = Number(itemDatasul["vl-tot-item"]);
                  updateItemData.datasul_vl_tot_item = isNaN(vlTotItem) ? null : vlTotItem;
                }
                
                if (itemDatasul["vl-merc-liq"] !== undefined && itemDatasul["vl-merc-liq"] !== null) {
                  const vlMercLiq = Number(itemDatasul["vl-merc-liq"]);
                  updateItemData.datasul_vl_merc_liq = isNaN(vlMercLiq) ? null : vlMercLiq;
                }
                
                if (itemDatasul["lote-mulven"] !== undefined && itemDatasul["lote-mulven"] !== null) {
                  const loteMulven = Number(itemDatasul["lote-mulven"]);
                  updateItemData.datasul_lote_mulven = isNaN(loteMulven) ? null : loteMulven;
                }
                
                // Atualizar item por sequência
                const { error: updateItemError } = await supabase
                  .from("vendas_itens")
                  .update(updateItemData)
                  .eq("venda_id", venda.id)
                  .eq("sequencia_item", nrSequencia);
                
                if (updateItemError) {
                  console.error(`Erro ao atualizar item sequência ${nrSequencia}:`, updateItemError);
                }
              }
            }
            
            console.log("Itens atualizados com dados do retorno Datasul");
          } else {
            console.warn("Retorno Datasul sem array de itens");
          }
        }
      }
    } catch (updateItemsError) {
      console.error("Erro ao atualizar itens com retorno Datasul:", updateItemsError);
      // Não quebrar o fluxo, continua com sucesso
    }

    // 15. Montar resumo de totais (extrair do retorno Datasul)
    const resumo = {
      total_itens: itens.length,
      tempo_resposta_ms: tempoResposta,
    };

    // 16. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        venda_id: venda.id,
        numero_venda: venda.numero_venda,
        resumo,
        datasul_response: datasulData,
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
        "Timeout: O sistema Datasul não respondeu em tempo hábil (60s). Tente novamente ou contate o suporte.";
    } else if (errorMessage.includes("fetch failed") || errorMessage.includes("network")) {
      userFriendlyMessage = "Erro de conexão com o sistema Datasul. Verifique a conectividade de rede.";
    } else if (errorMessage.includes("Venda sem")) {
      userFriendlyMessage = errorMessage; // Já é amigável
    }

    // Tentar salvar log de erro se possível
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Extrair venda_id do erro se disponível
      let venda_id: string | null = null;
      try {
        const body = await req.json();
        venda_id = body.venda_id;
      } catch {
        // Ignora se não conseguir parsear
      }

      if (venda_id) {
        await supabase.from("integracoes_totvs_calcula_pedido").insert({
          venda_id,
          numero_venda: "ERRO",
          request_payload: {},
          response_payload: null,
          status: "erro",
          error_message: errorMessage,
          tempo_resposta_ms: tempoDecorrido,
        });
      }
    } catch (logError) {
      console.error("Erro ao salvar log de erro:", logError);
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
