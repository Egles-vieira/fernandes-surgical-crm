import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurações da API Datasul
const DATASUL_API_URL = "https://limnetic-ara-unveridically.ngrok-free.dev/datasul/calcula-frete";
const DATASUL_AUTH = "Basic aW50ZWdyYWNhbzpjZjA3MDM4OA==";
const DATASUL_SERVER_ALIAS = "crm";
const DATASUL_COMPANY_ID = "1";

interface ItemFrete {
  "it-codigo": string;
  "qt-pedida": number;
  "vl-tot-it": number;
}

interface PayloadFrete {
  "tt-pai": [{
    "cod-emitente": number;
    "cod-entrega": string;
    "tt-ped": [{ "cod-canal-venda": number }];
    "tt-filho": ItemFrete[];
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
  produtos?: {
    id: string;
    referencia_interna: string | null;
    nome: string;
  };
}

// Interface para as opções de transportadora retornadas pela API
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
  // Handle CORS preflight
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

    // =============================================================
    // 1. BUSCAR DADOS DA VENDA
    // =============================================================
    const prepStartTime = performance.now();

    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .select(`
        id,
        numero_venda,
        cliente_id,
        tipo_frete_id,
        endereco_entrega_id,
        cliente_nome
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
    // 3. VALIDAR TIPO DE FRETE E cod_canal_venda
    // =============================================================
    if (!venda.tipo_frete_id) {
      throw new Error("Tipo de frete não selecionado. Selecione o tipo de frete antes de calcular.");
    }

    const { data: tipoFrete, error: tipoFreteError } = await supabase
      .from("tipos_frete")
      .select("id, nome, cod_canal_venda")
      .eq("id", venda.tipo_frete_id)
      .single();

    if (tipoFreteError || !tipoFrete) {
      throw new Error(`Tipo de frete não encontrado: ${tipoFreteError?.message}`);
    }

    // REGRA DE NEGÓCIO: A consulta de transportadoras SEMPRE usa cod_canal_venda = 20 (CIF)
    // independente do tipo de frete selecionado pelo usuário (FOB, CIF, etc.)
    // O tipo de frete selecionado é apenas para documentação/registro na proposta
    const COD_CANAL_VENDA_CIF = 20;

    console.log(`[FRETE] Tipo Frete: ${tipoFrete.nome} - Cliente | cod_canal_venda: ${COD_CANAL_VENDA_CIF} (fixo CIF para consulta)`);

    // =============================================================
    // 4. VALIDAR ENDEREÇO DE ENTREGA E cod_entrega
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
    // 5. BUSCAR E VALIDAR TODOS OS ITENS DA PROPOSTA
    // =============================================================
    const { data: itens, error: itensError } = await supabase
      .from("vendas_itens")
      .select(`
        id,
        produto_id,
        quantidade,
        valor_total,
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

    // Validar CADA item individualmente - NÃO PODE DEIXAR NENHUM PARA TRÁS
    const validation = validateAllItems(itens as unknown as VendaItem[]);
    
    if (!validation.valid) {
      throw new Error(`Validação de itens falhou:\n${validation.errors.join("\n")}`);
    }

    if (validation.warnings.length > 0) {
      console.log(`[FRETE] Avisos: ${validation.warnings.join(", ")}`);
    }

    // =============================================================
    // 6. MONTAR PAYLOAD PARA API DATASUL
    // =============================================================
    const ttFilho: ItemFrete[] = (itens as unknown as VendaItem[]).map((item, index) => {
      const refInterna = item.produtos?.referencia_interna;
      if (!refInterna) {
        throw new Error(`Item ${index + 1}: Produto sem referência interna`);
      }

      return {
        "it-codigo": refInterna,
        "qt-pedida": Number(item.quantidade),
        "vl-tot-it": Number((item.valor_total || 0).toFixed(2))
      };
    });

    const payload: PayloadFrete = {
      "tt-pai": [{
        "cod-emitente": cliente.cod_emitente,
        "cod-entrega": codEntrega,
        "tt-ped": [{ "cod-canal-venda": COD_CANAL_VENDA_CIF }], // Sempre CIF para consulta de transportadoras
        "tt-filho": ttFilho
      }]
    };

    tempoPreparacaoDados = performance.now() - prepStartTime;
    console.log(`[FRETE] Payload preparado em ${tempoPreparacaoDados.toFixed(0)}ms`);
    console.log(`[FRETE] Payload: ${JSON.stringify(payload)}`);

    // =============================================================
    // 7. CHAMAR API DATASUL
    // =============================================================
    const apiStartTime = performance.now();
    
    let apiResponse;
    let apiResponseText = "";
    
    try {
      apiResponse = await fetch(DATASUL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": DATASUL_AUTH,
          "x-totvs-server-alias": DATASUL_SERVER_ALIAS,
          "company_id": DATASUL_COMPANY_ID
        },
        body: JSON.stringify(payload)
      });

      apiResponseText = await apiResponse.text();
      tempoApi = performance.now() - apiStartTime;
      
      console.log(`[FRETE] API respondeu em ${tempoApi.toFixed(0)}ms | Status: ${apiResponse.status}`);
      console.log(`[FRETE] Resposta: ${apiResponseText.substring(0, 1000)}`);
    } catch (fetchError: any) {
      tempoApi = performance.now() - apiStartTime;
      throw new Error(`Falha na comunicação com Datasul: ${fetchError.message}`);
    }

