
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, ticketContext } = await req.json();
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    // Construir contexto do ticket
    const contexto = `Você é um assistente de atendimento especializado em auxiliar vendedores a resolver tickets de SAC.

INFORMAÇÕES DO TICKET:
- Número: ${ticketContext.numero}
- Título: ${ticketContext.titulo}
- Descrição: ${ticketContext.descricao}
- Status: ${ticketContext.status}
- Prioridade: ${ticketContext.prioridade}
- Cliente: ${ticketContext.cliente}
${ticketContext.produto ? `- Produto: ${ticketContext.produto}` : ''}
${ticketContext.venda ? `- Venda: ${ticketContext.venda}` : ''}

SUA FUNÇÃO:
1. Auxiliar o vendedor a entender o problema do cliente
2. Sugerir procedimentos e perguntas que o vendedor deve fazer ao cliente
3. Verificar se os procedimentos padrão foram seguidos
4. Orientar sobre os próximos passos baseado no tipo de problema
5. Ser objetivo e prático nas respostas

DIRETRIZES:
- Seja direto e objetivo
- Faça perguntas específicas sobre o que já foi feito
- Sugira procedimentos concretos
- Mantenha tom profissional mas amigável
- Foque em resolver o problema do cliente rapidamente`;

    console.log('Iniciando chat com assistente do ticket...');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: contexto },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API DeepSeek:', errorText);
      throw new Error('Erro ao comunicar com DeepSeek');
    }

    // Retornar stream diretamente
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Erro no chat assistente:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
