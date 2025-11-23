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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

    console.log('🔄 Iniciando atualização de scores ML...');

    // Buscar todos os feedbacks não processados
    const { data: feedbacks } = await supabase
      .from('whatsapp_feedback_produtos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (!feedbacks || feedbacks.length === 0) {
      console.log('ℹ️ Nenhum feedback para processar');
      return new Response(
        JSON.stringify({ message: 'Nenhum feedback para processar', total_produtos: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processando ${feedbacks.length} feedbacks`);

    // Agrupar feedbacks por produto
    const feedbacksPorProduto: Record<string, any[]> = {};
    
    for (const feedback of feedbacks) {
      if (!feedback.produto_id) continue;
      
      if (!feedbacksPorProduto[feedback.produto_id]) {
        feedbacksPorProduto[feedback.produto_id] = [];
      }
      feedbacksPorProduto[feedback.produto_id].push(feedback);
    }

    const produtosProcessados: string[] = [];

    // Processar cada produto
    for (const [produtoId, feedbacksList] of Object.entries(feedbacksPorProduto)) {
      const positivos = feedbacksList.filter(f => f.tipo === 'positivo').length;
      const negativos = feedbacksList.filter(f => f.tipo === 'negativo').length;
      const neutros = feedbacksList.filter(f => f.tipo === 'neutro').length;
      
      const sugeridos = feedbacksList.filter(f => f.foi_sugerido_ia).length;
      const comprados = feedbacksList.filter(f => f.foi_comprado).length;
      
      // Calcular taxa de conversão
      const taxaConversao = sugeridos > 0 ? (comprados / sugeridos) * 100 : 0;

      // Verificar se já existe registro
      const { data: existente } = await supabase
        .from('produtos_score_ajuste')
        .select('id')
        .eq('produto_id', produtoId)
        .single();

      if (existente) {
        // Atualizar
        await supabase
          .from('produtos_score_ajuste')
          .update({
            feedback_positivo: positivos,
            feedback_negativo: negativos,
            total_sugerido: sugeridos,
            total_comprado: comprados,
            taxa_conversao: taxaConversao,
            atualizado_em: new Date().toISOString()
          })
          .eq('produto_id', produtoId);
      } else {
        // Criar novo
        await supabase
          .from('produtos_score_ajuste')
          .insert({
            produto_id: produtoId,
            feedback_positivo: positivos,
            feedback_negativo: negativos,
            total_sugerido: sugeridos,
            total_comprado: comprados,
            taxa_conversao: taxaConversao
          });
      }

      produtosProcessados.push(produtoId);
      console.log(`✅ Produto ${produtoId}: +${positivos} -${negativos} =${neutros} | Conv: ${taxaConversao.toFixed(1)}%`);
    }

    console.log(`🎯 Total de produtos atualizados: ${produtosProcessados.length}`);

    return new Response(
      JSON.stringify({
        message: 'Scores ML atualizados com sucesso',
        total_produtos: produtosProcessados.length,
        produtos: produtosProcessados
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao atualizar scores ML:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
