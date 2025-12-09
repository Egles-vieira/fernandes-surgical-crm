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

    const { 
      atividade_id, 
      codigo_disposicao_id, 
      resultado_descricao,
      proximo_passo,
      duracao_real_minutos,
      criar_proxima_atividade
    } = await req.json();

    if (!atividade_id) {
      throw new Error('atividade_id é obrigatório');
    }

    if (!codigo_disposicao_id) {
      throw new Error('codigo_disposicao_id é obrigatório');
    }

    console.log(`[CONCLUIR] Concluindo atividade: ${atividade_id}`);

    // Buscar atividade atual
    const { data: atividade, error: atividadeError } = await supabase
      .from('atividades')
      .select('*, clientes(nome_abrev)')
      .eq('id', atividade_id)
      .single();

    if (atividadeError) {
      throw new Error(`Erro ao buscar atividade: ${atividadeError.message}`);
    }

    // Buscar código de disposição
    const { data: disposicao, error: disposicaoError } = await supabase
      .from('codigos_disposicao')
      .select('*')
      .eq('id', codigo_disposicao_id)
      .single();

    if (disposicaoError) {
      throw new Error(`Erro ao buscar código de disposição: ${disposicaoError.message}`);
    }

    // Validar próximo passo se requerido
    if (disposicao.requer_proximo_passo && (!proximo_passo || proximo_passo.trim() === '')) {
      throw new Error('Este código de disposição requer a definição de um próximo passo');
    }

    // Determinar novo status
    const novoStatus = disposicao.marca_como_concluido ? 'concluida' : 'aguardando_resposta';

    // Calcular se foi concluída no prazo
    let concluidaNoPrazo: boolean | null = null;
    if (novoStatus === 'concluida' && atividade.data_vencimento) {
      const dataConclusao = new Date();
      const dataVencimento = new Date(atividade.data_vencimento);
      concluidaNoPrazo = dataConclusao <= dataVencimento;
      console.log(`[CONCLUIR] Data vencimento: ${dataVencimento.toISOString()}, Conclusão: ${dataConclusao.toISOString()}, No prazo: ${concluidaNoPrazo}`);
    }

    // Atualizar atividade
    const { error: updateError } = await supabase
      .from('atividades')
      .update({
        status: novoStatus,
        codigo_disposicao_id,
        resultado_descricao,
        proximo_passo,
        duracao_real_minutos,
        data_conclusao: novoStatus === 'concluida' ? new Date().toISOString() : null,
        concluida_no_prazo: concluidaNoPrazo
      })
      .eq('id', atividade_id);

    if (updateError) {
      throw new Error(`Erro ao atualizar atividade: ${updateError.message}`);
    }

    let proximaAtividade = null;

    // Criar próxima atividade se solicitado
    if (criar_proxima_atividade) {
      // Gerar sugestão NBA
      const nbaResponse = await fetch(`${supabaseUrl}/functions/v1/gerar-sugestao-nba`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          atividade_id,
          cliente_nome: (atividade.clientes as any)?.nome_abrev
        })
      });

      const nbaData = await nbaResponse.json();

      if (nbaData.sugestao) {
        const sugestao = nbaData.sugestao;
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + sugestao.prazo_dias);

        const { data: novaAtividade, error: novaError } = await supabase
          .from('atividades')
          .insert({
            titulo: sugestao.titulo,
            descricao: sugestao.descricao,
            tipo: sugestao.tipo,
            prioridade: sugestao.prioridade,
            status: 'pendente',
            cliente_id: atividade.cliente_id,
            venda_id: atividade.venda_id,
            oportunidade_id: atividade.oportunidade_id,
            responsavel_id: atividade.responsavel_id,
            equipe_id: atividade.equipe_id,
            data_vencimento: dataVencimento.toISOString(),
            criado_por: atividade.responsavel_id,
            nba_sugestao_tipo: sugestao.tipo,
            nba_sugestao_descricao: sugestao.descricao,
            nba_confianca: sugestao.confianca
          })
          .select()
          .single();

        if (!novaError && novaAtividade) {
          proximaAtividade = novaAtividade;

          // Vincular atividades
          await supabase
            .from('atividades')
            .update({ proxima_atividade_id: novaAtividade.id })
            .eq('id', atividade_id);

          console.log(`[CONCLUIR] Próxima atividade criada: ${novaAtividade.id}`);
        }
      }
    }

    console.log(`[CONCLUIR] Atividade concluída com status: ${novoStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: novoStatus,
        proxima_atividade: proximaAtividade
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CONCLUIR] Erro:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
