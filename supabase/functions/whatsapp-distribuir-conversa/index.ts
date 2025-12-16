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

    const { 
      conversaId, 
      contatoId,
      filaId, 
      unidadeId, 
      operadorCarteiraId,
      modoCarteirizacao = 'preferencial',
      carteirizacaoAtiva = false,
      forcarDistribuicao = false 
    } = await req.json();

    if (!conversaId) {
      throw new Error('conversaId é obrigatório');
    }

    console.log('🔄 Distribuindo conversa:', { 
      conversaId, 
      contatoId,
      filaId, 
      unidadeId, 
      operadorCarteiraId, 
      modoCarteirizacao, 
      carteirizacaoAtiva 
    });

    // ===== FASE 1: VERIFICAR CARTEIRA V2 =====
    let atendenteId: string | null = null;
    let motivoDistribuicao = '';

    // Se carteirização ativa, priorizar operador da carteira
    if (carteirizacaoAtiva && contatoId) {
      console.log('📂 Verificando carteira v2 para contato:', contatoId);
      
      // Usar a função buscar_operador_carteira que já criamos
      const { data: operadorCarteira, error: carteiraError } = await supabase
        .rpc('buscar_operador_carteira', { p_contato_id: contatoId });
      
      if (carteiraError) {
        console.warn('⚠️ Erro ao buscar carteira:', carteiraError);
      }
      
      if (operadorCarteira) {
        console.log('✅ Operador da carteira encontrado:', operadorCarteira);
        
        // Verificar se operador está online
        const { data: perfilOperador } = await supabase
          .from('perfis_usuario')
          .select('id, nome_completo, status_atendimento')
          .eq('id', operadorCarteira)
          .single();
        
        if (perfilOperador?.status_atendimento === 'online') {
          // Verificar limite de atendimentos
          const { data: configAtendimento } = await supabase
            .from('whatsapp_configuracoes_atendimento')
            .select('max_atendimentos_simultaneos')
            .limit(1)
            .single();
          
          const maxAtendimentos = configAtendimento?.max_atendimentos_simultaneos || 5;
          
          const { count: atendimentosAtivos } = await supabase
            .from('whatsapp_conversas')
            .select('id', { count: 'exact', head: true })
            .eq('operador_id', operadorCarteira)
            .eq('status', 'aberta');
          
          if ((atendimentosAtivos || 0) < maxAtendimentos) {
            atendenteId = operadorCarteira;
            motivoDistribuicao = 'carteira_v2';
            console.log('✅ Operador da carteira disponível e dentro do limite');
          } else {
            console.log('⚠️ Operador da carteira está no limite de atendimentos');
            if (modoCarteirizacao === 'forcar') {
              // Modo forçar: aguarda operador da carteira
              motivoDistribuicao = 'aguardando_operador_carteira';
            }
          }
        } else {
          console.log('⚠️ Operador da carteira não está online:', perfilOperador?.status_atendimento);
          if (modoCarteirizacao === 'forcar') {
            // Modo forçar: aguarda operador da carteira ficar online
            motivoDistribuicao = 'aguardando_operador_carteira';
          }
        }
      }
    }

    // ===== FASE 2: FALLBACK PARA DISTRIBUIÇÃO ROUND-ROBIN =====
    if (!atendenteId && motivoDistribuicao !== 'aguardando_operador_carteira') {
      console.log('🔄 Iniciando distribuição round-robin...');
      
      // Buscar configuração
      const { data: configAtendimento } = await supabase
        .from('whatsapp_configuracoes_atendimento')
        .select('*')
        .limit(1)
        .single();
      
      const maxAtendimentos = configAtendimento?.max_atendimentos_simultaneos || 5;
      
      // Buscar operadores online com capacidade
      const { data: operadoresDisponiveis } = await supabase
        .from('perfis_usuario')
        .select(`
          id,
          nome_completo,
          status_atendimento,
          whatsapp_conversas:whatsapp_conversas(count)
        `)
        .eq('status_atendimento', 'online')
        .eq('whatsapp_ativo', true);
      
      if (operadoresDisponiveis && operadoresDisponiveis.length > 0) {
        // Filtrar operadores com capacidade disponível
        const operadoresComCapacidade = [];
        
        for (const op of operadoresDisponiveis) {
          const { count } = await supabase
            .from('whatsapp_conversas')
            .select('id', { count: 'exact', head: true })
            .eq('operador_id', op.id)
            .eq('status', 'aberta');
          
          if ((count || 0) < maxAtendimentos) {
            operadoresComCapacidade.push({
              ...op,
              atendimentos_ativos: count || 0
            });
          }
        }
        
        if (operadoresComCapacidade.length > 0) {
          // Ordenar por menor quantidade de atendimentos (menos ocupado primeiro)
          operadoresComCapacidade.sort((a, b) => a.atendimentos_ativos - b.atendimentos_ativos);
          atendenteId = operadoresComCapacidade[0].id;
          motivoDistribuicao = 'round_robin_menos_ocupado';
          console.log('✅ Operador selecionado por round-robin:', atendenteId);
        }
      }
    }

    // ===== FASE 3: ATRIBUIR OU COLOCAR NA FILA =====
    if (atendenteId) {
      // Atribuir conversa ao operador
      const { error: updateError } = await supabase
        .from('whatsapp_conversas')
        .update({
          operador_id: atendenteId,
          status: 'aberta',
          em_distribuicao: false,
          distribuicao_iniciada_em: null,
        })
        .eq('id', conversaId);

      if (updateError) {
        console.error('❌ Erro ao atribuir conversa:', updateError);
        throw updateError;
      }

      // Get attendant info
      const { data: atendente } = await supabase
        .from('perfis_usuario')
        .select('id, nome_completo')
        .eq('id', atendenteId)
        .single();

      // Audit log
      await supabase.from('whatsapp_auditoria').insert({
        tipo_evento: 'conversa_distribuida',
        descricao: `Conversa distribuída para ${atendente?.nome_completo || 'atendente'} (${motivoDistribuicao})`,
        usuario_id: atendenteId,
        whatsapp_conversa_id: conversaId,
        dados_evento: {
          atendente_id: atendenteId,
          atendente_nome: atendente?.nome_completo,
          motivo: motivoDistribuicao,
          fila_id: filaId,
          unidade_id: unidadeId,
        },
      });

      // Send notification to attendant
      await supabase.from('notificacoes').insert({
        user_id: atendenteId,
        tipo: 'whatsapp_nova_conversa',
        titulo: 'Nova conversa WhatsApp',
        descricao: 'Uma nova conversa foi atribuída a você',
        dados: { conversa_id: conversaId },
      });

      console.log('✅ Conversa distribuída com sucesso:', { atendenteId, motivoDistribuicao });

      return new Response(
        JSON.stringify({
          success: true,
          atendenteId: atendenteId,
          atendentNome: atendente?.nome_completo,
          motivo: motivoDistribuicao,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No attendant available - add to queue
    console.log('⏳ Nenhum atendente disponível, adicionando à fila:', motivoDistribuicao || 'sem_operadores_disponiveis');

    // Check if already in queue
    const { data: existingQueue } = await supabase
      .from('whatsapp_fila_espera')
      .select('id')
      .eq('conversa_id', conversaId)
      .eq('status', 'aguardando')
      .single();

    if (!existingQueue) {
      // Get conversation priority
      const { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('prioridade')
        .eq('id', conversaId)
        .single();

      await supabase.from('whatsapp_fila_espera').insert({
        conversa_id: conversaId,
        whatsapp_fila_id: filaId || null,
        fila_id: filaId || null,
        unidade_id: unidadeId || null,
        prioridade: conversa?.prioridade || 'normal',
        status: 'aguardando',
      });

      // Update conversation
      await supabase
        .from('whatsapp_conversas')
        .update({
          em_distribuicao: true,
          distribuicao_iniciada_em: new Date().toISOString(),
          tentativas_distribuicao: 1,
        })
        .eq('id', conversaId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        queued: true,
        reason: motivoDistribuicao || 'Nenhum atendente disponível',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in whatsapp-distribuir-conversa:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
