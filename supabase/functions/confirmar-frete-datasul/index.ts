import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransportadoraOption {
  cod_transp: number;
  nome_transp: string;
  vl_tot_frete: number;
  prazo_entrega: number;
  vl_tde: number;
  bloqueio: string;
}

interface ItemVenda {
  id: string;
  valor_total: number;
}

// ID do tipo de frete "CIF - INCLUSÃO NA NF"
const CIF_INCLUSO_NF_ID = "d691ff67-c6d5-47eb-a714-8af30e191b57";

/**
 * Calcula o rateio de frete para cada item da venda
 * Regra: frete_item = round(frete_total × (valor_item / valor_total_mercadorias), 2)
 * Ajusta diferença de centavos no item de maior valor
 */
function calcularRateioFrete(itens: ItemVenda[], freteTotal: number): Map<string, number> {
  const rateios = new Map<string, number>();
  
  if (itens.length === 0 || freteTotal <= 0) {
    return rateios;
  }

  // Calcular valor total das mercadorias
  const valorTotalMercadorias = itens.reduce((sum, item) => sum + item.valor_total, 0);
  
  if (valorTotalMercadorias <= 0) {
    return rateios;
  }

  // Encontrar o item de maior valor (para ajuste de centavos)
  let itemMaiorValor = itens[0];
  for (const item of itens) {
    if (item.valor_total > itemMaiorValor.valor_total) {
      itemMaiorValor = item;
    }
  }

  // Calcular rateio para cada item (arredondado para 2 casas)
  let somaRateios = 0;
  for (const item of itens) {
    const proporcao = item.valor_total / valorTotalMercadorias;
    const freteItem = Math.round(freteTotal * proporcao * 100) / 100; // Arredonda para 2 casas
    rateios.set(item.id, freteItem);
    somaRateios += freteItem;
  }

  // Ajustar diferença de centavos no item de maior valor
  const diferenca = Math.round((freteTotal - somaRateios) * 100) / 100;
  if (diferenca !== 0) {
    const freteAtualMaiorItem = rateios.get(itemMaiorValor.id) || 0;
    rateios.set(itemMaiorValor.id, Math.round((freteAtualMaiorItem + diferenca) * 100) / 100);
  }

  console.log(`[FRETE-RATEIO] Total mercadorias: R$ ${valorTotalMercadorias.toFixed(2)}`);
  console.log(`[FRETE-RATEIO] Frete total: R$ ${freteTotal.toFixed(2)}`);
  console.log(`[FRETE-RATEIO] Soma rateios: R$ ${somaRateios.toFixed(2)}`);
  console.log(`[FRETE-RATEIO] Diferença ajustada: R$ ${diferenca.toFixed(2)}`);

  return rateios;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { venda_id, transportadora } = await req.json();

    if (!venda_id) {
      throw new Error("venda_id é obrigatório");
    }

    if (!transportadora) {
      throw new Error("transportadora é obrigatória");
    }

    console.log(`[FRETE-CONFIRMAR] Confirmando transportadora para venda: ${venda_id}`);
    console.log(`[FRETE-CONFIRMAR] Transportadora selecionada: ${transportadora.nome_transp} - R$ ${transportadora.vl_tot_frete}`);

    // Validar dados da transportadora
    const { cod_transp, nome_transp, vl_tot_frete, prazo_entrega } = transportadora as TransportadoraOption;

    if (!nome_transp) {
      throw new Error("Nome da transportadora não informado");
    }

    if (vl_tot_frete === undefined || vl_tot_frete === null) {
      throw new Error("Valor do frete não informado");
    }

    // Buscar dados da venda para verificar tipo de frete
    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .select("tipo_frete_id")
      .eq("id", venda_id)
      .single();

    if (vendaError) {
      console.error(`[FRETE-CONFIRMAR] Erro ao buscar venda: ${vendaError.message}`);
      throw new Error(`Erro ao buscar venda: ${vendaError.message}`);
    }

    const isCIFInclusoNF = venda.tipo_frete_id === CIF_INCLUSO_NF_ID;
    console.log(`[FRETE-CONFIRMAR] Tipo de frete CIF Incluso NF: ${isCIFInclusoNF}`);

    // Se for CIF - INCLUSÃO NA NF, calcular e distribuir o rateio
    if (isCIFInclusoNF && vl_tot_frete > 0) {
      console.log(`[FRETE-CONFIRMAR] Iniciando rateio de frete nos itens...`);

      // Buscar itens da venda
      const { data: itens, error: itensError } = await supabase
        .from("vendas_itens")
        .select("id, valor_total")
        .eq("venda_id", venda_id);

      if (itensError) {
        console.error(`[FRETE-CONFIRMAR] Erro ao buscar itens: ${itensError.message}`);
        throw new Error(`Erro ao buscar itens: ${itensError.message}`);
      }

      if (itens && itens.length > 0) {
        // Calcular rateio
        const rateios = calcularRateioFrete(itens, vl_tot_frete);

        // Atualizar cada item com o frete rateado
        for (const [itemId, freteRateado] of rateios) {
          const { error: updateItemError } = await supabase
            .from("vendas_itens")
            .update({ frete_rateado: freteRateado })
            .eq("id", itemId);

          if (updateItemError) {
            console.error(`[FRETE-CONFIRMAR] Erro ao atualizar item ${itemId}: ${updateItemError.message}`);
          } else {
            console.log(`[FRETE-CONFIRMAR] Item ${itemId} atualizado com frete_rateado: R$ ${freteRateado.toFixed(2)}`);
          }
        }

        console.log(`[FRETE-CONFIRMAR] Rateio de frete concluído para ${itens.length} itens`);
      }
    } else {
      // Se não for CIF Incluso NF, zerar o frete_rateado dos itens
      const { error: resetError } = await supabase
        .from("vendas_itens")
        .update({ frete_rateado: 0 })
        .eq("venda_id", venda_id);

      if (resetError) {
        console.error(`[FRETE-CONFIRMAR] Erro ao resetar frete_rateado: ${resetError.message}`);
      }
    }

    // Atualizar a venda com a transportadora selecionada
    const { error: updateError } = await supabase
      .from("vendas")
      .update({
        frete_calculado: true,
        frete_calculado_em: new Date().toISOString(),
        frete_valor: vl_tot_frete,
        transportadora_cod: cod_transp,
        transportadora_nome: nome_transp,
        prazo_entrega_dias: prazo_entrega || 0
      })
      .eq("id", venda_id);

    if (updateError) {
      console.error(`[FRETE-CONFIRMAR] Erro ao atualizar venda: ${updateError.message}`);
      throw new Error(`Erro ao salvar seleção: ${updateError.message}`);
    }

    console.log(`[FRETE-CONFIRMAR] Venda atualizada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        valor_frete: vl_tot_frete,
        transportadora_nome: nome_transp,
        transportadora_cod: cod_transp,
        prazo_entrega_dias: prazo_entrega || 0,
        frete_rateado: isCIFInclusoNF,
        mensagem: `Frete confirmado: ${nome_transp} - R$ ${vl_tot_frete.toFixed(2)}${isCIFInclusoNF ? ' (rateado nos itens)' : ''}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[FRETE-CONFIRMAR] ERRO: ${error.message}`);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_code: "FRETE_CONFIRM_ERROR"
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
