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

  // Função auxiliar para limpar número de telefone
  const limparNumero = (numero: string): string => {
    return numero.replace(/\D/g, ''); // Remove tudo exceto dígitos
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
    messageType = messageData.messageType || 'text';
    timestamp = new Date(messageData.messageTimestamp * 1000).toISOString();
  } else {
    numeroRemetente = (payload.sender?.id || payload.chat?.id || '').replace(/\D/g, '');
    messageId = payload.messageId || crypto.randomUUID();
    pushName = payload.sender?.pushName || numeroRemetente;
    messageText = payload.msgContent?.conversation || '';
    messageType = 'text';
    timestamp = payload.moment ? new Date(payload.moment * 1000).toISOString() : new Date().toISOString();
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

  // 2. Buscar contato no CRM pelo número de telefone
  console.log('🔍 Buscando contato no CRM pelo número:', numeroRemetente);
  const numeroLimpo = limparNumero(numeroRemetente);
  
  const { data: contatoCRM } = await supabase
    .from('contatos')
    .select('id')
    .or(`telefone.ilike.%${numeroLimpo}%,celular.ilike.%${numeroLimpo}%,whatsapp_numero.ilike.%${numeroLimpo}%`)
    .limit(1)
    .maybeSingle();

  const contatoIdCRM = contatoCRM?.id || null;
  
  if (contatoIdCRM) {
    console.log('✅ Contato encontrado no CRM:', contatoIdCRM);
  } else {
    console.log('ℹ️ Contato não encontrado no CRM, será criado sem vínculo');
  }

  // 3. Buscar ou criar contato WhatsApp
  let { data: contato } = await supabase
    .from('whatsapp_contatos')
    .select('*')
    .eq('numero_whatsapp', numeroRemetente)
    .eq('whatsapp_conta_id', conta.id)
    .single();

  if (!contato) {
    console.log('➕ Criando novo contato WhatsApp com vínculo CRM');
    const { data: novoContato } = await supabase
      .from('whatsapp_contatos')
      .insert({
        whatsapp_conta_id: conta.id,
        numero_whatsapp: numeroRemetente,
        nome_whatsapp: pushName,
        contato_id: contatoIdCRM, // Vincula ao CRM se encontrado
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

  // 4. Buscar ou criar conversa
  let { data: conversa } = await supabase
    .from('whatsapp_conversas')
    .select('*')
    .eq('whatsapp_conta_id', conta.id)
    .eq('whatsapp_contato_id', contato.id)
    .single();

  if (!conversa) {
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
    // Atualizar janela de 24h
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

  // 5. Inserir mensagem
  await supabase.from('whatsapp_mensagens').insert({
    conversa_id: conversa.id,
    whatsapp_conta_id: conta.id,
    whatsapp_contato_id: contato.id,
    corpo: messageText,
    direcao: 'recebida',
    tipo_mensagem: messageType,
    status: 'entregue',
    id_mensagem_externa: messageId,
    recebida_em: timestamp,
    criado_em: new Date().toISOString(),
  });

  console.log('✅ Mensagem W-API processada com sucesso');
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
    atualizado_em: new Date().toISOString(),
  };

  if (novoStatus === 'enviada' && !updateData.enviada_em) {
    updateData.enviada_em = new Date().toISOString();
  } else if (novoStatus === 'entregue') {
    updateData.entregue_em = new Date().toISOString();
  } else if (novoStatus === 'lida') {
    updateData.lida_em = new Date().toISOString();
  }

  await supabase
    .from('whatsapp_mensagens')
    .update(updateData)
    .eq('id_mensagem_externa', messageId);

  console.log('✅ Status W-API atualizado:', messageId, '->', novoStatus);
}
