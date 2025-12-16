import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

        // 3. FASE: Se não tem cliente vinculado, verificar se já solicitou CNPJ
        if (!triagem.cnpj_solicitado && !resultadoCliente.cliente_id) {
          // Coletar mensagens e verificar se cliente enviou CNPJ
          const cnpjEncontrado = await buscarCNPJNasMensagens(supabase, triagem.conversa_id);
          
          if (cnpjEncontrado) {
            // Validar CNPJ
            const cliente = await validarCNPJ(supabase, cnpjEncontrado);
            if (cliente) {
              // CNPJ válido, atribuir ao vendedor do cliente
              const atribuido = await atribuirVendedorCliente(supabase, triagem, cliente);
              if (atribuido) {
                resultados.push({ id: triagem.id, status: 'cnpj_validado', cliente_id: cliente.cliente_id });
                continue;
              }
            }
          } else {
            // Não encontrou CNPJ, enviar mensagem solicitando
            await solicitarCNPJ(supabase, triagem);
            resultados.push({ id: triagem.id, status: 'cnpj_solicitado' });
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
    .select('contato_id, telefone')
    .eq('id', triagem.contato_id)
    .single();

  if (!whatsappContato?.contato_id) {
    // Tentar buscar por telefone normalizado
    const telefoneNormalizado = whatsappContato?.telefone?.replace(/\D/g, '');
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
    .select('telefone')
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
          numero_para: contato.telefone,
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
}
