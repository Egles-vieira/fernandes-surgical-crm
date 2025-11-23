import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { data: dataParam } = await req.json();
    const dataAlvo = dataParam || new Date().toISOString().split('T')[0];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

    console.log('📊 Coletando métricas para:', dataAlvo);

    // Buscar todas as contas WhatsApp ativas
    const { data: contas } = await supabase
      .from('whatsapp_contas')
      .select('id')
      .eq('esta_ativa', true);

    if (!contas || contas.length === 0) {
      console.log('ℹ️ Nenhuma conta ativa');
      return new Response(
        JSON.stringify({ message: 'Nenhuma conta ativa', metricas: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metricasColetadas: any[] = [];

    for (const conta of contas) {
      console.log(`📈 Processando conta: ${conta.id}`);

      // Buscar IDs das conversas da conta
      const { data: conversasDaConta } = await supabase
        .from('whatsapp_conversas')
        .select('id')
        .eq('whatsapp_conta_id', conta.id);

      const conversasIds = conversasDaConta?.map(c => c.id) || [];

      if (conversasIds.length === 0) {
        console.log(`ℹ️ Nenhuma conversa para conta ${conta.id}`);
        continue;
      }

      // Conversas iniciadas no dia
      const { count: conversasIniciadas } = await supabase
        .from('whatsapp_conversas')
        .select('id', { count: 'exact', head: true })
        .eq('whatsapp_conta_id', conta.id)
        .gte('criado_em', `${dataAlvo}T00:00:00`)
        .lte('criado_em', `${dataAlvo}T23:59:59`);

      // Conversas fechadas no dia
      const { count: conversasFechadas } = await supabase
        .from('whatsapp_conversas')
        .select('id', { count: 'exact', head: true })
        .eq('whatsapp_conta_id', conta.id)
        .eq('status', 'fechado')
        .gte('atualizado_em', `${dataAlvo}T00:00:00`)
        .lte('atualizado_em', `${dataAlvo}T23:59:59`);

      // Mensagens enviadas pelo bot
      const { count: mensagensBot } = await supabase
        .from('whatsapp_mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('direcao', 'saida')
        .eq('enviada_por_bot', true)
        .in('conversa_id', conversasIds)
        .gte('criado_em', `${dataAlvo}T00:00:00`)
        .lte('criado_em', `${dataAlvo}T23:59:59`);

      // Mensagens recebidas de clientes
      const { count: mensagensRecebidas } = await supabase
        .from('whatsapp_mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('direcao', 'entrada')
        .in('conversa_id', conversasIds)
        .gte('criado_em', `${dataAlvo}T00:00:00`)
        .lte('criado_em', `${dataAlvo}T23:59:59`);

      // Propostas geradas
      const { count: propostasGeradas } = await supabase
        .from('whatsapp_propostas_comerciais')
        .select('id', { count: 'exact', head: true })
        .in('conversa_id', conversasIds)
        .gte('criado_em', `${dataAlvo}T00:00:00`)
        .lte('criado_em', `${dataAlvo}T23:59:59`);

      // Propostas aceitas
      const { count: propostasAceitas } = await supabase
        .from('whatsapp_propostas_comerciais')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'aceita')
        .in('conversa_id', conversasIds)
        .gte('aceita_em', `${dataAlvo}T00:00:00`)
        .lte('aceita_em', `${dataAlvo}T23:59:59`);

      // Propostas rejeitadas
      const { count: propostasRejeitadas } = await supabase
        .from('whatsapp_propostas_comerciais')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejeitada')
        .in('conversa_id', conversasIds)
        .gte('rejeitada_em', `${dataAlvo}T00:00:00`)
        .lte('rejeitada_em', `${dataAlvo}T23:59:59`);

      // Tempo médio de resposta (simplificado)
      const tempoMedioResposta = 15;

      // Verificar se já existe métrica
      const { data: existente } = await supabase
        .from('whatsapp_metricas_agente')
        .select('id')
        .eq('data', dataAlvo)
        .eq('whatsapp_conta_id', conta.id)
        .single();

      const metricas = {
        data: dataAlvo,
        whatsapp_conta_id: conta.id,
        conversas_iniciadas: conversasIniciadas || 0,
        conversas_fechadas: conversasFechadas || 0,
        mensagens_bot_enviadas: mensagensBot || 0,
        mensagens_humano_recebidas: mensagensRecebidas || 0,
        propostas_geradas: propostasGeradas || 0,
        propostas_aceitas: propostasAceitas || 0,
        propostas_rejeitadas: propostasRejeitadas || 0,
        tempo_medio_resposta: tempoMedioResposta
      };

      if (existente) {
        await supabase
          .from('whatsapp_metricas_agente')
          .update(metricas)
          .eq('id', existente.id);
      } else {
        await supabase
          .from('whatsapp_metricas_agente')
          .insert(metricas);
      }

      metricasColetadas.push(metricas);
      console.log(`✅ Métricas coletadas para conta ${conta.id}`);
    }

    return new Response(
      JSON.stringify({
        message: 'Métricas coletadas com sucesso',
        data: dataAlvo,
        total_contas: metricasColetadas.length,
        metricas: metricasColetadas
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao coletar métricas:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
