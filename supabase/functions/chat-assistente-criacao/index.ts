import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, contexto } = await req.json();
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    const systemPrompt = `Você é um assistente especializado em COLETAR INFORMAÇÕES para abertura de tickets SAC.

SEU OBJETIVO:
- Fazer perguntas direcionadas para entender melhor o problema
- Coletar detalhes que o vendedor pode ter esquecido
- Identificar urgência e impacto
- Sugerir classificação correta (prioridade, fila)

CONTEXTO INICIAL:
${contexto?.titulo ? `Título: ${contexto.titulo}` : ''}
${contexto?.descricao ? `Descrição inicial: ${contexto.descricao}` : ''}
${contexto?.cliente ? `Cliente: ${contexto.cliente}` : ''}

PERGUNTAS ESSENCIAIS A FAZER (uma por vez):
1. O que aconteceu exatamente? Qual o problema?
2. Quando o problema começou ou foi identificado?
3. O cliente já tentou resolver? Como? O que aconteceu?
4. Qual o impacto para o cliente? (não consegue usar o produto, atraso, etc)
5. Há urgência? Por quê?
6. Há informações do produto ou da venda envolvida?
7. O cliente expressou algum sentimento? (irritado, calmo, impaciente)

REGRAS:
- Seja objetivo e direto
- Faça UMA pergunta por vez
- Se o vendedor responder várias coisas, reconheça e faça a próxima pergunta
- Após 4-5 perguntas respondidas, ofereça um resumo estruturado
- Sempre seja empático e profissional

QUANDO TIVER INFORMAÇÕES SUFICIENTES:
Responda com um resumo estruturado começando com "✅ INFORMAÇÕES COLETADAS:" e sugira:
- Título melhorado
- Descrição completa e estruturada
- Prioridade recomendada (baixa/normal/alta/urgente)
- Fila sugerida
- Justificativa das escolhas`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API DeepSeek:', response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Contar quantas perguntas foram respondidas (aproximação)
    const perguntasRespondidas = messages.filter((m: any) => m.role === 'user').length;

    // Detectar se a IA gerou sugestões finais
    let sugestoes = {};
    if (assistantMessage.includes('✅ INFORMAÇÕES COLETADAS') || assistantMessage.includes('SUGESTÃO')) {
      // Extrair sugestões do texto (simplificado)
      sugestoes = {
        titulo_sugerido: extrairCampo(assistantMessage, 'Título'),
        descricao_completa: extrairCampo(assistantMessage, 'Descrição'),
        prioridade_sugerida: extrairPrioridade(assistantMessage),
        fila_sugerida: extrairCampo(assistantMessage, 'Fila'),
        justificativa: extrairCampo(assistantMessage, 'Justificativa'),
      };
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        sugestoes,
        perguntas_respondidas: perguntasRespondidas,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Erro no chat-assistente-criacao:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: 'Desculpe, tive um problema técnico. Pode tentar novamente?' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Funções auxiliares para extrair informações
function extrairCampo(texto: string, campo: string): string | undefined {
  const regex = new RegExp(`${campo}[:\\s]+([^\\n]+)`, 'i');
  const match = texto.match(regex);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

function extrairPrioridade(texto: string): 'baixa' | 'normal' | 'alta' | 'urgente' | undefined {
  const textoLower = texto.toLowerCase();
  if (textoLower.includes('urgente')) return 'urgente';
  if (textoLower.includes('alta')) return 'alta';
  if (textoLower.includes('baixa')) return 'baixa';
  if (textoLower.includes('normal')) return 'normal';
  return undefined;
}
