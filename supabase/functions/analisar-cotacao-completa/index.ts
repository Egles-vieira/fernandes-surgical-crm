import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações de execução em lotes/retomada
const BATCH_SIZE = 10; // quantidade de itens processados por execução

serve(async (req) => {
  // CORS
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

    console.log(`🤖 Análise IA (batch) para cotação ${cotacao_id} iniciada`);

    // Buscar cotação
    const { data: cotacao, error: cotacaoError } = await supabase
      .from('edi_cotacoes')
      .select('*')
      .eq('id', cotacao_id)
      .single();

    if (cotacaoError || !cotacao) {
      throw new Error(`Cotação não encontrada: ${cotacaoError?.message}`);
    }

    // Buscar itens da cotação (sempre atualizado para suportar retomada)
    const { data: todosItens, error: itensError } = await supabase
      .from('edi_cotacoes_itens')
      .select('*')
      .eq('cotacao_id', cotacao_id)
      .order('numero_item', { ascending: true });

    if (itensError) {
      throw new Error(`Falha ao buscar itens: ${itensError.message}`);
    }

    if (!todosItens || todosItens.length === 0) {
      throw new Error('Cotação sem itens para analisar');
    }

    const totalItens = todosItens.length;
    const itensJaAnalisados = todosItens.filter((i: any) => i.analisado_por_ia).length;
    const itensPendentes = todosItens.filter((i: any) => !i.analisado_por_ia);

    // Atualiza status para em_analise e mantém progresso real caso seja retomada
    const progressoInicial = Math.round((itensJaAnalisados / totalItens) * 100);
    await supabase
      .from('edi_cotacoes')
      .update({
        step_atual: 'em_analise',
        status_analise_ia: 'em_analise',
        analise_ia_iniciada_em: cotacao.analise_ia_iniciada_em ?? new Date().toISOString(),
        progresso_analise_percent: progressoInicial,
        itens_analisados: itensJaAnalisados,
        total_itens_para_analise: totalItens,
        total_sugestoes_geradas: cotacao.total_sugestoes_geradas ?? 0,
        modelo_ia_utilizado: 'google/gemini-2.5-flash',
        versao_algoritmo: '2.1-batch-resume',
      })
      .eq('id', cotacao_id);

    // Broadcast de início/retomada
    await emitirBroadcast(
      supabase,
      `cotacao-ia-${cotacao_id}`,
      itensJaAnalisados === 0 ? 'analise-iniciada' : 'analise-progresso',
      {
        cotacao_id,
        status: itensJaAnalisados === 0 ? 'iniciando' : 'retomando',
        total_itens: totalItens,
        itens_analisados: itensJaAnalisados,
        itens_pendentes: totalItens - itensJaAnalisados,
        percentual: progressoInicial,
        itens_detalhes: [],
      }
    );

    // Seleciona lote atual
    const lote = itensPendentes.slice(0, BATCH_SIZE);
    let totalSugestoesGeradas = cotacao.total_sugestoes_geradas ?? 0;

    for (let idx = 0; idx < lote.length; idx++) {
      const item = lote[idx];
      const itemIndexGlobal = itensJaAnalisados + idx + 1; // posição real considerando já analisados
      const itemInicio = Date.now();

      try {
        console.log(`📝 [${itemIndexGlobal}/${totalItens}] Analisando: ${item.descricao_produto_cliente}`);

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
              limite: 5,
              modo_analise_completa: true,
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

        const requerRevisao = scoreConfianca < 70 || (sugestoes.length > 1 && (sugestoes[1].score_final >= scoreConfianca - 10));

        // Atualizar item com resultado
        await supabase
          .from('edi_cotacoes_itens')
          .update({
            analisado_por_ia: true,
            analisado_em: new Date().toISOString(),
            score_confianca_ia: scoreConfianca,
            produtos_sugeridos_ia: sugestoes,
            produto_selecionado_id: melhorSugestao?.produto_id ?? null,
            metodo_vinculacao: scoreConfianca >= 85 ? 'ia_automatico' : 'ia_manual',
            justificativa_ia: melhorSugestao?.justificativa || '',
            tempo_analise_segundos: Math.round(tempoMs / 1000),
            requer_revisao_humana: requerRevisao,
          })
          .eq('id', item.id);

        totalSugestoesGeradas += sugestoes.length;

        // Atualizar progresso parcial e heartbeat
        const itensAnalisadosAgora = itensJaAnalisados + idx + 1;
        const percentual = Math.round((itensAnalisadosAgora / totalItens) * 100);
        await supabase
          .from('edi_cotacoes')
          .update({
            progresso_analise_percent: percentual,
            itens_analisados: itensAnalisadosAgora,
            total_sugestoes_geradas: totalSugestoesGeradas,
          })
          .eq('id', cotacao_id);

        // Broadcast do item e progresso
        await emitirBroadcast(
          supabase,
          `cotacao-ia-${cotacao_id}`,
          'analise-item-concluido',
          {
            cotacao_id,
            item_descricao: item.descricao_produto_cliente,
            sugestoes_encontradas: sugestoes.length,
            score: scoreConfianca,
          }
        );

        await emitirBroadcast(
          supabase,
          `cotacao-ia-${cotacao_id}`,
          'analise-progresso',
          {
            cotacao_id,
            status: 'processando',
            total_itens: totalItens,
            itens_analisados: itensAnalisadosAgora,
            itens_pendentes: totalItens - itensAnalisadosAgora,
            percentual,
            itens_detalhes: [],
          }
        );

        console.log(`✅ Item ${itemIndexGlobal}/${totalItens} analisado - Score: ${scoreConfianca}% - ${tempoMs}ms`);
      } catch (err) {
        console.error(`❌ Erro ao analisar item ${item.id}:`, err);
        // Marca item para revisão
        await supabase
          .from('edi_cotacoes_itens')
          .update({ analisado_por_ia: false, requer_revisao_humana: true })
          .eq('id', item.id);
      }
    }

    // Verificar se ainda restam itens (executar próximo lote em background)
    const { count: pendentesRestantes } = await supabase
      .from('edi_cotacoes_itens')
      .select('*', { count: 'exact', head: true })
      .eq('cotacao_id', cotacao_id)
      .eq('analisado_por_ia', false);

    if ((pendentesRestantes ?? 0) > 0) {
      console.log(`⏭️ Agendando próximo lote. Restantes: ${pendentesRestantes}`);
      // Continua em background para não estourar timeout
      try {
        // @ts-ignore - objeto exposto pelo runtime de funções edge
        EdgeRuntime.waitUntil(supabase.functions.invoke('analisar-cotacao-completa', { body: { cotacao_id } }));
      } catch (e) {
        console.warn('⚠️ waitUntil indisponível, tentativa síncrona de reencolar ignorada:', e);
      }

      return new Response(
        JSON.stringify({ started: true, cotacao_id, remaining: pendentesRestantes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sem pendências: concluir
    const fimAnalise = new Date();
    const { data: contagemFinal } = await supabase
      .from('edi_cotacoes_itens')
      .select('id', { count: 'exact', head: true })
      .eq('cotacao_id', cotacao_id)
      .eq('analisado_por_ia', true);

    const itensSucesso = contagemFinal?.length ?? 0; // head:true -> length undefined; manter 0 e confiar em campos agregados

    await supabase
      .from('edi_cotacoes')
      .update({
        status_analise_ia: 'concluida',
        analise_ia_concluida_em: fimAnalise.toISOString(),
        progresso_analise_percent: 100,
        step_atual: 'em_analise', // Mantém em análise para o usuário revisar as sugestões
      })
      .eq('id', cotacao_id);

    await emitirBroadcast(
      supabase,
      `cotacao-ia-${cotacao_id}`,
      'analise-concluida',
      {
        cotacao_id,
        total_itens: totalItens,
        itens_analisados: totalItens,
        itens_pendentes: 0,
        percentual: 100,
        itens_detalhes: [],
      }
    );

    console.log(`🏁 Análise concluída para ${cotacao_id}`);

    return new Response(
      JSON.stringify({ sucesso: true, cotacao_id, finished: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro geral na análise:', error);

    // Atualiza status para erro
    try {
      const body = await req.json().catch(() => ({}));
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      if (body?.cotacao_id) {
        await supabase
          .from('edi_cotacoes')
          .update({ status_analise_ia: 'erro', erro_analise_ia: String(error) })
          .eq('id', body.cotacao_id);

        await emitirBroadcast(
          supabase,
          `cotacao-ia-${body.cotacao_id}`,
          'analise-erro',
          { cotacao_id: body.cotacao_id, erro: String(error) }
        );
      }
    } catch (_) { /* noop */ }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Utilitário: emitir broadcast real para o canal esperado pelo frontend
async function emitirBroadcast(
  supabase: any,
  channelName: string,
  event: 'analise-iniciada' | 'analise-progresso' | 'analise-item-concluido' | 'analise-concluida' | 'analise-erro',
  payload: Record<string, unknown>
) {
  try {
    const channel = supabase.channel(channelName, { config: { broadcast: { ack: false } } });
    await channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        // no-op
      }
    });

    await channel.send({ type: 'broadcast', event, payload });
    await supabase.removeChannel(channel);
    console.log(`📡 Broadcast enviado: ${event}`);
  } catch (e) {
    console.warn('⚠️ Falha ao enviar broadcast realtime:', e);
  }
}
