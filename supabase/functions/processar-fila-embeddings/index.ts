import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";
import { gerarEmbedding, montarTextoVetorizacao } from "../_shared/embedding-utils.ts";

console.log("🚀 Edge Function: processar-fila-embeddings inicializada");

const LOTE_MAXIMO = 20; // Processar até 20 produtos por execução
const DELAY_ENTRE_REQUESTS = 100; // 100ms entre requests

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

    // Inicializar Supabase com Service Role Key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`📊 Buscando itens pendentes na fila (máx: ${LOTE_MAXIMO})...`);

    // 1. Buscar itens pendentes da fila
    const { data: filaItens, error: filaError } = await supabase
      .from("embeddings_queue")
      .select("id, produto_id, tentativas, max_tentativas")
      .eq("status", "pending")
      .lt("tentativas", 3) // Só pega itens que não atingiram máximo de tentativas
      .order("criado_em", { ascending: true })
      .limit(LOTE_MAXIMO);

    if (filaError) {
      console.error("Erro ao buscar fila:", filaError);
      throw filaError;
    }

    if (!filaItens || filaItens.length === 0) {
      console.log("✅ Fila vazia!");
      
      // Contar totais
      const { count: totalProcessados } = await supabase
        .from("embeddings_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      const { count: totalFalhas } = await supabase
        .from("embeddings_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed");

      return new Response(
        JSON.stringify({
          sucesso: true,
          fila_vazia: true,
          processados: 0,
          total_completados: totalProcessados || 0,
          total_falhas: totalFalhas || 0,
          mensagem: "Nenhum item pendente na fila",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📦 ${filaItens.length} itens para processar`);

    // 2. Processar cada item da fila
    const resultados = {
      sucesso: 0,
      falha: 0,
      detalhes: [] as Array<{
        fila_id: string;
        produto_id: string;
        status: "sucesso" | "falha";
        erro?: string;
      }>,
    };

    for (const item of filaItens) {
      try {
        // Marcar como processando
        await supabase
          .from("embeddings_queue")
          .update({ status: "processing" })
          .eq("id", item.id);

        // Buscar dados do produto
        const { data: produto, error: produtoError } = await supabase
          .from("produtos")
          .select("id, referencia_interna, nome, narrativa, marcadores_produto")
          .eq("id", item.produto_id)
          .single();

        if (produtoError || !produto) {
          throw new Error("Produto não encontrado");
        }

        // Montar texto e gerar embedding
        const textoVetorizacao = montarTextoVetorizacao(produto);
        const { embedding } = await gerarEmbedding(textoVetorizacao, OPENAI_API_KEY);

        // Atualizar produto com embedding
        const { error: updateError } = await supabase
          .from("produtos")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", item.produto_id);

        if (updateError) throw updateError;

        // Marcar como completado na fila
        await supabase
          .from("embeddings_queue")
          .update({
            status: "completed",
            processado_em: new Date().toISOString(),
            erro_mensagem: null,
          })
          .eq("id", item.id);

        resultados.sucesso++;
        resultados.detalhes.push({
          fila_id: item.id,
          produto_id: item.produto_id,
          status: "sucesso",
        });

        console.log(`✅ ${resultados.sucesso}/${filaItens.length} - Produto ${produto.referencia_interna}`);

        // Delay entre requests
        if (resultados.sucesso < filaItens.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_ENTRE_REQUESTS));
        }

      } catch (error) {
        const mensagemErro = error instanceof Error ? error.message : "Erro desconhecido";
        
        // Incrementar tentativas
        const novasTentativas = item.tentativas + 1;
        const novoStatus = novasTentativas >= item.max_tentativas ? "failed" : "pending";

        await supabase
          .from("embeddings_queue")
          .update({
            status: novoStatus,
            tentativas: novasTentativas,
            erro_mensagem: mensagemErro,
          })
          .eq("id", item.id);

        resultados.falha++;
        resultados.detalhes.push({
          fila_id: item.id,
          produto_id: item.produto_id,
          status: "falha",
          erro: mensagemErro,
        });

        console.error(`❌ Erro ao processar produto ${item.produto_id}:`, mensagemErro);
      }
    }

    // 3. Contar estatísticas finais
    const { count: totalPendentes } = await supabase
      .from("embeddings_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: totalProcessados } = await supabase
      .from("embeddings_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    console.log(`📊 Resultado: ${resultados.sucesso} sucesso, ${resultados.falha} falhas`);
    console.log(`📊 Pendentes restantes: ${totalPendentes || 0}`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        fila_vazia: false,
        processados: resultados.sucesso,
        falhas: resultados.falha,
        pendentes_restantes: totalPendentes || 0,
        total_completados: totalProcessados || 0,
        detalhes: resultados.detalhes,
        mensagem: `Processados ${resultados.sucesso} produtos com ${resultados.falha} falhas`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro crítico ao processar fila:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
