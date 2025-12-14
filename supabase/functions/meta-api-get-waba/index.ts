// ============================================
// Meta API - Get WABA Information
// Busca informações do WhatsApp Business Account
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_URL = 'https://graph.facebook.com';
const META_API_VERSION = 'v21.0';

interface WABAInfo {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
  message_template_namespace: string;
  account_review_status: string;
  business_verification_status: string;
  ownership_type: string;
  on_behalf_of_business_info?: {
    name: string;
    id: string;
  };
}

interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  code_verification_status: string;
  name_status: string;
  platform_type?: string;
  throughput?: {
    level: string;
  };
}

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

    const wabaId = conta.meta_waba_id || conta.waba_id;
    const accessToken = conta.meta_access_token;

    if (!wabaId || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'WABA ID ou Access Token não configurados' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📡 Buscando informações do WABA: ${wabaId}`);

    // 1. Buscar informações do WABA
    const wabaResponse = await fetch(
      `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace,account_review_status,business_verification_status,ownership_type,on_behalf_of_business_info`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!wabaResponse.ok) {
      const errorData = await wabaResponse.json();
      console.error('❌ Erro ao buscar WABA:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorData.error?.message || 'Erro ao buscar WABA',
          errorCode: errorData.error?.code,
          errorSubcode: errorData.error?.error_subcode,
        }),
        { status: wabaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wabaInfo: WABAInfo = await wabaResponse.json();
    console.log('✅ WABA info:', JSON.stringify(wabaInfo, null, 2));

    // 2. Buscar Phone Numbers vinculados ao WABA
    const phoneNumbersResponse = await fetch(
      `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,name_status,platform_type,throughput`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    let phoneNumbers: PhoneNumberInfo[] = [];
    if (phoneNumbersResponse.ok) {
      const phoneData = await phoneNumbersResponse.json();
      phoneNumbers = phoneData.data || [];
      console.log(`📱 ${phoneNumbers.length} números encontrados`);
    }

    // 3. Buscar subscription status do webhook
    const subscriptionResponse = await fetch(
      `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/subscribed_apps`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    let subscriptionInfo: any = null;
    if (subscriptionResponse.ok) {
      const subData = await subscriptionResponse.json();
      subscriptionInfo = subData.data || [];
      console.log('📋 Subscriptions:', JSON.stringify(subscriptionInfo, null, 2));
    }

    // 4. Atualizar conta com informações obtidas
    const updateData: any = {
      subscription_verificado_em: new Date().toISOString(),
    };

    // Determinar status da subscription
    if (subscriptionInfo && subscriptionInfo.length > 0) {
      updateData.subscription_status = 'active';
      // Extrair campos subscritos de todas as apps
      const allFields = new Set<string>();
      subscriptionInfo.forEach((app: any) => {
        if (app.whatsapp_business_api_data?.subscribed_fields) {
          app.whatsapp_business_api_data.subscribed_fields.forEach((f: string) => allFields.add(f));
        }
      });
      if (allFields.size > 0) {
        updateData.subscribed_fields = Array.from(allFields);
      }
    } else {
      updateData.subscription_status = 'inactive';
    }

    // Atualizar qualidade da conta se temos phone numbers
    if (phoneNumbers.length > 0) {
      const mainPhone = phoneNumbers.find(p => 
        p.id === (conta.meta_phone_number_id || conta.phone_number_id)
      ) || phoneNumbers[0];
      
      if (mainPhone) {
        updateData.qualidade_conta = mainPhone.quality_rating;
        updateData.nome_exibicao = mainPhone.verified_name;
      }
    }

    await supabase
      .from('whatsapp_contas')
      .update(updateData)
      .eq('id', contaId);

    return new Response(
      JSON.stringify({
        success: true,
        waba: wabaInfo,
        phoneNumbers,
        subscription: {
          status: updateData.subscription_status,
          apps: subscriptionInfo,
          subscribedFields: updateData.subscribed_fields || [],
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em meta-api-get-waba:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
