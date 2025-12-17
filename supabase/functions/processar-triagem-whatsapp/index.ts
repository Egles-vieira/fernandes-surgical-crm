import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID da fila "Atendimento IA" - destino para clientes sem operador
const FILA_ATENDIMENTO_IA_ID = 'ddc8e523-18dd-422b-a9cc-105d1bae3016';

interface TriagemPendente {
  id: string;
  conversa_id: string;
  contato_id: string | null;
  conta_id: string | null;
  cnpj_solicitado: boolean;
  cnpj_informado: string | null;
  cliente_encontrado_id: string | null;
  tentativas: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔄 Iniciando processamento de triagens pendentes...');

    // Buscar triagens prontas para processamento (delay 10s já passou)
    const { data: triagens, error: triagemError } = await supabase
      .rpc('buscar_triagens_pendentes', { p_limit: 10 });

    if (triagemError) {
      console.error('❌ Erro ao buscar triagens:', triagemError);
      throw triagemError;
    }

    if (!triagens || triagens.length === 0) {
      console.log('ℹ️ Nenhuma triagem pendente para processar');
      return new Response(
        JSON.stringify({ success: true, processadas: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 ${triagens.length} triagens encontradas para processar`);

    const resultados = [];

    for (const triagem of triagens as TriagemPendente[]) {
      try {
        console.log(`\n🔍 Processando triagem ${triagem.id} para conversa ${triagem.conversa_id}`);

        // 1. FASE: Verificar se existe carteira (prioridade máxima)
        const resultadoCarteira = await verificarCarteira(supabase, triagem);
        if (resultadoCarteira.atribuido) {
          resultados.push({ id: triagem.id, status: 'carteira', ...resultadoCarteira });
          continue;
        }

        // 2. FASE: Verificar se contato tem cliente vinculado
        const resultadoCliente = await verificarClienteVinculado(supabase, triagem);
        if (resultadoCliente.vendedor_id) {
          // Tem vendedor do cliente, verificar se está online
          const atribuido = await atribuirVendedorCliente(supabase, triagem, resultadoCliente);
          if (atribuido) {
            resultados.push({ id: triagem.id, status: 'vendedor_cliente', ...resultadoCliente });
            continue;
          }
        }

        // 3. FASE: Se não tem cliente vinculado, verificar CNPJ
        if (!resultadoCliente.cliente_id) {
          // Sempre buscar CNPJ nas mensagens (independente se já solicitou)
          const cnpjEncontrado = await buscarCNPJNasMensagens(supabase, triagem.conversa_id);
          
          if (cnpjEncontrado) {
            console.log(`📝 CNPJ encontrado nas mensagens: ${cnpjEncontrado}`);
            
            // Validar CNPJ
            const cliente = await validarCNPJ(supabase, cnpjEncontrado);
            if (cliente) {
              console.log(`✅ CNPJ válido! Cliente: ${cliente.cliente_nome}`);
              
              // Atualizar triagem com CNPJ informado
              await supabase
                .from('whatsapp_triagem_pendente')
                .update({ 
                  cnpj_informado: cnpjEncontrado,
                  cnpj_validado: true,
                  cnpj_validado_em: new Date().toISOString(),
                  cliente_encontrado_id: cliente.cliente_id,
                })
                .eq('id', triagem.id);
              
              // Vincular contato ao cliente no CRM
              await vincularContatoCliente(supabase, triagem.contato_id, cliente.cliente_id);
              
              // CNPJ válido, tentar atribuir ao vendedor do cliente
              const atribuido = await atribuirVendedorCliente(supabase, triagem, cliente);
              if (atribuido) {
                resultados.push({ id: triagem.id, status: 'cnpj_validado', cliente_id: cliente.cliente_id });
                continue;
              }
              
              // ===== NOVO: Vendedor offline/inexistente → Fila "Atendimento IA" =====
              console.log('🤖 Vendedor não disponível - direcionando para fila "Atendimento IA"...');
              await direcionarParaFilaIA(supabase, triagem, cliente);
              await acionarAgenteIA(supabase, triagem);
              resultados.push({ id: triagem.id, status: 'fila_atendimento_ia', cliente_id: cliente.cliente_id });
              continue;
            } else {
              console.log(`⚠️ CNPJ ${cnpjEncontrado} não encontrado no CRM`);
              // Informar cliente que CNPJ não foi encontrado
              await informarCNPJNaoEncontrado(supabase, triagem, cnpjEncontrado);
              resultados.push({ id: triagem.id, status: 'cnpj_nao_encontrado' });
              continue;
            }
          } else if (!triagem.cnpj_solicitado) {
            // Não encontrou CNPJ e ainda não solicitou - enviar mensagem
            await solicitarCNPJ(supabase, triagem);
            resultados.push({ id: triagem.id, status: 'cnpj_solicitado' });
            continue;
          } else {
            // Já solicitou mas cliente ainda não respondeu com CNPJ válido - aguardar
            console.log('⏳ Aguardando resposta de CNPJ do cliente...');
            resultados.push({ id: triagem.id, status: 'aguardando_cnpj' });
            continue;
          }
        }

        // 4. FASE: Triagem via DeepSeek (sem cliente/vendedor definido)
        console.log('🤖 Iniciando triagem via DeepSeek...');
        
        const resultadoTriagem = await chamarTriagemDeepSeek(supabase, triagem);
        
        if (resultadoTriagem.fila_id) {
          // Distribuir para a fila definida
          await distribuirParaFila(supabase, triagem, resultadoTriagem);
          resultados.push({ id: triagem.id, status: 'ia_triagem', ...resultadoTriagem });
        } else {
          // Fallback: colocar na fila de espera
          await colocarNaFilaEspera(supabase, triagem);
          resultados.push({ id: triagem.id, status: 'fila_espera' });
        }

      } catch (error) {
        console.error(`❌ Erro ao processar triagem ${triagem.id}:`, error);
        
        // Marcar como erro
        await supabase
          .from('whatsapp_triagem_pendente')
          .update({
            status: triagem.tentativas >= 3 ? 'erro' : 'aguardando',
            erro_mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
            aguardar_ate: new Date(Date.now() + 30000).toISOString(), // Retry em 30s
          })
          .eq('id', triagem.id);

        resultados.push({ id: triagem.id, status: 'erro', error: error instanceof Error ? error.message : 'Erro' });
      }
    }

    console.log(`\n✅ Processamento concluído: ${resultados.length} triagens`);

    return new Response(
      JSON.stringify({ success: true, processadas: resultados.length, resultados }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no processamento de triagens:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

async function verificarCarteira(supabase: any, triagem: TriagemPendente) {
  if (!triagem.contato_id) return { atribuido: false };

  const { data: operadorCarteira } = await supabase
    .rpc('buscar_operador_carteira', { p_contato_id: triagem.contato_id });

  if (operadorCarteira) {
    // Verificar se operador está online
    const { data: perfil } = await supabase
      .from('perfis_usuario')
      .select('id, nome_completo, status_atendimento')
      .eq('id', operadorCarteira)
      .single();

    if (perfil?.status_atendimento === 'online') {
      // Atribuir diretamente ao operador da carteira
      await supabase
        .from('whatsapp_conversas')
        .update({
          atribuida_para_id: operadorCarteira,
          status: 'aberta',
          triagem_status: 'triagem_concluida',
          triagem_motivo: 'Atribuído ao operador da carteira',
        })
        .eq('id', triagem.conversa_id);

      await supabase
        .from('whatsapp_triagem_pendente')
        .update({
          status: 'concluido',
          operador_atribuido_id: operadorCarteira,
          motivo_atribuicao: 'carteira',
        })
        .eq('id', triagem.id);

      // Notificar operador
      await supabase.from('notificacoes').insert({
        user_id: operadorCarteira,
        tipo: 'whatsapp_nova_conversa',
        titulo: 'Nova conversa da sua carteira',
        descricao: 'Um contato da sua carteira iniciou uma conversa',
        dados: { conversa_id: triagem.conversa_id },
      });

      console.log(`✅ Conversa atribuída ao operador da carteira: ${perfil.nome_completo}`);
      return { atribuido: true, operador_id: operadorCarteira };
    }
  }

  return { atribuido: false };
}

async function verificarClienteVinculado(supabase: any, triagem: TriagemPendente) {
  if (!triagem.contato_id) return {};

  // Buscar contato CRM vinculado ao contato WhatsApp
  const { data: whatsappContato } = await supabase
    .from('whatsapp_contatos')
    .select('contato_id, numero_whatsapp')
    .eq('id', triagem.contato_id)
    .single();

  if (!whatsappContato?.contato_id) {
    // Tentar buscar por telefone normalizado
    const telefoneNormalizado = whatsappContato?.numero_whatsapp?.replace(/\D/g, '');
    if (telefoneNormalizado) {
      const { data: contatoCRM } = await supabase
        .from('contatos')
        .select('id, cliente_id')
        .or(`celular.ilike.%${telefoneNormalizado}%,telefone.ilike.%${telefoneNormalizado}%`)
        .limit(1)
        .single();

      if (contatoCRM?.cliente_id) {
        return await buscarVendedorCliente(supabase, contatoCRM.cliente_id);
      }
    }
    return {};
  }

  // Buscar cliente e vendedor
  const { data: contato } = await supabase
    .from('contatos')
    .select('cliente_id')
    .eq('id', whatsappContato.contato_id)
    .single();

  if (contato?.cliente_id) {
    return await buscarVendedorCliente(supabase, contato.cliente_id);
  }

  return {};
}

async function buscarVendedorCliente(supabase: any, clienteId: string) {
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, vendedor_id, nome_abrev')
    .eq('id', clienteId)
    .single();

  if (cliente) {
    return {
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_abrev,
      vendedor_id: cliente.vendedor_id,
    };
  }

  return {};
}

async function atribuirVendedorCliente(supabase: any, triagem: TriagemPendente, clienteInfo: any) {
  if (!clienteInfo.vendedor_id) return false;

  // Verificar se vendedor está online
  const { data: vendedor } = await supabase
    .from('perfis_usuario')
    .select('id, nome_completo, status_atendimento')
    .eq('id', clienteInfo.vendedor_id)
    .single();

  if (vendedor?.status_atendimento !== 'online') {
    console.log(`⚠️ Vendedor ${vendedor?.nome_completo} não está online`);
    return false;
  }

  // Atribuir ao vendedor
  await supabase
    .from('whatsapp_conversas')
    .update({
      atribuida_para_id: clienteInfo.vendedor_id,
      cliente_id: clienteInfo.cliente_id,
      status: 'aberta',
      triagem_status: 'triagem_concluida',
      triagem_motivo: `Atribuído ao vendedor do cliente ${clienteInfo.cliente_nome}`,
    })
    .eq('id', triagem.conversa_id);

  await supabase
    .from('whatsapp_triagem_pendente')
    .update({
      status: 'concluido',
      cliente_encontrado_id: clienteInfo.cliente_id,
      vendedor_encontrado_id: clienteInfo.vendedor_id,
      operador_atribuido_id: clienteInfo.vendedor_id,
      motivo_atribuicao: 'vendedor_cliente',
    })
    .eq('id', triagem.id);

  // Notificar vendedor
  await supabase.from('notificacoes').insert({
    user_id: clienteInfo.vendedor_id,
    tipo: 'whatsapp_nova_conversa',
    titulo: 'Conversa do seu cliente',
    descricao: `${clienteInfo.cliente_nome} iniciou uma conversa`,
    dados: { conversa_id: triagem.conversa_id, cliente_id: clienteInfo.cliente_id },
  });

  console.log(`✅ Conversa atribuída ao vendedor: ${vendedor.nome_completo}`);
  return true;
}

async function buscarCNPJNasMensagens(supabase: any, conversaId: string): Promise<string | null> {
  // Buscar mensagens do cliente
  const { data: mensagens } = await supabase
    .from('whatsapp_mensagens')
    .select('corpo')
    .eq('conversa_id', conversaId)
    .eq('direcao', 'recebida')
    .order('criado_em', { ascending: false })
    .limit(10);

  if (!mensagens) return null;

  // Regex para CNPJ (com ou sem formatação)
  const cnpjRegex = /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g;

  for (const msg of mensagens) {
    const match = msg.corpo?.match(cnpjRegex);
    if (match) {
      // Normalizar CNPJ (apenas dígitos)
      return match[0].replace(/\D/g, '');
    }
  }

  return null;
}

async function vincularContatoCliente(supabase: any, whatsappContatoId: string | null, clienteId: string) {
  if (!whatsappContatoId) return;
  
  // Buscar ou criar contato CRM vinculado ao WhatsApp
  const { data: whatsappContato } = await supabase
    .from('whatsapp_contatos')
    .select('contato_id, nome_whatsapp, numero_whatsapp')
    .eq('id', whatsappContatoId)
    .single();

  if (!whatsappContato?.contato_id) {
    // Criar contato CRM
    const { data: novoContato } = await supabase
      .from('contatos')
      .insert({
        primeiro_nome: whatsappContato?.nome_whatsapp || 'Cliente WhatsApp',
        sobrenome: '',
        celular: whatsappContato?.numero_whatsapp,
        whatsapp_numero: whatsappContato?.numero_whatsapp,
        cliente_id: clienteId,
        estagio_ciclo_vida: 'cliente',
        esta_ativo: true,
      })
      .select('id')
      .single();

    if (novoContato) {
      // Vincular contato WhatsApp ao contato CRM
      await supabase
        .from('whatsapp_contatos')
        .update({ contato_id: novoContato.id })
        .eq('id', whatsappContatoId);
      
      console.log(`✅ Contato CRM criado e vinculado: ${novoContato.id}`);
    }
  } else {
    // Atualizar cliente_id do contato existente
    await supabase
      .from('contatos')
      .update({ cliente_id: clienteId })
      .eq('id', whatsappContato.contato_id);
    
    console.log(`✅ Contato CRM atualizado com cliente_id`);
  }
}

async function informarCNPJNaoEncontrado(supabase: any, triagem: TriagemPendente, cnpj: string) {
  const { data: conta } = await supabase
    .from('whatsapp_contas')
    .select('id')
    .eq('id', triagem.conta_id)
    .single();

  const { data: contato } = await supabase
    .from('whatsapp_contatos')
    .select('numero_whatsapp')
    .eq('id', triagem.contato_id)
    .single();

  if (conta && contato) {
    const cnpjFormatado = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    const mensagemTexto = `⚠️ O CNPJ ${cnpjFormatado} não foi encontrado em nossa base. Por favor, verifique se digitou corretamente ou informe outro CNPJ.`;

    const { data: novaMensagem } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        conversa_id: triagem.conversa_id,
        whatsapp_conta_id: conta.id,
        whatsapp_contato_id: triagem.contato_id,
        corpo: mensagemTexto,
        tipo_mensagem: 'texto',
        direcao: 'enviada',
        status: 'pendente',
        numero_para: contato.numero_whatsapp,
        enviada_por_bot: true,
        enviada_automaticamente: true,
      })
      .select('id')
      .single();

    if (novaMensagem) {
      await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-api-enviar-mensagem`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ mensagemId: novaMensagem.id }),
        }
      );
      console.log('✅ Mensagem de CNPJ não encontrado enviada');
    }
  }

  // Manter em aguardando para nova tentativa
  await supabase
    .from('whatsapp_triagem_pendente')
    .update({
      cnpj_informado: cnpj,
      cnpj_validado: false,
      aguardar_ate: new Date(Date.now() + 60000).toISOString(),
    })
    .eq('id', triagem.id);
}

