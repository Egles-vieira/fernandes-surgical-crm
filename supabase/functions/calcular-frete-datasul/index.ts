import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs das APIs Datasul
const DATASUL_BASE_URL = "https://limnetic-ara-unveridically.ngrok-free.dev/datasul";
const DATASUL_CIF_URL = `${DATASUL_BASE_URL}/calcula-frete`;
const DATASUL_FOB_URL = `${DATASUL_BASE_URL}/calcula-frete-fob`;

// Autenticações diferentes para cada API
const DATASUL_CIF_AUTH = "Basic aW50ZWdyYWNhbzpjZjA3MDM4OA=="; // integracao:cf070388
const DATASUL_FOB_AUTH = "Basic Y29uc3VsdG9yOm9wYWxh"; // consultor:opala

// Headers específicos para CIF
const DATASUL_CIF_HEADERS = {
  "x-totvs-server-alias": "crm",
  "company_id": "1"
};

interface ItemFreteCIF {
  "it-codigo": string;
  "qt-pedida": number;
  "vl-tot-it": number;
}

interface PayloadFreteCIF {
  "tt-pai": [{
    "cod-emitente": number;
    "cod-entrega": string;
    "tt-ped": [{ "cod-canal-venda": number }];
    "tt-filho": ItemFreteCIF[];
  }];
}

interface ItemFreteFOB {
  "it-codigo": string;
  "qt-pedida": number;
  "pr-unit": number;
  "nr-seq-aux": number;
}

interface PayloadFreteFOB {
  pedido: [{
    "cod-emitente": number;
    "tipo-pedido": string;
    "cotacao": string;
    "cod-estabel": string;
    "nat-operacao": string;
    "cod-cond-pag": number;
    "cod-transp": number;
    "vl-frete-inf": number;
    "cod-rep": number;
    "nr-tabpre": string;
    "perc-desco1": number;
    "fat-parcial": string;
    item: ItemFreteFOB[];
  }];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface VendaItem {
  id: string;
  produto_id: string;
  quantidade: number;
  valor_total: number;
  preco_unitario: number;
  sequencia_item: number;
  produtos?: {
    id: string;
    referencia_interna: string | null;
    nome: string;
  };
}

interface TransportadoraOption {
  cod_transp: number;
  nome_transp: string;
  vl_tot_frete: number;
  prazo_entrega: number;
  vl_tde: number;
  bloqueio: string;
  orig: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  let tempoPreparacaoDados = 0;
  let tempoApi = 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { venda_id } = await req.json();

    if (!venda_id) {
      throw new Error("venda_id é obrigatório");
    }

    console.log(`[FRETE] Iniciando cálculo de frete para venda: ${venda_id}`);

    const prepStartTime = performance.now();

    // =============================================================
    // 1. BUSCAR DADOS DA VENDA COM JOINS NECESSÁRIOS
    // =============================================================
    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .select(`
        id,
        numero_venda,
        cliente_id,
        tipo_frete_id,
        endereco_entrega_id,
        cliente_nome,
        condicao_pagamento_id,
        vendedor_id,
        empresa_id,
        tipo_pedido_id
      `)
      .eq("id", venda_id)
      .single();

    if (vendaError || !venda) {
      throw new Error(`Venda não encontrada: ${vendaError?.message || "ID inválido"}`);
    }

    console.log(`[FRETE] Venda encontrada: ${venda.numero_venda}`);

    // =============================================================
    // 2. VALIDAR CLIENTE E cod_emitente
    // =============================================================
    if (!venda.cliente_id) {
      throw new Error("Venda não possui cliente vinculado");
    }

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id, cod_emitente, nome_abrev, nome_emit")
      .eq("id", venda.cliente_id)
      .single();

    if (clienteError || !cliente) {
      throw new Error(`Cliente não encontrado: ${clienteError?.message}`);
    }

    if (!cliente.cod_emitente || cliente.cod_emitente <= 0) {
      throw new Error(`Cliente "${cliente.nome_abrev || cliente.nome_emit}" não possui código de emitente (cod_emitente) cadastrado no Datasul`);
    }

    console.log(`[FRETE] Cliente: ${cliente.nome_abrev} | cod_emitente: ${cliente.cod_emitente}`);

