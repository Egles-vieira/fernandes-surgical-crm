import { salvarMemoria } from './utils.ts';

// Banco de perguntas qualificadoras por categoria
export const PERGUNTAS_QUALIFICADORAS = {
  tipo_procedimento: [
    "Para te ajudar melhor, me conta: é para uso hospitalar, clínica ou outro ambiente?",
    "Qual tipo de procedimento você realiza com esses produtos?",
    "Você já usa algum produto similar? Qual marca ou modelo?",
  ],
  quantidade: [
    "Qual a quantidade você precisa? É uma compra pontual ou reposição de estoque?",
    "Precisa de quantas unidades aproximadamente?",
    "É para começar com uma quantidade menor para testar ou já sabe quanto precisa?",
  ],
  urgencia: [
    "Para quando você precisa desses produtos?",
    "É urgente ou posso te apresentar algumas opções com calma?",
    "Está precisando com urgência ou é para planejamento futuro?",
  ],
  orcamento: [
    "Tem um orçamento definido para esse pedido?",
    "Prefere investir mais na qualidade ou busca melhor custo-benefício?",
    "Quer ver opções em diferentes faixas de preço?",
  ],
  preferencias: [
    "Tem preferência por alguma marca específica que já conhece?",
    "Já comprou com a gente antes? Como foi a experiência?",
    "Existe algum requisito técnico específico que preciso saber?",
  ]
};

/**
 * Identificar lacunas de informação no contexto da conversa
 */
export function identificarLacunasInformacao(contexto: string, mensagemAtual: string): string[] {
  const lacunas: string[] = [];
  const textoCompleto = `${contexto}\n${mensagemAtual}`.toLowerCase();
  
  // Verifica tipo de procedimento
  if (!textoCompleto.match(/cirurgia|ambulatório|uti|pronto\s*socorro|internação|clínica|hospital|consultório/i)) {
    lacunas.push('tipo_procedimento');
  }
  
  // Verifica quantidade
  if (!textoCompleto.match(/\d+\s*(unidades?|caixas?|peças?|pcs?|kits?)|quantidade|qtd/i)) {
    lacunas.push('quantidade');
  }
  
  // Verifica urgência
  if (!textoCompleto.match(/urgente|rápido|hoje|amanhã|essa\s*semana|prazo|quando\s*precis/i)) {
    lacunas.push('urgencia');
  }
  
  // Verifica orçamento
  if (!textoCompleto.match(/orçamento|valor|preço|custo|r\$\s*\d+|reais/i)) {
    lacunas.push('orcamento');
  }
  
  // Verifica preferências (sempre última a perguntar)
  const temPreferencia = textoCompleto.match(/marca|modelo|preferência|prefiro|gosto de/i);
  if (!temPreferencia && lacunas.length < 2) {
    lacunas.push('preferencias');
  }
  
  console.log('🔍 Lacunas identificadas:', lacunas);
  return lacunas;
}

/**
 * Escolher próxima pergunta mais relevante baseada nas lacunas
 */
