import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { gerarEmbedding, montarTextoVetorizacao } from "../_shared/embedding-utils.ts";

console.log("🚀 Edge Function: gerar-embedding-produto inicializada");

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    // Parse request
    const { produto_id } = await req.json();
    
    if (!produto_id) {
      return new Response(
        JSON.stringify({ error: "produto_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar Supabase com Service Role Key (bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📦 Buscando produto ${produto_id}...`);

    // 1. Buscar dados do produto
    const { data: produto, error: produtoError } = await supabase
      .from("produtos")
      .select("id, referencia_interna, nome, narrativa, marcadores_produto")
      .eq("id", produto_id)
      .single();

    if (produtoError || !produto) {
      console.error("Erro ao buscar produto:", produtoError);
      return new Response(
        JSON.stringify({ error: "Produto não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Produto encontrado: ${produto.nome} (${produto.referencia_interna})`);

    // 2. Montar texto para vetorização
    const textoVetorizacao = montarTextoVetorizacao(produto);
    console.log(`📝 Texto para vetorização (${textoVetorizacao.length} chars):`, textoVetorizacao);

    // 3. Gerar embedding via OpenAI
    const inicio = Date.now();
    const { embedding, tokensUsados } = await gerarEmbedding(textoVetorizacao, OPENAI_API_KEY);
    const tempoMs = Date.now() - inicio;

    console.log(`🧠 Embedding gerado: ${embedding.length} dimensões, ${tokensUsados} tokens, ${tempoMs}ms`);

    // 4. Atualizar produto no banco
    const { error: updateError } = await supabase
      .from("produtos")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", produto_id);

    if (updateError) {
      console.error("Erro ao atualizar embedding:", updateError);
      throw updateError;
    }

    console.log(`✅ Embedding salvo no banco para produto ${produto_id}`);

    // 5. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        produto_id,
        referencia_interna: produto.referencia_interna,
        nome: produto.nome,
        embedding_dimensoes: embedding.length,
        tokens_usados: tokensUsados,
        tempo_ms: tempoMs,
        texto_vetorizado: textoVetorizacao,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Erro ao gerar embedding:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
