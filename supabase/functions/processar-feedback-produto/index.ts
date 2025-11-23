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
    const { 
      conversaId, 
      produtoId, 
      tipo, 
      foiComprado = false,
      foiSugerido = true,
      queryBusca = null,
      motivoRejeicao = null,
      comentarioCliente = null,
    } = await req.json();

    if (!['positivo', 'negativo', 'neutro'].includes(tipo)) {
      throw new Error('Tipo de feedback inválido. Use: positivo, negativo ou neutro');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

    console.log('📝 Processando feedback do produto:', produtoId, '- Tipo:', tipo);

    // Buscar proposta ativa da conversa (se houver)
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('proposta_ativa_id')
      .eq('id', conversaId)
      .single();

    // Calcular ajuste de score baseado no feedback
    let scoreAjuste = 0;
    if (tipo === 'positivo') {
      scoreAjuste = foiComprado ? 0.2 : 0.1; // Mais peso se foi comprado
    } else if (tipo === 'negativo') {
      scoreAjuste = -0.1;
    }

    // Inserir feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('whatsapp_feedback_produtos')
      .insert({
        conversa_id: conversaId,
        proposta_id: conversa?.proposta_ativa_id || null,
        produto_id: produtoId,
        tipo,
        query_busca: queryBusca,
        foi_sugerido: foiSugerido,
        foi_comprado: foiComprado,
        motivo_rejeicao: motivoRejeicao,
        comentario_cliente: comentarioCliente,
        score_ajuste: scoreAjuste,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Erro ao inserir feedback:', feedbackError);
      throw feedbackError;
    }

    console.log('✅ Feedback registrado:', feedback.id);

    // Atualizar ou criar registro de score do produto
    const { data: scoreAtual } = await supabase
      .from('produtos_score_ajuste')
      .select('*')
      .eq('produto_id', produtoId)
      .single();

    if (scoreAtual) {
      // Atualizar score existente
      const updates: any = {
        atualizado_em: new Date().toISOString(),
      };

      if (tipo === 'positivo') {
        updates.total_feedbacks_positivos = scoreAtual.total_feedbacks_positivos + 1;
      } else if (tipo === 'negativo') {
        updates.total_feedbacks_negativos = scoreAtual.total_feedbacks_negativos + 1;
      }

      if (foiSugerido) {
        updates.total_vezes_sugerido = scoreAtual.total_vezes_sugerido + 1;
      }

      if (foiComprado) {
        updates.total_vezes_comprado = scoreAtual.total_vezes_comprado + 1;
      }

      // Ajustar score_ml
      updates.score_ml = (scoreAtual.score_ml || 0) + scoreAjuste;

      await supabase
        .from('produtos_score_ajuste')
        .update(updates)
        .eq('produto_id', produtoId);

    } else {
      // Criar novo registro
      await supabase
        .from('produtos_score_ajuste')
        .insert({
          produto_id: produtoId,
          score_ml: scoreAjuste,
          total_feedbacks_positivos: tipo === 'positivo' ? 1 : 0,
          total_feedbacks_negativos: tipo === 'negativo' ? 1 : 0,
          total_vezes_sugerido: foiSugerido ? 1 : 0,
          total_vezes_comprado: foiComprado ? 1 : 0,
        });
    }

    console.log('✅ Score do produto atualizado');

    // Registrar interação
    await supabase.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      tipo_evento: 'feedback_produto_registrado',
      descricao: `Feedback ${tipo} registrado para produto ${produtoId}`,
      metadata: {
        produto_id: produtoId,
        tipo,
        foi_comprado: foiComprado,
        score_ajuste: scoreAjuste,
      },
      executado_por_bot: true,
    });

    return new Response(
      JSON.stringify({
        feedbackId: feedback.id,
        scoreAtualizado: true,
        scoreAjuste,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar feedback:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
