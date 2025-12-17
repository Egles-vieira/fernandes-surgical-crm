import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// Baixar mídia da Meta API e fazer upload para Storage
// ============================================
async function baixarMidiaMetaAPI(
  supabase: any,
  conta: any,
  mediaId: string | null | undefined,
  mimeType: string | null | undefined,
): Promise<string | null> {
  try {
    if (!mediaId) {
      console.warn('⚠️ Media ID ausente - não é possível baixar mídia');
      return null;
    }

    const mimeBase = (mimeType || 'application/octet-stream').split(';')[0].trim();

    console.log('📥 Baixando mídia da Meta API:', { mediaId, mimeType: mimeBase });

    const accessToken = conta.meta_access_token;
    if (!accessToken) {
      console.error('❌ Token de acesso não encontrado para a conta');
      return null;
    }

    // 1) Obter URL de download
    const mediaInfoUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
    const mediaInfoResponse = await fetch(mediaInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mediaInfoResponse.ok) {
      console.error('❌ Erro ao obter info da mídia:', await mediaInfoResponse.text());
      return null;
    }

    const mediaInfo = await mediaInfoResponse.json();
    const downloadUrl = mediaInfo.url;
    console.log('📍 URL de download obtida:', downloadUrl ? 'OK' : 'FALHA');

    if (!downloadUrl) {
      console.error('❌ URL de download não encontrada');
      return null;
    }

    // 2) Baixar mídia (binário)
    const mediaResponse = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mediaResponse.ok) {
      console.error('❌ Erro ao baixar mídia:', mediaResponse.status);
      return null;
    }

    const mediaBuffer = await mediaResponse.arrayBuffer();
    const mediaBytes = new Uint8Array(mediaBuffer);
    console.log('📦 Mídia baixada:', mediaBytes.byteLength, 'bytes');

    // 3) Extensão (a partir do mime normalizado)
    const extensaoMap: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/aac': 'aac',
      'audio/amr': 'amr',
      'audio/webm': 'webm',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'application/pdf': 'pdf',
    };

    const fallbackExt = mimeBase.includes('/') ? mimeBase.split('/')[1] : 'bin';
    const extensao = extensaoMap[mimeBase] || fallbackExt || 'bin';

    const nomeArquivo = `${mediaId}.${extensao}`;
    const caminhoStorage = `audios/${nomeArquivo}`;

    // 4) Upload para Storage (IMPORTANTE: contentType sem "; codecs=..." para evitar 415)
    const { error: uploadError } = await supabase.storage
      .from('whatsapp-media')
      .upload(caminhoStorage, mediaBytes, {
        contentType: mimeBase,
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Erro no upload para Storage:', uploadError);
      return null;
    }

    // 5) URL pública
    const { data: urlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(caminhoStorage);

    console.log('✅ Mídia salva no Storage:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ Erro ao processar mídia:', error);
    return null;
  }
}

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

    const body = await req.text();
    const payload = JSON.parse(body);
    
    // Check if any account has signature validation disabled
    // Parse payload first to get WABA ID for account-specific validation
    let skipSignatureValidation = false;
    
    if (payload.entry?.[0]?.id) {
      const wabaId = payload.entry[0].id;
      const { data: conta } = await supabase
        .from('whatsapp_contas')
        .select('signature_validation_enabled')
        .or(`meta_waba_id.eq.${wabaId},waba_id.eq.${wabaId}`)
        .eq('provedor', 'meta_cloud_api')
        .single();
      
      if (conta && conta.signature_validation_enabled === false) {
        skipSignatureValidation = true;
        console.log('⚠️ Signature validation DISABLED for this account');
      }
    }
    
    // Signature validation (if enabled)
    if (!skipSignatureValidation) {
      const signature = req.headers.get('x-hub-signature-256');
      const appSecret = Deno.env.get('META_WHATSAPP_APP_SECRET');
      
      if (signature && appSecret) {
        const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
          .update(body)
          .digest('hex');
        
        if (signature !== expectedSignature) {
          console.error('❌ Invalid signature - rejecting webhook');
          console.error('📝 Received:', signature);
          console.error('📝 Expected:', expectedSignature);
          return new Response('Invalid signature', { status: 401 });
        }
        console.log('✅ Signature validated successfully');
      } else if (!signature) {
        console.warn('⚠️ No signature header present - allowing for backwards compatibility');
      } else if (!appSecret) {
        console.warn('⚠️ META_WHATSAPP_APP_SECRET not configured - skipping signature validation');
      }
    }
    console.log('📥 Meta Webhook received:', JSON.stringify(payload, null, 2));

    // Log webhook with correct column name: payload (not payload_completo)
    await supabase.from('whatsapp_webhooks_log').insert({
      provedor: 'meta_cloud_api',
      tipo_evento: payload.object || 'unknown',
      payload: payload,
    });

    // Process entries
    if (payload.entry) {
      for (const entry of payload.entry) {
        const wabaId = entry.id;
        
        // FASE 1.2: Find account with fallback - try meta_waba_id first, then waba_id
        let conta = null;
        
        // Try meta_waba_id first (new field)
        const { data: contaByMetaWaba } = await supabase
          .from('whatsapp_contas')
          .select('*')
          .eq('meta_waba_id', wabaId)
          .eq('provedor', 'meta_cloud_api')
          .single();
        
        if (contaByMetaWaba) {
          conta = contaByMetaWaba;
          console.log(`✅ Account found by meta_waba_id: ${conta.id}`);
        } else {
          // Fallback to waba_id (legacy field)
          const { data: contaByWaba } = await supabase
            .from('whatsapp_contas')
            .select('*')
            .eq('waba_id', wabaId)
            .eq('provedor', 'meta_cloud_api')
            .single();
          
          if (contaByWaba) {
            conta = contaByWaba;
            console.log(`✅ Account found by waba_id (legacy): ${conta.id}`);
          }
        }

        if (!conta) {
          console.warn(`⚠️ Account not found for WABA ID: ${wabaId} - tried meta_waba_id and waba_id`);
          continue;
        }

        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                // Processar reações separadamente
                if (message.type === 'reaction') {
                  await processarReacaoRecebida(supabase, conta, message);
                } else {
                  await processarMensagemRecebida(supabase, conta, message, value.contacts?.[0]);
                }
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

// Mapeamento de tipos Meta API → tipos do banco (português)
const tipoMensagemMap: Record<string, string> = {
  'text': 'texto',
  'image': 'imagem',
  'video': 'video',
  'audio': 'audio',
  'document': 'documento',
  'location': 'localizacao',
  'contacts': 'contato',
  'sticker': 'sticker',
  'button': 'botao',
  'interactive': 'lista',
  'reaction': 'reacao',
};

async function processarMensagemRecebida(supabase: any, conta: any, message: any, contact: any) {
  console.log('📨 Processing message:', message.id);
  console.log('📍 From account:', conta.id, '- Contact info:', contact?.profile?.name);

  const numeroRemetente = message.from;
  const messageId = message.id;
  const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

  // Find or create contact with robust error handling
  console.log('🔍 Looking for contact:', numeroRemetente, 'in account:', conta.id);
  
  let { data: contato, error: contatoError } = await supabase
    .from('whatsapp_contatos')
    .select('*')
    .eq('numero_whatsapp', numeroRemetente)
    .eq('whatsapp_conta_id', conta.id)
    .single();

  if (contatoError && contatoError.code !== 'PGRST116') {
    console.error('❌ Error fetching contact:', contatoError);
  }

  if (!contato) {
    console.log('📝 Creating new contact for:', numeroRemetente);
    const insertData = {
      whatsapp_conta_id: conta.id,
      numero_whatsapp: numeroRemetente,
      nome_whatsapp: contact?.profile?.name || 'Desconhecido',
      whatsapp_id: numeroRemetente,
    };
    console.log('📋 Contact insert data:', JSON.stringify(insertData));
    
    const { data: novoContato, error: insertContatoError } = await supabase
      .from('whatsapp_contatos')
      .insert(insertData)
      .select()
      .single();
    
    if (insertContatoError) {
      console.error('❌ Error creating contact:', insertContatoError);
      throw new Error(`Failed to create contact: ${insertContatoError.message}`);
    }
    
    contato = novoContato;
    console.log('✅ Contact created:', contato?.id);
  } else {
    console.log('✅ Existing contact found:', contato.id);
  }

  // Validate contact exists before proceeding
  if (!contato || !contato.id) {
    console.error('❌ Contact is null after creation attempt');
    throw new Error('Failed to create or find contact');
  }

  // Find or create conversation
  console.log('🔍 Looking for active conversation for contact:', contato.id);
  
  let { data: conversa, error: conversaError } = await supabase
    .from('whatsapp_conversas')
    .select('*')
    .eq('whatsapp_contato_id', contato.id)
    .eq('status', 'aberta')
    .single();

  if (conversaError && conversaError.code !== 'PGRST116') {
    console.error('❌ Error fetching conversation:', conversaError);
  }

  if (!conversa) {
    console.log('📝 Creating new conversation for contact:', contato.id);
    const conversaInsert = {
      whatsapp_conta_id: conta.id,
      whatsapp_contato_id: contato.id,
      status: 'aberta',
      origem_atendimento: 'receptivo',
      unidade_id: conta.unidade_padrao_id || null,
    };
    console.log('📋 Conversation insert data:', JSON.stringify(conversaInsert));
    
    const { data: novaConversa, error: insertConversaError } = await supabase
      .from('whatsapp_conversas')
      .insert(conversaInsert)
      .select()
      .single();
    
    if (insertConversaError) {
      console.error('❌ Error creating conversation:', insertConversaError);
      throw new Error(`Failed to create conversation: ${insertConversaError.message}`);
    }
    
    conversa = novaConversa;
    console.log('✅ Conversation created:', conversa?.id);
    
    // ===== FASE 2: DISTRIBUIÇÃO AUTOMÁTICA =====
    // Após criar nova conversa, enriquecer dados e distribuir automaticamente
    try {
      // Buscar dados do contato CRM vinculado (Fase 3: Enriquecimento)
      if (contato.contato_id) {
        console.log('🔗 Contato vinculado ao CRM:', contato.contato_id);
        const { data: contatoCRM } = await supabase
          .from('contatos')
          .select('id, cliente_id, primeiro_nome, sobrenome, cargo, pontuacao_lead, status_lead')
          .eq('id', contato.contato_id)
          .single();
        
        if (contatoCRM?.cliente_id) {
          // Atualizar conversa com cliente_id
          await supabase
            .from('whatsapp_conversas')
            .update({ cliente_id: contatoCRM.cliente_id })
            .eq('id', conversa.id);
          
          console.log('✅ Conversa enriquecida com cliente_id:', contatoCRM.cliente_id);
          
          // Classificar tipo de contato baseado em histórico
          const { data: historicoCompras } = await supabase
            .from('vendas')
            .select('id')
            .eq('cliente_id', contatoCRM.cliente_id)
            .eq('status', 'finalizado')
            .limit(10);
          
          const totalCompras = historicoCompras?.length || 0;
          let tipoContato = 'lead';
          if (totalCompras >= 10) tipoContato = 'cliente_vip';
          else if (totalCompras >= 1) tipoContato = 'cliente_regular';
          else if (totalCompras === 0 && contatoCRM.cliente_id) tipoContato = 'cliente_novo';
          
          console.log(`📊 Classificação do contato: ${tipoContato} (${totalCompras} compras)`);
        }
      }
      
      // Verificar configuração de distribuição automática (TABELA CORRETA: whatsapp_configuracoes_atendimento)
      const { data: configDistribuicao, error: configError } = await supabase
        .from('whatsapp_configuracoes_atendimento')
        .select('*')
        .limit(1)
        .single();
      
      if (configError && configError.code !== 'PGRST116') {
        console.error('⚠️ Erro ao buscar configuração de distribuição:', configError);
      }
      
      console.log('📋 Configuração de distribuição:', JSON.stringify(configDistribuicao));
      
      if (configDistribuicao?.distribuicao_automatica_ativa !== false) {
        console.log('🎯 Distribuição automática ativada, verificando carteiras v2...');
        
        // PRIORIDADE 1: Verificar se existe carteira v2 para este contato
        let operadorCarteira = null;
        if (configDistribuicao?.carteirizacao_ativa && contato?.id) {
          const { data: carteira } = await supabase
            .rpc('buscar_operador_carteira', { p_contato_id: contato.id });
          
          if (carteira) {
            operadorCarteira = carteira;
            console.log('📂 Operador da carteira v2 encontrado:', operadorCarteira);
            
            // Se tem carteira, distribuir diretamente (sem triagem IA)
            const distribuicaoResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-distribuir-conversa`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  conversaId: conversa.id,
                  contatoId: contato.id,
                  filaId: null,
                  unidadeId: conta.unidade_padrao_id || null,
                  operadorCarteiraId: operadorCarteira,
                  modoCarteirizacao: configDistribuicao?.modo_carteirizacao || 'preferencial',
                  carteirizacaoAtiva: true,
                }),
              }
            );
            
            const distribuicaoResult = await distribuicaoResponse.json();
            console.log('📋 Resultado da distribuição (carteira):', JSON.stringify(distribuicaoResult));
          }
        }
        
        // PRIORIDADE 2: Se não tem carteira, criar triagem pendente com delay 10s
        if (!operadorCarteira) {
          console.log('🔄 Sem carteira, criando triagem pendente com delay 10s...');
          
          // Verificar se já existe triagem pendente para esta conversa
          const { data: triagemExistente } = await supabase
            .from('whatsapp_triagem_pendente')
            .select('id')
            .eq('conversa_id', conversa.id)
            .in('status', ['aguardando', 'processando'])
            .single();
          
          if (!triagemExistente) {
            // Criar triagem pendente
            await supabase.from('whatsapp_triagem_pendente').insert({
              conversa_id: conversa.id,
              contato_id: contato.id,
              conta_id: conta.id,
              aguardar_ate: new Date(Date.now() + 10000).toISOString(), // 10 segundos
            });
            
            // Atualizar status da conversa
            await supabase
              .from('whatsapp_conversas')
              .update({ triagem_status: 'em_triagem' })
              .eq('id', conversa.id);
            
            console.log('✅ Triagem pendente criada, aguardando 10s para acumular mensagens');
          } else {
            console.log('ℹ️ Triagem pendente já existe para esta conversa');
          }
        }
      } else {
        console.log('ℹ️ Distribuição automática desativada');
      }
    } catch (distError) {
      // Não bloqueia o fluxo se a distribuição falhar
      console.error('⚠️ Erro na distribuição automática (não bloqueante):', distError);
    }
    // ===== FIM FASE 2 =====
    
  } else {
    console.log('✅ Existing conversation found:', conversa.id);
    
    // ===== REDISTRIBUIÇÃO DE CONVERSAS SEM OPERADOR =====
    // Se conversa existe mas NÃO tem operador atribuído e triagem concluída, tentar redistribuir
    if (!conversa.atribuida_para_id && conversa.triagem_status === 'triagem_concluida') {
      console.log('🔄 Conversa sem operador atribuído, tentando redistribuir...');
      
      try {
        // Buscar fila_id da conversa ou da triagem concluída
        let filaParaDistribuir = conversa.fila_id;
        
        if (!filaParaDistribuir) {
          const { data: triagemConcluida } = await supabase
            .from('whatsapp_triagem_pendente')
            .select('fila_definida_id')
            .eq('conversa_id', conversa.id)
            .eq('status', 'concluido')
            .order('atualizado_em', { ascending: false })
            .limit(1)
            .single();
          
          if (triagemConcluida?.fila_definida_id) {
            filaParaDistribuir = triagemConcluida.fila_definida_id;
            console.log('📋 Fila obtida da triagem:', filaParaDistribuir);
          }
        }
        
        const distribuicaoResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-distribuir-conversa`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              conversaId: conversa.id,
              contatoId: contato.id,
              filaId: filaParaDistribuir,
              unidadeId: conversa.unidade_id,
            }),
          }
        );
        
        const resultado = await distribuicaoResponse.json();
        console.log('📋 Resultado da redistribuição:', JSON.stringify(resultado));
        
        if (resultado.success && resultado.atendenteId) {
          // Atualizar conversa local para refletir atribuição
          conversa.atribuida_para_id = resultado.atendenteId;
        }
      } catch (redistError) {
        console.error('⚠️ Erro na redistribuição (não bloqueante):', redistError);
      }
    }
  }

  // Validate conversation exists before proceeding
  if (!conversa || !conversa.id) {
    console.error('❌ Conversation is null after creation attempt');
    throw new Error('Failed to create or find conversation');
  }

  // Extract message content
  let corpo = '';
  let tipoMensagem = message.type;
  let midiaDados: any = null;
  let urlMidia: string | null = null;

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
      // Baixar áudio e salvar URL para transcrição
      urlMidia = await baixarMidiaMetaAPI(supabase, conta, message.audio?.id, message.audio?.mime_type);
      console.log('🎵 URL do áudio para transcrição:', urlMidia);
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

  // Process context/reply reference if present
  let respostaParaId: string | null = null;
  if (message.context?.id) {
    console.log('↩️ Message is reply to:', message.context.id);
    // Find the original message by external ID
    const { data: mensagemOriginal } = await supabase
      .from('whatsapp_mensagens')
      .select('id')
      .eq('mensagem_externa_id', message.context.id)
      .single();
    
    if (mensagemOriginal) {
      respostaParaId = mensagemOriginal.id;
      console.log('✅ Found original message:', respostaParaId);
    } else {
      console.log('⚠️ Original message not found for context:', message.context.id);
    }
  }

  // Insert message with correct column names:
  // - conversa_id (not whatsapp_conversa_id)
  // - tipo_mensagem (not tipo)
  // - recebida_em (not status_recebida_em)
  // - metadata (not metadados)
  const { data: novaMensagem, error } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      conversa_id: conversa.id,
      whatsapp_conta_id: conta.id,
      whatsapp_contato_id: contato.id,
      direcao: 'recebida',
      tipo_mensagem: tipoMensagemMap[tipoMensagem] || 'texto',
      corpo,
      mensagem_externa_id: messageId,
      status: 'entregue',
      recebida_em: timestamp,
      metadata: midiaDados ? { midia: midiaDados } : null,
      numero_de: numeroRemetente,
      nome_remetente: contact?.profile?.name || null,
      resposta_para_id: respostaParaId,
      url_midia: urlMidia, // URL da mídia no Storage
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
      console.log('🤖 Chamando agente de vendas...');
      console.log('📋 Tipo da mensagem:', message.type);
      console.log('📋 URL da mídia:', urlMidia);
      
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
            tipoMensagem: message.type, // Passa o tipo para o agente
            urlMidia: urlMidia, // Passa a URL da mídia para transcrição
          }),
        }
      );

      const responseText = await response.text();
      console.log('🤖 Resposta do agente (status:', response.status, '):', responseText);
      
      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          console.log('🤖 Resultado parseado:', JSON.stringify(result));
          
          if (result.resposta) {
            console.log('📤 Enviando resposta do agente:', result.resposta.substring(0, 100) + '...');
            // Send agent response via Meta API
            const enviado = await enviarRespostaAgente(supabase, conta, conversa, contato, result.resposta);
            console.log('📤 Resultado do envio:', enviado ? '✅ Sucesso' : '❌ Falha');
          } else {
            console.warn('⚠️ Agente não retornou resposta');
          }
        } catch (parseError) {
          console.error('❌ Erro ao parsear resposta do agente:', parseError);
        }
      } else {
        console.error('❌ Erro na resposta do agente:', response.status, responseText);
      }
    } catch (agentError) {
      console.error('❌ Agent error:', agentError);
    }
  }
}

