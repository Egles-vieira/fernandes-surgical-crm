import { z } from 'https://esm.sh/zod@3.22.4';
import { normalizarNumeroWhatsApp, buscarContatoCRM } from "../_shared/phone-utils.ts";
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

/**
 * Obter vendedor disponível para atribuição automática
 * Retorna null se nenhum vendedor estiver disponível (conversa vai para fila)
 */
async function obterVendedorDisponivel(supabase: any, contaId: string): Promise<string | null> {
  try {
    console.log('Buscando vendedor disponível...');
    
    // Buscar vendedores com role 'sales' que estão disponíveis
    const { data: vendedores, error: errorVendedores } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        perfis_usuario!inner(esta_disponivel, max_conversas_simultaneas)
      `)
      .eq('role', 'sales')
      .eq('perfis_usuario.esta_disponivel', true);

    if (errorVendedores) {
      console.error('Erro ao buscar vendedores:', errorVendedores);
      return null;
    }

    if (!vendedores || vendedores.length === 0) {
      console.log('Nenhum vendedor disponível no momento');
      return null;
    }

    console.log(`Encontrados ${vendedores.length} vendedores disponíveis`);

    // Contar conversas abertas por vendedor
    const { data: conversasAtivas, error: errorConversas } = await supabase
      .from('whatsapp_conversas')
      .select('atribuida_para_id')
      .eq('whatsapp_conta_id', contaId)
      .in('status', ['aberta', 'aguardando'])
      .in('atribuida_para_id', vendedores.map((v: any) => v.user_id));

    if (errorConversas) {
      console.error('Erro ao contar conversas:', errorConversas);
    }

    // Calcular carga de trabalho de cada vendedor
    const cargaVendedores = vendedores.map((vendedor: any) => {
      const conversasAbertas = conversasAtivas?.filter(
        (c: any) => c.atribuida_para_id === vendedor.user_id
      ).length || 0;
      
      const maxConversas = vendedor.perfis_usuario?.max_conversas_simultaneas || 5;
      const disponivel = conversasAbertas < maxConversas;

      return {
        userId: vendedor.user_id,
        conversasAbertas,
        maxConversas,
        disponivel,
        carga: conversasAbertas / maxConversas // Percentual de carga
      };
    });

    // Filtrar apenas vendedores que ainda podem receber conversas
    const vendedoresDisponiveis = cargaVendedores.filter((v: any) => v.disponivel);

    if (vendedoresDisponiveis.length === 0) {
      console.log('Todos os vendedores estão no limite de conversas');
      return null;
    }

    // Ordenar por menor carga e retornar o primeiro (round-robin por carga)
    vendedoresDisponiveis.sort((a: any, b: any) => a.carga - b.carga);
    
    const vendedorSelecionado = vendedoresDisponiveis[0];
    console.log(`Vendedor selecionado: ${vendedorSelecionado.userId} (${vendedorSelecionado.conversasAbertas}/${vendedorSelecionado.maxConversas} conversas)`);
    
    return vendedorSelecionado.userId;

  } catch (error) {
    console.error('Erro ao obter vendedor disponível:', error);
    return null;
  }
}

/**
 * Processar mensagem recebida do Gupshup
 * Vincula automaticamente com contatos do CRM e gerencia fila
 */
async function processarMensagemRecebida(supabase: any, payload: any) {
  console.log('Processando mensagem recebida:', payload);

  const numeroRemetente = payload.sender?.phone || payload.from;
  const numeroDestinatario = payload.destination || payload.to;
  const nomeRemetente = payload.sender?.name || '';
  const corpoMensagem = payload.payload?.text || payload.text || '';
  const tipoMensagem = payload.type || 'text';

  if (!numeroRemetente) {
    console.error('Número do remetente não encontrado no payload');
    return;
  }

  // Formatar números para padrão brasileiro
  const formatarNumero = (num: string) => {
    const limpo = num.replace(/\D/g, '');
    if (limpo.startsWith('55')) return `+${limpo}`;
    if (limpo.startsWith('5511') || limpo.startsWith('5521')) return `+${limpo}`;
    return `+55${limpo}`;
  };

  const numeroRemetenteFormatado = formatarNumero(numeroRemetente);
  const numeroDestinatarioFormatado = formatarNumero(numeroDestinatario);

  console.log('Números formatados:', { 
    remetente: numeroRemetenteFormatado, 
    destinatario: numeroDestinatarioFormatado 
  });

  // ETAPA 1: Buscar conta WhatsApp pelo número de destino
  const { data: conta, error: errorConta } = await supabase
    .from('whatsapp_contas')
    .select('id, nome_conta')
    .or(`phone_number_id.eq.${numeroDestinatarioFormatado},numero_whatsapp.eq.${numeroDestinatarioFormatado}`)
    .eq('status', 'ativo')
    .maybeSingle();

  if (errorConta || !conta) {
    console.error('Conta WhatsApp não encontrada para número:', numeroDestinatarioFormatado, errorConta);
    return;
  }

  console.log('Conta WhatsApp encontrada:', conta.nome_conta);

  // ETAPA 2: Buscar se já existe contato no CRM com este número
  let contatoCRM = null;
  const { data: contatosEncontrados, error: errorBuscaContato } = await supabase
    .from('contatos')
    .select('id, conta_id, primeiro_nome, sobrenome, nome_completo')
    .or(`celular.eq.${numeroRemetenteFormatado},telefone.eq.${numeroRemetenteFormatado}`)
    .eq('excluido_em', null)
    .limit(1)
    .maybeSingle();

  if (errorBuscaContato) {
    console.error('Erro ao buscar contato no CRM:', errorBuscaContato);
  }

  if (contatosEncontrados) {
    contatoCRM = contatosEncontrados;
    console.log('✅ Contato existente encontrado no CRM:', contatoCRM.nome_completo || contatoCRM.primeiro_nome);
  }

  // ETAPA 3: Se não existe contato no CRM, criar um novo
  if (!contatoCRM) {
    console.log('Criando novo contato no CRM...');
    
    const { data: novoContatoCRM, error: erroCriarContato } = await supabase
      .from('contatos')
      .insert({
        primeiro_nome: nomeRemetente || 'Cliente',
        sobrenome: 'WhatsApp',
        celular: numeroRemetenteFormatado,
        origem: 'whatsapp',
        status_lead: 'novo',
        esta_ativo: true,
        ciclo_vida: 'lead',
      })
      .select('id, conta_id, primeiro_nome')
      .single();

    if (erroCriarContato) {
      console.error('Erro ao criar contato no CRM:', erroCriarContato);
      return;
    }

    contatoCRM = novoContatoCRM;
    console.log('✅ Novo contato criado no CRM:', contatoCRM.primeiro_nome);
  }

  // ETAPA 4: Buscar ou criar contato WhatsApp vinculado ao CRM
  let { data: contatoWhatsApp, error: errorBuscaWhatsApp } = await supabase
    .from('whatsapp_contatos')
    .select('id')
    .eq('contato_id', contatoCRM.id)
    .eq('whatsapp_conta_id', conta.id)
    .maybeSingle();

  if (errorBuscaWhatsApp && errorBuscaWhatsApp.code !== 'PGRST116') {
    console.error('Erro ao buscar contato WhatsApp:', errorBuscaWhatsApp);
  }

  if (!contatoWhatsApp) {
    console.log('Criando novo contato WhatsApp vinculado ao CRM...');
    
    const { data: novoContatoWhatsApp, error: erroCriarWhatsApp } = await supabase
      .from('whatsapp_contatos')
      .insert({
        contato_id: contatoCRM.id, // ✅ VINCULADO COM CRM
        whatsapp_conta_id: conta.id,
        numero_whatsapp: numeroRemetenteFormatado,
        nome_whatsapp: nomeRemetente || contatoCRM.primeiro_nome,
      })
      .select('id')
      .single();

    if (erroCriarWhatsApp) {
      console.error('Erro ao criar contato WhatsApp:', erroCriarWhatsApp);
      return;
    }

    contatoWhatsApp = novoContatoWhatsApp;
    console.log('✅ Contato WhatsApp criado e vinculado');
  } else {
    console.log('✅ Contato WhatsApp já existe');
  }

  // ETAPA 5: Buscar conversa existente ou criar nova COM GESTÃO DE FILA
  let { data: conversa, error: errorBuscaConversa } = await supabase
    .from('whatsapp_conversas')
    .select('id, status, atribuida_para_id')
    .eq('whatsapp_contato_id', contatoWhatsApp.id)
    .eq('whatsapp_conta_id', conta.id)
    .neq('status', 'fechada')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorBuscaConversa && errorBuscaConversa.code !== 'PGRST116') {
    console.error('Erro ao buscar conversa:', errorBuscaConversa);
  }

  if (!conversa) {
    console.log('Criando nova conversa com gestão de fila...');
    
    // ✅ OBTER VENDEDOR DISPONÍVEL OU NULL (FILA)
    const vendedorId = await obterVendedorDisponivel(supabase, conta.id);
    
    const statusConversa = vendedorId ? 'aberta' : 'aguardando';
    console.log(`Status da conversa: ${statusConversa}${vendedorId ? ` - Atribuída para ${vendedorId}` : ' - Em fila'}`);

    const { data: novaConversa, error: erroCriarConversa } = await supabase
      .from('whatsapp_conversas')
      .insert({
        whatsapp_conta_id: conta.id,
        whatsapp_contato_id: contatoWhatsApp.id,
        contato_id: contatoCRM.id,
        conta_id: contatoCRM.conta_id,
        titulo: nomeRemetente || contatoCRM.primeiro_nome || numeroRemetenteFormatado,
        status: statusConversa, // ✅ 'aberta' se tem vendedor, 'aguardando' se em fila
        atribuida_para_id: vendedorId, // ✅ NULL se não há vendedor disponível
        atribuicao_automatica: true,
        janela_24h_ativa: true,
        janela_aberta_em: new Date().toISOString(),
        janela_fecha_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ultima_mensagem_em: new Date().toISOString(),
      })
      .select('id, status, atribuida_para_id')
      .single();

    if (erroCriarConversa) {
      console.error('Erro ao criar conversa:', erroCriarConversa);
      return;
    }

    conversa = novaConversa;
    console.log('✅ Nova conversa criada:', conversa);
  } else {
    console.log('✅ Conversa existente encontrada');
    
    // Atualizar janela de 24h e última mensagem
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

  // ETAPA 6: Salvar mensagem
  const { error: errorMensagem } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversa.id,
      whatsapp_conta_id: conta.id,
      whatsapp_contato_id: contatoWhatsApp.id,
      corpo: corpoMensagem,
      direcao: 'recebida',
      tipo_mensagem: tipoMensagem,
      status: 'entregue',
      id_mensagem_externa: payload.id || payload.gsId,
      recebida_em: new Date().toISOString(),
    });

  if (errorMensagem) {
    console.error('Erro ao salvar mensagem:', errorMensagem);
    return;
  }

  console.log('✅ Mensagem recebida processada com sucesso');
  console.log('---');
}

/**
 * Processar atualização de status de mensagem
 */
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

  const { error } = await supabase
    .from('whatsapp_mensagens')
    .update(updateData)
    .eq('id_mensagem_externa', messageId);

  if (error) {
    console.error('Erro ao atualizar status:', error);
    return;
  }

  console.log('✅ Status de mensagem atualizado:', messageId, '->', novoStatus);
}
