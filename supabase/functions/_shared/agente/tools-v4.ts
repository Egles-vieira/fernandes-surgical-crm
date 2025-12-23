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
      description: `🎯 Cria uma oportunidade no Pipeline Spot usando os ITENS DO CARRINHO.

⚠️ IMPORTANTE: NÃO passe os itens manualmente! Eles são lidos AUTOMATICAMENTE do carrinho.

QUANDO VOCÊ DEVE CHAMAR ESTA FERRAMENTA (OBRIGATÓRIO):
- Cliente confirmou o CNPJ para faturamento (ex: "sim, esse mesmo", "isso", "pode ser")
- Cliente disse "pode fechar", "fecha o pedido", "confirmo"
- Você já identificou o cliente E o carrinho tem itens

⛔ NUNCA DIGA "criei a oportunidade" SEM CHAMAR ESTA FERRAMENTA!
Se você disser que criou sem chamar, o sistema detecta e dá erro.

Use quando:
- Cliente confirmou que quer fechar o pedido
- Você já identificou o cliente (identificar_cliente)
- O carrinho tem pelo menos 1 item (adicionar_ao_carrinho_v4)

RETORNA: oportunidade_id, codigo, itens confirmados`,
      parameters: {
        type: "object",
        properties: {
          cliente_id: {
            type: "string",
            description: "UUID do cliente (retornado por identificar_cliente)"
          },
          observacoes: {
            type: "string",
            description: "Observações adicionais para a oportunidade"
          }
        },
        required: ["cliente_id"]
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
  },
  // === NOVAS TOOLS DE EDIÇÃO ===
  {
    type: "function",
    function: {
      name: "alterar_quantidade_item",
      description: `Altera a quantidade de um item no carrinho ou oportunidade.

Use quando cliente disser:
- "muda pra 200 unidades"
- "na verdade quero 50"
- "aumenta pra 100"
- "diminui pra 30"
- "altera a quantidade do primeiro"

RETORNA: confirmação da alteração + novo total`,
      parameters: {
        type: "object",
        properties: {
          produto_id: {
            type: "string",
            description: "UUID do produto (se souber)"
          },
          numero_item: {
            type: "number",
            description: "Número do item no carrinho (1, 2, 3...)"
          },
          nova_quantidade: {
            type: "number",
            description: "Nova quantidade desejada"
          }
        },
        required: ["nova_quantidade"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remover_item",
      description: `Remove um item do carrinho ou oportunidade.

Use quando cliente disser:
- "tira o primeiro"
- "remove as luvas"
- "não quero mais esse"
- "cancela o item 2"
- "tira fora"

RETORNA: confirmação da remoção + itens restantes`,
      parameters: {
        type: "object",
        properties: {
          produto_id: {
            type: "string",
            description: "UUID do produto (se souber)"
          },
          numero_item: {
            type: "number",
            description: "Número do item no carrinho (1, 2, 3...)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "recalcular_proposta",
      description: `Recalcula valores da proposta após alterações.

Use APÓS alterar_quantidade_item ou remover_item.
Chama o Datasul novamente para atualizar impostos e valores.

RETORNA: novos valores calculados`,
      parameters: {
        type: "object",
        properties: {
          oportunidade_id: {
            type: "string",
            description: "UUID da oportunidade"
          }
        },
        required: ["oportunidade_id"]
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
 * FONTE PRINCIPAL: whatsapp_conversas.produtos_carrinho (carrinho real)
 * FALLBACK: args.itens passados pelo LLM (se carrinho vazio)
 */
export async function executarCriarOportunidadeSpot(
  args: { cliente_id: string; itens?: any[]; observacoes?: string },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("📦 [Tool] criar_oportunidade_spot", { cliente_id: args.cliente_id, itens_llm: args.itens?.length || 0 });
  
  try {
    // ========================================
    // 🛡️ GUARDRAIL: Verificar se já existe oportunidade para esta conversa
    // Previne recriação quando o LLM "insiste" em chamar a tool novamente
    // ========================================
    const { data: conversaAtual } = await supabase
      .from("whatsapp_conversas")
      .select("oportunidade_spot_id")
      .eq("id", conversaId)
      .single();
    
    if (conversaAtual?.oportunidade_spot_id) {
      // Já existe! Buscar código para retornar mensagem informativa
      const { data: opExistente } = await supabase
        .from("oportunidades")
        .select("codigo, valor")
        .eq("id", conversaAtual.oportunidade_spot_id)
        .single();
      
      console.log(`⚠️ [GUARDRAIL] Oportunidade já existe: ${opExistente?.codigo}`);
      
      return {
        sucesso: false,
        erro: "oportunidade_ja_criada",
        codigo: opExistente?.codigo,
        oportunidade_id: conversaAtual.oportunidade_spot_id,
        mensagem: `Oportunidade ${opExistente?.codigo || ""} já foi criada para esta conversa. Use calcular_cesta_datasul ou gerar_link_proposta.`
      };
    }
    
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
    
    // ========================================
    // 🛒 FONTE PRINCIPAL: Buscar carrinho REAL da conversa
    // ========================================
    const { data: conversa } = await supabase
      .from("whatsapp_conversas")
      .select("produtos_carrinho")
      .eq("id", conversaId)
      .single();
    
    const carrinhoReal = conversa?.produtos_carrinho || [];
    
    console.log("📋 [COMPARAÇÃO] Itens do LLM:", JSON.stringify(args.itens || [], null, 2));
    console.log("🛒 [COMPARAÇÃO] Itens do CARRINHO REAL:", JSON.stringify(carrinhoReal, null, 2));
    
    // ========================================
    // DECISÃO: Usar carrinho real como fonte de verdade
    // ========================================
    let itensParaProcessar: any[] = [];
    
    if (carrinhoReal.length > 0) {
      console.log("✅ [DECISÃO] Usando CARRINHO REAL como fonte de verdade");
      
      // Mapear itens do carrinho para o formato esperado
      itensParaProcessar = carrinhoReal.map((item: any) => ({
        produto_id: item.id, // O carrinho armazena 'id' como produto_id
        quantidade: item.quantidade || 1,
        preco_unitario: item.preco_unitario || null,
        produto_nome: item.nome,
        produto_referencia: item.referencia
      }));
      
    } else if (args.itens && args.itens.length > 0) {
      console.warn("⚠️ [FALLBACK] Carrinho vazio, usando itens do LLM");
      
      // FALLBACK: Usar itens do LLM (comportamento antigo)
      const primeiroProdutoId = args.itens?.[0]?.produto_id;
      
      if (primeiroProdutoId && !isValidUUID(primeiroProdutoId)) {
        console.log(`🔍 [RESOLUÇÃO] produto_id "${primeiroProdutoId}" não é UUID. Buscando por código/referência...`);
        
        const codigosProdutos = args.itens.map((i: any) => String(i.produto_id));
        
        const { data: produtosEncontrados } = await supabase
          .from("produtos")
          .select("id, referencia_interna, nome")
          .in("referencia_interna", codigosProdutos);
        
        if (produtosEncontrados && produtosEncontrados.length > 0) {
          itensParaProcessar = args.itens.map((item: any) => {
            const produtoEncontrado = produtosEncontrados.find(
              (p: any) => String(p.referencia_interna) === String(item.produto_id)
            );
            
            if (produtoEncontrado) {
              return {
                produto_id: produtoEncontrado.id,
                quantidade: item.quantidade || 1,
                preco_unitario: item.preco_unitario || null,
                produto_nome: produtoEncontrado.nome,
                produto_referencia: produtoEncontrado.referencia_interna
              };
            }
            return null;
          }).filter(Boolean);
        }
      } else {
        // Itens já são UUIDs
        itensParaProcessar = args.itens.map((item: any) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade || 1,
          preco_unitario: item.preco_unitario || null
        }));
      }
    }
    
    // Validar que temos itens
    if (itensParaProcessar.length === 0) {
      console.error("❌ Nenhum item encontrado (carrinho vazio e LLM não passou itens válidos)");
      return { 
        sucesso: false, 
        erro: "carrinho_vazio", 
        mensagem: "O carrinho está vazio. Adicione produtos antes de criar a oportunidade." 
      };
    }
    
    // ========================================
    // 📸 LOG: Snapshot do carrinho antes de criar oportunidade
    // ========================================
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "snapshot_carrinho_pre_oportunidade",
      tool_name: "criar_oportunidade_spot",
      tool_args: { 
        cliente_id: clienteId,
        total_itens: itensParaProcessar.length 
      },
      tool_resultado: { 
        carrinho_real: carrinhoReal,
        itens_llm: args.itens || [],
        itens_finais: itensParaProcessar
      }
    });
    
    console.log("📋 [DEBUG] Itens finais para gravar:", JSON.stringify(itensParaProcessar, null, 2));
    
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
    
    // Atualizar conversa e LIMPAR CARRINHO (oportunidade criada com sucesso)
    await supabase
      .from("whatsapp_conversas")
      .update({ 
        oportunidade_spot_id: oportunidade.id,
        produtos_carrinho: [] // Limpar carrinho após criar oportunidade
      })
      .eq("id", conversaId);
    
    console.log("🧹 Carrinho limpo após criar oportunidade");
    
    // Atualizar sessão com estado "calculo" (pós-criação, não "criacao")
    // Isso evita que o LLM tente recriar a oportunidade
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ 
        oportunidade_spot_id: oportunidade.id,
        estado_atual: "calculo", // ← Mudança: "calculo" ao invés de "criacao"
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
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://convertiai.online";
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
    
    // Se passou numero_sugestao, buscar da coluna sugestoes_busca (CORRIGIDO!)
    if (args.numero_sugestao && !produtoId) {
      const { data: sessao } = await supabase
        .from("whatsapp_agente_sessoes")
        .select("sugestoes_busca") // ← CORRIGIDO: busca de sugestoes_busca, não carrinho_itens
        .eq("conversa_id", conversaId)
        .gte("expira_em", new Date().toISOString())
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();
      
      const sugestoes = sessao?.sugestoes_busca || [];
      const sugestaoEscolhida = sugestoes.find((s: any) => s.numero === args.numero_sugestao);
      
      if (!sugestaoEscolhida) {
        console.warn(`⚠️ Sugestão número ${args.numero_sugestao} não encontrada em sugestoes_busca`);
        return { 
          sucesso: false, 
          erro: "sugestao_nao_encontrada", 
          mensagem: `não encontrei a opção ${args.numero_sugestao}. pode repetir qual produto quer?` 
        };
      }
      
      produtoId = sugestaoEscolhida.id;
      produtoNome = sugestaoEscolhida.nome;
      produtoReferencia = sugestaoEscolhida.referencia;
      console.log(`✅ Sugestão ${args.numero_sugestao} resolvida de sugestoes_busca: ${produtoNome}`);
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
    
    // ✅ ATÔMICO: Usar RPC para evitar race condition quando múltiplas tool calls rodam em paralelo
    const { data: resultado, error: rpcError } = await supabase.rpc("adicionar_item_carrinho", {
      p_conversa_id: conversaId,
      p_produto_id: produtoId,
      p_quantidade: args.quantidade,
      p_produto_nome: produtoNome,
      p_produto_referencia: produtoReferencia,
      p_preco_unitario: null
    });
    
    if (rpcError) {
      console.error("❌ Erro ao adicionar ao carrinho (RPC):", rpcError);
      return { sucesso: false, erro: "erro_banco", mensagem: "Erro ao adicionar ao carrinho" };
    }
    
    console.log(`🛒 Carrinho atualizado atomicamente: ${resultado?.carrinho_total_itens || 0} item(ns)`);
    
    // ========================================
    // 📸 LOG: Snapshot do carrinho após adicionar item
    // ========================================
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "snapshot_carrinho_pos_adicao",
      tool_name: "adicionar_ao_carrinho_v4",
      tool_args: { 
        numero_sugestao: args.numero_sugestao,
        produto_id: produtoId,
        quantidade: args.quantidade 
      },
      tool_resultado: { 
        carrinho_total_itens: resultado?.carrinho_total_itens || 1,
        produto_nome: produtoNome
      }
    });
    
    return { 
      sucesso: true, 
      produto_id: produtoId,
      produto_nome: produtoNome,
      produto_referencia: produtoReferencia,
      quantidade: args.quantidade,
      carrinho_total_itens: resultado?.carrinho_total_itens || 1,
      mensagem: `${args.quantidade}x ${produtoNome} adicionado ao carrinho`
    };
    
  } catch (error) {
    console.error("❌ Erro em adicionar_ao_carrinho_v4:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao adicionar ao carrinho" };
  }
}

/**
 * Alterar quantidade de item no carrinho ou oportunidade
 */
export async function executarAlterarQuantidadeItem(
  args: { produto_id?: string; numero_item?: number; nova_quantidade: number },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🔄 [Tool] alterar_quantidade_item", args);
  
  try {
    // Buscar sessão para verificar se tem oportunidade
    const { data: sessao } = await supabase
      .from("whatsapp_agente_sessoes")
      .select("oportunidade_spot_id, carrinho_itens")
      .eq("conversa_id", conversaId)
      .gte("expira_em", new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(1)
      .single();
    
    // Se tem oportunidade criada, alterar na oportunidade
    if (sessao?.oportunidade_spot_id) {
      let query = supabase
        .from("itens_linha_oportunidade")
        .update({ quantidade: args.nova_quantidade })
        .eq("oportunidade_id", sessao.oportunidade_spot_id);
      
      if (args.produto_id) {
        query = query.eq("produto_id", args.produto_id);
      } else if (args.numero_item) {
        query = query.eq("ordem_linha", args.numero_item);
      } else {
        return { sucesso: false, erro: "parametro_obrigatorio", mensagem: "Qual item você quer alterar?" };
      }
      
      const { error } = await query;
      
      if (error) {
        console.error("❌ Erro ao alterar item na oportunidade:", error);
        return { sucesso: false, erro: "erro_banco", mensagem: "Não consegui alterar o item" };
      }
      
      console.log(`✅ Item alterado na oportunidade para ${args.nova_quantidade} unidades`);
      
      return {
        sucesso: true,
        nova_quantidade: args.nova_quantidade,
        precisa_recalcular: true,
        oportunidade_id: sessao.oportunidade_spot_id,
        mensagem: `quantidade alterada pra ${args.nova_quantidade}. quer que eu recalcule os valores?`
      };
    }
    
    // Se não tem oportunidade, usar RPC do carrinho
    const { data: resultado, error: rpcError } = await supabase.rpc("alterar_quantidade_item_carrinho", {
      p_conversa_id: conversaId,
      p_produto_id: args.produto_id || null,
      p_numero_item: args.numero_item || null,
      p_nova_quantidade: args.nova_quantidade
    });
    
    if (rpcError) {
      console.error("❌ Erro ao alterar quantidade (RPC):", rpcError);
      return { sucesso: false, erro: "erro_banco", mensagem: "Não consegui alterar a quantidade" };
    }
    
    if (!resultado?.sucesso) {
      return resultado;
    }
    
    console.log(`✅ Quantidade alterada no carrinho: ${args.nova_quantidade}`);
    
    return {
      sucesso: true,
      nova_quantidade: args.nova_quantidade,
      carrinho_total_itens: resultado.carrinho_total_itens,
      item_alterado: resultado.item_alterado,
      mensagem: `beleza, alterei pra ${args.nova_quantidade} unidades`
    };
    
  } catch (error) {
    console.error("❌ Erro em alterar_quantidade_item:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao alterar quantidade" };
  }
}

/**
 * Remover item do carrinho ou oportunidade
 */
export async function executarRemoverItem(
  args: { produto_id?: string; numero_item?: number },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🗑️ [Tool] remover_item", args);
  
  try {
    // Buscar sessão para verificar se tem oportunidade
    const { data: sessao } = await supabase
      .from("whatsapp_agente_sessoes")
      .select("oportunidade_spot_id")
      .eq("conversa_id", conversaId)
      .gte("expira_em", new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(1)
      .single();
    
    // Se tem oportunidade criada, remover da oportunidade
    if (sessao?.oportunidade_spot_id) {
      let query = supabase
        .from("itens_linha_oportunidade")
        .delete()
        .eq("oportunidade_id", sessao.oportunidade_spot_id);
      
      if (args.produto_id) {
        query = query.eq("produto_id", args.produto_id);
      } else if (args.numero_item) {
        query = query.eq("ordem_linha", args.numero_item);
      } else {
        return { sucesso: false, erro: "parametro_obrigatorio", mensagem: "Qual item você quer remover?" };
      }
      
      const { error } = await query;
      
      if (error) {
        console.error("❌ Erro ao remover item da oportunidade:", error);
        return { sucesso: false, erro: "erro_banco", mensagem: "Não consegui remover o item" };
      }
      
      console.log(`✅ Item removido da oportunidade`);
      
      return {
        sucesso: true,
        precisa_recalcular: true,
        oportunidade_id: sessao.oportunidade_spot_id,
        mensagem: "pronto, tirei o item. quer que eu recalcule os valores?"
      };
    }
    
    // Se não tem oportunidade, usar RPC do carrinho
    const { data: resultado, error: rpcError } = await supabase.rpc("remover_item_carrinho", {
      p_conversa_id: conversaId,
      p_produto_id: args.produto_id || null,
      p_numero_item: args.numero_item || null
    });
    
    if (rpcError) {
      console.error("❌ Erro ao remover item (RPC):", rpcError);
      return { sucesso: false, erro: "erro_banco", mensagem: "Não consegui remover o item" };
    }
    
    if (!resultado?.sucesso) {
      return resultado;
    }
    
    console.log(`✅ Item removido do carrinho`);
    
    return {
      sucesso: true,
      carrinho_total_itens: resultado.carrinho_total_itens,
      item_removido: resultado.item_removido,
      mensagem: `beleza, tirei do carrinho. ${resultado.carrinho_total_itens > 0 ? `ainda tem ${resultado.carrinho_total_itens} item(ns)` : 'carrinho ficou vazio'}`
    };
    
  } catch (error) {
    console.error("❌ Erro em remover_item:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao remover item" };
  }
}

/**
 * Recalcular proposta após alterações
 */
export async function executarRecalcularProposta(
  args: { oportunidade_id: string },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🔄 [Tool] recalcular_proposta", args);
  
  // Reutilizar a lógica de calcular_cesta_datasul
  return executarCalcularCestaDatasul(args, supabase, conversaId);
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
    
    case "alterar_quantidade_item":
      return executarAlterarQuantidadeItem(args, supabase, conversaId);
    
    case "remover_item":
      return executarRemoverItem(args, supabase, conversaId);
    
    case "recalcular_proposta":
      return executarRecalcularProposta(args, supabase, conversaId);
    
    default:
      return null; // Tool não é V4, deixar para o executor original
  }
}

/**
 * Verificar se é uma tool V4
 */
export function isToolV4(nomeTool: string): boolean {
  return [
    "identificar_cliente", 
    "criar_oportunidade_spot", 
    "calcular_cesta_datasul", 
    "gerar_link_proposta", 
    "adicionar_ao_carrinho_v4",
    "alterar_quantidade_item",
    "remover_item",
    "recalcular_proposta"
  ].includes(nomeTool);
}
