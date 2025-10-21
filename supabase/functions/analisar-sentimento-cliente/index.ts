import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversaId } = await req.json();
    
    if (!conversaId) {
      throw new Error('conversaId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar últimas 20 mensagens recebidas do cliente
    const { data: mensagens, error: erroMensagens } = await supabase
      .from('whatsapp_mensagens')
      .select('corpo, criado_em')
      .eq('conversa_id', conversaId)
      .eq('direcao', 'recebida')
      .order('criado_em', { ascending: false })
      .limit(20);

    if (erroMensagens) {
      console.error('Erro ao buscar mensagens:', erroMensagens);
      throw erroMensagens;
    }

    if (!mensagens || mensagens.length === 0) {
      // Sem mensagens do cliente ainda
      return new Response(
        JSON.stringify({ 
          sentimento: 'neutro',
          emoji: '😐',
          mensagem: 'Aguardando mensagens do cliente'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar contexto para análise (últimas mensagens mais recentes primeiro)
    const contextoMensagens = mensagens
      .slice(0, 10) // Analisar últimas 10 para otimização
      .map(m => m.corpo)
      .join('\n');

    console.log('Analisando sentimento para', mensagens.length, 'mensagens');

    // Chamar Lovable AI para análise de sentimento
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Modelo rápido e barato para classificação
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de sentimento. Analise o humor do cliente com base nas mensagens dele.
            
Retorne APENAS um JSON com este formato exato:
{
  "sentimento": "positivo|neutro|negativo|frustrado|satisfeito",
  "emoji": "😊|😐|😔|😤|😃",
  "confianca": 0.95
}

Sentimentos possíveis:
- positivo: Cliente feliz, agradecido (😊)
- satisfeito: Cliente muito contente, elogiando (😃)
- neutro: Cliente objetivo, sem emoção clara (😐)
- negativo: Cliente triste, decepcionado (😔)
- frustrado: Cliente irritado, reclamando (😤)`
          },
          {
            role: 'user',
            content: `Analise o sentimento destas mensagens do cliente:\n\n${contextoMensagens}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições atingido. Tente novamente em alguns instantes.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos da IA esgotados. Adicione créditos em Settings -> Workspace -> Usage.');
      }
      
      throw new Error(`Erro na análise: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    console.log('Resposta da IA:', content);

    // Parse da resposta
    let resultado;
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultado = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Formato inválido');
      }
    } catch (e) {
      console.error('Erro ao parsear resposta:', content);
      // Fallback
      resultado = {
        sentimento: 'neutro',
        emoji: '😐',
        confianca: 0.5
      };
    }

    // Atualizar conversa com sentimento
    const { error: erroUpdate } = await supabase
      .from('whatsapp_conversas')
      .update({
        sentimento_cliente: resultado.sentimento,
        emoji_sentimento: resultado.emoji,
        ultima_analise_sentimento_em: new Date().toISOString(),
        mensagens_analisadas: mensagens.length
      })
      .eq('id', conversaId);

    if (erroUpdate) {
      console.error('Erro ao atualizar conversa:', erroUpdate);
    }

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});