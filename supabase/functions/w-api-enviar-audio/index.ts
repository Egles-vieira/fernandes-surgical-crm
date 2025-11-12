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
    console.log('📤 Enviando áudio via W-API, mensagemId:', mensagemId);

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
      throw new Error(`Mensagem não encontrada: ${msgError?.message}`);
    }

    const conta = mensagem.whatsapp_contatos.whatsapp_contas;
    const numeroDestinatario = mensagem.whatsapp_contatos.numero_whatsapp.replace(/\D/g, '');

    // Verificar conexão
    const statusUrl = `https://api.w-api.app/v1/instance/status-instance?instanceId=${conta.instance_id_wapi}`;
    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${conta.token_wapi}` },
    });

    const statusData = await statusRes.json();
    if (!statusData.connected) {
      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: 'Instância desconectada',
          status_falhou_em: new Date().toISOString(),
        })
        .eq('id', mensagemId);

      return new Response(
        JSON.stringify({ error: 'Instância desconectada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar áudio
    const payload = {
      phone: numeroDestinatario,
      audio: mensagem.url_midia, // MP3/OGG
    };

    const wapiUrl = `https://api.w-api.app/v1/message/send-audio?instanceId=${conta.instance_id_wapi}`;
    const wapiRes = await fetch(wapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${conta.token_wapi}`,
      },
      body: JSON.stringify(payload),
    });

    if (!wapiRes.ok) {
      const errorText = await wapiRes.text();
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
    console.log('✅ Áudio enviado:', wapiData);

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
    console.error('❌ Erro ao enviar áudio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
