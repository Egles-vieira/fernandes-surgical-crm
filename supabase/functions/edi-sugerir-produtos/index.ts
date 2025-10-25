import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SugestaoProduto {
  produto_id: string;
  score_final: number;
  score_token: number;
  score_semantico: number;
  descricao: string;
  codigo: string;
  unidade_medida?: string;
  preco_venda?: number;
  estoque_disponivel?: number;
  justificativa: string;
  razoes_match: string[];
  confianca: 'alta' | 'media' | 'baixa';
  alternativas?: Array<{
    produto_id: string;
    descricao: string;
    score: number;
    diferenca: string;
  }>;
}

// ============= ANÁLISE SEMÂNTICA COM LOVABLE AI =============
async function analisarComLovableAI(
  descricaoCliente: string,
  candidatos: Array<{ produto: any; scoreToken: number }>,
  contexto: { marca?: string; quantidade?: number; unidade_medida?: string }
): Promise<any[]> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.warn('⚠️ LOVABLE_API_KEY não configurada, pulando análise semântica');
    return [];
  }

  try {
    console.log(`🤖 [Lovable AI] Analisando ${candidatos.length} candidatos...`);
    
    const candidatosFormatados = candidatos.map((c, idx) => ({
      index: idx,
      nome: c.produto.nome,
      referencia: c.produto.referencia_interna,
      narrativa: c.produto.narrativa || 'Sem descrição detalhada',
      unidade: c.produto.unidade_medida,
      estoque: c.produto.quantidade_em_maos,
      scoreToken: c.scoreToken
    }));

    const prompt = `Você é um especialista em análise de produtos médicos e hospitalares. Analise a compatibilidade entre a solicitação e os produtos disponíveis.

**SOLICITAÇÃO DO CLIENTE:**
"${descricaoCliente}"
${contexto.marca ? `Marca: ${contexto.marca}` : ''}
${contexto.quantidade ? `Quantidade: ${contexto.quantidade} ${contexto.unidade_medida || ''}` : ''}

**PRODUTOS DISPONÍVEIS:**
${candidatosFormatados.map(p => 
  `[${p.index}] ${p.nome} (Ref: ${p.referencia})
   Descrição: ${p.narrativa}
   Unidade: ${p.unidade} | Estoque: ${p.estoque}
   Score inicial: ${p.scoreToken}`
).join('\n\n')}

Analise cada produto considerando:
1. Compatibilidade de categoria e finalidade
2. Equivalência de especificações técnicas
3. Correspondência de marca (se aplicável)
4. Adequação da unidade de medida

Retorne um JSON array com este formato:
[
  {
    "index": 0,
    "score": 85,
    "justificativa": "Explicação breve e clara da compatibilidade",
    "razoes_match": ["razão 1", "razão 2", "razão 3"],
    "categoria_compativel": true,
    "aplicacao_compativel": true,
    "alternativa_de": null
  }
]

Score de 0-100 onde:
- 90-100: Match perfeito/equivalente
- 70-89: Compatível com pequenas diferenças  
- 50-69: Parcialmente compatível
- 0-49: Incompatível

Retorne APENAS o JSON array, sem texto adicional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em análise de produtos médico-hospitalares. Retorne apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit excedido - Lovable AI');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes - Lovable AI');
      }
      const errorText = await response.text();
      console.error("❌ [Lovable AI] Erro:", response.status, errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Lovable AI retornou resposta vazia");
    }

    // Extrair JSON da resposta (pode vir com markdown)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ [Lovable AI] Resposta sem JSON válido:", content.substring(0, 200));
      throw new Error("Lovable AI não retornou JSON válido");
    }

    const results = JSON.parse(jsonMatch[0]);
    console.log(`✅ [Lovable AI] ${results.length} produtos analisados`);
    
    return results;
  } catch (error) {
    console.error("❌ [Lovable AI] Erro na análise:", error);
    return [];
  }
}

// ============= BUSCA POR TOKENS =============
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
  const stop = new Set(['de','do','da','e','ou','para','com','|','-','em','o','a','os','as','un','und']);
  return normalize(str)
    .split(' ')
    .filter(Boolean)
    .filter(t => !stop.has(t) && t.length > 1);
}

function tokenBasedSimilarity(queryText: string, produtos: any[], limite: number) {
  const queryTokens = tokenize(queryText);
  const queryNumbers = extractNumbers(queryText);
  const queryNormalized = normalize(queryText);
  
  if (queryTokens.length < 2 && queryNumbers.length === 0) {
    return [];
  }
  
  return produtos.map(p => {
    const productText = `${p.nome} ${p.referencia_interna} ${p.narrativa || ''}`;
    const productTokens = tokenize(productText);
    const productNumbers = extractNumbers(productText);
    const productNormalized = normalize(productText);
    
    let exactMatches = 0;
    let partialMatches = 0;
    
    for (const qt of queryTokens) {
      if (productTokens.includes(qt)) {
        exactMatches++;
      } else if (qt.length >= 4) {
        for (const pt of productTokens) {
          if (pt.length >= 4 && (pt.includes(qt) || qt.includes(pt))) {
            partialMatches++;
            break;
          }
        }
      }
    }
    
    const matchRatio = (exactMatches + partialMatches * 0.5) / queryTokens.length;
    if (matchRatio < 0.4) {
      return { produto: p, score: 0 };
    }
    
    const numberMatchCount = queryNumbers.filter(qn => productNumbers.includes(qn)).length;
    if (queryNumbers.length > 0 && numberMatchCount === 0) {
      return { produto: p, score: 0 };
    }
    
    const hasExactRef = p.referencia_interna && 
      (queryNormalized.includes(normalize(p.referencia_interna)) || 
       normalize(p.referencia_interna).includes(queryNormalized));
    
    const hasSubstring = productNormalized.includes(queryNormalized) || 
                        queryNormalized.includes(productNormalized);
    
    let score = 0;
    score += exactMatches * 30;
    score += partialMatches * 15;
    score += numberMatchCount * 40;
    if (hasExactRef) score += 60;
    if (hasSubstring) score += 25;
    if (matchRatio >= 0.8) score += 20;
    else if (matchRatio >= 0.6) score += 10;
    
    return { 
      produto: p, 
      score: Math.min(100, Math.round(score))
    };
  })
  .filter(s => s.score >= 30)
  .sort((a, b) => b.score - a.score)
  .slice(0, limite);
}

// ============= EDGE FUNCTION HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      descricao_cliente, 
      codigo_produto_cliente,
      cnpj_cliente, 
      plataforma_id, 
      quantidade_solicitada,
      unidade_medida,
      item_id,
      limite = 5,
      modo_analise_completa = false // Flag para retornar estrutura completa
    } = body;

    if (!descricao_cliente) {
      return new Response(
        JSON.stringify({ error: "descricao_cliente é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔍 Buscando produtos para: "${descricao_cliente}"`);

    // 1. Buscar produtos disponíveis
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("id, referencia_interna, nome, preco_venda, unidade_medida, quantidade_em_maos, narrativa")
      .gt("quantidade_em_maos", 0)
      .limit(500);

    if (produtosError) throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
    if (!produtos || produtos.length === 0) {
      return new Response(
        JSON.stringify({ sugestoes: [], total_produtos_analisados: 0, metodo: 'nenhum' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verificar vínculo aprovado existente
    if (plataforma_id && cnpj_cliente) {
      const { data: vinculoExistente } = await supabase
        .from("edi_produtos_vinculo")
        .select("produto_id, produtos(*)")
        .eq("plataforma_id", plataforma_id)
        .eq("cnpj_cliente", cnpj_cliente)
        .eq("descricao_cliente", descricao_cliente)
        .eq("ativo", true)
        .maybeSingle();

      if (vinculoExistente?.produtos) {
        const prod = vinculoExistente.produtos as any;
        const sugestaoVinculo: SugestaoProduto = {
          produto_id: prod.id,
          score_final: 100,
          score_token: 100,
          score_semantico: 100,
          descricao: prod.nome,
          codigo: prod.referencia_interna,
          unidade_medida: prod.unidade_medida,
          preco_venda: prod.preco_venda,
          estoque_disponivel: prod.quantidade_em_maos,
          justificativa: "Produto vinculado previamente e aprovado para este cliente/plataforma",
          razoes_match: ["Vínculo DE-PARA aprovado", "Histórico de uso confirmado"],
          confianca: 'alta',
        };

        return new Response(
          JSON.stringify({
            sugestoes: [sugestaoVinculo],
            total_produtos_analisados: 1,
            metodo: 'vinculo_existente',
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. NÍVEL 1: Busca por tokens (top 10 candidatos)
    const candidatosPorToken = tokenBasedSimilarity(descricao_cliente, produtos, 10);
    console.log(`📊 Token matching: ${candidatosPorToken.length} candidatos (melhor: ${candidatosPorToken[0]?.score || 0})`);

    if (candidatosPorToken.length === 0) {
      return new Response(
        JSON.stringify({ sugestoes: [], total_produtos_analisados: produtos.length, metodo: 'token_only' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. NÍVEL 2: Análise semântica com Lovable AI
    const contexto = {
      marca: body.marca_cliente,
      quantidade: quantidade_solicitada,
      unidade_medida: unidade_medida
    };

    const analiseSemantica = await analisarComLovableAI(
      descricao_cliente,
      candidatosPorToken.slice(0, 5).map(c => ({ produto: c.produto, scoreToken: c.score })),
      contexto
    );

    // 5. NÍVEL 3: Combinar scores e gerar estrutura rica de sugestões
    const sugestoes: SugestaoProduto[] = [];

    if (analiseSemantica.length > 0) {
      // Híbrido: 40% token + 60% semântico
      console.log("✨ Combinando scores (40% token + 60% semântico)");
      
      for (let i = 0; i < Math.min(candidatosPorToken.length, limite); i++) {
        const candidato = candidatosPorToken[i];
        const analise = analiseSemantica.find(a => a.index === i);
        
        const scoreToken = candidato.score;
        const scoreSemantico = analise?.score || 0;
        const scoreFinal = Math.round((scoreToken * 0.4) + (scoreSemantico * 0.6));
        
        // Determinar confiança
        let confianca: 'alta' | 'media' | 'baixa';
        if (scoreFinal >= 85) confianca = 'alta';
        else if (scoreFinal >= 70) confianca = 'media';
        else confianca = 'baixa';

        const justificativa = analise?.justificativa || `Match baseado em tokens (${scoreToken}% de similaridade)`;
        const razoes = analise?.razoes_match || [`${scoreToken}% de compatibilidade textual`];

        sugestoes.push({
          produto_id: candidato.produto.id,
          score_final: scoreFinal,
          score_token: scoreToken,
          score_semantico: scoreSemantico,
          descricao: candidato.produto.nome,
          codigo: candidato.produto.referencia_interna,
          unidade_medida: candidato.produto.unidade_medida,
          preco_venda: candidato.produto.preco_venda,
          estoque_disponivel: candidato.produto.quantidade_em_maos,
          justificativa,
          razoes_match: razoes,
          confianca,
        });
      }
    } else {
      // Fallback: apenas tokens
      console.log("📝 Usando apenas scores de tokens");
      
      for (const candidato of candidatosPorToken.slice(0, limite)) {
        const scoreFinal = candidato.score;
        let confianca: 'alta' | 'media' | 'baixa';
        if (scoreFinal >= 85) confianca = 'alta';
        else if (scoreFinal >= 70) confianca = 'media';
        else confianca = 'baixa';

        sugestoes.push({
          produto_id: candidato.produto.id,
          score_final: scoreFinal,
          score_token: scoreFinal,
          score_semantico: 0,
          descricao: candidato.produto.nome,
          codigo: candidato.produto.referencia_interna,
          unidade_medida: candidato.produto.unidade_medida,
          preco_venda: candidato.produto.preco_venda,
          estoque_disponivel: candidato.produto.quantidade_em_maos,
          justificativa: `Match baseado em análise textual (${scoreFinal}% de compatibilidade)`,
          razoes_match: [`${scoreFinal}% de similaridade textual`],
          confianca,
        });
      }
    }

    // Ordenar por score final
    sugestoes.sort((a, b) => b.score_final - a.score_final);

    console.log(`✅ ${sugestoes.length} sugestões geradas (melhor: ${sugestoes[0]?.score_final || 0}%)`);

    return new Response(
      JSON.stringify({
        sugestoes,
        total_produtos_analisados: produtos.length,
        metodo: analiseSemantica.length > 0 ? 'hibrido_lovable_ai' : 'token_only',
        candidatos_pre_filtrados: candidatosPorToken.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro em edi-sugerir-produtos:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
