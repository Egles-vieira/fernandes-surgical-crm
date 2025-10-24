import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Removido: cosineSimilarity não é mais necessário

// Função para fazer matching semântico usando Lovable AI
async function semanticMatching(descricao: string, produtos: any[], lovableApiKey: string, limite: number): Promise<any[]> {
  try {
    // Pegar amostra de produtos para análise (max 50 para não exceder token limits)
    const amostra = produtos.slice(0, 50);
    
    const produtosTexto = amostra.map((p, idx) => 
      `${idx + 1}. ${p.nome} (Ref: ${p.referencia_interna}) - ${p.narrativa || 'sem descrição'}`
    ).join('\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em matching de produtos médicos e hospitalares. Analise a descrição do cliente e retorne os índices dos produtos mais compatíveis em ordem de relevância."
          },
          {
            role: "user",
            content: `Descrição do cliente: "${descricao}"\n\nProdutos disponíveis:\n${produtosTexto}\n\nRetorne APENAS um JSON array com os índices (1-${amostra.length}) dos 5 produtos mais compatíveis, do mais para o menos relevante. Formato: [3, 7, 12, 5, 1]`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI matching error:", response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Extrair array JSON da resposta
    const match = content.match(/\[[\d,\s]+\]/);
    if (!match) return [];
    
    const indices = JSON.parse(match[0]) as number[];
    
    return indices.map((idx, position) => {
      const produto = amostra[idx - 1];
      if (!produto) return null;
      
      const score = 95 - (position * 10); // 95, 85, 75, 65, 55
      return {
        produto_id: produto.id,
        score,
        motivo: `Compatibilidade semântica (posição ${position + 1})`,
        metodo: 'ai_semantic'
      };
    }).filter(Boolean).slice(0, limite);
    
  } catch (error) {
    console.error("Error in semantic matching:", error);
    return [];
  }
}

// Fallback: similaridade baseada em tokens melhorada
function normalize(str: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[|.,/()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumbers(str: string): string[] {
  return (str.match(/\d+/g) || []);
}

function tokenize(str: string) {
  // Stopwords MUITO reduzida - manter termos médicos importantes
  const stop = new Set(['de','do','da','e','ou','para','com','|','-']);
  return normalize(str)
    .split(' ')
    .filter(Boolean)
    .filter(t => !stop.has(t) && t.length > 1); // Reduzido para > 1 ao invés de > 2
}

function tokenBasedSimilarity(queryText: string, produtos: any[], limite: number) {
  const queryTokens = tokenize(queryText);
  const queryNumbers = extractNumbers(queryText);
  
  return produtos.map(p => {
    const productText = `${p.nome} ${p.referencia_interna} ${p.narrativa || ''}`;
    const productTokens = tokenize(productText);
    const productNumbers = extractNumbers(productText);
    
    const setA = new Set(queryTokens);
    const setB = new Set(productTokens);
    
    // Contar tokens em comum
    let inter = 0;
    for (const t of setA) if (setB.has(t)) inter++;
    
    const union = new Set([...setA, ...setB]).size || 1;
    let jaccard = inter / union;
    
    // BONUS 1: Números em comum (ex: 500GR)
    let numberBonus = 0;
    for (const num of queryNumbers) {
      if (productNumbers.includes(num)) {
        numberBonus += 0.15;
      }
    }
    
    // BONUS 2: Referência exata
    const refBonus = queryText.toLowerCase().includes(String(p.referencia_interna).toLowerCase()) ? 0.2 : 0;
    
    // BONUS 3: Match de sequências (bigrams)
    const queryBigrams = [];
    for (let i = 0; i < queryTokens.length - 1; i++) {
      queryBigrams.push(queryTokens[i] + ' ' + queryTokens[i + 1]);
    }
    const productBigrams = [];
    for (let i = 0; i < productTokens.length - 1; i++) {
      productBigrams.push(productTokens[i] + ' ' + productTokens[i + 1]);
    }
    let bigramMatches = 0;
    for (const bg of queryBigrams) {
      if (productBigrams.some(pbg => pbg.includes(bg) || bg.includes(pbg))) {
        bigramMatches++;
      }
    }
    const bigramBonus = (bigramMatches / Math.max(queryBigrams.length, 1)) * 0.2;
    
    const finalScore = Math.min(1, jaccard + numberBonus + refBonus + bigramBonus) * 100;
    
    return { 
      produto_id: p.id, 
      score: Math.round(finalScore), 
      motivo: inter > 0 ? `${inter} termos + ${queryNumbers.filter(n => productNumbers.includes(n)).length} números` : 'Similaridade baixa',
      metodo: 'token_enhanced'
    };
  })
  .filter(s => s.score >= 25) // Threshold mais baixo para capturar mais candidatos
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
    let metodo = 'ai_semantic';

    // 3. Tentar matching semântico com Lovable AI (chat-based)
    if (lovableApiKey && produtos.length > 0) {
      console.log("Tentando matching semântico com IA...");
      sugestoes = await semanticMatching(descricao_cliente, produtos, lovableApiKey, limite);
      
      if (sugestoes.length > 0) {
        console.log(`IA encontrou ${sugestoes.length} sugestões`);
      }
    }

    // 4. Fallback: usar similaridade baseada em tokens MELHORADA
    if (sugestoes.length === 0) {
      console.log("Usando algoritmo baseado em tokens melhorado...");
      metodo = 'token_enhanced';
      sugestoes = tokenBasedSimilarity(descricao_cliente, produtos, limite);
      console.log(`Token matching encontrou ${sugestoes.length} sugestões`);
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
