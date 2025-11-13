import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mensagemId } = await req.json();
    console.log('📤 Enviando imagem via W-API, mensagemId:', mensagemId);

    // 1. Buscar mensagem pendente e dados relacionados
    const { data: mensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contatos!inner(
          numero_whatsapp,
          whatsapp_contas!inner(
            instance_id_wapi,
            token_wapi
          )
        )
      `)
      .eq('id', mensagemId)
      .eq('status', 'pendente')
      .single();

    if (msgError || !mensagem) {
      throw new Error(`Mensagem não encontrada ou já processada: ${msgError?.message}`);
    }

    const conta = mensagem.whatsapp_contatos.whatsapp_contas;
    const instanceId = conta.instance_id_wapi;
    const token = conta.token_wapi;
    const numeroDestinatario = mensagem.whatsapp_contatos.numero_whatsapp.replace(/\D/g, '');

    // 2. Verificar status da instância
    const statusUrl = `https://api.w-api.app/v1/instance/status-instance?instanceId=${instanceId}`;
    const statusRes = await fetch(statusUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!statusRes.ok) {
      throw new Error(`Falha ao verificar status: ${statusRes.status}`);
    }

    const statusData = await statusRes.json();
    if (!statusData.connected) {
      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: 'Instância desconectada do WhatsApp',
          status_falhou_em: new Date().toISOString(),
        })
        .eq('id', mensagemId);

      return new Response(
        JSON.stringify({
          error: 'Instância desconectada do WhatsApp no provedor W-API',
          statusData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Baixar imagem do Storage e converter para base64
    console.log('📥 Baixando imagem do Storage:', mensagem.url_midia);
    
    let imageBase64: string;
    try {
      const imageResponse = await fetch(mensagem.url_midia);
      if (!imageResponse.ok) {
        throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
      }
      
      const imageBlob = await imageResponse.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(imageBlob).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Detectar mimetype ou usar o da mensagem
      const mimeType = mensagem.mime_type || 'image/jpeg';
      imageBase64 = `data:${mimeType};base64,${base64String}`;
      
      console.log('✅ Imagem convertida para base64, tamanho:', imageBlob.byteLength, 'bytes');
    } catch (downloadError) {
      console.error('❌ Erro ao baixar/converter imagem:', downloadError);
      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: `Erro ao processar imagem: ${downloadError instanceof Error ? downloadError.message : 'Erro desconhecido'}`,
          status_falhou_em: new Date().toISOString(),
          tentativas_envio: mensagem.tentativas_envio + 1,
        })
        .eq('id', mensagemId);
      
      throw downloadError;
    }

    // 4. Preparar payload para W-API com base64
    const payload: any = {
      phone: numeroDestinatario,
      image: imageBase64, // Base64 da imagem
    };

    if (mensagem.corpo) {
      payload.caption = mensagem.corpo;
    }

    // 5. Enviar via W-API
    const wapiUrl = `https://api.w-api.app/v1/message/send-image?instanceId=${instanceId}`;
    const wapiRes = await fetch(wapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!wapiRes.ok) {
      const errorText = await wapiRes.text();
      console.error('❌ Erro W-API:', errorText);
      
      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: `Erro W-API: ${errorText}`,
          status_falhou_em: new Date().toISOString(),
          tentativas_envio: mensagem.tentativas_envio + 1,
        })
        .eq('id', mensagemId);

      throw new Error(`Erro W-API: ${errorText}`);
    }

    const wapiData = await wapiRes.json();
    console.log('✅ Imagem enviada com sucesso:', wapiData);

    // 6. Atualizar status da mensagem
    await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        mensagem_externa_id: wapiData.messageId,
        status_enviada_em: new Date().toISOString(),
        enviada_em: new Date().toISOString(),
      })
      .eq('id', mensagemId);

    return new Response(
      JSON.stringify({ success: true, messageId: wapiData.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar imagem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
