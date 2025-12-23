/**
 * ============================================
 * PROVIDER LLM COM FALLBACK
 * OpenAI (GPT-4o-mini) -> DeepSeek (SEM Lovable AI!)
 * 
 * ⚠️ LOVABLE AI REMOVIDO para evitar consumo de créditos
 * ============================================
 */

interface LLMResponse {
  resposta: string | null;
  toolCalls: any[];
  provider: "openai" | "deepseek" | "error_fallback";
  tokens_entrada?: number;
  tokens_saida?: number;
}

/**
 * Chamar LLM com fallback automático
 * Ordem: OpenAI -> DeepSeek (sem Lovable AI!)
 */
export async function chamarLLMComFallback(
  messages: any[],
  tools: any[] | null,
  deepseekApiKey: string,
  lovableApiKey: string | null, // Mantido para compatibilidade, mas NÃO usado
  openaiApiKey?: string | null
): Promise<LLMResponse> {
  
  // 1. Tentar OpenAI (GPT-4o-mini) PRIMEIRO
  if (openaiApiKey) {
    try {
      console.log("🚀 Tentando OpenAI (GPT-4o-mini)...");
      const resultado = await chamarOpenAI(messages, tools, openaiApiKey);
      return { ...resultado, provider: "openai" };
    } catch (error) {
      console.warn("⚠️ OpenAI falhou, tentando DeepSeek:", error);
    }
  }
  
  // 2. Fallback para DeepSeek
  try {
    console.log("🔄 Tentando DeepSeek...");
    const resultado = await chamarDeepSeek(messages, tools, deepseekApiKey);
    return { ...resultado, provider: "deepseek" };
  } catch (error) {
    console.error("❌ DeepSeek também falhou:", error);
    
    // ⛔ NÃO usar Lovable AI - retornar erro controlado
    console.error("⛔ [SEM LOVABLE AI] Retornando erro controlado para evitar consumo de créditos");
    
    return {
      resposta: "opa, estou com instabilidade momentânea. pode tentar de novo em alguns segundos?",
      toolCalls: [],
      provider: "error_fallback"
    };
  }
}

/**
 * Detectar se mensagem indica necessidade de tool
 */
function detectarIntencaoTool(messages: any[]): string | null {
  // Pegar última mensagem do usuário
  const ultimaMensagemUser = [...messages].reverse().find(m => m.role === "user");
  if (!ultimaMensagemUser?.content) return null;
  
  const texto = ultimaMensagemUser.content.toLowerCase();
  
  // Padrões que indicam busca de produto (alta prioridade)
  const padroesProduto = [
    /\bquero\b.*\b(cotar|comprar|pedir|encomendar|produto)/,
    /\bpreciso\b.*\b(de|comprar|cotar)/,
    /\b(cotar|cotação|orçamento|orcamento)\b/,
    /\b(unidade|unidades|cx|caixa|pacote|pct)\b/,
    /\b(abaixador|scalp|luva|seringa|agulha|sonda|gaze|algodão|mascara|máscara)\b/,
    /\btem\b.*\b(em estoque|disponível|disponivel)\b/,
    /\bpreço\b.*\bde?\b/,
    /\bquanto\b.*\b(custa|fica|sai)\b/,
    /\bme\s+(manda|envia|passa).*\b(preço|valor|cotação)/,
    /\d+\s*(un|unid|unidade|cx|caixa|pct|pacote)/i
  ];
  
  for (const padrao of padroesProduto) {
    if (padrao.test(texto)) {
      console.log(`🎯 Intenção detectada: buscar_produtos (padrão: ${padrao})`);
      return "buscar_produtos";
    }
  }
  
  return null;
}

/**
 * Chamar OpenAI (GPT-4o-mini) com tool calling
 */
async function chamarOpenAI(
  messages: any[],
  tools: any[] | null,
  apiKey: string
): Promise<{ resposta: string | null; toolCalls: any[]; tokens_entrada?: number; tokens_saida?: number }> {
  
  const messagesLimpos = messages.filter(m => m.content && m.content.trim() !== '');
  
  const body: any = {
    model: "gpt-4o-mini",
    messages: messagesLimpos,
    temperature: 0.5,
    max_tokens: 500
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    
    // Detectar intenção para forçar uso de tools
    const intencao = detectarIntencaoTool(messagesLimpos);
    
    if (intencao) {
      body.tool_choice = { type: "function", function: { name: intencao } };
      console.log(`🔧 OpenAI: Forçando tool_choice: ${intencao}`);
    } else {
      body.tool_choice = "auto";
    }
  }
  
  console.log(`📤 OpenAI request | Model: gpt-4o-mini | Tools: ${tools?.length || 0} | tool_choice: ${JSON.stringify(body.tool_choice || 'none')}`);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000) // 30s timeout
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro OpenAI:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const assistantMessage = data.choices[0].message;
  
  console.log(`📥 OpenAI response | Tool calls: ${assistantMessage.tool_calls?.length || 0} | Tokens: ${data.usage?.prompt_tokens}/${data.usage?.completion_tokens}`);
  
  return {
    resposta: assistantMessage.content,
    toolCalls: assistantMessage.tool_calls || [],
    tokens_entrada: data.usage?.prompt_tokens,
    tokens_saida: data.usage?.completion_tokens
  };
}

