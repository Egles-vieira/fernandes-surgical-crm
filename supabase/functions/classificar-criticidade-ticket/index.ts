
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

    const promptCriticidade = `Analise o seguinte ticket de SAC e classifique sua criticidade/prioridade.

Título: ${titulo}
Descrição: ${descricao}
Tipo: ${tipo}

Baseado no conteúdo, classifique a criticidade como:
- "baixa": Questões simples, não urgentes, sugestões, elogios
- "normal": Dúvidas comuns, problemas que não impedem uso
- "alta": Problemas graves, reclamações sérias, impacto significativo
- "urgente": Situações críticas, sistema parado, segurança comprometida

Responda APENAS com uma das palavras: baixa, normal, alta, urgente`;

    const promptFila = `Analise o seguinte ticket de SAC e classifique em qual fila de atendimento ele deve ser direcionado.

Título: ${titulo}
Descrição: ${descricao}
Tipo: ${tipo}

Filas disponíveis:
- "Tratativa Comercial": Questões comerciais, orçamentos, negociações, preços, condições de pagamento
- "Importação": Processos de importação de produtos, documentação, prazos de entrega internacional
- "Análise Técnica": Avaliação técnica de produtos, especificações, compatibilidade, dúvidas técnicas
- "Envio para Fabricante": Problemas que necessitam análise do fabricante, defeitos, garantia
- "Devolução": Processos de devolução, troca de produtos, reembolso
- "Resolvido": Tickets já finalizados (não use esta opção para classificação inicial)

Responda APENAS com uma das opções exatas: Tratativa Comercial, Importação, Análise Técnica, Envio para Fabricante, Devolução`;

    console.log('Chamando DeepSeek API para classificação de criticidade e fila...');

    // Classificar criticidade
    const responseCriticidade = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
          { role: 'user', content: promptCriticidade }
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    // Classificar fila
    const responseFila = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
            content: 'Você é um assistente especializado em direcionar tickets para a fila de atendimento correta. Responda apenas com o nome exato da fila.' 
          },
          { role: 'user', content: promptFila }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!responseCriticidade.ok || !responseFila.ok) {
      const errorText = !responseCriticidade.ok ? await responseCriticidade.text() : await responseFila.text();
      console.error('Erro na API DeepSeek:', errorText);
      throw new Error('Erro na API DeepSeek');
    }

    const dataCriticidade = await responseCriticidade.json();
    const dataFila = await responseFila.json();
    
    const criticidade = dataCriticidade.choices[0].message.content.trim().toLowerCase();
    const filaNome = dataFila.choices[0].message.content.trim();

    console.log('Criticidade classificada:', criticidade);
    console.log('Fila classificada:', filaNome);

    // Validar criticidade
    const criticidadesValidas = ['baixa', 'normal', 'alta', 'urgente'];
    const criticidadeFinal = criticidadesValidas.includes(criticidade) ? criticidade : 'normal';

    // Validar fila
    const filasValidas = ['Tratativa Comercial', 'Importação', 'Análise Técnica', 'Envio para Fabricante', 'Devolução'];
    const filaNomeFinal = filasValidas.includes(filaNome) ? filaNome : 'Análise Técnica';

    return new Response(
      JSON.stringify({ 
        prioridade: criticidadeFinal,
        fila_nome: filaNomeFinal,
        confianca: criticidadesValidas.includes(criticidade) && filasValidas.includes(filaNome) ? 'alta' : 'media'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao classificar ticket:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        prioridade: 'normal',
        fila_nome: 'Análise Técnica'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
