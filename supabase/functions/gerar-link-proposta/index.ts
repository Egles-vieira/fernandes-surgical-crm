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
    const { vendaId, config } = await req.json();

    if (!vendaId) {
      return new Response(
        JSON.stringify({ error: 'vendaId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const publicToken = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: existingToken } = await supabase
      .from('propostas_publicas_tokens')
      .select('id, public_token')
      .eq('venda_id', vendaId)
      .eq('ativo', true)
      .maybeSingle();

    if (existingToken) {
      return new Response(
        JSON.stringify({ success: true, token: existingToken.public_token, isNew: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: newToken, error: insertError } = await supabase
      .from('propostas_publicas_tokens')
      .insert({
        venda_id: vendaId,
        public_token: publicToken,
        ativo: true,
        mostrar_precos: config?.mostrar_precos ?? true,
        mostrar_descontos: config?.mostrar_descontos ?? true,
        permitir_aceitar: config?.permitir_aceitar ?? true,
        permitir_recusar: config?.permitir_recusar ?? true,
        permitir_download_pdf: config?.permitir_download_pdf ?? true,
        mensagem_personalizada: config?.mensagem_personalizada || null,
        expira_em: config?.expira_em || null
      })
      .select('id, public_token')
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, token: newToken.public_token, isNew: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
