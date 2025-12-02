import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { analytics_id, action, tempo_total, secoes, section_id, time_spent } = body;

    if (!analytics_id) {
      return new Response(JSON.stringify({ error: 'analytics_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (action === 'session_end') {
      if (tempo_total) {
        await supabase.from('propostas_analytics').update({
          tempo_total_segundos: tempo_total,
          finalizado_em: new Date().toISOString(),
          ultima_atividade_em: new Date().toISOString()
        }).eq('id', analytics_id);
      }

      if (secoes && Array.isArray(secoes)) {
        for (const secao of secoes) {
          await supabase.from('propostas_analytics_secoes').upsert({
            analytics_id: secao.analytics_id,
            secao_id: secao.secao_id,
            secao_nome: secao.secao_nome,
            tempo_visivel_segundos: secao.tempo_visivel_segundos,
            ultima_visualizacao_em: new Date().toISOString()
          }, { onConflict: 'analytics_id,secao_id' });
        }
      }
    } else if (action === 'section_exit' && section_id && time_spent) {
      await supabase.from('propostas_analytics_secoes').upsert({
        analytics_id,
        secao_id: section_id,
        tempo_visivel_segundos: time_spent,
        ultima_visualizacao_em: new Date().toISOString()
      }, { onConflict: 'analytics_id,secao_id' });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro';
    return new Response(JSON.stringify({ success: false, error: message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
