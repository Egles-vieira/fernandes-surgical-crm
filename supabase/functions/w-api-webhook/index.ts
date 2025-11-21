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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    // Registrar webhook no log
    await supabase.from('whatsapp_webhooks_log').insert({
      provedor: 'w_api',
      tipo_evento: payload.event || payload.status || 'unknown',
      payload: payload,
      recebido_em: new Date().toISOString(),
    });

    console.log('🔍 Evento detectado:', payload.event || payload.status || 'unknown');
    console.log('🔍 Payload completo:', JSON.stringify(payload, null, 2));

    // Processar baseado no evento
    if (payload.event === 'message.received' || payload.event === 'webhookReceived') {
      console.log('✅ Iniciando processamento de mensagem recebida...');
      await processarMensagemRecebida(supabase, payload);
    } else if (payload.event === 'message.status.update') {
      console.log('✅ Iniciando atualização de status...');
      await atualizarStatusMensagem(supabase, payload);
    } else if (payload.event === 'connection.update' || payload.status) {
      console.log('📡 Atualização de conexão/status:', payload.data || payload);
    } else {
      console.log('⚠️ Evento não reconhecido - ignorando');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no webhook W-API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processarMensagemRecebida(supabase: any, payload: any) {
  console.log('📨 Processando mensagem W-API:', payload);

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
      // Texto como padrão
      return 'texto';
    } catch {
      return 'texto';
    }
  };

  const instanceId = payload.instanceId || payload.data?.instanceId;
  const isNewSchema = payload.event === 'webhookReceived';
  
  // Extrair dados de forma resiliente (suporta esquema antigo e novo)
  let numeroRemetente = '';
  let messageId = '';
  let pushName = '';
  let messageText = '';
  let messageType = 'text';
  let timestamp = new Date().toISOString();

  if (!isNewSchema && payload.data) {
    const messageData = payload.data;
    numeroRemetente = (messageData.key.remoteJid || '').replace('@s.whatsapp.net', '').replace('@c.us', '');
    messageId = messageData.key.id;
    pushName = messageData.pushName || numeroRemetente;
    messageText = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || '';
    messageType = mapTipoMensagem(messageData);
    timestamp = new Date(messageData.messageTimestamp * 1000).toISOString();
  } else {
    numeroRemetente = (payload.sender?.id || payload.chat?.id || '').replace(/\D/g, '');
    messageId = payload.messageId || crypto.randomUUID();
    pushName = payload.sender?.pushName || numeroRemetente;
    messageText = payload.msgContent?.conversation || '';
    messageType = mapTipoMensagem(payload);
    timestamp = payload.moment ? new Date(payload.moment * 1000).toISOString() : new Date().toISOString();
  }
  
  // Extrair informações de mídia (URL, mime, arquivo) de forma resiliente
  let mediaUrl: string | null = null;
  let mediaMime: string | null = null;
  let mediaFileName: string | null = null;
  let mediaKind: 'image' | 'video' | 'audio' | 'document' | null = null;

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
        
        // Capturar mediaKey para descriptografia posterior
        const mediaKey = aud.mediaKey;
        if (mediaKey) {
          console.log('🔑 mediaKey capturado para áudio');
        }
        
        // Logs detalhados para debug de áudio
        console.log('🎤 Áudio detectado:', {
          url: mediaUrl,
          mime: mediaMime,
          fileName: mediaFileName,
          hasMediaKey: !!mediaKey,
          fullAudioObject: JSON.stringify(aud, null, 2)
        });
    } else if (doc) {
      mediaUrl = doc.url || doc.mediaUrl || doc.directPath || null;
      mediaMime = doc.mimetype || doc.mimeType || null;
      mediaFileName = doc.fileName || doc.title || null;
      mediaKind = 'document';
    }
  } catch (e) {
    console.warn('Falha ao extrair mídia do payload:', e);
  }

  // Ignorar mensagens enviadas por nós mesmos ou de grupos
  if (payload.fromMe === true || payload.isGroup === true) {
    console.log('↩️ Ignorando mensagem de nós mesmos ou de grupo');
    return;
  }

  // 1. Buscar conta WhatsApp pelo instance_id
  const { data: conta } = await supabase
    .from('whatsapp_contas')
    .select('*')
    .eq('instance_id_wapi', instanceId)
    .eq('provedor', 'w_api')
    .eq('status', 'ativo')
    .single();

  if (!conta) {
    console.error('❌ Conta W-API não encontrada para instanceId:', instanceId);
    return;
  }

  // 2. Normalizar número e buscar contato no CRM
  const numeroNormalizado = normalizarNumeroWhatsApp(numeroRemetente);
  const contatoIdCRM = await buscarContatoCRM(supabase, numeroNormalizado);

  // 3. Buscar ou criar contato WhatsApp considerando variações de número e possível vínculo CRM
  const numeroApenasDigitos = numeroNormalizado; // já vem normalizado com dígitos
  const variacoesNumero = [numeroApenasDigitos, `+${numeroApenasDigitos}`];

  // Buscar por número com e sem "+"
  const { data: contatosPorNumero } = await supabase
    .from('whatsapp_contatos')
    .select('id, numero_whatsapp, contato_id, criado_em')
    .eq('whatsapp_conta_id', conta.id)
    .in('numero_whatsapp', variacoesNumero);

  // Opcionalmente buscar por vínculo CRM (se existir)
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
  // Preferir o que já está no formato dígitos (sem "+")
  if (contatosCandidatos.length > 1) {
    const preferido = contatosCandidatos.find((c: any) => c.numero_whatsapp === numeroApenasDigitos);
    if (preferido) contato = preferido;
    console.warn('⚠️ Múltiplos whatsapp_contatos encontrados para o mesmo número:', contatosCandidatos);
  }

  if (!contato) {
    console.log('➕ Criando novo contato WhatsApp com vínculo CRM');
    const { data: novoContato } = await supabase
      .from('whatsapp_contatos')
      .insert({
        whatsapp_conta_id: conta.id,
        numero_whatsapp: numeroApenasDigitos, // padronizar somente dígitos
        nome_whatsapp: pushName,
        contato_id: contatoIdCRM || null, // Vincula ao CRM se encontrado
        criado_em: new Date().toISOString(),
      })
      .select()
      .single();

    contato = novoContato;
  } else if (contatoIdCRM && !contato.contato_id) {
    // Se o contato WhatsApp já existe mas não tem vínculo CRM, atualiza
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
    console.error('❌ Erro ao criar/buscar contato');
    return;
  }

  // 4. Buscar conversa ativa existente (priorizar janela ativa) para qualquer contato candidato
  const contatoIdsParaBusca = (contatosCandidatos && contatosCandidatos.length > 0)
    ? (contatosCandidatos as any[]).map((c: any) => c.id)
    : [contato.id];

  let { data: conversasAtivas } = await supabase
    .from('whatsapp_conversas')
    .select('*')
    .eq('whatsapp_conta_id', conta.id)
    .in('whatsapp_contato_id', contatoIdsParaBusca)
    .neq('status', 'fechada')
    .order('janela_24h_ativa', { ascending: false })
    .order('ultima_mensagem_em', { ascending: false });

  let conversa = conversasAtivas && conversasAtivas.length > 0 ? conversasAtivas[0] : null;

  if (!conversa) {
    // Nenhuma conversa ativa encontrada: criar nova
    const { data: novaConversa } = await supabase
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
    conversa = novaConversa;
  } else {
    // Atualizar janela de 24h e última atividade
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

  // 5. Inserir mensagem (idempotente)
  // Evitar duplicidade caso o provedor reenvie eventos
  const { data: msgExistente } = await supabase
    .from('whatsapp_mensagens')
    .select('id, conversa_id')
    .eq('mensagem_externa_id', messageId)
    .maybeSingle();

  if (msgExistente) {
    console.log('ℹ️ Mensagem já processada, evitando duplicidade:', messageId);
    return;
  }

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
    // Dados de mídia (quando houver)
    tem_midia: !!mediaUrl,
    tipo_midia: mediaKind,
    url_midia: mediaUrl,
    mime_type: mediaMime,
    nome_arquivo: mediaFileName,
  }).select().single();

  if (msgError) {
    console.error('❌ Erro ao inserir mensagem:', msgError);
    return;
  }

  console.log('✅ Mensagem W-API processada com sucesso');

  // 🤖 AGENTE DE VENDAS: Processar mensagem automaticamente se ativo
      console.log('🔍 Verificando agente:', { 
        agente_ativo: conta.agente_vendas_ativo, 
        tem_texto: !!messageText, 
        tipo: messageType,
        tem_midia: !!mediaUrl 
      });
      
      console.log('📋 Dados para o agente:', {
        conversaId: conversa.id,
        contatoId: contato.id,
        tipoMensagem: messageType,
        urlMidia: mediaUrl || null,
        temTexto: !!messageText,
        textoLength: messageText?.length || 0
      });
  
  // Ativar agente para mensagens de texto OU áudio (que será transcrito)
  if (conta.agente_vendas_ativo && (messageType === 'texto' || messageType === 'audio')) {
    console.log('🤖 Agente de vendas ativo - processando mensagem');
    
    try {
      // Chamar agente de vendas com suporte a áudio
      const { data: agenteData, error: agenteError } = await supabase.functions.invoke('agente-vendas-whatsapp', {
        body: {
          mensagemTexto: messageText || '', // Pode estar vazio se for áudio
          conversaId: conversa.id,
          contatoId: contato.id,
          tipoMensagem: messageType,
          urlMidia: mediaUrl || null
        }
      });

      if (agenteError) {
        console.error('❌ Erro ao invocar agente:', agenteError);
        return;
      }

      if (agenteData?.resposta) {
        console.log('🤖 Resposta do agente:', agenteData.resposta);
        
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
              tipo_origem: messageType, // texto ou audio
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
            // Obter número do contato
            const { data: contatoData } = await supabase
              .from('whatsapp_contatos')
              .select('numero_whatsapp')
              .eq('id', contato.id)
              .single();

            const numeroDestinatario = contatoData?.numero_whatsapp;
            
            // Validações antes do envio
            if (!numeroDestinatario) {
              console.error('❌ Número do destinatário não encontrado');
              console.error('Contato ID:', contato.id);
              await supabase
                .from('whatsapp_mensagens')
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
              console.error('Token presente:', !!conta.token_wapi);
              console.error('Instância presente:', !!conta.instance_id_wapi);
              await supabase
                .from('whatsapp_mensagens')
                .update({
                  status: 'erro',
                  erro_mensagem: 'Credenciais W-API não configuradas',
                  status_falhou_em: new Date().toISOString()
                })
                .eq('id', respostaAgente.id);
              return;
            }

            // Construir URL do W-API com instanceId como query parameter
            const sendUrl = `https://api.w-api.app/v1/message/send-text?instanceId=${conta.instance_id_wapi}`;
            
            console.log('📤 Enviando mensagem via W-API');
            console.log('Número destinatário:', numeroDestinatario);
            console.log('URL:', sendUrl);
            console.log('Instância:', conta.instance_id_wapi);
            
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

            console.log('📊 Status da resposta W-API:', sendResponse.status);

            if (sendResponse.ok) {
              const sendResult = await sendResponse.json();
              console.log('✅ Resposta do agente enviada via W-API');
              console.log('Message ID:', sendResult.messageId);
              
              // Atualizar status da mensagem
              await supabase
                .from('whatsapp_mensagens')
                .update({
                  status: 'enviada',
                  mensagem_externa_id: sendResult.messageId,
                  status_enviada_em: new Date().toISOString()
                })
                .eq('id', respostaAgente.id);
            } else {
              const errorBody = await sendResponse.text();
              console.error('❌ Erro ao enviar resposta via W-API');
              console.error('Status HTTP:', sendResponse.status);
              console.error('Response Body:', errorBody);
              console.error('Dados enviados:', {
                phone: numeroDestinatario,
                message: agenteData.resposta,
                delayMessage: 3,
                instancia: conta.instance_id_wapi
              });
              
              // Marcar como erro
              await supabase
                .from('whatsapp_mensagens')
                .update({
                  status: 'erro',
                  erro_mensagem: `W-API error ${sendResponse.status}: ${errorBody}`,
                  status_falhou_em: new Date().toISOString()
                })
                .eq('id', respostaAgente.id);
            }
          } catch (sendError) {
            const error = sendError as Error;
            console.error('❌ Erro de rede ao enviar via W-API:', error);
            console.error('Stack trace:', error.stack);
            
            // Marcar como erro
            await supabase
              .from('whatsapp_mensagens')
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
      // Não falhar o webhook se o agente falhar
    }
  }
}

async function atualizarStatusMensagem(supabase: any, payload: any) {
  console.log('📊 Atualizando status W-API:', payload);

  const messageId = payload.data.key.id;
  const status = payload.data.status;

  // Mapear status do W-API para nosso sistema
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
