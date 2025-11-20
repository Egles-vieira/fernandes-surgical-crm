import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { gerarEmbedding, montarTextoVetorizacao } from "../_shared/embedding-utils.ts";

console.log("🚀 Edge Function: popular-embeddings inicializada");

const TAMANHO_LOTE = 50; // Processar 50 produtos por vez para evitar timeout
const DELAY_ENTRE_REQUESTS = 50; // 50ms entre requests para respeitar rate limits

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

    // Inicializar Supabase com Service Role Key (bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📊 Buscando produtos sem embedding (limite: ${TAMANHO_LOTE})...`);

    // 1. Buscar produtos sem embedding (em lote)
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("id, referencia_interna, nome, narrativa, marcadores_produto")
      .is("embedding", null)
      .limit(TAMANHO_LOTE);

    if (produtosError) {
      console.error("Erro ao buscar produtos:", produtosError);
      throw produtosError;
    }

    if (!produtos || produtos.length === 0) {
      console.log("✅ Nenhum produto pendente. População concluída!");
      
      // Contar total de produtos com embedding
      const { count: totalComEmbedding } = await supabase
        .from("produtos")
        .select("*", { count: "exact", head: true })
        .not("embedding", "is", null);

      return new Response(
        JSON.stringify({
          concluido: true,
          processados: 0,
          restantes: 0,
          total_com_embedding: totalComEmbedding || 0,
          mensagem: "Todos os produtos já possuem embeddings!",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📦 Encontrados ${produtos.length} produtos para processar`);

    // 2. Processar cada produto
    const resultados = {
      sucesso: 0,
      erro: 0,
      erros: [] as Array<{ produto_id: string; erro: string }>,
      tokens_totais: 0,
      tempo_total_ms: 0,
    };

    const inicioLote = Date.now();

    for (const produto of produtos) {
      try {
        // Montar texto
        const textoVetorizacao = montarTextoVetorizacao(produto);

        // Gerar embedding
        const { embedding, tokensUsados } = await gerarEmbedding(textoVetorizacao, OPENAI_API_KEY);
        resultados.tokens_totais += tokensUsados;

        // Salvar no banco
        const { error: updateError } = await supabase
          .from("produtos")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", produto.id);

        if (updateError) {
          throw updateError;
        }

        resultados.sucesso++;
        console.log(`✅ ${resultados.sucesso}/${produtos.length} - ${produto.nome} (${produto.referencia_interna})`);

        // Delay entre requests para evitar rate limit
        if (resultados.sucesso < produtos.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_REQUESTS));
        }

      } catch (error) {
        resultados.erro++;
        const mensagemErro = error instanceof Error ? error.message : "Erro desconhecido";
        resultados.erros.push({
          produto_id: produto.id,
          erro: mensagemErro,
        });
        console.error(`❌ Erro ao processar ${produto.nome}:`, mensagemErro);
      }
    }

    resultados.tempo_total_ms = Date.now() - inicioLote;

    // 3. Contar quantos ainda faltam
    const { count: restantes } = await supabase
      .from("produtos")
      .select("*", { count: "exact", head: true })
      .is("embedding", null);

    const { count: totalProdutos } = await supabase
      .from("produtos")
      .select("*", { count: "exact", head: true });

    const totalProcessado = (totalProdutos || 0) - (restantes || 0);
    const progressoPercent = totalProdutos ? (totalProcessado / totalProdutos * 100).toFixed(2) : 0;

    console.log(`📊 Progresso: ${totalProcessado}/${totalProdutos} (${progressoPercent}%)`);
    console.log(`⏱️ Tempo do lote: ${resultados.tempo_total_ms}ms`);
    console.log(`🪙 Tokens usados: ${resultados.tokens_totais}`);

    // 4. Retornar estatísticas
    return new Response(
      JSON.stringify({
        concluido: restantes === 0,
        processados: resultados.sucesso,
        erros: resultados.erro,
        restantes: restantes || 0,
        total_produtos: totalProdutos || 0,
        progresso_percent: parseFloat(progressoPercent as string),
        tokens_totais: resultados.tokens_totais,
        tempo_ms: resultados.tempo_total_ms,
        detalhes_erros: resultados.erros,
        mensagem: restantes === 0 
          ? "População de embeddings concluída!" 
          : `Processados ${resultados.sucesso} produtos. Restam ${restantes}.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro crítico ao popular embeddings:", error);
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