export function escolherProximaPergunta(lacunas: string[], contexto: string): string {
  // Prioridade: tipo_procedimento > urgencia > quantidade > orcamento > preferencias
  
  if (lacunas.includes('tipo_procedimento')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.tipo_procedimento;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('urgencia')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.urgencia;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('quantidade')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.quantidade;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('orcamento')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.orcamento;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('preferencias')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.preferencias;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  // Fallback genérico
  return "Me conta um pouco mais sobre o que você precisa para eu te ajudar melhor?";
}

/**
 * Verificar se tem informações suficientes para buscar produtos
 */
export function verificarInformacoesSuficientes(contexto: string, mensagemAtual: string): boolean {
  const lacunas = identificarLacunasInformacao(contexto, mensagemAtual);
  
  // Precisa de pelo menos: produto específico mencionado + (tipo_procedimento OU quantidade)
  const temProdutoEspecifico = /sonda|luva|máscara|campo|bisturi|cateter|seringa|agulha|gaze|atadura/i.test(`${contexto}\n${mensagemAtual}`);
  const temContextoMinimo = !lacunas.includes('tipo_procedimento') || !lacunas.includes('quantidade');
  
  const suficiente = temProdutoEspecifico && temContextoMinimo;
  console.log('✅ Informações suficientes?', suficiente, '| Produto específico:', temProdutoEspecifico, '| Contexto mínimo:', temContextoMinimo);
  
  return suficiente;
}

/**
 * Fazer perguntas qualificadoras até ter informações suficientes
 */
export async function fazerPerguntasQualificadoras(
  supabase: any,
  conversaId: string,
  contexto: string,
  mensagemAtual: string,
  openAiKey: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log('❓ Iniciando descoberta de necessidade');
  
  // Verificar se já tem informações suficientes
  if (verificarInformacoesSuficientes(contexto, mensagemAtual)) {
    console.log('✅ Informações suficientes - avançando para busca de produtos');
    return new Response(
      JSON.stringify({ pular_pergunta: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Identificar lacunas
  const lacunas = identificarLacunasInformacao(contexto, mensagemAtual);
  
  if (lacunas.length === 0) {
    console.log('✅ Todas informações coletadas');
    return new Response(
      JSON.stringify({ pular_pergunta: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Escolher próxima pergunta
  const perguntaBase = escolherProximaPergunta(lacunas, contexto);
  
  // Usar IA para personalizar a pergunta com base no contexto
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  const respostaIA = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${deepseekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Você é o Beto, vendedor da Cirúrgica Fernandes.

CONTEXTO DA CONVERSA:
${contexto}

CLIENTE DISSE: "${mensagemAtual}"

PERGUNTA BASE SUGERIDA: "${perguntaBase}"

INSTRUÇÕES:
- Faça UMA pergunta qualificadora natural e amigável
- Seja direto mas não robotizado
- Use linguagem informal (você, não "senhor/senhora")
- Máximo 2 linhas
- Máximo 1 emoji
- Conecte com o que o cliente acabou de dizer
- Faça parecer uma conversa natural, não um questionário`
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    })
  });
  
  if (!respostaIA.ok) {
    console.error('❌ Erro ao chamar DeepSeek:', await respostaIA.text());
    // Usar pergunta base como fallback
    console.log('⚠️ Usando pergunta base como fallback:', perguntaBase);
    
    // Salvar interação mesmo com fallback
    await supabase.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      tipo_evento: 'pergunta_qualificadora',
      descricao: `Pergunta (fallback): ${perguntaBase}`,
      metadata: { lacunas, pergunta_base: perguntaBase, fallback: true },
      executado_por_bot: true
    });
    
    await salvarMemoria(supabase, conversaId, `Beto fez pergunta: ${perguntaBase}`, 'pergunta_qualificadora', openAiKey);
    
    return new Response(
      JSON.stringify({ resposta: perguntaBase, tipo: 'pergunta_qualificadora' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  const respostaJson = await respostaIA.json();
  const perguntaPersonalizada = respostaJson.choices[0].message.content;
  
  // Salvar interação
  await supabase.from('whatsapp_interacoes').insert({
    conversa_id: conversaId,
    tipo_evento: 'pergunta_qualificadora',
    descricao: `Pergunta: ${perguntaPersonalizada}`,
    metadata: { lacunas, pergunta_base: perguntaBase },
    executado_por_bot: true
  });
  
  // Salvar na memória
  await salvarMemoria(supabase, conversaId, `Beto fez pergunta: ${perguntaPersonalizada}`, 'pergunta_qualificadora', openAiKey);
  
  console.log('❓ Pergunta enviada:', perguntaPersonalizada);
  
  return new Response(
    JSON.stringify({ resposta: perguntaPersonalizada, tipo: 'pergunta_qualificadora' }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
