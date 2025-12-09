import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📊 [registrar-visualizacao-proposta] Requisição recebida');

  try {
    const { tokenId, vendaId, sessionId, deviceInfo } = await req.json();

    console.log('📊 [registrar-visualizacao-proposta] Dados:', { tokenId, vendaId, sessionId });

    if (!tokenId || !vendaId || !sessionId) {
      console.error('❌ Parâmetros obrigatórios ausentes');
      return new Response(
        JSON.stringify({ error: 'tokenId, vendaId e sessionId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar SERVICE_ROLE_KEY para bypass de RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Inserir registro de analytics
    const { data, error } = await supabase
      .from('propostas_analytics')
      .insert({
        proposta_token_id: tokenId,
        venda_id: vendaId,
        session_id: sessionId,
        device_type: deviceInfo?.device_type || 'unknown',
        os_name: deviceInfo?.os_name || 'Unknown',
        os_version: deviceInfo?.os_version || '',
        browser_name: deviceInfo?.browser_name || 'Unknown',
        browser_version: deviceInfo?.browser_version || '',
        screen_width: deviceInfo?.screen_width || 0,
        screen_height: deviceInfo?.screen_height || 0
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erro ao inserir analytics:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Analytics registrado com sucesso:', data.id);

    return new Response(
      JSON.stringify({ id: data.id, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
