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

    console.log('⏱️ Checking SLA for active conversations...');

    // Get SLA configuration
    const { data: config } = await supabase
      .from('whatsapp_configuracoes_atendimento')
      .select('*')
      .eq('nivel', 'empresa')
      .single();

    const slaTempoResposta = config?.sla_tempo_resposta_segundos || 300; // 5 min default
    const slaTempoResolucao = config?.sla_tempo_resolucao_segundos || 86400; // 24h default

    // Get active conversations without response
    const { data: conversasSemResposta } = await supabase
      .from('whatsapp_conversas')
      .select(`
        id,
        created_at,
        atribuida_para_id,
        whatsapp_conta_id,
        whatsapp_mensagens (
          id,
          direcao,
          created_at
        )
      `)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false })
      .limit(100);

    const now = new Date();
    const alertas: any[] = [];
    const conversasVioladas: string[] = [];

    for (const conversa of conversasSemResposta || []) {
      const mensagens = conversa.whatsapp_mensagens || [];
      
      // Find last received message without response
      const ultimaRecebida = mensagens
        .filter((m: any) => m.direcao === 'recebida')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      const ultimaEnviada = mensagens
        .filter((m: any) => m.direcao === 'enviada')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (ultimaRecebida) {
        const tempoRecebida = new Date(ultimaRecebida.created_at);
        const tempoEnviada = ultimaEnviada ? new Date(ultimaEnviada.created_at) : null;

        // Check if last message is received (awaiting response)
        if (!tempoEnviada || tempoRecebida > tempoEnviada) {
          const tempoEspera = Math.floor((now.getTime() - tempoRecebida.getTime()) / 1000);

          // Check SLA violation
          if (tempoEspera > slaTempoResposta) {
            const percentualExcedido = Math.floor((tempoEspera / slaTempoResposta - 1) * 100);
            
            conversasVioladas.push(conversa.id);

            // Create alert
            alertas.push({
              tipo_evento: 'sla_violacao_tempo_resposta',
              descricao: `SLA de tempo de resposta violado (${Math.floor(tempoEspera / 60)}min, limite: ${Math.floor(slaTempoResposta / 60)}min)`,
              nivel_risco: percentualExcedido > 100 ? 'critico' : 'alto',
              whatsapp_conversa_id: conversa.id,
              whatsapp_conta_id: conversa.whatsapp_conta_id,
              usuario_id: conversa.atribuida_para_id,
              dados_evento: {
                tempo_espera_segundos: tempoEspera,
                sla_limite_segundos: slaTempoResposta,
                percentual_excedido: percentualExcedido,
              },
            });

            // Notify attendant if assigned
            if (conversa.atribuida_para_id) {
              await supabase.from('notificacoes').insert({
                user_id: conversa.atribuida_para_id,
                tipo: 'whatsapp_sla_alerta',
                titulo: '⚠️ SLA em risco',
                descricao: `Conversa aguardando resposta há ${Math.floor(tempoEspera / 60)} minutos`,
                dados: { conversa_id: conversa.id },
              });
            }
          }
        }
      }

      // Check resolution SLA
      const tempoConversa = Math.floor((now.getTime() - new Date(conversa.created_at).getTime()) / 1000);
      if (tempoConversa > slaTempoResolucao) {
        alertas.push({
          tipo_evento: 'sla_violacao_tempo_resolucao',
          descricao: `SLA de tempo de resolução violado (${Math.floor(tempoConversa / 3600)}h, limite: ${Math.floor(slaTempoResolucao / 3600)}h)`,
          nivel_risco: 'alto',
          whatsapp_conversa_id: conversa.id,
          whatsapp_conta_id: conversa.whatsapp_conta_id,
          usuario_id: conversa.atribuida_para_id,
          dados_evento: {
            tempo_conversa_segundos: tempoConversa,
            sla_limite_segundos: slaTempoResolucao,
          },
        });
      }
    }

    // Insert alerts to audit log
    if (alertas.length > 0) {
      await supabase.from('whatsapp_auditoria').insert(alertas);
    }

    // Update queue SLA status
    const { data: filaAguardando } = await supabase
      .from('whatsapp_fila_espera')
      .select('*')
      .eq('status', 'aguardando');

    for (const item of filaAguardando || []) {
      const tempoFila = Math.floor((now.getTime() - new Date(item.entrada_fila).getTime()) / 1000);
      const limiteFilaSegundos = config?.tempo_maximo_fila_segundos || 600; // 10 min default

      if (tempoFila > limiteFilaSegundos && !item.sla_violado) {
        await supabase
          .from('whatsapp_fila_espera')
          .update({ sla_violado: true })
          .eq('id', item.id);

        // Escalate priority
        await supabase
          .from('whatsapp_fila_espera')
          .update({ prioridade: 'urgente' })
          .eq('id', item.id)
          .eq('prioridade', 'normal');
      }
    }

    console.log(`✅ SLA check complete. Violations: ${conversasVioladas.length}, Queue items: ${filaAguardando?.length || 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        violations: conversasVioladas.length,
        alerts: alertas.length,
        queueItems: filaAguardando?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in whatsapp-verificar-sla:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
