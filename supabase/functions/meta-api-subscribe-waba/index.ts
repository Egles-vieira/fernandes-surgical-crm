// ============================================
// Meta API - Subscribe/Unsubscribe WABA
// Gerencia subscription do webhook para o WABA
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

    const { contaId, action, fields } = await req.json();

    if (!contaId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'contaId e action são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['subscribe', 'unsubscribe'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'action deve ser "subscribe" ou "unsubscribe"' }),
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

    const wabaId = conta.meta_waba_id || conta.waba_id;
    const accessToken = conta.meta_access_token;

    if (!wabaId || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'WABA ID ou Access Token não configurados' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📡 ${action === 'subscribe' ? 'Inscrevendo' : 'Desinscrevendo'} WABA: ${wabaId}`);

    // Campos padrão para subscription
    const subscribeFields = fields || ['messages'];

    if (action === 'subscribe') {
      // POST para inscrever o app no WABA
      const response = await fetch(
        `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro ao inscrever:', errorData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: errorData.error?.message || 'Erro ao inscrever webhook',
            errorCode: errorData.error?.code,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      console.log('✅ Inscrito com sucesso:', result);

      // Atualizar banco
      await supabase
        .from('whatsapp_contas')
        .update({
          subscription_status: 'active',
          subscribed_fields: subscribeFields,
          subscription_verificado_em: new Date().toISOString(),
        })
        .eq('id', contaId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook inscrito com sucesso',
          subscriptionStatus: 'active',
          subscribedFields: subscribeFields,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // DELETE para desinscrever
      const response = await fetch(
        `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/subscribed_apps`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro ao desinscrever:', errorData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: errorData.error?.message || 'Erro ao desinscrever webhook',
            errorCode: errorData.error?.code,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await response.json();
      console.log('✅ Desinscrito com sucesso:', result);

      // Atualizar banco
      await supabase
        .from('whatsapp_contas')
        .update({
          subscription_status: 'inactive',
          subscribed_fields: [],
          subscription_verificado_em: new Date().toISOString(),
        })
        .eq('id', contaId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Webhook desinscrito com sucesso',
          subscriptionStatus: 'inactive',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Erro em meta-api-subscribe-waba:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
