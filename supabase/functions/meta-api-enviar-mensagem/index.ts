// ============================================
// Meta API - Enviar Mensagem
// CRÍTICO: Usa SEMPRE phone_number_id (não waba_id)
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Meta API Version - Sempre usar a mais recente
const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

// Códigos de erro específicos da Meta
const META_ERROR_CODES = {
  INVALID_PHONE_NUMBER_ID: { code: 100, subcode: 33 },
  TOKEN_EXPIRED: { code: 190 },
  RATE_LIMITED: { code: 80007 },
  TEMPLATE_NOT_FOUND: { code: 132000 },
  MESSAGE_OUTSIDE_WINDOW: { code: 131047 },
};

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

    const { mensagemId } = await req.json();

    if (!mensagemId) {
      return new Response(
        JSON.stringify({ error: 'mensagemId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 [meta-api-enviar-mensagem] Iniciando envio - mensagemId: ${mensagemId}`);

    // Fetch message with account and contact data
    const { data: mensagem, error: mensagemError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contas (
          id,
          phone_number_id,
          meta_phone_number_id,
          meta_access_token,
          api_version,
          provedor,
          status
        ),
        whatsapp_contatos (
          numero_whatsapp
        )
      `)
      .eq('id', mensagemId)
      .eq('status', 'pendente')
      .single();

    if (mensagemError || !mensagem) {
      console.error('❌ Mensagem não encontrada:', mensagemError);
      return new Response(
        JSON.stringify({ 
          error: 'Mensagem não encontrada ou já processada',
          details: mensagemError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conta = mensagem.whatsapp_contas as any;
    const contato = mensagem.whatsapp_contatos as any;

    // Validações críticas
    if (!conta) {
      throw new Error('Conta WhatsApp não encontrada');
    }

    if (!contato) {
      throw new Error('Contato não encontrado');
    }

    if (conta.provedor !== 'meta_cloud_api') {
      throw new Error(`Provedor inválido: ${conta.provedor}. Esperado: meta_cloud_api`);
    }

    // CRÍTICO: Usar meta_phone_number_id (não waba_id!)
    const phoneNumberId = conta.meta_phone_number_id || conta.phone_number_id;
    
    if (!phoneNumberId) {
      console.error('❌ ERRO CRÍTICO: Phone Number ID não configurado');
      
      // Atualiza mensagem com erro específico
      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: 'Phone Number ID não configurado. Configure nas configurações do WhatsApp.',
          erro_codigo: '100',
          status_falhou_em: new Date().toISOString(),
        })
        .eq('id', mensagemId);

      return new Response(
        JSON.stringify({ 
          error: 'Phone Number ID não configurado',
          errorCode: 100,
          errorSubcode: 33,
          action: 'settings',
          message: 'Configure o Phone Number ID (não o WABA ID) nas configurações do WhatsApp.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Access Token - usar meta_access_token da conta
    const accessToken = conta.meta_access_token || Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    
    if (!accessToken) {
      throw new Error('Access Token não configurado');
    }

    // Format phone number - sempre com código do país
    let numeroDestino = (contato.numero_whatsapp || '').replace(/\D/g, '');
    if (!numeroDestino.startsWith('55')) {
      numeroDestino = `55${numeroDestino}`;
    }

    console.log('📤 Enviando via Meta Cloud API:', {
      phoneNumberId: `***${phoneNumberId.slice(-4)}`,
      to: `***${numeroDestino.slice(-4)}`,
      type: mensagem.tipo_mensagem || mensagem.tipo,
      apiVersion: META_API_VERSION,
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

    // Build API URL - SEMPRE usar phoneNumberId
    const apiUrl = `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/messages`;

    // Send via Meta Cloud API com retry
    let metaResponse: Response;
    let responseData: any;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        metaResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messagePayload),
        });

        responseData = await metaResponse.json();
        
        // Se não for erro de rate limit, não tenta novamente
        if (!responseData.error || responseData.error.code !== 80007) {
          break;
        }

        // Rate limit - espera e tenta novamente
        retryCount++;
        if (retryCount <= maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`⏳ Rate limited. Aguardando ${waitTime}ms antes de retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (fetchError) {
        console.error(`❌ Fetch error (tentativa ${retryCount + 1}):`, fetchError);
        retryCount++;
        if (retryCount > maxRetries) {
          throw fetchError;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`📥 Meta API response (${executionTime}ms):`, JSON.stringify(responseData));

    if (!metaResponse!.ok || responseData.error) {
      console.error('❌ Meta API error:', responseData);

      // Tratamento específico de erros
      const errorCode = responseData.error?.code;
      const errorSubcode = responseData.error?.error_subcode;
      let userFriendlyMessage = responseData.error?.message || 'Erro desconhecido';
      let action = 'retry';

      // Erro 100/33 - Phone Number ID inválido
      if (errorCode === 100 && errorSubcode === 33) {
        userFriendlyMessage = 'Erro de Configuração: Verifique se você está usando o Phone Number ID (não o WABA ID) e se o token possui as permissões corretas.';
        action = 'settings';
      }
      // Erro 190 - Token expirado
      else if (errorCode === 190) {
        userFriendlyMessage = 'Token expirado. Renove o token no Meta Developer Console.';
        action = 'renew_token';
      }
      // Erro 131047 - Fora da janela de 24h
      else if (errorCode === 131047) {
        userFriendlyMessage = 'Janela de 24h expirada. Use um template aprovado para iniciar a conversa.';
        action = 'use_template';
      }

      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: userFriendlyMessage,
          erro_codigo: errorCode?.toString() || null,
          status_falhou_em: new Date().toISOString(),
        })
        .eq('id', mensagemId);

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

    // Update message status - sucesso
    await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        mensagem_externa_id: responseData.messages?.[0]?.id || null,
        status_enviada_em: new Date().toISOString(),
      })
      .eq('id', mensagemId);

    console.log(`✅ Mensagem enviada com sucesso em ${executionTime}ms - ID: ${responseData.messages?.[0]?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.messages?.[0]?.id,
        executionTimeMs: executionTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in meta-api-enviar-mensagem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
