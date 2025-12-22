/**
 * ============================================
 * PROVIDER LLM COM FALLBACK
 * DeepSeek -> Lovable AI (sem tools)
 * ============================================
 */

interface LLMResponse {
  resposta: string | null;
  toolCalls: any[];
  provider: "deepseek" | "lovable_ai";
  tokens_entrada?: number;
  tokens_saida?: number;
}

/**
 * Chamar LLM com fallback automático
 * Tenta DeepSeek primeiro, se falhar usa Lovable AI
 */
export async function chamarLLMComFallback(
  messages: any[],
  tools: any[] | null,
  deepseekApiKey: string,
  lovableApiKey: string | null
): Promise<LLMResponse> {
  
  // Tentar DeepSeek primeiro
  try {
    const resultado = await chamarDeepSeek(messages, tools, deepseekApiKey);
    return { ...resultado, provider: "deepseek" };
  } catch (error) {
    console.warn("⚠️ DeepSeek falhou, tentando Lovable AI:", error);
    
    // Fallback para Lovable AI
    if (lovableApiKey) {
      try {
        const resultado = await chamarLovableAI(messages, lovableApiKey);
        return { ...resultado, provider: "lovable_ai" };
      } catch (lovableError) {
        console.error("❌ Lovable AI também falhou:", lovableError);
        throw new Error("Ambos os provedores de IA falharam");
      }
    }
    
    throw error;
  }
}

/**
 * Chamar DeepSeek com tool calling
 */
async function chamarDeepSeek(
  messages: any[],
  tools: any[] | null,
  apiKey: string
): Promise<{ resposta: string | null; toolCalls: any[]; tokens_entrada?: number; tokens_saida?: number }> {
  
  const body: any = {
    model: "deepseek-chat",
    messages: messages.filter(m => m.content && m.content.trim() !== ''),
    temperature: 0.7,
    max_tokens: 500
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
  }
  
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
  lovableApiKey: string | null
): Promise<LLMResponse> {
  
  const messages = [
    { role: "system", content: systemPrompt },
    ...historicoMensagens.filter(m => m.content && m.content.trim() !== ''),
    { role: "user", content: mensagemCliente },
    { role: "assistant", content: null, tool_calls: toolCalls },
    ...resultadosFerramentas
  ];
  
  // Tentar DeepSeek primeiro
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
    
    // Fallback: gerar resposta baseada nos resultados das tools
    return gerarRespostaFallback(resultadosFerramentas);
  }
}

/**
 * Gerar resposta fallback quando LLM falha
 */
function gerarRespostaFallback(resultadosFerramentas: any[]): LLMResponse {
  let resposta = "opa, deixa eu ver aqui o que consegui...";
  
  for (const resultado of resultadosFerramentas) {
    const dados = typeof resultado.content === "string" ? JSON.parse(resultado.content) : resultado.content;
    
    if (resultado.name === "buscar_produtos" && dados.produtos?.length > 0) {
      resposta = `achei essas opções:\n\n` +
        dados.produtos.slice(0, 3).map((p: any, i: number) => 
          `${i + 1}. ${p.nome}\n   cód: ${p.referencia} - R$ ${p.preco?.toFixed(2) || '0.00'}`
        ).join("\n\n") +
        `\n\nqual te interessou?`;
    }
    
    if (resultado.name === "identificar_cliente" && dados.sucesso) {
      resposta = `encontrei seu cadastro: ${dados.cliente_nome}\ncnpj: ${dados.cnpj}\n\né esse mesmo?`;
    }
    
    if (resultado.name === "criar_oportunidade_spot" && dados.sucesso) {
      resposta = `blz, criei a oportunidade ${dados.codigo} com ${dados.total_itens} itens.\nvou calcular os valores no sistema, um momento...`;
    }
    
    if (resultado.name === "calcular_cesta_datasul" && dados.sucesso) {
      resposta = `pronto! calculei tudo aqui:\n\n` +
        `total: R$ ${dados.resumo?.valor_total?.toFixed(2) || '0.00'}\n\n` +
        `quer que eu gere o link da proposta?`;
    }
    
    if (resultado.name === "gerar_link_proposta" && dados.sucesso) {
      resposta = `aqui está o link da sua proposta:\n\n${dados.link}\n\npode acessar pra ver todos os detalhes e confirmar 👆`;
    }
  }
  
  return {
    resposta,
    toolCalls: [],
    provider: "lovable_ai"
  };
}