    // =============================================================
    // 8. PROCESSAR RESPOSTA DA API - EXTRAIR TRANSPORTADORAS
    // =============================================================
    let responseData;
    try {
      responseData = JSON.parse(apiResponseText);
    } catch {
      throw new Error(`Resposta inválida do Datasul (não é JSON): ${apiResponseText.substring(0, 200)}`);
    }

    // Verificar erros na resposta
    const hasError = responseData.ErrorNumber || responseData.errorNumber || 
                     responseData["tt-retorno"]?.[0]?.["cd-erro"];
    
    if (hasError) {
      const errorMsg = responseData.ErrorDescription || 
                       responseData.errorDescription ||
                       responseData["tt-retorno"]?.[0]?.["ds-erro"] ||
                       "Erro desconhecido do Datasul";
      throw new Error(`Datasul retornou erro: ${errorMsg}`);
    }

    // Extrair array de transportadoras da resposta
    const transportadoras: TransportadoraOption[] = [];

    if (responseData["tt-frete"] && Array.isArray(responseData["tt-frete"])) {
      for (const frete of responseData["tt-frete"]) {
        transportadoras.push({
          cod_transp: frete["cod-transp"] || 0,
          nome_transp: frete["nome-transp"] || "Sem nome",
          vl_tot_frete: frete["vl-tot-frete"] || 0,
          prazo_entrega: frete["prazo-entrega"] || 0,
          vl_tde: frete["vl-tde"] || 0,
          bloqueio: frete["bloqueio"] || "",
          orig: frete["orig"] || false
        });
      }
    }

    if (transportadoras.length === 0) {
      throw new Error("Nenhuma transportadora retornada pelo Datasul. Verifique o endereço de entrega e tipo de frete.");
    }

    console.log(`[FRETE] ${transportadoras.length} transportadora(s) encontrada(s)`);

    // =============================================================
    // 9. SALVAR LOG DA INTEGRAÇÃO (sem atualizar a venda ainda)
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

    console.log(`[FRETE] Cálculo concluído com sucesso em ${tempoTotal.toFixed(0)}ms`);

    // Retornar TODAS as opções de transportadora para o frontend selecionar
    return new Response(
      JSON.stringify({
        success: true,
        transportadoras,
        quantidade_opcoes: transportadoras.length,
        mensagem: `${transportadoras.length} opção(ões) de frete encontrada(s)`,
        tempo_total_ms: Math.round(tempoTotal)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    const tempoTotal = performance.now() - startTime;
    console.error(`[FRETE] ERRO: ${error.message}`);

    // Tentar extrair venda_id para o log
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

    // Salvar log de erro
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

/**
 * Valida TODOS os itens da proposta - nenhum item pode ficar de fora
 */
function validateAllItems(itens: VendaItem[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  itens.forEach((item, index) => {
    const itemNum = index + 1;
    const produtoNome = item.produtos?.nome || `Produto ID: ${item.produto_id}`;
    
    // Validação 1: Produto deve existir
    if (!item.produtos) {
      errors.push(`Item ${itemNum}: Produto não encontrado no sistema (${produtoNome})`);
      return;
    }
    
    // Validação 2: referencia_interna obrigatória
    if (!item.produtos.referencia_interna) {
      errors.push(`Item ${itemNum}: "${produtoNome}" não possui referência interna cadastrada`);
    }
    
    // Validação 3: Quantidade deve ser > 0
    if (!item.quantidade || item.quantidade <= 0) {
      errors.push(`Item ${itemNum}: "${produtoNome}" possui quantidade inválida (${item.quantidade})`);
    }
    
    // Validação 4: Valor total deve ser >= 0
    if (item.valor_total === null || item.valor_total === undefined) {
      errors.push(`Item ${itemNum}: "${produtoNome}" não possui valor total calculado`);
    } else if (item.valor_total < 0) {
      errors.push(`Item ${itemNum}: "${produtoNome}" possui valor total negativo (${item.valor_total})`);
    }
    
    // Warning: Valor zero
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
