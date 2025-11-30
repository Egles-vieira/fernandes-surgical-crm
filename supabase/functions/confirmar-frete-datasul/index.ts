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
        mensagem: `Frete confirmado: ${nome_transp} - R$ ${vl_tot_frete.toFixed(2)}`
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
