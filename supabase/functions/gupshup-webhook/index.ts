import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://esm.sh/zod@3.22.4';
import { normalizarNumeroWhatsApp, buscarContatoCRM } from "../_shared/phone-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema for webhook payload
const GupshupWebhookSchema = z.object({
  type: z.enum(['message', 'message-event'], { required_error: "Type is required" }),
  payload: z.object({
    source: z.string().min(1, "Source phone required").max(50),
    payload: z.object({
      text: z.string().max(5000, "Message too long").optional(),
      type: z.string().max(50).optional(),
    }).passthrough(),
    sender: z.object({
      phone: z.string().min(1).max(50),
      name: z.string().max(200).optional(),
    }).passthrough(),
  }).passthrough(),
  eventType: z.string().max(100).optional(),
  gsId: z.string().max(200).optional(),
}).passthrough();

// Verify webhook signature (if Gupshup provides one in headers)
async function verifyGupshupSignature(
  payload: string, 
  signature: string | null, 
  secret: string
): Promise<boolean> {
  if (!signature) {
    console.warn('No signature provided - webhook signature verification disabled');
    return true; // Allow for backward compatibility
  }
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const keyData = encoder.encode(secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validar que o sistema está em modo Gupshup
    const { data: config } = await supabase
      .from('whatsapp_configuracao_global')
      .select('modo_api, provedor_ativo')
      .eq('esta_ativo', true)
      .single();

    if (config?.modo_api !== 'oficial' || config?.provedor_ativo !== 'gupshup') {
      console.warn('⚠️ Sistema não está configurado para Gupshup');
      return new Response(
        JSON.stringify({ error: 'Sistema não está configurado para Gupshup' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    .eq('phone_number_id_gupshup', numeroDestinatario)
    .eq('provedor', 'gupshup')
    .eq('status', 'ativo')
    .single();

  if (!conta) {
    console.error('Conta WhatsApp não encontrada para número:', numeroDestinatario);
    return;
  }

  // Normalizar número e buscar contato no CRM
  const numeroNormalizado = normalizarNumeroWhatsApp(numeroRemetente);
  const contatoIdCRM = await buscarContatoCRM(supabase, numeroNormalizado);

  // Buscar ou criar contato WhatsApp considerando variações de número e possível vínculo CRM
  const numeroApenasDigitos = numeroNormalizado;
  const variacoesNumero = [numeroApenasDigitos, `+${numeroApenasDigitos}`];

  const { data: contatosPorNumero } = await supabase
    .from('whatsapp_contatos')
    .select('id, numero_whatsapp, contato_id, criado_em')
    .eq('whatsapp_conta_id', conta.id)
    .in('numero_whatsapp', variacoesNumero);

  let contatosPorCRM: any[] = [];
  if (contatoIdCRM) {
    const { data } = await supabase
      .from('whatsapp_contatos')
      .select('id, numero_whatsapp, contato_id, criado_em')
      .eq('whatsapp_conta_id', conta.id)
      .eq('contato_id', contatoIdCRM);
    contatosPorCRM = data || [];
  }

  const mapaContatos: Record<string, any> = {};
  [...(contatosPorNumero || []), ...contatosPorCRM].forEach((c: any) => {
    mapaContatos[c.id] = c;
  });
  const contatosCandidatos = Object.values(mapaContatos);

  let contato = contatosCandidatos[0] as any | undefined;
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
        numero_whatsapp: numeroApenasDigitos,
        nome_whatsapp: payload.sender?.name || numeroRemetente,
        contato_id: contatoIdCRM || null,
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
    console.error('Erro ao criar/buscar contato');
    return;
  }

  // Buscar conversa ativa existente (priorizar janela ativa) para qualquer contato candidato
  const contatoIdsParaBusca = (contatosCandidatos && contatosCandidatos.length > 0)
    ? (contatosCandidatos as any[]).map((c: any) => c.id)
    : [contato.id];

  let { data: conversasAtivas } = await supabase
    .from('whatsapp_conversas')
    .select('id, status, janela_24h_ativa, ultima_mensagem_em')
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
        ultima_mensagem_em: new Date().toISOString(),
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
        ultima_mensagem_em: new Date().toISOString(),
      })
      .eq('id', conversa.id);
  }

  // Salvar mensagem
  const { data: novaMensagem } = await supabase
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
    })
    .select()
    .single();

  console.log('Mensagem recebida processada com sucesso');

  // 🤖 AGENTE DE VENDAS: Processar mensagem automaticamente se ativo
  // Buscar configuração da conta para verificar se agente está ativo
  const { data: contaCompleta } = await supabase
    .from('whatsapp_contas')
    .select('agente_vendas_ativo')
    .eq('id', conta.id)
    .single();

  console.log('🔍 Verificando agente:', { 
    agente_ativo: contaCompleta?.agente_vendas_ativo, 
    tem_texto: !!corpoMensagem, 
    tipo: tipoMensagem
  });
  
  // Ativar agente para mensagens de texto (Gupshup não suporta áudio direto ainda)
  if (contaCompleta?.agente_vendas_ativo && corpoMensagem && tipoMensagem === 'text') {
    console.log('🤖 Agente de vendas ativo - processando mensagem');
    
    try {
      // Chamar agente de vendas
      const { data: agenteData, error: agenteError } = await supabase.functions.invoke('agente-vendas-whatsapp', {
        body: {
          mensagemTexto: corpoMensagem,
          conversaId: conversa.id,
          contatoId: contato.id,
          tipoMensagem: 'texto'
        }
      });

      if (agenteError) {
        console.error('❌ Erro ao invocar agente:', agenteError);
        return;
      }

      if (agenteData?.resposta) {
        console.log('🤖 Resposta do agente:', agenteData.resposta);
        
        // Inserir resposta do agente no banco
        const { data: respostaAgente } = await supabase
          .from('whatsapp_mensagens')
          .insert({
            conversa_id: conversa.id,
            whatsapp_conta_id: conta.id,
            whatsapp_contato_id: contato.id,
            corpo: agenteData.resposta,
            direcao: 'enviada',
            tipo_mensagem: 'text',
            status: 'pendente',
            criado_em: new Date().toISOString(),
            enviada_por_bot: true,
            metadata: { 
              gerada_por_agente: true,
              produtos_encontrados: agenteData.produtos_encontrados || []
            }
          })
          .select()
          .single();

        // Enviar via Gupshup
        if (respostaAgente) {
          try {
            const { data: envioData, error: envioError } = await supabase.functions.invoke('gupshup-enviar-mensagem', {
              body: { mensagemId: respostaAgente.id }
            });

            if (envioError) {
              console.error('❌ Erro ao enviar resposta do agente:', envioError);
            } else {
              console.log('✅ Resposta do agente enviada via Gupshup');
            }
          } catch (envioError) {
            console.error('❌ Erro ao enviar via Gupshup:', envioError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro no agente de vendas:', error);
    }
  }
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