async function validarCNPJ(supabase: any, cnpj: string) {
  // Buscar cliente pelo CNPJ
  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nome_abrev, vendedor_id')
    .eq('cgc', cnpj)
    .single();

  if (cliente) {
    return {
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_abrev,
      vendedor_id: cliente.vendedor_id,
    };
  }

  return null;
}

async function solicitarCNPJ(supabase: any, triagem: TriagemPendente) {
  console.log('📨 Enviando solicitação de CNPJ...');

  // Buscar conta WhatsApp
  const { data: conta } = await supabase
    .from('whatsapp_contas')
    .select('id, meta_phone_number_id, meta_access_token')
    .eq('id', triagem.conta_id)
    .single();

  // Buscar contato
  const { data: contato } = await supabase
    .from('whatsapp_contatos')
    .select('numero_whatsapp')
    .eq('id', triagem.contato_id)
    .single();

  if (conta && contato) {
    const mensagemTexto = '👋 Olá! Para melhor atendê-lo, por favor, informe o CNPJ da sua empresa.';

    try {
      // 1. Criar mensagem no banco de dados primeiro
      const { data: novaMensagem, error: insertError } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: triagem.conversa_id,
          whatsapp_conta_id: conta.id,
          whatsapp_contato_id: triagem.contato_id,
          corpo: mensagemTexto,
          tipo_mensagem: 'texto',
          direcao: 'enviada',
          status: 'pendente',
          numero_para: contato.numero_whatsapp,
          enviada_por_bot: true,
          enviada_automaticamente: true,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('⚠️ Erro ao criar mensagem no banco:', insertError);
        return;
      }

      console.log('✅ Mensagem criada no banco:', novaMensagem.id);

      // 2. Chamar meta-api-enviar-mensagem com o mensagemId
      const response = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/meta-api-enviar-mensagem`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ mensagemId: novaMensagem.id }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        console.error('⚠️ Erro ao enviar mensagem de CNPJ:', result);
      } else {
        console.log('✅ Mensagem de CNPJ enviada com sucesso:', result);
      }
    } catch (error) {
      console.error('⚠️ Erro ao enviar mensagem de CNPJ:', error);
    }
  } else {
    console.error('⚠️ Conta ou contato não encontrado para envio de CNPJ');
  }

  // Atualizar triagem
  await supabase
    .from('whatsapp_triagem_pendente')
    .update({
      status: 'aguardando',
      cnpj_solicitado: true,
      cnpj_solicitado_em: new Date().toISOString(),
      aguardar_ate: new Date(Date.now() + 60000).toISOString(), // Aguardar 1 minuto
    })
    .eq('id', triagem.id);

  // Atualizar status da conversa
  await supabase
    .from('whatsapp_conversas')
    .update({ triagem_status: 'aguardando_cnpj' })
    .eq('id', triagem.conversa_id);
}

async function chamarTriagemDeepSeek(supabase: any, triagem: TriagemPendente) {
  // Buscar mensagens da conversa
  const { data: mensagens } = await supabase
    .from('whatsapp_mensagens')
    .select('corpo, direcao, criado_em')
    .eq('conversa_id', triagem.conversa_id)
    .eq('direcao', 'recebida')
    .order('criado_em', { ascending: true })
    .limit(10);

  const mensagensTexto = mensagens
    ?.map((m: any) => m.corpo)
    .filter(Boolean)
    .join('\n') || '';

  // Chamar função de triagem DeepSeek
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/triar-conversa-deepseek`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        conversaId: triagem.conversa_id,
        mensagens: mensagensTexto,
      }),
    }
  );

  const resultado = await response.json();
  
  // Salvar resultado
  await supabase
    .from('whatsapp_triagem_pendente')
    .update({
      resultado_triagem: resultado,
      fila_definida_id: resultado.fila_id,
    })
    .eq('id', triagem.id);

  return resultado;
}

