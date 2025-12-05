import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { responsavel_id, equipe_id, limite } = await req.json();

    console.log('[PRIORIDADE] Calculando scores...', { responsavel_id, equipe_id, limite });

    // Buscar atividades pendentes
    let query = supabase
      .from('atividades')
      .select('id, score_lead_fit, score_engajamento, data_vencimento, prioridade, score_valor_potencial')
      .is('excluido_em', null)
      .in('status', ['pendente', 'em_andamento', 'aguardando_resposta']);

    if (responsavel_id) {
      query = query.eq('responsavel_id', responsavel_id);
    }
    if (equipe_id) {
      query = query.eq('equipe_id', equipe_id);
    }
    if (limite) {
      query = query.limit(limite);
    }

    const { data: atividades, error: atividadesError } = await query;

    if (atividadesError) {
      throw new Error(`Erro ao buscar atividades: ${atividadesError.message}`);
    }

    console.log(`[PRIORIDADE] ${atividades?.length || 0} atividades encontradas`);

    const atualizacoes = [];

    for (const atividade of atividades || []) {
      const leadFit = atividade.score_lead_fit || 50;
      const engajamento = atividade.score_engajamento || 50;
      const valorPotencial = atividade.score_valor_potencial || 0;
      
      // Calcular decaimento temporal
      let decaimento = 0;
      if (atividade.data_vencimento) {
        const vencimento = new Date(atividade.data_vencimento);
        const agora = new Date();
        
        if (vencimento < agora) {
          decaimento = -100; // Atrasada = penalidade máxima (score negativo aumenta prioridade)
        } else {
          const horasRestantes = (vencimento.getTime() - agora.getTime()) / (1000 * 60 * 60);
          decaimento = Math.max(0, 100 - horasRestantes);
        }
      }

      // Calcular urgência baseada na prioridade
      const urgenciaMap: Record<string, number> = {
        'critica': 100,
        'alta': 75,
        'media': 50,
        'baixa': 25
      };
      const urgencia = urgenciaMap[atividade.prioridade] || 50;

      // Bônus de valor
      const bonusValor = valorPotencial / 10000;

      // Fórmula: Score = (LeadFit × Engajamento/100) - Decaimento + Urgência + BonusValor
      const score = (leadFit * engajamento / 100) - decaimento + urgencia + bonusValor;

      atualizacoes.push({
        id: atividade.id,
        score_prioridade: score,
        score_decaimento_temporal: decaimento,
        score_urgencia: urgencia,
        score_calculado_em: new Date().toISOString()
      });
    }

    // Atualizar em batch
    for (const atualizacao of atualizacoes) {
      await supabase
        .from('atividades')
        .update({
          score_prioridade: atualizacao.score_prioridade,
          score_decaimento_temporal: atualizacao.score_decaimento_temporal,
          score_urgencia: atualizacao.score_urgencia,
          score_calculado_em: atualizacao.score_calculado_em
        })
        .eq('id', atualizacao.id);
    }

    // Refresh da Materialized View
    await supabase.rpc('refresh_mv_atividades_prioridade');

    console.log(`[PRIORIDADE] ${atualizacoes.length} atividades atualizadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        atualizadas: atualizacoes.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[PRIORIDADE] Erro:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
