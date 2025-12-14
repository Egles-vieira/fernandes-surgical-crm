// ============================================
// Meta API - Marcar Mensagem como Lida
// Envia status "read" para a Meta API
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

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

    if (!mensagemId) {
      return new Response(
        JSON.stringify({ error: 'mensagemId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`👁️ [meta-api-marcar-lida] mensagemId: ${mensagemId}`);

    // Buscar mensagem com conta
    const { data: mensagem, error: mensagemError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contas (
          id,
          meta_phone_number_id,
          phone_number_id,
          meta_access_token
        )
      `)
      .eq('id', mensagemId)
      .single();

    if (mensagemError || !mensagem) {
      console.error('❌ Mensagem não encontrada:', mensagemError);
      return new Response(
        JSON.stringify({ error: 'Mensagem não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Só marcar como lida mensagens recebidas
    if (mensagem.direcao !== 'recebida') {
      return new Response(
        JSON.stringify({ success: true, message: 'Apenas mensagens recebidas podem ser marcadas como lidas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Já foi marcada como lida?
    if (mensagem.lida_confirmada_em) {
      return new Response(
        JSON.stringify({ success: true, message: 'Mensagem já marcada como lida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se tem mensagem_externa_id
    if (!mensagem.mensagem_externa_id) {
      console.warn('⚠️ Mensagem não tem ID externo para marcar como lida');
      return new Response(
        JSON.stringify({ success: true, message: 'Mensagem sem ID externo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conta = mensagem.whatsapp_contas as any;

    if (!conta) {
      throw new Error('Conta WhatsApp não encontrada');
    }

    const phoneNumberId = conta.meta_phone_number_id || conta.phone_number_id;
    const accessToken = conta.meta_access_token || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');

    if (!phoneNumberId || !accessToken) {
      throw new Error('Phone Number ID ou Access Token não configurado');
    }

    // Build mark as read payload
    const readPayload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: mensagem.mensagem_externa_id,
    };

    console.log('📤 Marcando mensagem como lida via Meta API:', {
      messageId: mensagem.mensagem_externa_id,
    });

    const apiUrl = `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/messages`;

    const metaResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(readPayload),
    });

    const responseData = await metaResponse.json();
    console.log('📥 Meta API response:', JSON.stringify(responseData));

    if (!metaResponse.ok || responseData.error) {
      console.error('❌ Meta API error:', responseData);
      // Não falhar a operação por erro de mark as read
      return new Response(
        JSON.stringify({ 
          success: false,
          error: responseData.error?.message || 'Erro ao marcar como lida',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar mensagem no banco
    await supabase
      .from('whatsapp_mensagens')
      .update({
        lida_confirmada_em: new Date().toISOString(),
      })
      .eq('id', mensagemId);

    console.log('✅ Mensagem marcada como lida com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in meta-api-marcar-lida:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