async function distribuirParaFila(supabase: any, triagem: TriagemPendente, resultadoTriagem: any) {
  console.log(`📋 Distribuindo para fila: ${resultadoTriagem.fila_nome}`);

  // Atualizar conversa com a fila
  await supabase
    .from('whatsapp_conversas')
    .update({
      whatsapp_fila_id: resultadoTriagem.fila_id,
      triagem_status: 'triagem_concluida',
      triagem_motivo: resultadoTriagem.justificativa,
    })
    .eq('id', triagem.conversa_id);

  // Chamar distribuição com filaId
  const distribuicaoResponse = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-distribuir-conversa`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        conversaId: triagem.conversa_id,
        contatoId: triagem.contato_id,
        filaId: resultadoTriagem.fila_id,
      }),
    }
  );

  const distribuicaoResult = await distribuicaoResponse.json();

  // Finalizar triagem
  await supabase
    .from('whatsapp_triagem_pendente')
    .update({
      status: 'concluido',
      fila_definida_id: resultadoTriagem.fila_id,
      operador_atribuido_id: distribuicaoResult.atendenteId || null,
      motivo_atribuicao: 'ia_triagem',
    })
    .eq('id', triagem.id);

  // Log de auditoria
  await supabase.from('whatsapp_interacoes').insert({
    conversa_id: triagem.conversa_id,
    tipo_evento: 'triagem_ia_concluida',
    descricao: `Triagem IA: ${resultadoTriagem.fila_nome} (${(resultadoTriagem.confianca * 100).toFixed(0)}%)`,
    metadata: resultadoTriagem,
    executado_por_bot: true,
  });

  // ===== NOVO: Se não atribuiu operador, acionar agente IA =====
  if (!distribuicaoResult.atendenteId) {
    console.log('🤖 Nenhum operador atribuído - verificando se deve acionar agente IA...');
    await acionarAgenteIA(supabase, triagem);
  }
}

async function colocarNaFilaEspera(supabase: any, triagem: TriagemPendente) {
  console.log('⏳ Colocando na fila de espera...');

  await supabase.from('whatsapp_fila_espera').insert({
    conversa_id: triagem.conversa_id,
    status: 'aguardando',
    prioridade: 'normal',
  });

  await supabase
    .from('whatsapp_conversas')
    .update({
      em_distribuicao: true,
      triagem_status: 'triagem_concluida',
      triagem_motivo: 'Sem fila específica, aguardando atendimento',
    })
    .eq('id', triagem.conversa_id);

  await supabase
    .from('whatsapp_triagem_pendente')
    .update({
      status: 'concluido',
      motivo_atribuicao: 'fila_espera',
    })
    .eq('id', triagem.id);

  // ===== NOVO: Sem operador na fila de espera, acionar agente IA =====
  console.log('🤖 Conversa em fila de espera sem operador - verificando se deve acionar agente IA...');
  await acionarAgenteIA(supabase, triagem);
}

// ===== NOVA FUNÇÃO: Direcionar para fila "Atendimento IA" =====
async function direcionarParaFilaIA(supabase: any, triagem: TriagemPendente, clienteInfo: any) {
  console.log(`🤖 Direcionando conversa ${triagem.conversa_id} para fila "Atendimento IA"...`);
  
  // 1. Atualizar conversa com fila (cliente_id não existe na tabela - vínculo feito via contato)
  const { error: updateConversaError } = await supabase
    .from('whatsapp_conversas')
    .update({
      whatsapp_fila_id: FILA_ATENDIMENTO_IA_ID,
      triagem_status: 'triagem_concluida',
      triagem_motivo: `Cliente ${clienteInfo.cliente_nome} identificado - Atendimento IA`,
      em_distribuicao: true, // Permite resgate manual por operador
    })
    .eq('id', triagem.conversa_id);

  if (updateConversaError) {
    console.error('❌ Erro ao atualizar conversa:', updateConversaError);
  }

  // 2. Finalizar triagem pendente
  const { error: updateTriagemError } = await supabase
    .from('whatsapp_triagem_pendente')
    .update({
      status: 'concluido',
      cliente_encontrado_id: clienteInfo.cliente_id,
      vendedor_encontrado_id: clienteInfo.vendedor_id,
      fila_definida_id: FILA_ATENDIMENTO_IA_ID,
      motivo_atribuicao: 'fila_atendimento_ia',
    })
    .eq('id', triagem.id);

  if (updateTriagemError) {
    console.error('❌ Erro ao finalizar triagem:', updateTriagemError);
  }

  // 3. Colocar na fila de espera para possível resgate manual
  // Calcular próxima posição na fila
  const { data: ultimaPosicao } = await supabase
    .from('whatsapp_fila_espera')
    .select('posicao')
    .eq('whatsapp_fila_id', FILA_ATENDIMENTO_IA_ID)
    .eq('status', 'aguardando')
    .order('posicao', { ascending: false })
    .limit(1)
    .single();

  const proximaPosicao = (ultimaPosicao?.posicao || 0) + 1;

  const { error: filaError } = await supabase
    .from('whatsapp_fila_espera')
    .insert({
      conversa_id: triagem.conversa_id,
      whatsapp_fila_id: FILA_ATENDIMENTO_IA_ID,
      prioridade: 'normal',
      status: 'aguardando',
      posicao: proximaPosicao,
    });

  if (filaError) {
    console.error('❌ Erro ao inserir na fila de espera:', filaError);
  }

  // 4. Log de auditoria
  await supabase.from('whatsapp_interacoes').insert({
    conversa_id: triagem.conversa_id,
    tipo_evento: 'direcionado_fila_ia',
    descricao: `Cliente ${clienteInfo.cliente_nome} direcionado para fila "Atendimento IA" - aguardando atendimento bot`,
    metadata: { 
      cliente_id: clienteInfo.cliente_id, 
      cliente_nome: clienteInfo.cliente_nome,
      vendedor_id: clienteInfo.vendedor_id,
      fila_id: FILA_ATENDIMENTO_IA_ID,
      motivo: 'vendedor_offline_ou_inexistente'
    },
    executado_por_bot: true,
  });

  console.log(`✅ Conversa direcionada para "Atendimento IA" - cliente: ${clienteInfo.cliente_nome}`);
}

// ===== NOVA FUNÇÃO: Acionar agente IA após triagem concluída sem operador =====
async function acionarAgenteIA(supabase: any, triagem: TriagemPendente) {
  try {
    console.log('🤖 Verificando se deve acionar agente IA após triagem...');
    
    // Buscar configuração do agente na conta
    const { data: conta, error: contaError } = await supabase
      .from('whatsapp_contas')
      .select('id, agente_vendas_ativo, agente_ia_config')
      .eq('id', triagem.conta_id)
      .single();
    
    if (contaError || !conta) {
      console.log('⚠️ Erro ao buscar conta WhatsApp:', contaError?.message);
      return;
    }

    if (!conta.agente_vendas_ativo) {
      console.log('ℹ️ Agente de vendas não está ativo na conta');
      return;
    }
    
    const agenteConfig = conta.agente_ia_config || {};
    const regras = agenteConfig.regras || {};
    const deveResponder = regras.responder_cliente_novo_sem_operador !== false;
    
    if (!deveResponder) {
      console.log('ℹ️ Configuração não permite responder cliente novo sem operador');
      return;
    }
    
    // Buscar dados da conversa e contato para enviar mensagem
    const { data: conversa, error: conversaError } = await supabase
      .from('whatsapp_conversas')
      .select('id, whatsapp_contato_id')
      .eq('id', triagem.conversa_id)
      .single();
    
    if (conversaError || !conversa) {
      console.log('⚠️ Erro ao buscar conversa:', conversaError?.message);
      return;
    }
    
    const { data: contato, error: contatoError } = await supabase
      .from('whatsapp_contatos')
      .select('id, numero_whatsapp')
      .eq('id', conversa.whatsapp_contato_id)
      .single();
    
    if (contatoError || !contato) {
      console.log('⚠️ Erro ao buscar contato:', contatoError?.message);
      return;
    }
    
    // Buscar última mensagem recebida para processar
    const { data: ultimaMensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select('id, corpo')
      .eq('conversa_id', triagem.conversa_id)
      .eq('direcao', 'recebida')
      .order('criado_em', { ascending: false })
      .limit(1)
      .single();
    
    if (msgError || !ultimaMensagem) {
      console.log('⚠️ Nenhuma mensagem recebida encontrada para processar:', msgError?.message);
      return;
    }
    
    console.log(`🚀 Acionando agente IA via agente-vendas-whatsapp para conversa ${triagem.conversa_id}...`);
    console.log(`   Mensagem a processar: "${ultimaMensagem.corpo?.substring(0, 50)}..."`);
    
    // Chamar o agente de vendas
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/agente-vendas-whatsapp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          conversaId: triagem.conversa_id,
          mensagemId: ultimaMensagem.id,
          mensagemTexto: ultimaMensagem.corpo,
          tipoMensagem: 'text',
          origem: 'triagem_concluida',
        }),
      }
    );
    
    if (response.ok) {
      const resultado = await response.json();
      console.log('✅ Agente IA retornou:', resultado);
      
      // === ENVIAR RESPOSTA DO AGENTE PARA O WHATSAPP ===
      if (resultado.resposta) {
        console.log('📤 Enviando resposta do agente para WhatsApp:', resultado.resposta.substring(0, 100));
        
        // 1. Inserir mensagem no banco
        const { data: mensagemAgente, error: insertError } = await supabase
          .from('whatsapp_mensagens')
          .insert({
            conversa_id: triagem.conversa_id,
            whatsapp_conta_id: triagem.conta_id,
            whatsapp_contato_id: conversa.whatsapp_contato_id,
            direcao: 'enviada',
            tipo_mensagem: 'texto',
            corpo: resultado.resposta,
            status: 'pendente',
            enviada_por_bot: true,
            numero_para: contato.numero_whatsapp,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('❌ Erro ao inserir mensagem do agente:', insertError.message);
        } else if (mensagemAgente) {
          console.log('📝 Mensagem inserida com ID:', mensagemAgente.id);
          
          // 2. Chamar meta-api-enviar-mensagem para enviar de fato
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
          
          if (enviarResponse.ok) {
            console.log('✅ Mensagem do agente enviada com sucesso via Meta API');
          } else {
            const enviarError = await enviarResponse.text();
            console.error('❌ Erro ao enviar mensagem via Meta API:', enviarError);
          }
        }
      } else {
        console.log('ℹ️ Agente não retornou resposta para enviar');
      }
      
      // Log de auditoria
      await supabase.from('whatsapp_interacoes').insert({
        conversa_id: triagem.conversa_id,
        tipo_evento: 'agente_ia_acionado_pos_triagem',
        descricao: 'Agente IA acionado automaticamente após triagem concluir sem operador',
        metadata: { 
          origem: 'triagem_concluida', 
          mensagem_id: ultimaMensagem.id,
          resposta_enviada: !!resultado.resposta,
        },
        executado_por_bot: true,
      });
    } else {
      const errorText = await response.text();
      console.error('⚠️ Erro ao acionar agente IA:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Erro inesperado ao acionar agente IA:', error);
  }
}
