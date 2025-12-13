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

    const { mensagemId } = await req.json();

    // Fetch message with account and contact data
    const { data: mensagem, error: mensagemError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contas (
          phone_number_id,
          meta_access_token,
          api_version,
          provedor
        ),
        whatsapp_contatos (
          numero_whatsapp
        )
      `)
      .eq('id', mensagemId)
      .eq('status', 'pendente')
      .single();

    if (mensagemError || !mensagem) {
      console.error('❌ Message not found:', mensagemError);
      throw new Error('Mensagem não encontrada');
    }

    const conta = mensagem.whatsapp_contas as any;
    const contato = mensagem.whatsapp_contatos as any;

    if (!conta || !contato) {
      throw new Error('Conta ou contato não encontrado');
    }

    if (conta.provedor !== 'meta_cloud_api') {
      throw new Error('Conta não é do provedor Meta Cloud API');
    }

    // Format phone number
    let numeroDestino = (contato.numero_whatsapp || '').replace(/\D/g, '');
    if (!numeroDestino.startsWith('55')) {
      numeroDestino = `55${numeroDestino}`;
    }

    const apiVersion = conta.api_version || 'v18.0';
    const accessToken = conta.meta_access_token || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');

    console.log('📤 Sending message via Meta Cloud API:', {
      phone_number_id: conta.phone_number_id,
      to: numeroDestino,
      type: mensagem.tipo,
    });

    // Build message payload
    let messagePayload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: numeroDestino,
    };

    switch (mensagem.tipo) {
      case 'text':
        messagePayload.type = 'text';
        messagePayload.text = { body: mensagem.corpo };
        break;
      case 'image':
        messagePayload.type = 'image';
        messagePayload.image = mensagem.midia_url 
          ? { link: mensagem.midia_url, caption: mensagem.corpo }
          : { id: mensagem.metadados?.media_id, caption: mensagem.corpo };
        break;
      case 'audio':
        messagePayload.type = 'audio';
        messagePayload.audio = mensagem.midia_url 
          ? { link: mensagem.midia_url }
          : { id: mensagem.metadados?.media_id };
        break;
      case 'video':
        messagePayload.type = 'video';
        messagePayload.video = mensagem.midia_url 
          ? { link: mensagem.midia_url, caption: mensagem.corpo }
          : { id: mensagem.metadados?.media_id, caption: mensagem.corpo };
        break;
      case 'document':
        messagePayload.type = 'document';
        messagePayload.document = mensagem.midia_url 
          ? { link: mensagem.midia_url, filename: mensagem.corpo }
          : { id: mensagem.metadados?.media_id, filename: mensagem.corpo };
        break;
      case 'template':
        messagePayload.type = 'template';
        messagePayload.template = mensagem.metadados?.template || {
          name: mensagem.metadados?.template_name,
          language: { code: mensagem.metadados?.language || 'pt_BR' },
          components: mensagem.metadados?.components || [],
        };
        break;
      case 'interactive':
        messagePayload.type = 'interactive';
        messagePayload.interactive = mensagem.metadados?.interactive;
        break;
      default:
        messagePayload.type = 'text';
        messagePayload.text = { body: mensagem.corpo };
    }

    // Send via Meta Cloud API
    const metaResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${conta.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const responseData = await metaResponse.json();
    console.log('📥 Meta API response:', responseData);

    if (!metaResponse.ok || responseData.error) {
      console.error('❌ Meta API error:', responseData);

      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: responseData.error?.message || JSON.stringify(responseData),
          erro_codigo: responseData.error?.code?.toString() || null,
          status_falhou_em: new Date().toISOString(),
        })
        .eq('id', mensagemId);

      throw new Error(`Meta API error: ${responseData.error?.message || 'Unknown error'}`);
    }

    // Update message status
    await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        mensagem_externa_id: responseData.messages?.[0]?.id || null,
        status_enviada_em: new Date().toISOString(),
      })
      .eq('id', mensagemId);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messages?.[0]?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in meta-api-enviar-mensagem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
