// ============================================
// Meta API - Enviar Template
// CRÍTICO: Usa SEMPRE phone_number_id (não waba_id)
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Meta API Version
const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { 
      contaId, 
      numeroDestino, 
      templateName, 
      languageCode = 'pt_BR',
      components = [],
      conversaId,
      contatoId,
    } = await req.json();

    // Validate required fields
    if (!contaId || !numeroDestino || !templateName) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: contaId, numeroDestino, templateName' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 [meta-api-enviar-template] Iniciando - template: ${templateName}, destino: ***${numeroDestino.slice(-4)}`);

    // Fetch account
    const { data: conta, error: contaError } = await supabase
      .from('whatsapp_contas')
      .select('*')
      .eq('id', contaId)
      .eq('provedor', 'meta_cloud_api')
      .single();

    if (contaError || !conta) {
      console.error('❌ Conta não encontrada:', contaError);
      return new Response(
        JSON.stringify({ error: 'Conta Meta Cloud API não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRÍTICO: Usar meta_phone_number_id (não waba_id!)
    const phoneNumberId = conta.meta_phone_number_id || conta.phone_number_id;
    
    if (!phoneNumberId) {
      console.error('❌ Phone Number ID não configurado');
      return new Response(
        JSON.stringify({ 
          error: 'Phone Number ID não configurado',
          errorCode: 100,
          errorSubcode: 33,
          action: 'settings',
          message: 'Configure o Phone Number ID nas configurações do WhatsApp.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    let numero = (numeroDestino || '').replace(/\D/g, '');
    if (!numero.startsWith('55')) {
      numero = `55${numero}`;
    }

    const accessToken = conta.meta_access_token || conta.access_token || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access Token não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build template payload
    const templatePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: numero,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components,
      },
    };

    console.log('📤 Sending template via Meta Cloud API:', {
      to: numero,
      template: templateName,
    });

    // Build API URL - SEMPRE usar phoneNumberId
    const apiUrl = `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/messages`;

    console.log('📤 Enviando template via Meta Cloud API:', {
      phoneNumberId: `***${phoneNumberId.slice(-4)}`,
      to: `***${numero.slice(-4)}`,
      template: templateName,
    });

    // Send via Meta Cloud API
    const metaResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templatePayload),
    });

    const responseData = await metaResponse.json();
    const executionTime = Date.now() - startTime;
    console.log(`📥 Meta API response (${executionTime}ms):`, JSON.stringify(responseData));

    if (!metaResponse.ok || responseData.error) {
      console.error('❌ Meta API error:', responseData);
      
      const errorCode = responseData.error?.code;
      const errorSubcode = responseData.error?.error_subcode;
      let userFriendlyMessage = responseData.error?.message || 'Erro desconhecido';
      let action = 'retry';

      // Tratamento específico de erros
      if (errorCode === 100 && errorSubcode === 33) {
        userFriendlyMessage = 'Erro de Configuração: Verifique se você está usando o Phone Number ID correto.';
        action = 'settings';
      } else if (errorCode === 190) {
        userFriendlyMessage = 'Token expirado. Renove no Meta Developer Console.';
        action = 'renew_token';
      } else if (errorCode === 132000) {
        userFriendlyMessage = 'Template não encontrado ou não aprovado.';
        action = 'check_template';
      }

      return new Response(
        JSON.stringify({ 
          error: userFriendlyMessage,
          errorCode,
          errorSubcode,
          action,
          originalError: responseData.error,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create message record if conversaId and contatoId provided
    if (conversaId && contatoId) {
      const messageExternalId = responseData.messages?.[0]?.id || null;

      const { error: insertMsgError } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversaId,
          whatsapp_conta_id: contaId,
          whatsapp_contato_id: contatoId,
          direcao: 'enviada',
          tipo_mensagem: 'template',
          corpo: `[Template: ${templateName}]`,
          mensagem_externa_id: messageExternalId,
          status: 'enviada',
          status_enviada_em: new Date().toISOString(),
          metadata: {
            template_name: templateName,
            language_code: languageCode,
            components,
          },
        });

      if (insertMsgError) {
        console.error('❌ Falha ao salvar mensagem de template no banco:', insertMsgError);
        // Se não persistir, a UI não vai exibir; portanto retornamos erro.
        return new Response(
          JSON.stringify({ error: 'Falha ao registrar template enviado no chat.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log template usage for analytics
    await supabase.from('whatsapp_auditoria').insert({
      tipo_evento: 'template_enviado',
      descricao: `Template "${templateName}" enviado para ${numero}`,
      whatsapp_conta_id: contaId,
      whatsapp_conversa_id: conversaId || null,
      dados_evento: {
        template_name: templateName,
        language_code: languageCode,
        message_id: responseData.messages?.[0]?.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messages?.[0]?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in meta-api-enviar-template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