async function enviarRespostaAgente(supabase: any, conta: any, conversa: any, contato: any, resposta: string): Promise<boolean> {
  console.log('📝 enviarRespostaAgente - Iniciando...');
  console.log('📝 Conta ID:', conta.id);
  console.log('📝 Contato ID:', contato.id);
  console.log('📝 Resposta:', resposta.substring(0, 100) + '...');
  
  try {
    // Insert agent message
    const { data: mensagemAgente, error: insertError } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        conversa_id: conversa.id,
        whatsapp_conta_id: conta.id,
        whatsapp_contato_id: contato.id,
        direcao: 'enviada',
        tipo_mensagem: 'texto',
        corpo: resposta,
        status: 'pendente',
        enviada_por_bot: true,
        numero_para: contato.numero_whatsapp,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir mensagem do agente:', insertError);
      return false;
    }

    console.log('✅ Mensagem do agente criada:', mensagemAgente.id);

    // Call meta-api-enviar-mensagem and AWAIT the response
    console.log('📤 Chamando meta-api-enviar-mensagem para mensagemId:', mensagemAgente.id);
    
    const enviarResponse = await fetch(
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

    const enviarResult = await enviarResponse.text();
    console.log('📤 meta-api-enviar-mensagem response (status:', enviarResponse.status, '):', enviarResult);

    if (!enviarResponse.ok) {
      console.error('❌ Erro ao enviar mensagem via Meta API:', enviarResponse.status, enviarResult);
      return false;
    }

    console.log('✅ Mensagem enviada com sucesso via Meta API');
    return true;
  } catch (error) {
    console.error('❌ Erro em enviarRespostaAgente:', error);
    return false;
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

// ============================================
// Processar Reação Recebida
// ============================================
async function processarReacaoRecebida(supabase: any, conta: any, message: any) {
  console.log('😊 Processing reaction:', message.reaction);

  const reaction = message.reaction;
  const messageIdReacted = reaction?.message_id;
  const emoji = reaction?.emoji;
  const from = message.from;

  if (!messageIdReacted) {
    console.warn('⚠️ Reaction without message_id');
    return;
  }

  // Buscar a mensagem que foi reagida
  const { data: mensagemOriginal } = await supabase
    .from('whatsapp_mensagens')
    .select('id, whatsapp_contato_id')
    .eq('mensagem_externa_id', messageIdReacted)
    .single();

  if (!mensagemOriginal) {
    console.warn('⚠️ Original message not found for reaction:', messageIdReacted);
    return;
  }

  // Buscar contato pelo número
  const { data: contato } = await supabase
    .from('whatsapp_contatos')
    .select('id')
    .eq('numero_whatsapp', from)
    .eq('whatsapp_conta_id', conta.id)
    .single();

  if (!contato) {
    console.warn('⚠️ Contact not found for reaction');
    return;
  }

  // Se emoji está vazio, é remoção de reação
  if (!emoji || emoji === '') {
    console.log('🗑️ Removing reaction');
    await supabase
      .from('whatsapp_reacoes')
      .delete()
      .eq('mensagem_id', mensagemOriginal.id)
      .eq('reagido_por_contato_id', contato.id);
    return;
  }

  // Inserir ou atualizar reação
  const { error: upsertError } = await supabase
    .from('whatsapp_reacoes')
    .upsert({
      mensagem_id: mensagemOriginal.id,
      emoji,
      reagido_por_tipo: 'contato',
      reagido_por_contato_id: contato.id,
      mensagem_externa_id: message.id,
    }, {
      onConflict: 'mensagem_id,reagido_por_contato_id',
    });

  if (upsertError) {
    console.error('❌ Error saving reaction:', upsertError);
  } else {
    console.log('✅ Reaction saved:', emoji);
  }
}
