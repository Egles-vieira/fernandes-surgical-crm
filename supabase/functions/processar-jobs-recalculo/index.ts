import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Processar jobs pendentes (limite de 50 por execução)
    const { data, error } = await supabase.rpc("processar_jobs_recalculo_oportunidade", {
      p_limite: 50,
    });

    if (error) {
      console.error("Erro ao processar jobs:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const result = data?.[0] || { jobs_processados: 0, jobs_com_erro: 0 };
    
    console.log(`Jobs processados: ${result.jobs_processados}, Erros: ${result.jobs_com_erro}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobs_processados: result.jobs_processados,
        jobs_com_erro: result.jobs_com_erro,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
