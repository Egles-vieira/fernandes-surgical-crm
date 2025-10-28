import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar cotações travadas em análise há mais de 10 minutos
    const { data: cotacoesTravadas, error: fetchError } = await supabase
      .from("edi_cotacoes")
      .select(`
        id,
        numero_cotacao,
        total_itens,
        criado_em,
        edi_cotacoes_itens(
          id,
          produto_selecionado_id,
          score_confianca_ia
        )
      `)
      .eq("status_analise_ia", "em_analise")
      .lt("criado_em", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (fetchError) throw fetchError;

    const corrigidas = [];
    
    for (const cotacao of cotacoesTravadas || []) {
      const itensAnalisados = cotacao.edi_cotacoes_itens?.filter(
        (i: any) => i.produto_selecionado_id || i.score_confianca_ia !== null
      ).length || 0;

      const totalItens = cotacao.edi_cotacoes_itens?.length || cotacao.total_itens || 0;

      // Se todos os itens foram analisados, marcar como concluída
      if (itensAnalisados >= totalItens && totalItens > 0) {
        const { error: updateError } = await supabase
          .from("edi_cotacoes")
          .update({
            status_analise_ia: "concluida",
            progresso_analise_percent: 100,
            total_itens_analisados: itensAnalisados,
            analise_ia_concluida_em: new Date().toISOString(),
          })
          .eq("id", cotacao.id);

        if (!updateError) {
          corrigidas.push({
            id: cotacao.id,
            numero: cotacao.numero_cotacao,
            acao: "concluida",
            itens: `${itensAnalisados}/${totalItens}`
          });
        }
      } 
      // Se está parcialmente analisada, resetar para reprocessar
      else if (itensAnalisados > 0) {
        const { error: updateError } = await supabase
          .from("edi_cotacoes")
          .update({
            status_analise_ia: "pendente",
            progresso_analise_percent: 0,
            total_itens_analisados: 0,
          })
          .eq("id", cotacao.id);

        if (!updateError) {
          corrigidas.push({
            id: cotacao.id,
            numero: cotacao.numero_cotacao,
            acao: "resetada_para_reprocessar",
            itens: `${itensAnalisados}/${totalItens}`
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_verificadas: cotacoesTravadas?.length || 0,
        total_corrigidas: corrigidas.length,
        detalhes: corrigidas,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro ao corrigir análises:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
