// ============================================
// Meta API - Enviar Reação
// Envia/Remove reações em mensagens via Meta Cloud API
// REGRA CRÍTICA: Só pode reagir a mensagens recebidas nos últimos 7 dias
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

// Limite de 7 dias (504 horas) para reações
const REACTION_TIME_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { mensagemId, emoji, userId } = await req.json();

    if (!mensagemId) {
      return new Response(
        JSON.stringify({ error: 'mensagemId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`😊 [meta-api-enviar-reacao] mensagemId: ${mensagemId}, emoji: ${emoji || '(remover)'}`);

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
        ),
        whatsapp_contatos (
          numero_whatsapp
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

    // REGRA CRÍTICA: Verificar limite de 7 dias
    const messageDate = new Date(mensagem.criado_em);
    const now = new Date();
    const timeDiff = now.getTime() - messageDate.getTime();

    if (timeDiff > REACTION_TIME_LIMIT_MS) {
      console.error('❌ Mensagem muito antiga para reação (> 7 dias)');
      return new Response(
        JSON.stringify({ 
          error: 'Não é possível reagir a mensagens com mais de 7 dias',
          errorCode: 'REACTION_TOO_OLD'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se tem mensagem_externa_id (necessário para reação)
    if (!mensagem.mensagem_externa_id) {
      console.error('❌ Mensagem não tem ID externo');
      return new Response(
        JSON.stringify({ error: 'Mensagem não possui ID externo para reação' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conta = mensagem.whatsapp_contas as any;
    const contato = mensagem.whatsapp_contatos as any;

    if (!conta || !contato) {
      throw new Error('Conta ou contato não encontrado');
    }

    const phoneNumberId = conta.meta_phone_number_id || conta.phone_number_id;
    const accessToken = conta.meta_access_token || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');

    if (!phoneNumberId || !accessToken) {
      throw new Error('Phone Number ID ou Access Token não configurado');
    }

    // Format phone number
    let numeroDestino = (contato.numero_whatsapp || '').replace(/\D/g, '');
    if (!numeroDestino.startsWith('55')) {
      numeroDestino = `55${numeroDestino}`;
    }

    // Build reaction payload
    // emoji = "" para remover reação
    const reactionPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: numeroDestino,
      type: 'reaction',
      reaction: {
        message_id: mensagem.mensagem_externa_id,
        emoji: emoji || '', // String vazia remove a reação
      },
    };

    console.log('📤 Enviando reação via Meta API:', {
      to: `***${numeroDestino.slice(-4)}`,
      messageId: mensagem.mensagem_externa_id,
      emoji: emoji || '(remover)',
    });

    const apiUrl = `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/messages`;

    const metaResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reactionPayload),
    });

    const responseData = await metaResponse.json();
    console.log('📥 Meta API response:', JSON.stringify(responseData));

    if (!metaResponse.ok || responseData.error) {
      console.error('❌ Meta API error:', responseData);
      return new Response(
        JSON.stringify({ 
          error: responseData.error?.message || 'Erro ao enviar reação',
          errorCode: responseData.error?.code,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar/atualizar reação no banco
    if (emoji) {
      // Inserir ou atualizar reação
      const { error: upsertError } = await supabase
        .from('whatsapp_reacoes')
        .upsert({
          mensagem_id: mensagemId,
          emoji,
          reagido_por_tipo: 'usuario',
          reagido_por_usuario_id: userId,
          mensagem_externa_id: responseData.messages?.[0]?.id,
        }, {
          onConflict: 'mensagem_id,reagido_por_usuario_id',
        });

      if (upsertError) {
        console.error('⚠️ Erro ao salvar reação no banco:', upsertError);
      }
    } else {
      // Remover reação
      await supabase
        .from('whatsapp_reacoes')
        .delete()
        .eq('mensagem_id', mensagemId)
        .eq('reagido_por_usuario_id', userId);
    }

    console.log(`✅ Reação ${emoji ? 'enviada' : 'removida'} com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messages?.[0]?.id,
        emoji: emoji || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in meta-api-enviar-reacao:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