/**
 * Chamar DeepSeek com tool calling
 */
async function chamarDeepSeek(
  messages: any[],
  tools: any[] | null,
  apiKey: string
): Promise<{ resposta: string | null; toolCalls: any[]; tokens_entrada?: number; tokens_saida?: number }> {
  
  const messagesLimpos = messages.filter(m => m.content && m.content.trim() !== '');
  
  const body: any = {
    model: "deepseek-chat",
    messages: messagesLimpos,
    temperature: 0.5,
    max_tokens: 500
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    
    // Detectar intenção para forçar uso de tools
    const intencao = detectarIntencaoTool(messagesLimpos);
    
    if (intencao) {
      body.tool_choice = { type: "function", function: { name: intencao } };
      console.log(`🔧 DeepSeek: Forçando tool_choice: ${intencao}`);
    } else {
      body.tool_choice = "auto";
    }
  }
  
  console.log(`📤 DeepSeek request | Tools: ${tools?.length || 0} | tool_choice: ${JSON.stringify(body.tool_choice || 'none')}`);
  
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000) // 30s timeout
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro DeepSeek:", response.status, errorText);
    throw new Error(`DeepSeek API error: ${response.status}`);
  }
  
  const data = await response.json();
  const assistantMessage = data.choices[0].message;
  
  console.log(`📥 DeepSeek response | Tool calls: ${assistantMessage.tool_calls?.length || 0} | Tokens: ${data.usage?.prompt_tokens}/${data.usage?.completion_tokens}`);
  
  return {
    resposta: sanitizarResposta(assistantMessage.content),
    toolCalls: assistantMessage.tool_calls || [],
    tokens_entrada: data.usage?.prompt_tokens,
    tokens_saida: data.usage?.completion_tokens
  };
}

/**
 * Chamar Lovable AI (sem tool calling)
 */
async function chamarLovableAI(
  messages: any[],
  apiKey: string
): Promise<{ resposta: string | null; toolCalls: any[]; tokens_entrada?: number; tokens_saida?: number }> {
  
  // Lovable AI não suporta tools, então adicionamos instruções ao system prompt
  const messagesParaLovable = messages.map(m => {
    if (m.role === "system") {
      return {
        ...m,
        content: m.content + `

IMPORTANTE: Você está em modo fallback sem acesso a ferramentas.
- NÃO tente buscar produtos ou criar propostas
- Peça desculpas pela limitação temporária
- Sugira que o cliente tente novamente em alguns minutos
- Seja simpático e mantenha a conversa`
      };
    }
    return m;
  }).filter(m => m.content && m.content.trim() !== '');
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: messagesParaLovable,
      max_tokens: 400
    }),
    signal: AbortSignal.timeout(30000)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro Lovable AI:", response.status, errorText);
    throw new Error(`Lovable AI error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    resposta: data.choices[0]?.message?.content || "Desculpa, tive um probleminha. Pode repetir?",
    toolCalls: [], // Lovable AI não suporta tools
    tokens_entrada: data.usage?.prompt_tokens,
    tokens_saida: data.usage?.completion_tokens
  };
}

/**
 * Sanitiza resposta removendo artefatos do DeepSeek
 */
function sanitizarResposta(texto: string | null): string | null {
  if (!texto) return texto;
  
  let limpo = texto.replace(/<｜DSML｜function_calls>[\s\S]*?<\/｜DSML｜function_calls>/g, '');
  limpo = limpo.replace(/<｜DSML｜[^>]*>[\s\S]*?<\/｜DSML｜[^>]*>/g, '');
  limpo = limpo.replace(/<｜DSML｜[^>]*>/g, '');
  limpo = limpo.replace(/<\/｜DSML｜[^>]*>/g, '');
  limpo = limpo.replace(/\[function_call:[\s\S]*?\]/g, '');
  limpo = limpo.replace(/\n{3,}/g, '\n\n').trim();
  
  return limpo || null;
}

/**
 * Segunda chamada ao LLM com resultados das tools
 */
export async function chamarLLMComResultadosTools(
  systemPrompt: string,
  historicoMensagens: any[],
  mensagemCliente: string,
  toolCalls: any[],
  resultadosFerramentas: any[],
  deepseekApiKey: string,
  lovableApiKey: string | null,
  openaiApiKey?: string | null
): Promise<LLMResponse> {
  
  const messages = [
    { role: "system", content: systemPrompt },
    ...historicoMensagens.filter(m => m.content && m.content.trim() !== ''),
    { role: "user", content: mensagemCliente },
    { role: "assistant", content: null, tool_calls: toolCalls },
    ...resultadosFerramentas
  ];
  
  // 1. Tentar OpenAI primeiro (se tiver chave)
  if (openaiApiKey) {
    try {
      console.log("🚀 Segunda chamada: OpenAI (GPT-4o-mini)...");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.7,
          max_tokens: 400
        }),
        signal: AbortSignal.timeout(30000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📥 OpenAI (2ª chamada) | Tokens: ${data.usage?.prompt_tokens}/${data.usage?.completion_tokens}`);
        
        return {
          resposta: data.choices[0].message.content,
          toolCalls: [],
          provider: "openai",
          tokens_entrada: data.usage?.prompt_tokens,
          tokens_saida: data.usage?.completion_tokens
        };
      }
      
      console.warn("⚠️ OpenAI falhou na segunda chamada, tentando DeepSeek...");
    } catch (error) {
      console.warn("⚠️ OpenAI erro na segunda chamada:", error);
    }
  }
  
  // 2. Fallback DeepSeek
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 400
      }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      resposta: sanitizarResposta(data.choices[0].message.content),
      toolCalls: [],
      provider: "deepseek",
      tokens_entrada: data.usage?.prompt_tokens,
      tokens_saida: data.usage?.completion_tokens
    };
    
  } catch (error) {
    console.warn("⚠️ DeepSeek falhou na segunda chamada:", error);
    
    // 3. Fallback: gerar resposta baseada nos resultados das tools (SEM Lovable AI!)
    console.log("📋 Gerando resposta fallback manual (sem consumir créditos Lovable)");
    return gerarRespostaFallback(resultadosFerramentas);
  }
}

