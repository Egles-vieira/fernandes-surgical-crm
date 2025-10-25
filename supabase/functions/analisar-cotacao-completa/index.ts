import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ItemAnalise {
  item_id: string;
  descricao: string;
  codigo_cliente?: string;
  quantidade: number;
  unidade_medida?: string;
}

interface ResultadoAnaliseItem {
  item_id: string;
  sucesso: boolean;
  score_confianca?: number;
  produtos_sugeridos?: any;
  erro?: string;
  tempo_ms?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cotacao_id } = await req.json();
    
    if (!cotacao_id) {
      return new Response(
        JSON.stringify({ error: 'cotacao_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🤖 Iniciando análise IA para cotação ${cotacao_id}...`);

    // Buscar cotação e seus itens
    const { data: cotacao, error: cotacaoError } = await supabase
      .from('edi_cotacoes')
      .select(`
        *,
        edi_cotacoes_itens(*)
      `)
      .eq('id', cotacao_id)
      .single();

    if (cotacaoError || !cotacao) {
      throw new Error(`Cotação não encontrada: ${cotacaoError?.message}`);
    }

    const itens = cotacao.edi_cotacoes_itens || [];
    
    if (itens.length === 0) {
      throw new Error('Cotação sem itens para analisar');
    }

    // Atualizar status para "em_analise" e mover para aba "Análise IA"
    const inicioAnalise = new Date();
    await supabase
      .from('edi_cotacoes')
      .update({
        step_atual: 'em_analise', // Move para aba "Análise IA"
        status_analise_ia: 'em_analise',
        analise_ia_iniciada_em: inicioAnalise.toISOString(), // Padronizado
        progresso_analise_percent: 0,
        itens_analisados: 0, // Padronizado
        total_itens_para_analise: itens.length, // Novo campo
        total_sugestoes_geradas: 0,
        modelo_ia_utilizado: 'google/gemini-2.5-flash',
        versao_algoritmo: '2.0-hybrid',
      })
      .eq('id', cotacao_id);

    // Emitir evento Realtime de início
    await emitirEventoRealtime(supabase, cotacao_id, {
      tipo: 'analise_iniciada',
      progresso: 0,
      total_itens: itens.length,
    });

    // Analisar cada item
    const resultados: ResultadoAnaliseItem[] = [];
    let totalSugestoes = 0;

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      const itemInicio = Date.now();
      
      try {
        console.log(`📝 Analisando item ${i + 1}/${itens.length}: ${item.descricao_produto_cliente}`);

        // Chamar função de sugestão de produtos
        const { data: sugestoesData, error: sugestoesError } = await supabase.functions.invoke(
          'edi-sugerir-produtos',
          {
            body: {
              descricao_cliente: item.descricao_produto_cliente,
              codigo_produto_cliente: item.codigo_produto_cliente,
              cnpj_cliente: cotacao.cnpj_cliente,
              plataforma_id: cotacao.plataforma_id,
              quantidade_solicitada: item.quantidade_solicitada,
              unidade_medida: item.unidade_medida,
              item_id: item.id,
              limite: 5, // Buscar top 5 sugestões
              modo_analise_completa: true, // Flag para retornar estrutura completa
            }
          }
        );

        if (sugestoesError) {
          throw new Error(`Erro ao sugerir produtos: ${sugestoesError.message}`);
        }

        const sugestoes = sugestoesData?.sugestoes || [];
        const melhorSugestao = sugestoes[0];
        const scoreConfianca = melhorSugestao?.score_final || 0;
        const tempoMs = Date.now() - itemInicio;

        // Determinar se requer revisão humana
        const requerRevisao = scoreConfianca < 70 || sugestoes.length > 1 && (sugestoes[1].score_final >= scoreConfianca - 10);

        // Atualizar item com sugestões da IA
        await supabase
          .from('edi_cotacoes_itens')
          .update({
            analisado_por_ia: true,
            analisado_em: new Date().toISOString(), // Padronizado
            score_confianca_ia: scoreConfianca,
            produtos_sugeridos_ia: sugestoes,
            produto_selecionado_id: melhorSugestao?.produto_id,
            metodo_vinculacao: scoreConfianca >= 85 ? 'ia_automatico' : 'ia_manual',
            justificativa_ia: melhorSugestao?.justificativa || '',
            tempo_analise_segundos: Math.round(tempoMs / 1000), // Padronizado para segundos
            requer_revisao_humana: requerRevisao,
          })
          .eq('id', item.id);

        resultados.push({
          item_id: item.id,
          sucesso: true,
          score_confianca: scoreConfianca,
          produtos_sugeridos: sugestoes.length,
          tempo_ms: tempoMs,
        });

        totalSugestoes += sugestoes.length;

        // Atualizar progresso
        const progresso = Math.round(((i + 1) / itens.length) * 100);
        await supabase
          .from('edi_cotacoes')
          .update({
            progresso_analise_percent: progresso,
            itens_analisados: i + 1, // Padronizado
            total_sugestoes_geradas: totalSugestoes,
          })
          .eq('id', cotacao_id);

        // Emitir evento de progresso
        await emitirEventoRealtime(supabase, cotacao_id, {
          tipo: 'progresso_analise',
          progresso,
          item_atual: i + 1,
          total_itens: itens.length,
          item_descricao: item.descricao_produto_cliente,
          score: scoreConfianca,
        });

        console.log(`✅ Item ${i + 1}/${itens.length} analisado - Score: ${scoreConfianca}% - ${tempoMs}ms`);

      } catch (error) {
        console.error(`❌ Erro ao analisar item ${item.id}:`, error);
        
        const tempoMs = Date.now() - itemInicio;
        resultados.push({
          item_id: item.id,
          sucesso: false,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
          tempo_ms: tempoMs,
        });

        // Marcar item com erro
        await supabase
          .from('edi_cotacoes_itens')
          .update({
            analisado_por_ia: false,
            requer_revisao_humana: true,
          })
          .eq('id', item.id);
      }
    }

    // Calcular métricas finais
    const fimAnalise = new Date();
    const tempoTotalSegundos = Math.round((fimAnalise.getTime() - inicioAnalise.getTime()) / 1000);
    const itensSucesso = resultados.filter(r => r.sucesso).length;
    const itensErro = resultados.filter(r => !r.sucesso).length;

    // Atualizar cotação com resultado final
    await supabase
      .from('edi_cotacoes')
      .update({
        step_atual: itensErro === 0 ? 'em_analise' : 'nova', // Mantém em análise se sucesso
        status_analise_ia: itensErro === 0 ? 'concluida' : 'erro',
        analisado_por_ia: true,
        analise_ia_concluida_em: fimAnalise.toISOString(), // Padronizado
        progresso_analise_percent: 100,
        tempo_analise_segundos: tempoTotalSegundos,
        erro_analise_ia: itensErro > 0 ? `${itensErro} itens falharam na análise` : null, // Padronizado
      })
      .eq('id', cotacao_id);

    // Emitir evento de conclusão
    await emitirEventoRealtime(supabase, cotacao_id, {
      tipo: 'analise_concluida',
      sucesso: itensErro === 0,
      total_itens: itens.length,
      itens_sucesso: itensSucesso,
      itens_erro: itensErro,
      tempo_total_segundos: tempoTotalSegundos,
      total_sugestoes: totalSugestoes,
    });

    console.log(`✅ Análise completa: ${itensSucesso} sucesso, ${itensErro} erros em ${tempoTotalSegundos}s`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        cotacao_id,
        resultados: {
          total_itens: itens.length,
          itens_sucesso: itensSucesso,
          itens_erro: itensErro,
          tempo_total_segundos: tempoTotalSegundos,
          total_sugestoes: totalSugestoes,
        },
        itens: resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral na análise:', error);
    
    // Tentar atualizar cotação com erro
    try {
      const { cotacao_id } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('edi_cotacoes')
        .update({
          status_analise_ia: 'erro',
          erro_analise_ia: error instanceof Error ? error.message : 'Erro desconhecido', // Padronizado
        })
        .eq('id', cotacao_id);
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função auxiliar para emitir eventos Realtime
async function emitirEventoRealtime(supabase: any, cotacaoId: string, payload: any) {
  try {
    // Inserir evento na tabela de eventos (opcional - pode ser usado para histórico)
    await supabase
      .from('edi_cotacoes')
      .update({
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', cotacaoId);

    console.log(`📡 Evento Realtime emitido:`, payload.tipo);
  } catch (error) {
    console.warn('Aviso: Falha ao emitir evento Realtime:', error);
  }
}
