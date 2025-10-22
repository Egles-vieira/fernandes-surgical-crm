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

    const systemPrompt = `Você é uma ENFERMEIRA TÉCNICA especializada em COLETAR INFORMAÇÕES clínicas para abertura de tickets SAC na área da saúde.

SEU PAPEL:
- Atuar como enfermeira técnica profissional e empática
- Fazer perguntas clínicas direcionadas baseadas na descrição inicial do caso
- Coletar informações essenciais sobre o estado do paciente/situação
- Identificar urgência clínica e prioridade de atendimento
- Sugerir classificação adequada do caso

CONTEXTO INICIAL DO CASO:
${contexto?.titulo ? `Título: ${contexto.titulo}` : ''}
${contexto?.descricao ? `Descrição inicial: ${contexto.descricao}` : ''}
${contexto?.cliente ? `Cliente/Unidade: ${contexto.cliente}` : ''}

ABORDAGEM CLÍNICA - Faça perguntas baseadas na descrição, considerando:

1. AVALIAÇÃO INICIAL:
   - Quais são os sinais e sintomas apresentados?
   - Há quanto tempo o problema/situação está ocorrendo?
   - Houve piora ou melhora desde o início?

2. HISTÓRICO E CONTEXTO:
   - Há informações sobre o paciente (idade, condições prévias)?
   - Foi tentada alguma intervenção inicial? Qual resultado?
   - Há registros ou documentação do caso?

3. GRAVIDADE E URGÊNCIA:
   - Há risco imediato ao paciente ou necessidade de ação urgente?
   - Qual o nível de desconforto ou comprometimento?
   - Há sinais de alerta ou complicações?

4. IMPACTO E NECESSIDADES:
   - Qual o impacto na rotina do paciente/unidade?
   - Há necessidade de equipamentos ou recursos específicos?
   - Qual a expectativa de resolução?

5. INFORMAÇÕES TÉCNICAS:
   - Há produtos médicos/equipamentos envolvidos? Quais?
   - Há número de lote, nota fiscal ou data de entrega?
   - Há fotos ou evidências que possam ajudar?

DIRETRIZES:
- Faça APENAS UMA pergunta por vez
- Use linguagem técnica mas acessível
- Seja empática e profissional
- Priorize informações que indiquem gravidade
- Após 4-5 perguntas respondidas, ofereça resumo estruturado

QUANDO TIVER INFORMAÇÕES SUFICIENTES:
Responda com: "✅ INFORMAÇÕES COLETADAS:" e forneça:
- Título técnico melhorado
- Descrição clínica completa e estruturada
- Prioridade recomendada (baixa/normal/alta/urgente) com justificativa clínica
- Fila de atendimento sugerida
- Recomendações de ação imediata, se aplicável`;

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

    // Detectar se a IA gerou sugestões finais (detecção robusta)
    let sugestoes: any = {};
    let perguntasPendentes: string[] | undefined = undefined;

    // Extrair campos de forma ampla
    const tituloExtraido = extrairCampo(assistantMessage, 'Título') || extrairCampo(assistantMessage, 'Titulo');
    const descricaoExtraida = extrairCampo(assistantMessage, 'Descrição') || extrairCampo(assistantMessage, 'Descricao') || extrairCampo(assistantMessage, 'Resumo');
    const prioridadeExtraida = extrairPrioridade(assistantMessage);
    const filaExtraida = extrairCampo(assistantMessage, 'Fila') || extrairCampo(assistantMessage, 'Fila de Atendimento');
    const justificativaExtraida = extrairCampo(assistantMessage, 'Justificativa') || extrairCampo(assistantMessage, 'Justificativa Clínica') || extrairCampo(assistantMessage, 'Justificativa Clinica');

    const lower = assistantMessage.toLowerCase();
    const finalDetect =
      lower.includes('✅ informações coletadas') ||
      lower.includes('informações coletadas') ||
      lower.includes('informacoes coletadas') ||
      lower.includes('resumo final') ||
      lower.includes('pronto!') ||
      // Considerar final quando houver descrição + (prioridade ou fila)
      (!!descricaoExtraida && (!!prioridadeExtraida || !!filaExtraida));

    if (finalDetect) {
      sugestoes = {
        titulo_sugerido: tituloExtraido,
        descricao_completa: descricaoExtraida,
        prioridade_sugerida: prioridadeExtraida,
        fila_sugerida: filaExtraida,
        justificativa: justificativaExtraida,
        perguntas_pendentes: [],
      };
      perguntasPendentes = [];
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        sugestoes,
        perguntas_respondidas: perguntasRespondidas,
        perguntas_pendentes: perguntasPendentes,
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
