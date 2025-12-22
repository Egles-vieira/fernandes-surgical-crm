/**
 * ============================================
 * AGENTE VENDAS WHATSAPP V4 - NOVAS TOOLS
 * Tools para Pipeline Spot + Datasul + Link Proposta
 * ============================================
 */

// ============ DEFINIÇÕES DAS TOOLS ============

export const TOOLS_V4 = [
  {
    type: "function",
    function: {
      name: "identificar_cliente",
      description: `Identifica o cliente para faturamento. Use quando:
1) Cliente informar código Datasul ou CNPJ
2) Antes de criar proposta/oportunidade
3) Para validar dados de faturamento

RETORNA: cliente_id, nome, cnpj, cod_emitente, endereços cadastrados`,
      parameters: {
        type: "object",
        properties: {
          codigo_emitente: {
            type: "string",
            description: "Código do cliente no Datasul (ex: '123456')"
          },
          cnpj: {
            type: "string",
            description: "CNPJ do cliente (ex: '12.345.678/0001-90')"
          },
          usar_vinculo_whatsapp: {
            type: "boolean",
            description: "Buscar pelo vínculo do contato WhatsApp (default: true se nenhum outro param)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "criar_oportunidade_spot",
      description: `Cria uma oportunidade no Pipeline Spot com os produtos selecionados.
OBRIGATÓRIO antes de calcular preços no Datasul.

Use quando: cliente confirmou os produtos desejados + você já identificou o cliente

RETORNA: oportunidade_id, codigo da oportunidade`,
      parameters: {
        type: "object",
        properties: {
          cliente_id: {
            type: "string",
            description: "UUID do cliente (retornado por identificar_cliente)"
          },
          itens: {
            type: "array",
            description: "Lista de produtos com quantidade. IMPORTANTE: SEMPRE extrair a quantidade que o cliente informou na mensagem!",
            items: {
              type: "object",
              properties: {
                produto_id: { type: "string", description: "Código do produto ou UUID" },
                quantidade: { type: "number", description: "Quantidade solicitada pelo cliente - OBRIGATÓRIO extrair da mensagem" },
                preco_unitario: { type: "number", description: "Preço unitário sugerido" }
              },
              required: ["produto_id", "quantidade"]
            }
          },
          observacoes: {
            type: "string",
            description: "Observações adicionais para a oportunidade"
          }
        },
        required: ["cliente_id", "itens"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calcular_cesta_datasul",
      description: `OBRIGATÓRIO antes de apresentar valores finais ao cliente.
Calcula impostos, descontos e valores via API Datasul (ERP).

Use APENAS após ter criado a oportunidade com criar_oportunidade_spot.

RETORNA: valores calculados por item com impostos + resumo total`,
      parameters: {
        type: "object",
        properties: {
          oportunidade_id: {
            type: "string",
            description: "UUID da oportunidade criada"
          }
        },
        required: ["oportunidade_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "gerar_link_proposta",
      description: `Gera link público da proposta para enviar ao cliente.
O cliente pode aceitar ou recusar diretamente pelo link.

Use APÓS calcular no Datasul e apresentar valores ao cliente.

RETORNA: URL do link público da proposta`,
      parameters: {
        type: "object",
        properties: {
          oportunidade_id: {
            type: "string",
            description: "UUID da oportunidade"
          },
          validade_dias: {
            type: "number",
            description: "Dias de validade do link (default: 7)"
          }
        },
        required: ["oportunidade_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "adicionar_ao_carrinho_v4",
      description: `🛒 FERRAMENTA OBRIGATÓRIA quando cliente ESCOLHE um produto da lista!

QUANDO USAR (use IMEDIATAMENTE se cliente disser):
- "quero o número 2"
- "pode ser o 3"
- "esse mesmo"
- "o segundo"
- "vou querer esse"
- "manda o primeiro"

COMO USAR:
1. numero_sugestao = o número que o cliente falou (1, 2, 3...)
2. quantidade = a quantidade que o cliente informou ANTES na conversa
   → Se cliente disse "100 unidades de luva" e depois "quero o 2", use quantidade: 100
   → Se não informou quantidade, NÃO chame a tool - pergunte primeiro!

⚠️ NUNCA pergunte "pode me dar mais detalhes" se cliente escolheu número!
⚠️ O carrinho é SEPARADO das sugestões de busca

RETORNA: confirmação do item adicionado + total no carrinho`,
      parameters: {
        type: "object",
        properties: {
          numero_sugestao: {
            type: "number",
            description: "Número da sugestão que o cliente escolheu (1, 2, 3...) - USE ESTE quando cliente fala 'número X' ou 'o X'"
          },
          produto_id: {
            type: "string",
            description: "UUID do produto (alternativa ao numero_sugestao, use se tiver o ID direto)"
          },
          quantidade: {
            type: "number",
            description: "Quantidade que o cliente quer - SE NÃO SOUBER, não chame a tool, pergunte ao cliente primeiro!"
          }
        },
        required: ["quantidade"]
      }
    }
  }
];

// ============ CONSTANTES ============

const PIPELINE_SPOT_ID = "d7775301-2f80-4f65-9b1f-174253d69cea";
const ESTAGIO_PROPOSTA_ID = "42182c80-53b3-471b-a31f-cd4aa3fdc9ef"; // Proposta - ordem 3
const ESTAGIO_FECHAMENTO_ID = "30aafadc-ce09-4144-b772-c9f27d973455"; // Fechamento - ordem 6

// ============ EXECUTORES DAS TOOLS ============

/**
 * Identificar cliente por código Datasul, CNPJ ou vínculo WhatsApp
 */
export async function executarIdentificarCliente(
  args: { codigo_emitente?: string; cnpj?: string; usar_vinculo_whatsapp?: boolean },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🔍 [Tool] identificar_cliente", args);
  
  try {
    let cliente: any = null;
    
    // 1. Busca por código emitente (Datasul)
    if (args.codigo_emitente) {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_emit, nome_fantasia, cgc, cod_emitente")
        .eq("cod_emitente", Number(args.codigo_emitente))
        .limit(1)
        .single();
      cliente = data;
      console.log("📋 Busca por cod_emitente:", cliente ? "encontrado" : "não encontrado");
    }
    
    // 2. Busca por CNPJ
    if (!cliente && args.cnpj) {
      const cnpjLimpo = args.cnpj.replace(/\D/g, "");
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_emit, nome_fantasia, cgc, cod_emitente")
        .or(`cgc.eq.${cnpjLimpo},cgc.eq.${args.cnpj}`)
        .limit(1)
        .single();
      cliente = data;
      console.log("📋 Busca por CNPJ:", cliente ? "encontrado" : "não encontrado");
    }
    
    // 3. Busca por vínculo WhatsApp (default se nenhum param)
    if (!cliente && (args.usar_vinculo_whatsapp !== false)) {
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select(`
          whatsapp_contato_id,
          whatsapp_contatos (
            contato_id,
            contatos (
              cliente_id,
              clientes (id, nome_emit, nome_fantasia, cgc, cod_emitente)
            )
          )
        `)
        .eq("id", conversaId)
        .single();
      
      if (conversa?.whatsapp_contatos) {
        const whatsappContato = Array.isArray(conversa.whatsapp_contatos) 
          ? conversa.whatsapp_contatos[0] 
          : conversa.whatsapp_contatos;
        
        if (whatsappContato?.contatos) {
          const contato = Array.isArray(whatsappContato.contatos) 
            ? whatsappContato.contatos[0] 
            : whatsappContato.contatos;
          
          if (contato?.clientes) {
            cliente = Array.isArray(contato.clientes) 
              ? contato.clientes[0] 
              : contato.clientes;
            console.log("📋 Busca por vínculo WhatsApp:", "encontrado");
          }
        }
      }
    }
    
    if (!cliente) {
      return {
        sucesso: false,
        erro: "cliente_nao_encontrado",
        mensagem: "Não encontrei seu cadastro. Pode me informar o código do cliente ou CNPJ?"
      };
    }
    
    // Buscar endereços do cliente
    const { data: enderecos } = await supabase
      .from("enderecos_clientes")
      .select("id, tipo, endereco, numero, bairro, cidade, estado, cep")
      .eq("cliente_id", cliente.id);
    
    const enderecosFormatados = (enderecos || []).map((e: any, idx: number) => ({
      id: e.id,
      numero: idx + 1,
      tipo: e.tipo || "entrega",
      endereco_completo: `${e.endereco || ""}${e.numero ? ", " + e.numero : ""}, ${e.bairro || ""}, ${e.cidade || ""}/${e.estado || ""} - CEP: ${e.cep || ""}`
    }));
    
    console.log(`✅ Cliente identificado: ${cliente.nome_emit} (${cliente.cgc})`);
    console.log(`📍 ${enderecosFormatados.length} endereço(s) encontrado(s)`);
    
    // Atualizar sessão se existir
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ 
        cliente_identificado_id: cliente.id,
        estado_atual: "identificacao"
      })
      .eq("conversa_id", conversaId);
    
    return {
      sucesso: true,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_fantasia || cliente.nome_emit,
      cnpj: cliente.cgc,
      cod_emitente: cliente.cod_emitente,
      enderecos: enderecosFormatados
    };
    
  } catch (error) {
    console.error("❌ Erro em identificar_cliente:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao buscar cliente" };
  }
}

/**
 * Validar se é um UUID válido
 */
function isValidUUID(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Criar oportunidade no Pipeline Spot com itens
 * INCLUI FALLBACK: Se cliente_id não for UUID válido, busca da sessão
 */
export async function executarCriarOportunidadeSpot(
  args: { cliente_id: string; itens: any[]; observacoes?: string },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("📦 [Tool] criar_oportunidade_spot", { cliente_id: args.cliente_id, qtd_itens: args.itens?.length });
  
  try {
    let clienteId = args.cliente_id;
    
    // FALLBACK: Se cliente_id não for UUID válido, buscar da sessão
    if (!isValidUUID(clienteId)) {
      console.warn(`⚠️ [FALLBACK] cliente_id "${clienteId}" não é UUID válido. Buscando da sessão...`);
      
      const { data: sessaoAtual } = await supabase
        .from("whatsapp_agente_sessoes")
        .select("cliente_identificado_id")
        .eq("conversa_id", conversaId)
        .gte("expira_em", new Date().toISOString())
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();
      
      if (sessaoAtual?.cliente_identificado_id) {
        clienteId = sessaoAtual.cliente_identificado_id;
        console.log(`✅ [FALLBACK] Usando cliente_id da sessão: ${clienteId}`);
      } else {
        console.error("❌ [FALLBACK] Não encontrou cliente_id na sessão");
        return { 
          sucesso: false, 
          erro: "cliente_obrigatorio", 
          mensagem: "Preciso identificar o cliente primeiro. Use identificar_cliente antes." 
        };
      }
    }
    
    if (!args.itens || args.itens.length === 0) {
      return { sucesso: false, erro: "itens_obrigatorios", mensagem: "Preciso de pelo menos um produto" };
    }
    
    // ========================================
    // LOG: Mostrar exatamente o que o LLM passou
    // ========================================
    console.log("📋 [DEBUG] Itens recebidos do LLM:", JSON.stringify(args.itens, null, 2));
    
    // ========================================
    // VALIDAÇÃO: Garantir que todas as quantidades são válidas
    // ========================================
    const itensComQuantidadeInvalida = args.itens.filter((i: any) => !i.quantidade || i.quantidade < 1);
    if (itensComQuantidadeInvalida.length > 0) {
      console.warn("⚠️ [VALIDAÇÃO] Itens sem quantidade válida:", JSON.stringify(itensComQuantidadeInvalida));
      // Forçar quantidade 1 como mínimo para não falhar
      args.itens = args.itens.map((i: any) => ({
        ...i,
        quantidade: i.quantidade && i.quantidade >= 1 ? i.quantidade : 1
      }));
    }
    
    // ========================================
    // RESOLUÇÃO: Converter códigos de produto para UUIDs
    // NÃO usa mais o carrinho antigo - resolve pelo código/referência
    // ========================================
    let itensParaProcessar = args.itens;
    const primeiroProdutoId = args.itens?.[0]?.produto_id;
    
    if (primeiroProdutoId && !isValidUUID(primeiroProdutoId)) {
      console.log(`🔍 [RESOLUÇÃO] produto_id "${primeiroProdutoId}" não é UUID. Buscando por código/referência...`);
      
      // Extrair todos os códigos de produto passados pelo LLM
      const codigosProdutos = args.itens.map((i: any) => String(i.produto_id));
      console.log(`🔍 [RESOLUÇÃO] Códigos a resolver: ${codigosProdutos.join(", ")}`);
      
      // Buscar produtos pelo código/referência
      const { data: produtosEncontrados } = await supabase
        .from("produtos")
        .select("id, referencia_interna, nome")
        .in("referencia_interna", codigosProdutos);
      
      if (produtosEncontrados && produtosEncontrados.length > 0) {
        console.log(`✅ [RESOLUÇÃO] Encontrados ${produtosEncontrados.length} produtos por referência`);
        
        // Mapear códigos para UUIDs MANTENDO AS QUANTIDADES DO LLM
        itensParaProcessar = args.itens.map((item: any) => {
          const produtoEncontrado = produtosEncontrados.find(
            (p: any) => String(p.referencia_interna) === String(item.produto_id)
          );
          
          if (produtoEncontrado) {
            console.log(`  ✓ ${item.produto_id} → ${produtoEncontrado.id} (${produtoEncontrado.nome}) | QTD: ${item.quantidade}`);
            return {
              produto_id: produtoEncontrado.id,
              quantidade: item.quantidade, // MANTER A QUANTIDADE PASSADA PELO LLM
              preco_unitario: item.preco_unitario || null
            };
          } else {
            console.warn(`  ✗ ${item.produto_id} não encontrado`);
            return null;
          }
        }).filter(Boolean);
        
        if (itensParaProcessar.length === 0) {
          console.error("❌ [RESOLUÇÃO] Nenhum produto foi resolvido");
          return { 
            sucesso: false, 
            erro: "produtos_nao_encontrados", 
            mensagem: "Não encontrei os produtos informados. Pode confirmar os códigos?" 
          };
        }
      } else {
        console.error("❌ [RESOLUÇÃO] Nenhum produto encontrado por referência");
        return { 
          sucesso: false, 
          erro: "produtos_nao_encontrados", 
          mensagem: "Não encontrei os produtos informados. Pode confirmar os códigos?" 
        };
      }
    }
    
    console.log("📋 [DEBUG] Itens processados para gravar:", JSON.stringify(itensParaProcessar, null, 2));
    
    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome_emit, nome_fantasia, vendedor_id, cod_emitente")
      .eq("id", clienteId)
      .single();
    
    if (!cliente) {
      console.error(`❌ Cliente não encontrado para ID: ${clienteId}`);
      return { sucesso: false, erro: "cliente_nao_encontrado", mensagem: "Cliente não encontrado. Vou identificar novamente." };
    }
    
    // Buscar produtos para calcular valor estimado (usando itensParaProcessar que já tem UUIDs)
    const produtoIds = itensParaProcessar.map((i: any) => i.produto_id);
    const { data: produtos } = await supabase
      .from("produtos")
      .select("id, nome, preco_venda, referencia_interna")
      .in("id", produtoIds);
    
    // Calcular valor estimado
    let valorEstimado = 0;
    const itensComPreco = itensParaProcessar.map((item: any) => {
      const produto = produtos?.find((p: any) => p.id === item.produto_id);
      const preco = item.preco_unitario || produto?.preco_venda || 0;
      valorEstimado += preco * item.quantidade;
      return {
        ...item,
        preco_unitario: preco,
        produto_nome: produto?.nome,
        produto_referencia: produto?.referencia_interna
      };
    });
    
    // IDs padrão para cálculo Datasul
    const TIPO_PEDIDO_NORMAL_ID = "2ad4bdc8-580e-4a8d-b5de-39499f665bab";
    const CONDICAO_PAGAMENTO_10_DIAS_ID = "fe1b192f-8176-44cf-b932-4f9293114419";
    
    // Criar oportunidade no Pipeline Spot
    const { data: oportunidade, error: opError } = await supabase
      .from("oportunidades")
      .insert({
        nome_oportunidade: `Spot WhatsApp - ${cliente.nome_fantasia || cliente.nome_emit}`,
        pipeline_id: PIPELINE_SPOT_ID,
        estagio_id: ESTAGIO_PROPOSTA_ID,
        cliente_id: clienteId,
        vendedor_id: cliente.vendedor_id,
        valor: valorEstimado,
        percentual_probabilidade: 50,
        origem_lead: "whatsapp_agente",
        descricao: args.observacoes || null,
        data_entrada_estagio: new Date().toISOString(),
        campos_customizados: {
          tipo_pedido_id: TIPO_PEDIDO_NORMAL_ID,
          condicao_pagamento_id: CONDICAO_PAGAMENTO_10_DIAS_ID
        }
      })
      .select("id, codigo")
      .single();
    
    if (opError) {
      console.error("❌ Erro ao criar oportunidade:", opError);
      return { sucesso: false, erro: "erro_criar_oportunidade", mensagem: "Erro ao criar oportunidade" };
    }
    
    console.log(`✅ Oportunidade criada: ${oportunidade.codigo}`);
    
    // Inserir itens na oportunidade
    const itensParaInserir = itensComPreco.map((item, idx) => ({
      oportunidade_id: oportunidade.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      ordem_linha: idx + 1
    }));
    
    const { error: itensError } = await supabase
      .from("itens_linha_oportunidade")
      .insert(itensParaInserir);
    
    if (itensError) {
      console.error("❌ Erro ao inserir itens:", itensError);
      // Não falhar, oportunidade já foi criada
    } else {
      console.log(`✅ ${itensParaInserir.length} itens inseridos`);
    }
    
    // Atualizar conversa e sessão
    await supabase
      .from("whatsapp_conversas")
      .update({ oportunidade_spot_id: oportunidade.id })
      .eq("id", conversaId);
    
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ 
        oportunidade_spot_id: oportunidade.id,
        estado_atual: "criacao",
        carrinho_itens: itensComPreco
      })
      .eq("conversa_id", conversaId);
    
    // Log
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "oportunidade_criada",
      tool_name: "criar_oportunidade_spot",
      tool_resultado: { oportunidade_id: oportunidade.id, codigo: oportunidade.codigo }
    });
    
    // ========================================
    // FIRE-AND-FORGET: Enfileirar job de cálculo
    // Isso garante que o cálculo continue mesmo sem nova mensagem do cliente
    // ========================================
    try {
      const { data: job, error: jobError } = await supabase
        .from("whatsapp_jobs_queue")
        .insert({
          conversa_id: conversaId,
          tipo: "calcular_datasul_e_responder",
          payload: {
            oportunidade_id: oportunidade.id,
            oportunidade_codigo: oportunidade.codigo,
            cliente_id: clienteId,
            valor_estimado: valorEstimado,
            total_itens: itensComPreco.length
          },
          status: "pending"
        })
        .select("id")
        .single();
      
      if (jobError) {
        console.error("⚠️ Erro ao enfileirar job (não-crítico):", jobError);
      } else {
        console.log(`📋 Job enfileirado: ${job.id} (calcular_datasul_e_responder)`);
        
        // Log do enfileiramento
        await supabase.from("whatsapp_agente_logs").insert({
          conversa_id: conversaId,
          tipo_evento: "job_enfileirado",
          tool_name: "criar_oportunidade_spot",
          tool_resultado: { job_id: job.id, tipo: "calcular_datasul_e_responder" }
        });
        
        // Disparar processador de jobs em background (Fire-and-Forget)
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        fetch(`${supabaseUrl}/functions/v1/processar-whatsapp-jobs`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ job_id: job.id })
        }).catch(err => {
          console.error("⚠️ Erro ao disparar processador (não-crítico):", err);
        });
      }
    } catch (jobEnqueueError) {
      console.error("⚠️ Erro ao enfileirar job:", jobEnqueueError);
      // Não falhar a criação da oportunidade por causa disso
    }
    
    return {
      sucesso: true,
      oportunidade_id: oportunidade.id,
      codigo: oportunidade.codigo,
      valor_estimado: valorEstimado,
      total_itens: itensComPreco.length,
      job_enfileirado: true, // Indica que o cálculo será feito automaticamente
      itens: itensComPreco.map(i => ({
        produto: i.produto_nome,
        ref: i.produto_referencia,
        qtd: i.quantidade,
        preco: i.preco_unitario
      }))
    };
    
  } catch (error) {
    console.error("❌ Erro em criar_oportunidade_spot:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao criar oportunidade" };
  }
}

/**
 * Calcular cesta no Datasul (ERP)
 */
export async function executarCalcularCestaDatasul(
  args: { oportunidade_id: string },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🧮 [Tool] calcular_cesta_datasul", args);
  
  try {
    if (!args.oportunidade_id) {
      return { sucesso: false, erro: "oportunidade_obrigatoria", mensagem: "Preciso da oportunidade primeiro" };
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Chamar Edge Function calcular-oportunidade-datasul
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/functions/v1/calcular-oportunidade-datasul`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ oportunidade_id: args.oportunidade_id }),
      signal: AbortSignal.timeout(120000) // 2 min timeout
    });
    
    const tempoMs = Date.now() - startTime;
    
    const resultado = await response.json();
    
    // Log
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "calculo_datasul",
      tool_name: "calcular_cesta_datasul",
      tool_args: args,
      tool_resultado: resultado,
      tempo_execucao_ms: tempoMs
    });
    
    if (!response.ok || !resultado.success) {
      console.error("❌ Erro no cálculo Datasul:", resultado.error);
      
      // Verificar se é erro de negócio
      if (resultado.error_category === "negocio") {
        return {
          sucesso: false,
          erro: "erro_negocio_datasul",
          mensagem: resultado.error || "Erro no cálculo do ERP",
          detalhes: resultado.error_details
        };
      }
      
      return {
        sucesso: false,
        erro: "erro_calculo_datasul",
        mensagem: resultado.error || "Não consegui calcular no ERP. Tente novamente."
      };
    }
    
    console.log(`✅ Cálculo Datasul concluído em ${tempoMs}ms`);
    
    // Atualizar sessão
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ estado_atual: "calculo" })
      .eq("conversa_id", conversaId);
    
    // Buscar itens atualizados
    const { data: itens } = await supabase
      .from("itens_linha_oportunidade")
      .select(`
        id, quantidade, preco_unitario, ordem_linha,
        datasul_vl_tot_item, datasul_vl_merc_liq,
        produtos:produto_id (nome, referencia_interna)
      `)
      .eq("oportunidade_id", args.oportunidade_id)
      .order("ordem_linha");
    
    const itensFormatados = (itens || []).map((i: any) => ({
      produto: i.produtos?.nome,
      ref: i.produtos?.referencia_interna,
      qtd: i.quantidade,
      preco_unit: i.preco_unitario,
      valor_total: i.datasul_vl_tot_item || (i.preco_unitario * i.quantidade),
      valor_liquido: i.datasul_vl_merc_liq
    }));
    
    const valorTotal = itensFormatados.reduce((sum: number, i: any) => sum + (i.valor_total || 0), 0);
    
    return {
      sucesso: true,
      oportunidade_id: args.oportunidade_id,
      tempo_calculo_ms: tempoMs,
      resumo: {
        total_itens: itensFormatados.length,
        valor_total: valorTotal
      },
      itens: itensFormatados
    };
    
  } catch (error) {
    console.error("❌ Erro em calcular_cesta_datasul:", error);
    
    // Timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        sucesso: false,
        erro: "timeout_datasul",
        mensagem: "O cálculo demorou muito. Vou tentar novamente em instantes."
      };
    }
    
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao calcular no ERP" };
  }
}

/**
 * Gerar link público da proposta
 */
export async function executarGerarLinkProposta(
  args: { oportunidade_id: string; validade_dias?: number },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🔗 [Tool] gerar_link_proposta", args);
  
  try {
    if (!args.oportunidade_id) {
      return { sucesso: false, erro: "oportunidade_obrigatoria", mensagem: "Preciso da oportunidade primeiro" };
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Calcular data de expiração
    const diasValidade = args.validade_dias || 7;
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + diasValidade);
    
    // Chamar Edge Function gerar-link-proposta-oportunidade
    const response = await fetch(`${supabaseUrl}/functions/v1/gerar-link-proposta-oportunidade`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        oportunidadeId: args.oportunidade_id,
        config: {
          expira_em: expiraEm.toISOString(),
          mostrar_precos: true,
          mostrar_descontos: true,
          permitir_aceitar: true,
          permitir_recusar: true,
          permitir_download_pdf: true
        }
      })
    });
    
    const resultado = await response.json();
    
    if (!response.ok || !resultado.success) {
      console.error("❌ Erro ao gerar link:", resultado.error);
      return {
        sucesso: false,
        erro: "erro_gerar_link",
        mensagem: resultado.error || "Não consegui gerar o link da proposta"
      };
    }
    
    // Montar URL completa
    // A origem depende do ambiente - usar variável ou inferir
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://rzzzfprgnoywmmjwepzm.lovableproject.com";
    const linkProposta = `${appOrigin}/proposal-oportunidade/${resultado.token}`;
    
    console.log(`✅ Link gerado: ${linkProposta}`);
    
    // Atualizar sessão
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ estado_atual: "fechamento" })
      .eq("conversa_id", conversaId);
    
    // Log
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "link_proposta_gerado",
      tool_name: "gerar_link_proposta",
      tool_resultado: { token: resultado.token, link: linkProposta }
    });
    
    return {
      sucesso: true,
      link: linkProposta,
      token: resultado.token,
      validade_dias: diasValidade,
      expira_em: expiraEm.toISOString(),
      instrucoes: "Envie este link ao cliente. Ele poderá aceitar ou recusar a proposta diretamente."
    };
    
  } catch (error) {
    console.error("❌ Erro em gerar_link_proposta:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao gerar link" };
  }
}

/**
 * Adicionar item ao carrinho V4
 * Suporta seleção por número da sugestão OU produto_id direto
 */
export async function executarAdicionarAoCarrinhoV4(
  args: { produto_id?: string; numero_sugestao?: number; quantidade: number },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🛒🛒🛒 [Tool] adicionar_ao_carrinho_v4 CHAMADO!", {
    numero_sugestao: args.numero_sugestao,
    produto_id: args.produto_id,
    quantidade: args.quantidade,
    conversaId
  });
  
  try {
    let produtoId = args.produto_id;
    let produtoNome = "";
    let produtoReferencia = "";
    
    // Se passou numero_sugestao, buscar da sessão
    if (args.numero_sugestao && !produtoId) {
      const { data: sessao } = await supabase
        .from("whatsapp_agente_sessoes")
        .select("carrinho_itens")
        .eq("conversa_id", conversaId)
        .gte("expira_em", new Date().toISOString())
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();
      
      const sugestoes = (sessao?.carrinho_itens || []).filter((i: any) => i.tipo === "sugestao");
      const sugestaoEscolhida = sugestoes.find((s: any) => s.numero === args.numero_sugestao);
      
      if (!sugestaoEscolhida) {
        console.warn(`⚠️ Sugestão número ${args.numero_sugestao} não encontrada`);
        return { 
          sucesso: false, 
          erro: "sugestao_nao_encontrada", 
          mensagem: `Não encontrei a opção número ${args.numero_sugestao}. Pode repetir qual produto deseja?` 
        };
      }
      
      produtoId = sugestaoEscolhida.id;
      produtoNome = sugestaoEscolhida.nome;
      produtoReferencia = sugestaoEscolhida.referencia;
      console.log(`✅ Sugestão ${args.numero_sugestao} resolvida: ${produtoNome}`);
    }
    
    // Validar produto_id
    if (!produtoId) {
      return { 
        sucesso: false, 
        erro: "produto_obrigatorio", 
        mensagem: "Qual produto você gostaria de adicionar?" 
      };
    }
    
    // Validar quantidade
    if (!args.quantidade || args.quantidade < 1) {
      return { 
        sucesso: false, 
        erro: "quantidade_obrigatoria", 
        mensagem: "Qual a quantidade que você precisa?" 
      };
    }
    
    // Se não temos o nome ainda, buscar do banco
    if (!produtoNome) {
      const { data: produto } = await supabase
        .from("produtos")
        .select("id, nome, referencia_interna, preco_venda")
        .eq("id", produtoId)
        .single();
      
      if (!produto) {
        return { sucesso: false, erro: "produto_nao_encontrado", mensagem: "Produto não encontrado" };
      }
      
      produtoNome = produto.nome;
      produtoReferencia = produto.referencia_interna;
    }
    
    // Buscar carrinho atual da conversa
    const { data: conversa } = await supabase
      .from("whatsapp_conversas")
      .select("produtos_carrinho")
      .eq("id", conversaId)
      .single();
    
    const carrinhoAtual: Array<{ id: string; quantidade: number; nome?: string }> = 
      conversa?.produtos_carrinho || [];
    
    // Verificar se produto já está no carrinho
    const itemExistente = carrinhoAtual.find((item: any) => item.id === produtoId);
    
    if (itemExistente) {
      itemExistente.quantidade = args.quantidade;
      console.log(`📝 Quantidade atualizada: ${produtoNome} → ${args.quantidade}`);
    } else {
      carrinhoAtual.push({ 
        id: produtoId, 
        quantidade: args.quantidade,
        nome: produtoNome
      });
      console.log(`➕ Novo item adicionado: ${produtoNome} (${args.quantidade})`);
    }
    
    // Salvar carrinho na conversa
    await supabase
      .from("whatsapp_conversas")
      .update({ produtos_carrinho: carrinhoAtual })
      .eq("id", conversaId);
    
    console.log(`🛒 Carrinho atualizado: ${carrinhoAtual.length} item(ns)`);
    
    return { 
      sucesso: true, 
      produto_id: produtoId,
      produto_nome: produtoNome,
      produto_referencia: produtoReferencia,
      quantidade: args.quantidade,
      carrinho_total_itens: carrinhoAtual.length,
      mensagem: `${args.quantidade}x ${produtoNome} adicionado ao carrinho`
    };
    
  } catch (error) {
    console.error("❌ Erro em adicionar_ao_carrinho_v4:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao adicionar ao carrinho" };
  }
}

/**
 * Dispatcher para executar tool V4 pelo nome
 */
export async function executarToolV4(
  nomeTool: string,
  args: any,
  supabase: any,
  conversaId: string
): Promise<any> {
  switch (nomeTool) {
    case "identificar_cliente":
      return executarIdentificarCliente(args, supabase, conversaId);
    
    case "criar_oportunidade_spot":
      return executarCriarOportunidadeSpot(args, supabase, conversaId);
    
    case "calcular_cesta_datasul":
      return executarCalcularCestaDatasul(args, supabase, conversaId);
    
    case "gerar_link_proposta":
      return executarGerarLinkProposta(args, supabase, conversaId);
    
    case "adicionar_ao_carrinho_v4":
      return executarAdicionarAoCarrinhoV4(args, supabase, conversaId);
    
    default:
      return null; // Tool não é V4, deixar para o executor original
  }
}

/**
 * Verificar se é uma tool V4
 */
export function isToolV4(nomeTool: string): boolean {
  return ["identificar_cliente", "criar_oportunidade_spot", "calcular_cesta_datasul", "gerar_link_proposta", "adicionar_ao_carrinho_v4"].includes(nomeTool);
}
