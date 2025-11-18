import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VendaData {
  id: string;
  numero_venda: string;
  cod_emitente: number;
  faturamento_parcial: string | null;
  tipo_pedido_id: string | null;
  condicao_pagamento_id: string | null;
  vendedor_id: string | null;
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
      .select("id, numero_venda, cod_emitente, faturamento_parcial, tipo_pedido_id, condicao_pagamento_id, vendedor_id")
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

    // 2. Buscar dados da empresa (assumindo uma empresa única)
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .select("codigo_estabelecimento, natureza_operacao")
      .limit(1)
      .maybeSingle<EmpresaData>();

    if (empresaError || !empresa) {
      throw new Error("Dados da empresa não encontrados. Configure a empresa no sistema.");
    }

    // 3. Buscar tipo de pedido
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

    // 4. Buscar condição de pagamento
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

    // 5. Buscar dados do vendedor
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

    // 6. Buscar itens da venda com produtos
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
          referencia_interna
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

    // 7. Montar payload para Datasul (ordem e tipos exatos conforme imagem)
    const datasulPayload = {
      pedido: [
        {
          "cod-emitente": Number(venda.cod_emitente),
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
          "fat-parcial": venda.faturamento_parcial === "YES" ? "yes" : "no",
          "item": itens.map((item) => {
            const produtoRef = item.produtos?.referencia_interna || "";

            if (!produtoRef) {
              console.warn(`Item ${item.sequencia_item} sem referência interna`);
            }

            return {
              "nr-sequencia": Number(item.sequencia_item),
              "it-codigo": String(produtoRef),
              "cod-refer": "",
              "nat-operacao": String(empresa.natureza_operacao),
              "qt-pedida": Number(item.quantidade),
              "vl-preuni": Number(item.preco_tabela),
              "vl-pretab": Number(item.preco_tabela),
              "vl-preori": Number(item.preco_tabela),
              "vl-preco-base": Number(item.preco_tabela),
              "per-des-item": Number(item.desconto),
            };
          }),
        },
      ],
    };

    console.log("Payload montado:", JSON.stringify(datasulPayload, null, 2));

    // 8. Enviar para Datasul
    const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);

    console.log("Enviando requisição para Datasul via proxy:", DATASUL_PROXY_URL);

    const datasulResponse = await fetch(DATASUL_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datasulPayload),
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

    // 9. Armazenar log da integração
    const logData = {
      venda_id: venda.id,
      numero_venda: venda.numero_venda,
      request_payload: datasulPayload,
      response_payload: datasulData,
      status: datasulResponse.ok ? "sucesso" : "erro",
      error_message: datasulResponse.ok ? null : `HTTP ${datasulResponse.status}: ${responseText}`,
      tempo_resposta_ms: tempoResposta,
    };

    const { error: logError } = await supabase.from("integracoes_totvs_calcula_pedido").insert(logData);

    if (logError) {
      console.error("Erro ao salvar log:", logError);
    }

    // 10. Se houve erro no Datasul, retornar erro
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

    // 11. Montar resumo de totais (extrair do retorno Datasul)
    const resumo = {
      total_itens: itens.length,
      tempo_resposta_ms: tempoResposta,
    };

    // 12. Retornar sucesso
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
