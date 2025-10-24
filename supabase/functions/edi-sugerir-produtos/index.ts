import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para calcular similaridade de cosseno entre dois vetores
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// Função para gerar embedding usando Lovable AI
async function generateEmbedding(text: string, lovableApiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

// Fallback: similaridade baseada em tokens
function normalize(str: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[|.,/()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str: string) {
  const stop = new Set(['de','do','da','e','ou','para','com','fr','mm','unidade','peca','peça','im','jl','jr']);
  return normalize(str)
    .split(' ')
    .filter(Boolean)
    .filter(t => !stop.has(t) && t.length > 2);
}

function tokenBasedSimilarity(queryText: string, produtos: any[], limite: number) {
  const queryTokens = tokenize(queryText);
  
  return produtos.map(p => {
    const productText = `${p.nome} ${p.referencia_interna} ${p.narrativa || ''}`;
    const productTokens = tokenize(productText);
    const setA = new Set(queryTokens);
    const setB = new Set(productTokens);
    
    let inter = 0;
    for (const t of setA) if (setB.has(t)) inter++;
    const union = new Set([...setA, ...setB]).size || 1;
    const jaccard = inter / union;
    
    const bonus = queryText.toLowerCase().includes(String(p.referencia_interna).toLowerCase()) ? 0.2 : 0;
    const score = Math.min(1, jaccard + bonus) * 100;
    
    return { 
      produto_id: p.id, 
      score: Math.round(score), 
      motivo: inter ? `${inter} termos em comum` : 'Similaridade baixa',
      metodo: 'token_fallback'
    };
  })
  .filter(s => s.score >= 30)
  .sort((a, b) => b.score - a.score)
  .slice(0, limite);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descricao_cliente, cnpj_cliente, plataforma_id, limite = 5 } = await req.json();

    if (!descricao_cliente) {
      return new Response(
        JSON.stringify({ error: "descricao_cliente é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar produtos em estoque (até 500 para melhor cobertura)
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("id, referencia_interna, nome, preco_venda, unidade_medida, quantidade_em_maos, narrativa")
      .gt("quantidade_em_maos", 0)
      .limit(500);

    if (produtosError) {
      throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
    }

    if (!produtos || produtos.length === 0) {
      return new Response(
        JSON.stringify({ 
          sugestoes: [], 
          total_produtos_analisados: 0,
          metodo: 'nenhum'
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verificar se já existe vínculo aprovado
    if (plataforma_id && cnpj_cliente) {
      const { data: vinculoExistente } = await supabase
        .from("edi_produtos_vinculo")
        .select("produto_id, produtos(id, referencia_interna, nome, preco_venda, unidade_medida, quantidade_em_maos)")
        .eq("plataforma_id", plataforma_id)
        .eq("cnpj_cliente", cnpj_cliente)
        .eq("descricao_cliente", descricao_cliente)
        .eq("ativo", true)
        .maybeSingle();

      if (vinculoExistente?.produtos) {
        const prod = vinculoExistente.produtos as any;
        return new Response(
          JSON.stringify({
            sugestoes: [{
              produto_id: prod.id,
              nome: prod.nome,
              referencia_interna: prod.referencia_interna,
              preco_venda: prod.preco_venda,
              unidade_medida: prod.unidade_medida,
              quantidade_em_maos: prod.quantidade_em_maos,
              score: 100,
              motivo: "Vínculo previamente aprovado",
              metodo: 'vinculo_existente'
            }],
            total_produtos_analisados: 1,
            metodo: 'vinculo_existente'
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let sugestoes: any[] = [];
    let metodo = 'embedding_semantico';

    // 3. Tentar embedding semântico com Lovable AI
    if (lovableApiKey) {
      console.log("Gerando embedding para descrição do cliente...");
      const queryEmbedding = await generateEmbedding(descricao_cliente, lovableApiKey);

      if (queryEmbedding) {
        console.log("Gerando embeddings para produtos...");
        const produtosComEmbedding = await Promise.all(
          produtos.map(async (p) => {
            const productText = `${p.nome} ${p.referencia_interna} ${p.narrativa || ''}`;
            const embedding = await generateEmbedding(productText, lovableApiKey);
            return { ...p, embedding };
          })
        );

        const scored = produtosComEmbedding
          .filter(p => p.embedding)
          .map(p => {
            const similarity = cosineSimilarity(queryEmbedding, p.embedding!);
            const score = Math.round(similarity * 100);
            return {
              produto_id: p.id,
              score,
              motivo: score > 80 ? 'Alta compatibilidade semântica' : 
                      score > 60 ? 'Boa compatibilidade' : 
                      'Compatibilidade moderada',
              metodo: 'embedding_semantico'
            };
          })
          .filter(s => s.score >= 40)
          .sort((a, b) => b.score - a.score)
          .slice(0, limite);

        if (scored.length > 0) {
          sugestoes = scored;
        }
      }
    }

    // 4. Fallback: usar similaridade baseada em tokens
    if (sugestoes.length === 0) {
      console.log("Usando fallback baseado em tokens...");
      metodo = 'token_fallback';
      sugestoes = tokenBasedSimilarity(descricao_cliente, produtos, limite);
    }

    // 5. Enriquecer sugestões com dados completos
    const sugestoesEnriquecidas = sugestoes.map(sug => {
      const produto = produtos.find(p => p.id === sug.produto_id);
      if (!produto) return null;
      return {
        produto_id: produto.id,
        nome: produto.nome,
        referencia_interna: produto.referencia_interna,
        preco_venda: produto.preco_venda,
        unidade_medida: produto.unidade_medida,
        quantidade_em_maos: produto.quantidade_em_maos,
        score: sug.score,
        motivo: sug.motivo,
        metodo: sug.metodo || metodo
      };
    }).filter(Boolean);

    // 6. Salvar melhor sugestão como vínculo inativo (pendente aprovação)
    if (sugestoesEnriquecidas.length > 0 && plataforma_id && cnpj_cliente) {
      const melhorSugestao = sugestoesEnriquecidas[0];
      
      if (melhorSugestao) {
        const { error: vinculoError } = await supabase
          .from("edi_produtos_vinculo")
          .upsert({
            plataforma_id,
            cnpj_cliente,
            descricao_cliente,
            produto_id: melhorSugestao.produto_id,
            score_confianca: melhorSugestao.score,
            sugerido_por_ia: true,
            ativo: false,
            criado_em: new Date().toISOString(),
          }, {
            onConflict: 'plataforma_id,cnpj_cliente,descricao_cliente'
          });

        if (vinculoError) {
          console.error("Erro ao salvar vínculo:", vinculoError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        sugestoes: sugestoesEnriquecidas,
        total_produtos_analisados: produtos.length,
        metodo
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro em edi-sugerir-produtos:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
