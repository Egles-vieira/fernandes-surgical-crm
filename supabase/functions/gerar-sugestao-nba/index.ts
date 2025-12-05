import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NBARegra {
  id: string;
  nome: string;
  condicao_tipo_atividade: string | null;
  condicao_codigo_disposicao: string | null;
  condicao_etapa_pipeline: string | null;
  acao_tipo: string;
  acao_titulo_template: string;
  acao_descricao_template: string | null;
  acao_prazo_dias: number;
  acao_prioridade: string;
  confianca: number;
}

interface Sugestao {
  regra_id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  prazo_dias: number;
  prioridade: string;
  confianca: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { atividade_id, cliente_nome } = await req.json();

    if (!atividade_id) {
      throw new Error('atividade_id é obrigatório');
    }

    console.log(`[NBA] Gerando sugestão para atividade: ${atividade_id}`);

    // Buscar atividade concluída
    const { data: atividade, error: atividadeError } = await supabase
      .from('atividades')
      .select(`
        id,
        tipo,
        status,
        cliente_id,
        venda_id,
        responsavel_id,
        codigo_disposicao_id,
        codigos_disposicao (
          codigo,
          sugestao_nba_padrao
        )
      `)
      .eq('id', atividade_id)
      .single();

    if (atividadeError) {
      throw new Error(`Erro ao buscar atividade: ${atividadeError.message}`);
    }

    if (!atividade.codigo_disposicao_id) {
      return new Response(
        JSON.stringify({ sugestao: null, motivo: 'Atividade sem código de disposição' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const codigoDisposicao = (atividade.codigos_disposicao as any)?.codigo;

    // Buscar regras NBA que se aplicam
    const { data: regras, error: regrasError } = await supabase
      .from('nba_regras')
      .select('*')
      .eq('ativo', true)
      .or(`condicao_tipo_atividade.eq.${atividade.tipo},condicao_tipo_atividade.is.null`)
      .order('ordem', { ascending: true });

    if (regrasError) {
      throw new Error(`Erro ao buscar regras NBA: ${regrasError.message}`);
    }

    console.log(`[NBA] ${regras?.length || 0} regras encontradas`);

    // Filtrar regras pelo código de disposição
    const regrasAplicaveis = (regras || []).filter((regra: NBARegra) => {
      if (regra.condicao_codigo_disposicao && regra.condicao_codigo_disposicao !== codigoDisposicao) {
        return false;
      }
      return true;
    });

    if (regrasAplicaveis.length === 0) {
      return new Response(
        JSON.stringify({ sugestao: null, motivo: 'Nenhuma regra NBA aplicável' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pegar a regra com maior confiança
    const melhorRegra = regrasAplicaveis.reduce((prev: NBARegra, curr: NBARegra) => 
      curr.confianca > prev.confianca ? curr : prev
    );

    // Substituir placeholders no template
    const nomeCliente = cliente_nome || 'Cliente';
    const titulo = melhorRegra.acao_titulo_template.replace('{cliente}', nomeCliente);
    const descricao = melhorRegra.acao_descricao_template?.replace('{cliente}', nomeCliente) || null;

    const sugestao: Sugestao = {
      regra_id: melhorRegra.id,
      tipo: melhorRegra.acao_tipo,
      titulo,
      descricao,
      prazo_dias: melhorRegra.acao_prazo_dias,
      prioridade: melhorRegra.acao_prioridade,
      confianca: melhorRegra.confianca
    };

    // Registrar no histórico
    const { error: historicoError } = await supabase
      .from('nba_historico')
      .insert({
        atividade_origem_id: atividade_id,
        regra_id: melhorRegra.id,
        sugestao_tipo: sugestao.tipo,
        sugestao_titulo: sugestao.titulo,
        sugestao_descricao: sugestao.descricao,
        confianca: sugestao.confianca,
        usuario_id: atividade.responsavel_id
      });

    if (historicoError) {
      console.error('[NBA] Erro ao registrar histórico:', historicoError);
    }

    // Incrementar contador de sugestões
    await supabase
      .from('nba_regras')
      .update({ vezes_sugerida: (melhorRegra as any).vezes_sugerida + 1 })
      .eq('id', melhorRegra.id);

    console.log(`[NBA] Sugestão gerada: ${sugestao.tipo} - ${sugestao.titulo}`);

    return new Response(
      JSON.stringify({ sugestao }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[NBA] Erro:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