/**
 * Gerar resposta fallback quando LLM falha (SEM usar Lovable AI!)
 * MELHORADO: Respostas mais naturais, estilo humano
 */
function gerarRespostaFallback(resultadosFerramentas: any[]): LLMResponse {
  let resposta = "opa, deixa eu ver aqui o que consegui...";
  
  for (const resultado of resultadosFerramentas) {
    try {
      const dados = typeof resultado.content === "string" ? JSON.parse(resultado.content) : resultado.content;
      
      if (resultado.name === "buscar_produtos" && dados.produtos?.length > 0) {
        const prods = dados.produtos.slice(0, 3);
        resposta = `achei ${prods.length} opções pra vc:\n\n` +
          prods.map((p: any, i: number) => 
            `${i + 1}. ${p.nome?.toLowerCase() || 'produto'}\n` +
            `   ref ${p.referencia || 'n/a'} • R$ ${p.preco?.toFixed(2).replace('.', ',') || '0,00'}`
          ).join("\n\n") +
          `\n\nqual desses te interessou?`;
      }
      
      if (resultado.name === "identificar_cliente" && dados.sucesso) {
        resposta = `encontrei teu cadastro:\n${dados.cliente_nome}\ncnpj ${dados.cnpj}\n\né esse mesmo?`;
      }
      
      if (resultado.name === "criar_oportunidade_spot" && dados.sucesso) {
        resposta = `blz, criei a oportunidade ${dados.codigo} com ${dados.total_itens} itens\nvou calcular os valores e já mando o link da proposta, um momento`;
      }
      
      if (resultado.name === "calcular_cesta_datasul" && dados.sucesso) {
        resposta = `pronto, calculei tudo! já estou gerando o link da proposta pra você conferir...`;
      }
      
      if (resultado.name === "gerar_link_proposta" && dados.sucesso) {
        resposta = `aqui o link da proposta:\n\n${dados.link}\n\npode acessar pra ver os detalhes e confirmar`;
      }
      
      if (resultado.name === "adicionar_ao_carrinho_v4" && dados.sucesso) {
        resposta = `beleza, adicionei ${dados.quantidade}x ${dados.produto_nome?.toLowerCase() || 'produto'} no carrinho\n\nquer mais alguma coisa ou posso identificar pra fechar?`;
      }
      
      if (resultado.name === "alterar_quantidade_item" && dados.sucesso) {
        resposta = `pronto, alterei pra ${dados.nova_quantidade} unidades${dados.precisa_recalcular ? '\nquer que eu recalcule os valores?' : ''}`;
      }
      
      if (resultado.name === "remover_item" && dados.sucesso) {
        resposta = `beleza, tirei do carrinho${dados.precisa_recalcular ? '\nquer que eu recalcule os valores?' : ''}`;
      }
    } catch (parseError) {
      console.warn("⚠️ Erro ao parsear resultado de tool:", parseError);
    }
  }
  
  return {
    resposta,
    toolCalls: [],
    provider: "error_fallback" // NÃO é lovable_ai!
  };
}
