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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Webhook Gupshup recebido:', JSON.stringify(payload, null, 2));

    // Registrar webhook
    await supabase.from('whatsapp_webhooks_log').insert({
      provedor: 'gupshup',
      tipo_evento: payload.type || 'message',
      payload: payload,
      recebido_em: new Date().toISOString(),
    });

    // Processar mensagem recebida
    if (payload.type === 'message' && payload.payload) {
      await processarMensagemRecebida(supabase, payload.payload);
    }

    // Processar status de mensagem
    if (payload.type === 'message-event' && payload.payload) {
      await processarStatusMensagem(supabase, payload.payload);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no webhook Gupshup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processarMensagemRecebida(supabase: any, payload: any) {
  console.log('Processando mensagem recebida:', payload);

  const numeroRemetente = payload.sender?.phone || payload.from;
  const numeroDestinatario = payload.destination || payload.to;
  const corpoMensagem = payload.payload?.text || payload.text || '';
  const tipoMensagem = payload.type || 'text';

  if (!numeroRemetente) {
    console.error('Número do remetente não encontrado no payload');
    return;
  }

  // Buscar conta WhatsApp pelo número de destino
  const { data: conta } = await supabase
    .from('whatsapp_contas')
    .select('id')
    .eq('phone_number_id', numeroDestinatario)
    .eq('status', 'ativo')
    .single();

  if (!conta) {
    console.error('Conta WhatsApp não encontrada para número:', numeroDestinatario);
    return;
  }

  // Buscar ou criar contato
  let { data: contato } = await supabase
    .from('whatsapp_contatos')
    .select('id')
    .eq('numero_whatsapp', numeroRemetente)
    .eq('whatsapp_conta_id', conta.id)
    .single();

  if (!contato) {
    const { data: novoContato } = await supabase
      .from('whatsapp_contatos')
      .insert({
        whatsapp_conta_id: conta.id,
        numero_whatsapp: numeroRemetente,
        nome_whatsapp: payload.sender?.name || numeroRemetente,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single();
    
    contato = novoContato;
  }

  if (!contato) {
    console.error('Erro ao criar/buscar contato');
    return;
  }

  // Buscar ou criar conversa
  let { data: conversa } = await supabase
    .from('whatsapp_conversas')
    .select('id')
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
        ultima_mensagem_em: new Date().toISOString(),
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
        ultima_mensagem_em: new Date().toISOString(),
      })
      .eq('id', conversa.id);
  }

  // Salvar mensagem
  await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversa.id,
      whatsapp_conta_id: conta.id,
      whatsapp_contato_id: contato.id,
      corpo: corpoMensagem,
      direcao: 'recebida',
      tipo_mensagem: tipoMensagem,
      status: 'entregue',
      id_mensagem_externa: payload.id || payload.gsId,
      recebida_em: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    });

  console.log('Mensagem recebida processada com sucesso');
}

async function processarStatusMensagem(supabase: any, payload: any) {
  console.log('Processando status de mensagem:', payload);

  const messageId = payload.id || payload.gsId;
  const status = payload.status;

  if (!messageId || !status) {
    console.error('ID ou status da mensagem não encontrado');
    return;
  }

  // Mapear status do Gupshup para nosso sistema
  const statusMap: { [key: string]: string } = {
    'sent': 'enviada',
    'delivered': 'entregue',
    'read': 'lida',
    'failed': 'erro',
    'enqueued': 'pendente',
  };

  const novoStatus = statusMap[status.toLowerCase()] || status;

  const updateData: any = {
    status: novoStatus,
    atualizado_em: new Date().toISOString(),
  };

  if (novoStatus === 'entregue') {
    updateData.entregue_em = new Date().toISOString();
  } else if (novoStatus === 'lida') {
    updateData.lida_em = new Date().toISOString();
  }

  await supabase
    .from('whatsapp_mensagens')
    .update(updateData)
    .eq('id_mensagem_externa', messageId);

  console.log('Status de mensagem atualizado:', messageId, '->', novoStatus);
}
