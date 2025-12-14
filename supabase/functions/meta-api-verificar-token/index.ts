// ============================================
// Meta API - Verificar Token
// Verifica se o token está válido e busca expiração
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_URL = 'https://graph.facebook.com';
const META_API_VERSION = 'v21.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { contaId } = await req.json();

    if (!contaId) {
      return new Response(
        JSON.stringify({ success: false, error: 'contaId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar conta WhatsApp
    const { data: conta, error: contaError } = await supabase
      .from('whatsapp_contas')
      .select('*')
      .eq('id', contaId)
      .single();

    if (contaError || !conta) {
      console.error('❌ Conta não encontrada:', contaError);
      return new Response(
        JSON.stringify({ success: false, error: 'Conta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = conta.meta_access_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access Token não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Verificando token para conta: ${contaId}`);

    // Debug token para verificar validade e expiração
    const debugResponse = await fetch(
      `${META_GRAPH_URL}/debug_token?input_token=${accessToken}&access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!debugResponse.ok) {
      const errorData = await debugResponse.json();
      console.error('❌ Erro ao verificar token:', errorData);
      
      // Marcar como expirado
      await supabase
        .from('whatsapp_contas')
        .update({
          token_expira_em: new Date().toISOString(), // Marca como expirado
          token_renovacao_tentativas: (conta.token_renovacao_tentativas || 0) + 1,
        })
        .eq('id', contaId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          tokenValid: false,
          error: errorData.error?.message || 'Token inválido ou expirado',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const debugData = await debugResponse.json();
    const tokenData = debugData.data;

    console.log('🔍 Debug token result:', JSON.stringify(tokenData, null, 2));

    const isValid = tokenData.is_valid === true;
    const expiresAt = tokenData.expires_at 
      ? new Date(tokenData.expires_at * 1000).toISOString() 
      : null;
    
    // Calcular dias restantes
    let daysRemaining: number | null = null;
    if (expiresAt) {
      const now = new Date();
      const expDate = new Date(expiresAt);
      daysRemaining = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Token "never expires" (System User Token) não tem expires_at
    const neverExpires = !tokenData.expires_at || tokenData.expires_at === 0;

    // Atualizar banco
    const updateData: any = {
      token_renovacao_tentativas: 0, // Reset tentativas
    };

    if (!neverExpires && expiresAt) {
      updateData.token_expira_em = expiresAt;
    } else if (neverExpires) {
      // Token permanente - setar data muito futura
      updateData.token_expira_em = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    await supabase
      .from('whatsapp_contas')
      .update(updateData)
      .eq('id', contaId);

    // Log no histórico
    await supabase
      .from('whatsapp_tokens_log')
      .insert({
        conta_id: contaId,
        tipo_evento: 'verificacao',
        token_novo_expira_em: updateData.token_expira_em,
        status: isValid ? 'sucesso' : 'erro',
        metadata: {
          app_id: tokenData.app_id,
          type: tokenData.type,
          scopes: tokenData.scopes,
          granular_scopes: tokenData.granular_scopes,
          expires_at: tokenData.expires_at,
          is_valid: tokenData.is_valid,
          never_expires: neverExpires,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        tokenValid: isValid,
        expiresAt: neverExpires ? null : expiresAt,
        daysRemaining: neverExpires ? null : daysRemaining,
        neverExpires,
        appId: tokenData.app_id,
        type: tokenData.type,
        scopes: tokenData.scopes || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em meta-api-verificar-token:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
