import { corsHeaders } from "../_shared/cors.ts";

console.log("CNPJA Office Consulta - Starting");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj, useCache = true } = await req.json();
    
    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: "CNPJ é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CNPJA_API_KEY = Deno.env.get("CNPJA_API_KEY");
    if (!CNPJA_API_KEY) {
      throw new Error("CNPJA_API_KEY não configurada");
    }

    // Remover caracteres não numéricos do CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    console.log(`Consultando /office para CNPJ: ${cnpjLimpo}`);
    const startTime = Date.now();

    // Consulta à API CNPJA - endpoint /office (gratuito com cache)
    const response = await fetch(
      `https://api.cnpja.com/office/${cnpjLimpo}`,
      {
        headers: {
          "Authorization": CNPJA_API_KEY,
        },
      }
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na API CNPJA: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({
          error: `Erro ao consultar CNPJ: ${response.status}`,
          details: errorText,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    console.log(`Consulta /office concluída em ${responseTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        metadata: {
          responseTime,
          cached: response.headers.get('x-cache-status') === 'HIT',
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro ao consultar /office:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Erro interno ao processar requisição",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
