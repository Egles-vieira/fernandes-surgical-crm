import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizarNumeroWhatsApp, buscarContatoCRM } from "../_shared/phone-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let webhookLogId: string | null = null;

  try {
    const payload = await req.json();
    console.log('📥 Webhook W-API recebido:', JSON.stringify(payload, null, 2));

    // Validar que o sistema está em modo não oficial com W-API
    const { data: config } = await supabase
      .from('whatsapp_configuracao_global')
      .select('modo_api, provedor_ativo')
      .eq('esta_ativo', true)
      .single();

    if (config?.modo_api !== 'nao_oficial' || config?.provedor_ativo !== 'w_api') {
      console.warn('⚠️ Sistema não está configurado para W-API');
      return new Response(
        JSON.stringify({ error: 'Sistema não está em modo W-API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar webhook no log e capturar ID
    const { data: logEntry, error: logError } = await supabase.from('whatsapp_webhooks_log').insert({
      provedor: 'w_api',
      tipo_evento: payload.event || payload.status || 'unknown',
      payload: payload,
      recebido_em: new Date().toISOString(),
      processado: false,
    }).select('id').single();

    if (logError) {
      console.error('❌ Erro ao criar log de webhook:', logError);
    } else {
      webhookLogId = logEntry?.id;
      console.log('📝 Webhook logado com ID:', webhookLogId);
    }

    const eventoTipo = payload.event || payload.status || 'unknown';
    console.log('🔍 Evento detectado:', eventoTipo);

    // Processar baseado no evento
    if (payload.event === 'message.received' || payload.event === 'webhookReceived') {
      console.log('✅ Iniciando processamento de mensagem recebida...');
      
      try {
        await processarMensagemRecebida(supabase, payload);
        
        // Marcar como processado com sucesso
        if (webhookLogId) {
          await supabase.from('whatsapp_webhooks_log')
            .update({ 
              processado: true,
              processado_em: new Date().toISOString()
            })
            .eq('id', webhookLogId);
          console.log('✅ Webhook marcado como processado');
        }
      } catch (processError) {
        const errorMessage = processError instanceof Error ? processError.message : 'Erro desconhecido no processamento';
        const errorStack = processError instanceof Error ? processError.stack : '';
        console.error('❌ Erro ao processar mensagem:', errorMessage);
        console.error('Stack:', errorStack);
        
        // Registrar erro no log
        if (webhookLogId) {
          await supabase.from('whatsapp_webhooks_log')
            .update({ 
              processado: false,
              erro_processamento: `${errorMessage}\n${errorStack}`,
              processado_em: new Date().toISOString()
            })
            .eq('id', webhookLogId);
        }
      }
    } else if (payload.event === 'message.status.update') {
      console.log('✅ Iniciando atualização de status...');
      
      try {
        await atualizarStatusMensagem(supabase, payload);
        
        if (webhookLogId) {
          await supabase.from('whatsapp_webhooks_log')
            .update({ 
              processado: true,
              processado_em: new Date().toISOString()
            })
            .eq('id', webhookLogId);
        }
      } catch (statusError) {
        const errorMessage = statusError instanceof Error ? statusError.message : 'Erro ao atualizar status';
        console.error('❌ Erro ao atualizar status:', errorMessage);
        
        if (webhookLogId) {
          await supabase.from('whatsapp_webhooks_log')
            .update({ 
              processado: false,
              erro_processamento: errorMessage,
              processado_em: new Date().toISOString()
            })
            .eq('id', webhookLogId);
        }
      }
    } else if (payload.event === 'connection.update' || payload.status) {
      console.log('📡 Atualização de conexão/status:', payload.data || payload);
      
      if (webhookLogId) {
        await supabase.from('whatsapp_webhooks_log')
          .update({ 
            processado: true,
            processado_em: new Date().toISOString()
          })
          .eq('id', webhookLogId);
      }
    } else {
      console.log('⚠️ Evento não reconhecido - ignorando:', eventoTipo);
      
      if (webhookLogId) {
        await supabase.from('whatsapp_webhooks_log')
          .update({ 
            processado: true,
            erro_processamento: `Evento não reconhecido: ${eventoTipo}`,
            processado_em: new Date().toISOString()
          })
          .eq('id', webhookLogId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, webhookLogId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro crítico no webhook W-API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Tentar registrar erro no log se temos o ID
    if (webhookLogId) {
      try {
        await supabase.from('whatsapp_webhooks_log')
          .update({ 
            processado: false,
            erro_processamento: `Erro crítico: ${errorMessage}`,
            processado_em: new Date().toISOString()
          })
          .eq('id', webhookLogId);
      } catch (logErr) {
        console.error('❌ Não foi possível atualizar log de erro:', logErr);
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processarMensagemRecebida(supabase: any, payload: any) {
  console.log('📨 [STEP 1] Iniciando processamento de mensagem W-API');

  // Mapear tipo de mensagem do provedor para os valores aceitos no banco
  const mapTipoMensagem = (src: any): string => {
    try {
      const m = src?.message || src?.msgContent || {};
      if (m.imageMessage) return 'imagem';
      if (m.videoMessage) return 'video';
      if (m.audioMessage) return 'audio';
      if (m.documentMessage) return 'documento';
      if (m.locationMessage) return 'localizacao';
      if (m.contactMessage) return 'contato';
      return 'texto';
    } catch {
      return 'texto';
    }
  };

  const instanceId = payload.instanceId || payload.data?.instanceId;
  const isNewSchema = payload.event === 'webhookReceived';
  
  console.log('📨 [STEP 2] Instance ID:', instanceId, '| Schema novo:', isNewSchema);
  
  if (!instanceId) {
    throw new Error('instanceId não encontrado no payload');
  }

  // Extrair dados de forma resiliente (suporta esquema antigo e novo)
  let numeroRemetente = '';
  let messageId = '';
  let pushName = '';
  let messageText = '';
  let messageType = 'text';
  let timestamp = new Date().toISOString();

  if (!isNewSchema && payload.data) {
    const messageData = payload.data;
    numeroRemetente = (messageData.key?.remoteJid || '').replace('@s.whatsapp.net', '').replace('@c.us', '');
    messageId = messageData.key?.id || crypto.randomUUID();
    pushName = messageData.pushName || numeroRemetente;
    messageText = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || '';
    messageType = mapTipoMensagem(messageData);
    timestamp = messageData.messageTimestamp ? new Date(messageData.messageTimestamp * 1000).toISOString() : new Date().toISOString();
  } else {
    numeroRemetente = (payload.sender?.id || payload.chat?.id || '').replace(/\D/g, '');
    messageId = payload.messageId || crypto.randomUUID();
    pushName = payload.sender?.pushName || numeroRemetente;
    messageText = payload.msgContent?.conversation || '';
    messageType = mapTipoMensagem(payload);
    timestamp = payload.moment ? new Date(payload.moment * 1000).toISOString() : new Date().toISOString();
  }

  console.log('📨 [STEP 3] Dados extraídos:', { 
    numeroRemetente, 
    messageId, 
    pushName, 
    messageType, 
    temTexto: !!messageText 
  });

  if (!numeroRemetente) {
    throw new Error('Número do remetente não encontrado no payload');
  }
  
  // Extrair informações de mídia (URL, mime, arquivo) de forma resiliente
  let mediaUrl: string | null = null;
  let mediaMime: string | null = null;
  let mediaFileName: string | null = null;
  let mediaKind: 'image' | 'video' | 'audio' | 'document' | null = null;
  let audioMetadata: any = null;

  try {
    const content = !isNewSchema && payload.data
      ? (payload.data.message || payload.data.msgContent || {})
      : (payload.msgContent || payload.message || payload.data?.message || {});
    
    const img = (content as any)?.imageMessage;
    const vid = (content as any)?.videoMessage;
    const aud = (content as any)?.audioMessage;
    const doc = (content as any)?.documentMessage;

    if (img) {
      mediaUrl = img.url || img.originalUrl || img.mediaUrl || img.directPath || null;
      mediaMime = img.mimetype || img.mimeType || 'image/jpeg';
      mediaFileName = img.fileName || null;
      mediaKind = 'image';
      if (!messageText && (img.caption || img.captionText)) messageText = img.caption || img.captionText;
    } else if (vid) {
      mediaUrl = vid.url || vid.originalUrl || vid.mediaUrl || vid.directPath || null;
      mediaMime = vid.mimetype || vid.mimeType || 'video/mp4';
      mediaFileName = vid.fileName || null;
      mediaKind = 'video';
      if (!messageText && (vid.caption || vid.captionText)) messageText = vid.caption || vid.captionText;
    } else if (aud) {
        mediaUrl = aud.url || aud.mediaUrl || aud.directPath || null;
        mediaMime = aud.mimetype || aud.mimeType || 'audio/ogg';
        mediaFileName = aud.fileName || null;
        mediaKind = 'audio';
        
        // Capturar mediaKey e outros metadados para descriptografia
        audioMetadata = {};
        if (aud.mediaKey) {
          audioMetadata.mediaKey = aud.mediaKey;
          audioMetadata.fileEncSha256 = aud.fileEncSha256;
          audioMetadata.fileSha256 = aud.fileSha256;
          audioMetadata.fileLength = aud.fileLength;
          console.log('🔑 Metadados de descriptografia capturados');
        }
        
        console.log('🎤 Áudio detectado:', {
          url: mediaUrl,
          mime: mediaMime,
          hasMediaKey: !!aud.mediaKey,
        });
    } else if (doc) {
      mediaUrl = doc.url || doc.mediaUrl || doc.directPath || null;
      mediaMime = doc.mimetype || doc.mimeType || null;
      mediaFileName = doc.fileName || doc.title || null;
      mediaKind = 'document';
    }
  } catch (e) {
    console.warn('⚠️ Falha ao extrair mídia do payload:', e);
  }

  // Ignorar mensagens enviadas por nós mesmos ou de grupos
  if (payload.fromMe === true || payload.isGroup === true) {
    console.log('↩️ Ignorando mensagem de nós mesmos ou de grupo');
    return;
  }

  // STEP 4: Buscar conta WhatsApp pelo instance_id
  console.log('📨 [STEP 4] Buscando conta W-API para instanceId:', instanceId);
  
  const { data: conta, error: contaError } = await supabase
    .from('whatsapp_contas')
    .select('*')
    .eq('instance_id_wapi', instanceId)
    .eq('provedor', 'w_api')
    .eq('status', 'ativo')
    .single();

  if (contaError) {
    console.error('❌ Erro ao buscar conta:', contaError);
    throw new Error(`Erro ao buscar conta W-API: ${contaError.message}`);
  }

  if (!conta) {
    throw new Error(`Conta W-API não encontrada para instanceId: ${instanceId}`);
  }

  console.log('📨 [STEP 5] Conta encontrada:', conta.id, conta.nome);

  // STEP 5: Normalizar número e buscar contato no CRM
  const numeroNormalizado = normalizarNumeroWhatsApp(numeroRemetente);
  console.log('📨 [STEP 6] Número normalizado:', numeroNormalizado);
  
  const contatoIdCRM = await buscarContatoCRM(supabase, numeroNormalizado);
  console.log('📨 [STEP 7] Contato CRM encontrado:', contatoIdCRM);

  // STEP 6: Buscar ou criar contato WhatsApp
  const numeroApenasDigitos = numeroNormalizado;
  const variacoesNumero = [numeroApenasDigitos, `+${numeroApenasDigitos}`];

  const { data: contatosPorNumero, error: contatosError } = await supabase
    .from('whatsapp_contatos')
    .select('id, numero_whatsapp, contato_id, criado_em')
    .eq('whatsapp_conta_id', conta.id)
    .in('numero_whatsapp', variacoesNumero);

  if (contatosError) {
    console.error('❌ Erro ao buscar contatos:', contatosError);
  }

  let contatosPorCRM: any[] = [];
  if (contatoIdCRM) {
    const { data } = await supabase
      .from('whatsapp_contatos')
      .select('id, numero_whatsapp, contato_id, criado_em')
      .eq('whatsapp_conta_id', conta.id)
      .eq('contato_id', contatoIdCRM);
    contatosPorCRM = data || [];
  }

  // Unificar resultados e remover duplicados
  const mapaContatos: Record<string, any> = {};
  [...(contatosPorNumero || []), ...contatosPorCRM].forEach((c: any) => {
    mapaContatos[c.id] = c;
  });
  const contatosCandidatos = Object.values(mapaContatos);

  let contato = contatosCandidatos[0] as any | undefined;
  if (contatosCandidatos.length > 1) {
    const preferido = contatosCandidatos.find((c: any) => c.numero_whatsapp === numeroApenasDigitos);
    if (preferido) contato = preferido;
    console.warn('⚠️ Múltiplos whatsapp_contatos encontrados:', contatosCandidatos.length);
  }

  if (!contato) {
    console.log('📨 [STEP 8] Criando novo contato WhatsApp');
    const { data: novoContato, error: novoContatoError } = await supabase
      .from('whatsapp_contatos')
      .insert({
        whatsapp_conta_id: conta.id,
        numero_whatsapp: numeroApenasDigitos,
        nome_whatsapp: pushName,
        contato_id: contatoIdCRM || null,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (novoContatoError) {
      throw new Error(`Erro ao criar contato WhatsApp: ${novoContatoError.message}`);
    }
    contato = novoContato;
  } else if (contatoIdCRM && !contato.contato_id) {
    console.log('🔗 Vinculando contato WhatsApp existente ao CRM');
    const { data: contatoAtualizado } = await supabase
      .from('whatsapp_contatos')
      .update({ contato_id: contatoIdCRM })
      .eq('id', contato.id)
      .select()
      .single();
    contato = contatoAtualizado || contato;
  }

  if (!contato) {
    throw new Error('Erro ao criar/buscar contato WhatsApp');
  }

  console.log('📨 [STEP 9] Contato WhatsApp:', contato.id);

  // STEP 7: Buscar conversa ativa existente
  const contatoIdsParaBusca = (contatosCandidatos && contatosCandidatos.length > 0)
    ? (contatosCandidatos as any[]).map((c: any) => c.id)
    : [contato.id];

  let { data: conversasAtivas, error: conversasError } = await supabase
    .from('whatsapp_conversas')
    .select('*')
    .eq('whatsapp_conta_id', conta.id)
    .in('whatsapp_contato_id', contatoIdsParaBusca)
    .neq('status', 'fechada')
    .order('janela_24h_ativa', { ascending: false })
    .order('ultima_mensagem_em', { ascending: false });

  if (conversasError) {
    console.error('❌ Erro ao buscar conversas:', conversasError);
  }

  let conversa = conversasAtivas && conversasAtivas.length > 0 ? conversasAtivas[0] : null;

  if (!conversa) {
    console.log('📨 [STEP 10] Criando nova conversa');
    const { data: novaConversa, error: novaConversaError } = await supabase
      .from('whatsapp_conversas')
      .insert({
        whatsapp_conta_id: conta.id,
        whatsapp_contato_id: contato.id,
        status: 'aberta',
        janela_24h_ativa: true,
        janela_aberta_em: new Date().toISOString(),
        janela_fecha_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ultima_mensagem_em: timestamp,
      })
      .select()
      .single();
    
    if (novaConversaError) {
      throw new Error(`Erro ao criar conversa: ${novaConversaError.message}`);
    }
    conversa = novaConversa;
  } else {
    console.log('📨 [STEP 10] Atualizando conversa existente:', conversa.id);
    await supabase
      .from('whatsapp_conversas')
      .update({
        janela_24h_ativa: true,
        janela_aberta_em: new Date().toISOString(),
        janela_fecha_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ultima_mensagem_em: timestamp,
      })
      .eq('id', conversa.id);
  }

  if (!conversa) {
    throw new Error('Erro ao criar/buscar conversa');
  }

  console.log('📨 [STEP 11] Conversa:', conversa.id);

  // STEP 8: Verificar duplicidade
  const { data: msgExistente } = await supabase
    .from('whatsapp_mensagens')
    .select('id, conversa_id')
    .eq('mensagem_externa_id', messageId)
    .maybeSingle();

  if (msgExistente) {
    console.log('ℹ️ Mensagem já processada, evitando duplicidade:', messageId);
    return;
  }

  // STEP 9: Inserir mensagem
  console.log('📨 [STEP 12] Inserindo mensagem no banco');
  const { data: novaMensagem, error: msgError } = await supabase.from('whatsapp_mensagens').insert({
    conversa_id: conversa.id,
    whatsapp_conta_id: conta.id,
    whatsapp_contato_id: contato.id,
    corpo: messageText,
    direcao: 'recebida',
    tipo_mensagem: messageType,
    status: 'entregue',
    mensagem_externa_id: messageId,
    recebida_em: timestamp,
    criado_em: new Date().toISOString(),
    tem_midia: !!mediaUrl,
    tipo_midia: mediaKind,
    url_midia: mediaUrl,
    mime_type: mediaMime,
    nome_arquivo: mediaFileName,
    metadata: mediaKind === 'audio' && audioMetadata ? audioMetadata : null,
  }).select().single();

  if (msgError) {
    throw new Error(`Erro ao inserir mensagem: ${msgError.message}`);
  }

  console.log('✅ [STEP 13] Mensagem processada com sucesso:', novaMensagem?.id);

  // 🤖 AGENTE DE VENDAS: Processar mensagem automaticamente se ativo
  console.log('🔍 Verificando agente:', { 
    agente_ativo: conta.agente_vendas_ativo, 
    tem_texto: !!messageText, 
    tipo: messageType,
    tem_midia: !!mediaUrl 
  });
  
  // Ativar agente para mensagens de texto OU áudio (que será transcrito)
  if (conta.agente_vendas_ativo && (messageType === 'texto' || messageType === 'audio')) {
    console.log('🤖 Agente de vendas ativo - processando mensagem');
    
    try {
      // Buscar cliente_id do contato CRM
      let clienteId = null;
      if (contatoIdCRM) {
        const { data: contatoCRM } = await supabase
          .from('contatos')
          .select('cliente_id')
          .eq('id', contatoIdCRM)
          .single();
        
        clienteId = contatoCRM?.cliente_id;
        console.log('👤 Cliente ID encontrado:', clienteId);
      }

      // Chamar agente de vendas
      const { data: agenteData, error: agenteError } = await supabase.functions.invoke('agente-vendas-whatsapp', {
        body: {
          mensagemTexto: messageText || '',
          conversaId: conversa.id,
          contatoId: contato.id,
          clienteId: clienteId,
          tipoMensagem: messageType,
          urlMidia: mediaUrl || null
        }
      });

      if (agenteError) {
        console.error('❌ Erro ao invocar agente:', agenteError);
        return;
      }

      if (agenteData?.resposta) {
        console.log('🤖 Resposta do agente recebida');
        
        // Inserir resposta do agente no banco
        const { data: respostaAgente, error: respostaError } = await supabase
          .from('whatsapp_mensagens')
          .insert({
            conversa_id: conversa.id,
            whatsapp_conta_id: conta.id,
            whatsapp_contato_id: contato.id,
            corpo: agenteData.resposta,
            direcao: 'enviada',
            tipo_mensagem: 'texto',
            status: 'pendente',
            criado_em: new Date().toISOString(),
            enviada_por_bot: true,
            metadata: { 
              gerada_por_agente: true,
              tipo_origem: messageType,
              produtos_encontrados: agenteData.produtos_encontrados || []
            }
          })
          .select()
          .single();

        if (respostaError) {
          console.error('❌ Erro ao inserir resposta do agente:', respostaError);
          return;
        }

        // Enviar via W-API
        if (respostaAgente) {
          try {
            const { data: contatoData } = await supabase
              .from('whatsapp_contatos')
              .select('numero_whatsapp')
              .eq('id', contato.id)
              .single();

            const numeroDestinatario = contatoData?.numero_whatsapp;
            
            if (!numeroDestinatario) {
              console.error('❌ Número do destinatário não encontrado');
              await supabase.from('whatsapp_mensagens')
                .update({
                  status: 'erro',
                  erro_mensagem: 'Número do destinatário não encontrado',
                  status_falhou_em: new Date().toISOString()
                })
                .eq('id', respostaAgente.id);
              return;
            }

            if (!conta.token_wapi || !conta.instance_id_wapi) {
              console.error('❌ Credenciais W-API não configuradas');
              await supabase.from('whatsapp_mensagens')
                .update({
                  status: 'erro',
                  erro_mensagem: 'Credenciais W-API não configuradas',
                  status_falhou_em: new Date().toISOString()
                })
                .eq('id', respostaAgente.id);
              return;
            }

            const sendUrl = `https://api.w-api.app/v1/message/send-text?instanceId=${conta.instance_id_wapi}`;
            
            console.log('📤 Enviando resposta via W-API para:', numeroDestinatario);
            
            const sendResponse = await fetch(sendUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${conta.token_wapi}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone: numeroDestinatario,
                message: agenteData.resposta,
                delayMessage: 3
              }),
            });

            if (sendResponse.ok) {
              const sendResult = await sendResponse.json();
              console.log('✅ Resposta do agente enviada, messageId:', sendResult.messageId);
              
              await supabase.from('whatsapp_mensagens')
                .update({
                  status: 'enviada',
                  mensagem_externa_id: sendResult.messageId,
                  status_enviada_em: new Date().toISOString()
                })
                .eq('id', respostaAgente.id);
            } else {
              const errorBody = await sendResponse.text();
              console.error('❌ Erro W-API:', sendResponse.status, errorBody);
              
              await supabase.from('whatsapp_mensagens')
                .update({
                  status: 'erro',
                  erro_mensagem: `W-API error ${sendResponse.status}: ${errorBody}`,
                  status_falhou_em: new Date().toISOString()
                })
                .eq('id', respostaAgente.id);
            }
          } catch (sendError) {
            const error = sendError as Error;
            console.error('❌ Erro de rede ao enviar via W-API:', error.message);
            
            await supabase.from('whatsapp_mensagens')
              .update({
                status: 'erro',
                erro_mensagem: `Network error: ${error.message}`,
                status_falhou_em: new Date().toISOString()
              })
              .eq('id', respostaAgente.id);
          }
        }
      }
    } catch (agenteError) {
      console.error('❌ Erro ao processar agente de vendas:', agenteError);
    }
  }
}

async function atualizarStatusMensagem(supabase: any, payload: any) {
  console.log('📊 Atualizando status W-API:', payload);

  const messageId = payload.data?.key?.id;
  const status = payload.data?.status;

  if (!messageId) {
    throw new Error('messageId não encontrado no payload de status');
  }

  const statusMap: { [key: string]: string } = {
    'PENDING': 'pendente',
    'SERVER_ACK': 'enviada',
    'DELIVERY_ACK': 'entregue',
    'READ': 'lida',
    'PLAYED': 'lida',
    'DELETED': 'erro',
    'ERROR': 'erro',
  };

  const novoStatus = statusMap[status] || 'enviada';

  const updateData: any = {
    status: novoStatus,
  };

  if (novoStatus === 'enviada') {
    updateData.status_enviada_em = new Date().toISOString();
  } else if (novoStatus === 'entregue') {
    updateData.status_entregue_em = new Date().toISOString();
  } else if (novoStatus === 'lida') {
    updateData.status_lida_em = new Date().toISOString();
  }

  await supabase
    .from('whatsapp_mensagens')
    .update(updateData)
    .eq('mensagem_externa_id', messageId);

  console.log('✅ Status W-API atualizado:', messageId, '->', novoStatus);
}
