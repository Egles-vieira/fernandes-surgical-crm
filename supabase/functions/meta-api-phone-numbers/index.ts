// ============================================
// Edge Function: meta-api-phone-numbers
// Gerencia phone numbers da Meta Cloud API
// Suporta: sync, register, deregister
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_GRAPH_URL = 'https://graph.facebook.com';
const META_API_VERSION = 'v21.0';

interface PhoneNumberFromMeta {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  name_status?: string;
  code_verification_status?: string;
  platform_type?: string;
  throughput?: {
    level?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, contaId, phoneNumberId, pin } = await req.json();

    console.log(`[meta-api-phone-numbers] Action: ${action}, ContaId: ${contaId}`);

    // Buscar conta
    const { data: conta, error: contaError } = await supabase
      .from('whatsapp_contas')
      .select('id, meta_waba_id, meta_access_token')
      .eq('id', contaId)
      .single();

    if (contaError || !conta) {
      console.error('[meta-api-phone-numbers] Conta não encontrada:', contaError);
      return new Response(
        JSON.stringify({ error: 'Conta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wabaId = conta.meta_waba_id;
    const accessToken = conta.meta_access_token;

    if (!wabaId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'WABA ID ou Access Token não configurados' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== SYNC ==========
    if (action === 'sync') {
      console.log('[meta-api-phone-numbers] Sincronizando números...');

      const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,name_status,code_verification_status,platform_type,throughput`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const data = await response.json();

      if (data.error) {
        console.error('[meta-api-phone-numbers] Erro Meta API:', data.error);
        return new Response(
          JSON.stringify({ 
            error: data.error.message || 'Erro ao buscar números',
            meta_error: data.error
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const phoneNumbers: PhoneNumberFromMeta[] = data.data || [];
      console.log(`[meta-api-phone-numbers] Encontrados ${phoneNumbers.length} números`);

      // Upsert cada número
      for (const phone of phoneNumbers) {
        const { error: upsertError } = await supabase
          .from('whatsapp_phone_numbers')
          .upsert({
            conta_id: contaId,
            phone_number_id: phone.id,
            display_phone_number: phone.display_phone_number,
            verified_name: phone.verified_name,
            quality_rating: phone.quality_rating,
            name_status: phone.name_status,
            code_verification_status: phone.code_verification_status,
            platform_type: phone.platform_type,
            throughput_level: phone.throughput?.level,
            ultima_sincronizacao_em: new Date().toISOString()
          }, {
            onConflict: 'conta_id,phone_number_id'
          });

        if (upsertError) {
          console.error('[meta-api-phone-numbers] Erro upsert:', upsertError);
        }
      }

      // Atualizar timestamp na conta
      await supabase
        .from('whatsapp_contas')
        .update({ phone_numbers_sincronizados_em: new Date().toISOString() })
        .eq('id', contaId);

      // Buscar números atualizados
      const { data: updatedNumbers } = await supabase
        .from('whatsapp_phone_numbers')
        .select('*')
        .eq('conta_id', contaId)
        .order('criado_em', { ascending: true });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${phoneNumbers.length} números sincronizados`,
          phoneNumbers: updatedNumbers || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== REGISTER ==========
    if (action === 'register') {
      if (!phoneNumberId || !pin) {
        return new Response(
          JSON.stringify({ error: 'phoneNumberId e pin são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[meta-api-phone-numbers] Registrando número ${phoneNumberId}...`);

      const url = `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/register`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: pin
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error('[meta-api-phone-numbers] Erro ao registrar:', data.error);
        return new Response(
          JSON.stringify({ 
            error: data.error.message || 'Erro ao registrar número',
            meta_error: data.error
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar status no banco
      await supabase
        .from('whatsapp_phone_numbers')
        .update({ 
          is_registered: true,
          atualizado_em: new Date().toISOString()
        })
        .eq('phone_number_id', phoneNumberId)
        .eq('conta_id', contaId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Número registrado com sucesso'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== DEREGISTER ==========
    if (action === 'deregister') {
      if (!phoneNumberId) {
        return new Response(
          JSON.stringify({ error: 'phoneNumberId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[meta-api-phone-numbers] Desregistrando número ${phoneNumberId}...`);

      const url = `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/deregister`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.error) {
        console.error('[meta-api-phone-numbers] Erro ao desregistrar:', data.error);
        return new Response(
          JSON.stringify({ 
            error: data.error.message || 'Erro ao desregistrar número',
            meta_error: data.error
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar status no banco
      await supabase
        .from('whatsapp_phone_numbers')
        .update({ 
          is_registered: false,
          atualizado_em: new Date().toISOString()
        })
        .eq('phone_number_id', phoneNumberId)
        .eq('conta_id', contaId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Número desregistrado com sucesso'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== SET PRINCIPAL ==========
    if (action === 'set_principal') {
      if (!phoneNumberId) {
        return new Response(
          JSON.stringify({ error: 'phoneNumberId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[meta-api-phone-numbers] Definindo ${phoneNumberId} como principal...`);

      // Remover principal de todos os números da conta
      await supabase
        .from('whatsapp_phone_numbers')
        .update({ is_principal: false })
        .eq('conta_id', contaId);

      // Definir o novo principal
      await supabase
        .from('whatsapp_phone_numbers')
        .update({ is_principal: true })
        .eq('phone_number_id', phoneNumberId)
        .eq('conta_id', contaId);

      // Atualizar meta_phone_number_id na conta
      await supabase
        .from('whatsapp_contas')
        .update({ meta_phone_number_id: phoneNumberId })
        .eq('id', contaId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Número definido como principal'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida. Use: sync, register, deregister, set_principal' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[meta-api-phone-numbers] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