    // =============================================================
    // 3. VALIDAR TIPO DE FRETE E DETERMINAR API (CIF/FOB)
    // =============================================================
    if (!venda.tipo_frete_id) {
      throw new Error("Tipo de frete não selecionado. Selecione o tipo de frete antes de calcular.");
    }

    const { data: tipoFrete, error: tipoFreteError } = await supabase
      .from("tipos_frete")
      .select("id, nome, cod_canal_venda, api_tipo_frete")
      .eq("id", venda.tipo_frete_id)
      .single();

    if (tipoFreteError || !tipoFrete) {
      throw new Error(`Tipo de frete não encontrado: ${tipoFreteError?.message}`);
    }

    const apiTipo = tipoFrete.api_tipo_frete || 'cif';
    console.log(`[FRETE] Tipo Frete: ${tipoFrete.nome} | API: ${apiTipo.toUpperCase()} | cod_canal_venda: ${tipoFrete.cod_canal_venda}`);

    // Validação específica por tipo de API
    if (apiTipo === 'sem_frete') {
      return new Response(
        JSON.stringify({
          success: true,
          transportadoras: [],
          quantidade_opcoes: 0,
          mensagem: "Tipo de frete 'Sem Frete' não requer cálculo",
          tempo_total_ms: Math.round(performance.now() - startTime)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (apiTipo === 'cif' && !tipoFrete.cod_canal_venda) {
      throw new Error(`Tipo de frete "${tipoFrete.nome}" não possui código de canal de venda (cod_canal_venda) configurado`);
    }

    // =============================================================
    // 4. VALIDAR ENDEREÇO DE ENTREGA
    // =============================================================
    if (!venda.endereco_entrega_id) {
      throw new Error("Endereço de entrega não selecionado. Selecione o endereço antes de calcular o frete.");
    }

    const { data: endereco, error: enderecoError } = await supabase
      .from("enderecos_clientes")
      .select("id, cod_entrega, endereco, cidade, estado")
      .eq("id", venda.endereco_entrega_id)
      .single();

    if (enderecoError || !endereco) {
      throw new Error(`Endereço de entrega não encontrado: ${enderecoError?.message}`);
    }

    const codEntrega = endereco.cod_entrega || "Padrão";
    console.log(`[FRETE] Endereço: ${endereco.cidade}/${endereco.estado} | cod_entrega: ${codEntrega}`);

    // =============================================================
    // 5. BUSCAR E VALIDAR ITENS
    // =============================================================
    const { data: itens, error: itensError } = await supabase
      .from("vendas_itens")
      .select(`
        id,
        produto_id,
        quantidade,
        valor_total,
        preco_unitario,
        sequencia_item,
        produtos (
          id,
          referencia_interna,
          nome
        )
      `)
      .eq("venda_id", venda_id)
      .order("sequencia_item", { ascending: true });

    if (itensError) {
      throw new Error(`Erro ao buscar itens: ${itensError.message}`);
    }

    if (!itens || itens.length === 0) {
      throw new Error("A proposta não possui itens. Adicione produtos antes de calcular o frete.");
    }

    console.log(`[FRETE] Total de itens encontrados: ${itens.length}`);

    const validation = validateAllItems(itens as unknown as VendaItem[]);
    
    if (!validation.valid) {
      throw new Error(`Validação de itens falhou:\n${validation.errors.join("\n")}`);
    }

    tempoPreparacaoDados = performance.now() - prepStartTime;

    // =============================================================
    // 6. CHAMAR API APROPRIADA (CIF ou FOB)
    // =============================================================
    let transportadoras: TransportadoraOption[] = [];
    let payload: any;
    let apiUrl: string;
    let apiResponseText = "";

    if (apiTipo === 'fob') {
      // =========== API FOB ===========
      console.log(`[FRETE] Usando API FOB: ${DATASUL_FOB_URL}`);
      
      // Buscar dados adicionais necessários para FOB
      const { data: empresa } = await supabase
        .from("empresas")
        .select("codigo_estabelecimento, natureza_operacao, tabela_preco")
        .eq("id", venda.empresa_id)
        .single();

      const { data: condicaoPag } = await supabase
        .from("condicoes_pagamento")
        .select("codigo_integracao")
        .eq("id", venda.condicao_pagamento_id)
        .single();

      const { data: vendedor } = await supabase
        .from("perfis_usuario")
        .select("codigo_vendedor")
        .eq("id", venda.vendedor_id)
        .single();

      const { data: tipoPedido } = await supabase
        .from("tipos_pedido")
        .select("nome")
        .eq("id", venda.tipo_pedido_id)
        .single();

      // Montar itens para FOB
      const itensFOB: ItemFreteFOB[] = (itens as unknown as VendaItem[]).map((item) => ({
        "it-codigo": item.produtos?.referencia_interna || "",
        "qt-pedida": Number(item.quantidade),
        "pr-unit": Number(item.preco_unitario || 0),
        "nr-seq-aux": item.sequencia_item || 1
      }));

      payload = {
        pedido: [{
          "cod-emitente": cliente.cod_emitente,
          "tipo-pedido": tipoPedido?.nome?.toLowerCase() || "normal",
          "cotacao": venda.numero_venda || "",
          "cod-estabel": empresa?.codigo_estabelecimento || "3",
          "nat-operacao": empresa?.natureza_operacao || "610809",
          "cod-cond-pag": condicaoPag?.codigo_integracao || 1,
          "cod-transp": 0, // API retornará opções
          "vl-frete-inf": 0,
          "cod-rep": vendedor?.codigo_vendedor || 0,
          "nr-tabpre": empresa?.tabela_preco || "SE-CFI",
          "perc-desco1": 0,
          "fat-parcial": "yes",
          item: itensFOB
        }]
      } as PayloadFreteFOB;

      apiUrl = DATASUL_FOB_URL;

      const apiStartTime = performance.now();
      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": DATASUL_FOB_AUTH
        },
        body: JSON.stringify(payload)
      });

      apiResponseText = await apiResponse.text();
      tempoApi = performance.now() - apiStartTime;
      console.log(`[FRETE] API FOB respondeu em ${tempoApi.toFixed(0)}ms | Status: ${apiResponse.status}`);
      console.log(`[FRETE] Resposta FOB: ${apiResponseText.substring(0, 1000)}`);

      // Processar resposta FOB
      const responseData = JSON.parse(apiResponseText);
      
      if (responseData["tt-frete"] && Array.isArray(responseData["tt-frete"])) {
        transportadoras = responseData["tt-frete"].map((frete: any) => ({
          cod_transp: frete["cod-transp"] || 0,
          nome_transp: frete["nome-transp"] || "Sem nome",
          vl_tot_frete: frete["vl-tot-frete"] || 0,
          prazo_entrega: frete["prazo-entrega"] || 0,
          vl_tde: frete["vl-tde"] || 0,
          bloqueio: frete["bloqueio"] || "",
          orig: frete["orig"] || false
        }));
      }

    } else {
      // =========== API CIF (padrão) ===========
      console.log(`[FRETE] Usando API CIF: ${DATASUL_CIF_URL}`);

      const ttFilho: ItemFreteCIF[] = (itens as unknown as VendaItem[]).map((item) => ({
        "it-codigo": item.produtos?.referencia_interna || "",
        "qt-pedida": Number(item.quantidade),
        "vl-tot-it": Number((item.valor_total || 0).toFixed(2))
      }));

      payload = {
        "tt-pai": [{
          "cod-emitente": cliente.cod_emitente,
          "cod-entrega": codEntrega,
          "tt-ped": [{ "cod-canal-venda": tipoFrete.cod_canal_venda }],
          "tt-filho": ttFilho
        }]
      } as PayloadFreteCIF;

      apiUrl = DATASUL_CIF_URL;

      const apiStartTime = performance.now();
      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": DATASUL_CIF_AUTH,
          ...DATASUL_CIF_HEADERS
        },
        body: JSON.stringify(payload)
      });

