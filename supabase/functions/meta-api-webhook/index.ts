import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle GET for webhook verification
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('META_WHATSAPP_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verification successful');
      return new Response(challenge, { status: 200 });
    }

    console.error('❌ Webhook verification failed');
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate signature for security
    const signature = req.headers.get('x-hub-signature-256');
    const body = await req.text();
    
    if (signature) {
      const appSecret = Deno.env.get('META_WHATSAPP_APP_SECRET');
      if (appSecret) {
        const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
          .update(body)
          .digest('hex');
        
        if (signature !== expectedSignature) {
          console.error('❌ Invalid signature');
          return new Response('Invalid signature', { status: 401 });
        }
      }
    }

    const payload = JSON.parse(body);
    console.log('📥 Meta Webhook received:', JSON.stringify(payload, null, 2));

    // Log webhook
    await supabase.from('whatsapp_webhooks_log').insert({
      provedor: 'meta_cloud_api',
      tipo_evento: payload.object || 'unknown',
      payload_completo: payload,
    });

    // Process entries
    if (payload.entry) {
      for (const entry of payload.entry) {
        const wabaId = entry.id;
        
        // Find account by waba_id
        const { data: conta } = await supabase
          .from('whatsapp_contas')
          .select('*')
          .eq('waba_id', wabaId)
          .eq('provedor', 'meta_cloud_api')
          .single();

        if (!conta) {
          console.warn(`⚠️ Account not found for WABA ID: ${wabaId}`);
          continue;
        }

        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await processarMensagemRecebida(supabase, conta, message, value.contacts?.[0]);
              }
            }

            // Process status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                await atualizarStatusMensagem(supabase, status);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in meta-api-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processarMensagemRecebida(supabase: any, conta: any, message: any, contact: any) {
  console.log('📨 Processing message:', message.id);

  const numeroRemetente = message.from;
  const messageId = message.id;
  const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

  // Find or create contact
  let { data: contato } = await supabase
    .from('whatsapp_contatos')
    .select('*')
    .eq('numero_whatsapp', numeroRemetente)
    .eq('whatsapp_conta_id', conta.id)
    .single();

  if (!contato) {
    const { data: novoContato } = await supabase
      .from('whatsapp_contatos')
      .insert({
        whatsapp_conta_id: conta.id,
        numero_whatsapp: numeroRemetente,
        nome: contact?.profile?.name || 'Desconhecido',
        provedor_contato_id: numeroRemetente,
      })
      .select()
      .single();
    contato = novoContato;
  }

  // Find or create conversation
  let { data: conversa } = await supabase
    .from('whatsapp_conversas')
    .select('*')
    .eq('whatsapp_contato_id', contato.id)
    .eq('status', 'ativa')
    .single();

  if (!conversa) {
    const { data: novaConversa } = await supabase
      .from('whatsapp_conversas')
      .insert({
        whatsapp_conta_id: conta.id,
        whatsapp_contato_id: contato.id,
        status: 'ativa',
        origem_atendimento: 'receptivo',
        unidade_id: conta.unidade_padrao_id,
      })
      .select()
      .single();
    conversa = novaConversa;
  }

  // Extract message content
  let corpo = '';
  let tipoMensagem = message.type;
  let midiaDados: any = null;

  switch (message.type) {
    case 'text':
      corpo = message.text?.body || '';
      break;
    case 'image':
      corpo = message.image?.caption || '[Imagem]';
      midiaDados = { media_id: message.image?.id, mime_type: message.image?.mime_type };
      break;
    case 'audio':
      corpo = '[Áudio]';
      midiaDados = { media_id: message.audio?.id, mime_type: message.audio?.mime_type };
      break;
    case 'video':
      corpo = message.video?.caption || '[Vídeo]';
      midiaDados = { media_id: message.video?.id, mime_type: message.video?.mime_type };
      break;
    case 'document':
      corpo = message.document?.filename || '[Documento]';
      midiaDados = { media_id: message.document?.id, mime_type: message.document?.mime_type };
      break;
    case 'location':
      corpo = `[Localização: ${message.location?.latitude}, ${message.location?.longitude}]`;
      break;
    case 'button':
      corpo = message.button?.text || '[Botão]';
      break;
    case 'interactive':
      corpo = message.interactive?.button_reply?.title || 
              message.interactive?.list_reply?.title || '[Interativo]';
      break;
    default:
      corpo = `[${message.type}]`;
  }

  // Insert message
  const { data: novaMensagem, error } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      whatsapp_conversa_id: conversa.id,
      whatsapp_conta_id: conta.id,
      whatsapp_contato_id: contato.id,
      direcao: 'recebida',
      tipo: tipoMensagem,
      corpo,
      mensagem_externa_id: messageId,
      status: 'recebida',
      status_recebida_em: timestamp,
      metadados: midiaDados ? { midia: midiaDados } : null,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting message:', error);
    return;
  }

  console.log('✅ Message saved:', novaMensagem.id);

  // Check if agent is active for this account
  if (conta.agente_vendas_ativo && (message.type === 'text' || message.type === 'audio')) {
    try {
      const response = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/agente-vendas-whatsapp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            mensagemId: novaMensagem.id,
            conversaId: conversa.id,
            contatoId: contato.id,
            contaId: conta.id,
            mensagemTexto: corpo,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.resposta) {
          // Send agent response via Meta API
          await enviarRespostaAgente(supabase, conta, conversa, contato, result.resposta);
        }
      }
    } catch (agentError) {
      console.error('❌ Agent error:', agentError);
    }
  }
}

async function enviarRespostaAgente(supabase: any, conta: any, conversa: any, contato: any, resposta: string) {
  const { data: mensagemAgente } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      whatsapp_conversa_id: conversa.id,
      whatsapp_conta_id: conta.id,
      whatsapp_contato_id: contato.id,
      direcao: 'enviada',
      tipo: 'text',
      corpo: resposta,
      status: 'pendente',
      enviado_por_agente: true,
    })
    .select()
    .single();

  if (mensagemAgente) {
    // Call meta-api-enviar-mensagem
    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-api-enviar-mensagem`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ mensagemId: mensagemAgente.id }),
      }
    );
  }
}

async function atualizarStatusMensagem(supabase: any, status: any) {
  const statusMap: Record<string, string> = {
    sent: 'enviada',
    delivered: 'entregue',
    read: 'lida',
    failed: 'erro',
  };

  const novoStatus = statusMap[status.status] || status.status;
  const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();

  const updateData: any = { status: novoStatus };
  
  if (status.status === 'sent') updateData.status_enviada_em = timestamp;
  if (status.status === 'delivered') updateData.status_entregue_em = timestamp;
  if (status.status === 'read') updateData.status_lida_em = timestamp;
  if (status.status === 'failed') {
    updateData.status_falhou_em = timestamp;
    updateData.erro_mensagem = status.errors?.[0]?.message;
    updateData.erro_codigo = status.errors?.[0]?.code;
  }

  await supabase
    .from('whatsapp_mensagens')
    .update(updateData)
    .eq('mensagem_externa_id', status.id);

  console.log(`📊 Status updated for ${status.id}: ${novoStatus}`);
}
