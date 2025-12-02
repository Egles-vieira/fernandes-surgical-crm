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
    const { tokenId, vendaId, tipoResposta, nome, email, cargo, telefone, comentario, motivoRecusa, analyticsId } = await req.json();

    if (!tokenId || !vendaId || !tipoResposta) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || '';

    const { data: resposta, error: insertError } = await supabase.from('propostas_respostas').insert({
      proposta_token_id: tokenId,
      venda_id: vendaId,
      analytics_id: analyticsId || null,
      tipo_resposta: tipoResposta,
      nome_respondente: nome || null,
      email_respondente: email || null,
      cargo_respondente: cargo || null,
      telefone_respondente: telefone || null,
      comentario: comentario || null,
      motivo_recusa: motivoRecusa || null,
      ip_assinatura: clientIP,
      user_agent_assinatura: userAgent
    }).select().single();

    if (insertError) throw insertError;

    if (tipoResposta === 'aceita') {
      await supabase.from('vendas').update({ etapa_pipeline: 'fechamento', status: 'aprovada' }).eq('id', vendaId);
    }

    return new Response(JSON.stringify({ success: true, resposta: { id: resposta.id, tipo: tipoResposta } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro';
    return new Response(JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