      apiResponseText = await apiResponse.text();
      tempoApi = performance.now() - apiStartTime;
      console.log(`[FRETE] API CIF respondeu em ${tempoApi.toFixed(0)}ms | Status: ${apiResponse.status}`);
      console.log(`[FRETE] Resposta CIF: ${apiResponseText.substring(0, 1000)}`);

      // Processar resposta CIF
      const responseData = JSON.parse(apiResponseText);

      if (responseData.ErrorNumber || responseData["tt-retorno"]?.[0]?.["cd-erro"]) {
        const errorMsg = responseData.ErrorDescription || 
                         responseData["tt-retorno"]?.[0]?.["ds-erro"] ||
                         "Erro desconhecido do Datasul";
        throw new Error(`Datasul retornou erro: ${errorMsg}`);
      }

      if (responseData["tt-frete"] && Array.isArray(responseData["tt-frete"])) {
        transportadoras = responseData["tt-frete"].map((frete: any) => ({
          cod_transp: frete["cod-transp"] || 0,
          nome_transp: frete["nome-transp"] || "Sem nome",
          vl_tot_frete: frete["vl-tot-frete"] || 0,
          prazo_entrega: frete["prazo-entrega"] || 0,
          vl_tde: frete["vl-tde"] || 0,
          bloqueio: frete["bloqueio"] || "",
          orig: frete["orig"] || false
        }));
      }
    }

    if (transportadoras.length === 0) {
      throw new Error("Nenhuma transportadora retornada pelo Datasul. Verifique o endereço de entrega e tipo de frete.");
    }

    console.log(`[FRETE] ${transportadoras.length} transportadora(s) encontrada(s)`);

    // =============================================================
    // 7. SALVAR LOG DA INTEGRAÇÃO
    // =============================================================
    const tempoTotal = performance.now() - startTime;

    await supabase
      .from("integracoes_totvs_calcula_frete")
      .insert({
        venda_id,
        numero_venda: venda.numero_venda,
        request_payload: JSON.stringify(payload),
        response_payload: apiResponseText,
        status: "sucesso",
        tempo_resposta_ms: Math.round(tempoTotal),
        tempo_preparacao_dados_ms: Math.round(tempoPreparacaoDados),
        tempo_api_ms: Math.round(tempoApi)
      });

    console.log(`[FRETE] Cálculo ${apiTipo.toUpperCase()} concluído com sucesso em ${tempoTotal.toFixed(0)}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        transportadoras,
        quantidade_opcoes: transportadoras.length,
        mensagem: `${transportadoras.length} opção(ões) de frete encontrada(s) via ${apiTipo.toUpperCase()}`,
        api_utilizada: apiTipo,
        tempo_total_ms: Math.round(tempoTotal)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    const tempoTotal = performance.now() - startTime;
    console.error(`[FRETE] ERRO: ${error.message}`);

    let vendaIdLog = null;
    let numeroVendaLog = "N/A";
    try {
      const body = await req.clone().json();
      vendaIdLog = body.venda_id;
      
      if (vendaIdLog) {
        const { data } = await supabase
          .from("vendas")
          .select("numero_venda")
          .eq("id", vendaIdLog)
          .single();
        numeroVendaLog = data?.numero_venda || "N/A";
      }
    } catch {}

    if (vendaIdLog) {
      await supabase
        .from("integracoes_totvs_calcula_frete")
        .insert({
          venda_id: vendaIdLog,
          numero_venda: numeroVendaLog,
          request_payload: "{}",
          status: "erro",
          error_message: error.message,
          tempo_resposta_ms: Math.round(tempoTotal),
          tempo_preparacao_dados_ms: Math.round(tempoPreparacaoDados),
          tempo_api_ms: Math.round(tempoApi)
        });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_code: "FRETE_CALCULATION_ERROR"
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function validateAllItems(itens: VendaItem[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  itens.forEach((item, index) => {
    const itemNum = index + 1;
    const produtoNome = item.produtos?.nome || `Produto ID: ${item.produto_id}`;
    
    if (!item.produtos) {
      errors.push(`Item ${itemNum}: Produto não encontrado no sistema (${produtoNome})`);
      return;
    }
    
    if (!item.produtos.referencia_interna) {
      errors.push(`Item ${itemNum}: "${produtoNome}" não possui referência interna cadastrada`);
    }
    
    if (!item.quantidade || item.quantidade <= 0) {
      errors.push(`Item ${itemNum}: "${produtoNome}" possui quantidade inválida (${item.quantidade})`);
    }
    
    if (item.valor_total === null || item.valor_total === undefined) {
      errors.push(`Item ${itemNum}: "${produtoNome}" não possui valor total calculado`);
    } else if (item.valor_total < 0) {
      errors.push(`Item ${itemNum}: "${produtoNome}" possui valor total negativo (${item.valor_total})`);
    }
    
    if (item.valor_total === 0) {
      warnings.push(`Item ${itemNum}: "${produtoNome}" possui valor total R$ 0,00`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
