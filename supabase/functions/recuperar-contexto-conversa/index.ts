import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gerar embedding usando OpenAI
async function gerarEmbedding(texto: string, openAiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texto.replace(/\n/g, ' '),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversaId, queryTexto, limite = 5 } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

    console.log('🔍 Recuperando contexto para:', queryTexto);

    // Gerar embedding da query
    const queryEmbedding = await gerarEmbedding(queryTexto, openAiKey);

    // Buscar memórias relevantes usando RPC
    const { data: memorias, error } = await supabase.rpc('recuperar_contexto_relevante', {
      p_conversa_id: conversaId,
      p_query_embedding: queryEmbedding,
      p_limite: limite,
    });

    if (error) {
      console.error('Erro ao buscar contexto:', error);
      throw error;
    }

    // Formatar contexto como texto  
    const contextoFormatado = memorias && memorias.length > 0
      ? memorias.map((m: any) => 
          `[${m.tipo_interacao}] ${m.conteudo} (relevância: ${(m.relevancia * 100).toFixed(0)}%)`
        ).join('\n')
      : 'Nenhum contexto anterior relevante.';

    console.log('✅ Contexto recuperado:', memorias?.length, 'memórias');

    return new Response(
      JSON.stringify({
        contextoRelevante: contextoFormatado,
        memorias: memorias || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao recuperar contexto:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
