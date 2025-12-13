import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      throw new Error('contaId, numeroDestino e templateName são obrigatórios');
    }

    // Fetch account
    const { data: conta, error: contaError } = await supabase
      .from('whatsapp_contas')
      .select('*')
      .eq('id', contaId)
      .eq('provedor', 'meta_cloud_api')
      .single();

    if (contaError || !conta) {
      throw new Error('Conta Meta Cloud API não encontrada');
    }

    // Format phone number
    let numero = (numeroDestino || '').replace(/\D/g, '');
    if (!numero.startsWith('55')) {
      numero = `55${numero}`;
    }

    const apiVersion = conta.api_version || 'v18.0';
    const accessToken = conta.meta_access_token || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');

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

    // Send via Meta Cloud API
    const metaResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${conta.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templatePayload),
      }
    );

    const responseData = await metaResponse.json();
    console.log('📥 Meta API response:', responseData);

    if (!metaResponse.ok || responseData.error) {
      console.error('❌ Meta API error:', responseData);
      throw new Error(`Meta API error: ${responseData.error?.message || 'Unknown error'}`);
    }

    // Create message record if conversaId and contatoId provided
    if (conversaId && contatoId) {
      await supabase
        .from('whatsapp_mensagens')
        .insert({
          whatsapp_conversa_id: conversaId,
          whatsapp_conta_id: contaId,
          whatsapp_contato_id: contatoId,
          direcao: 'enviada',
          tipo: 'template',
          corpo: `[Template: ${templateName}]`,
          mensagem_externa_id: responseData.messages?.[0]?.id || null,
          status: 'enviada',
          status_enviada_em: new Date().toISOString(),
          metadados: {
            template_name: templateName,
            language_code: languageCode,
            components: components,
          },
        });
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
