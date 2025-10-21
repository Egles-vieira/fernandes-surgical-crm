
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titulo, descricao, tipo } = await req.json();
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    const prompt = `Analise o seguinte ticket de SAC e classifique sua criticidade/prioridade.

Título: ${titulo}
Descrição: ${descricao}
Tipo: ${tipo}

Baseado no conteúdo, classifique a criticidade como:
- "baixa": Questões simples, não urgentes, sugestões, elogios
- "normal": Dúvidas comuns, problemas que não impedem uso
- "alta": Problemas graves, reclamações sérias, impacto significativo
- "urgente": Situações críticas, sistema parado, segurança comprometida

Responda APENAS com uma das palavras: baixa, normal, alta, urgente`;

    console.log('Chamando DeepSeek API para classificação...');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um assistente especializado em classificar a criticidade de tickets de suporte. Responda apenas com uma palavra: baixa, normal, alta ou urgente.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API DeepSeek:', response.status, errorText);
      throw new Error(`Erro na API DeepSeek: ${response.status}`);
    }

    const data = await response.json();
    const criticidade = data.choices[0].message.content.trim().toLowerCase();

    console.log('Criticidade classificada:', criticidade);

    // Validar resposta
    const criticidadesValidas = ['baixa', 'normal', 'alta', 'urgente'];
    const criticidadeFinal = criticidadesValidas.includes(criticidade) ? criticidade : 'normal';

    return new Response(
      JSON.stringify({ 
        prioridade: criticidadeFinal,
        confianca: criticidadesValidas.includes(criticidade) ? 'alta' : 'baixa'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao classificar criticidade:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        prioridade: 'normal' // Fallback para normal em caso de erro
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
