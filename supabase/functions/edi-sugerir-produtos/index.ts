import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= CONFIGURAÇÃO v3.3 - REFINADA =============
const MAX_PRODUTOS_BUSCA = 300;
const MIN_SCORE_TOKEN = 35; // Mais seletivo
const MIN_SIMILARITY_THRESHOLD = 0.22; // pg_trgm mais rigoroso
const LIMITE_CANDIDATOS_IA = 5;
const SCORE_MINIMO_ACEITAVEL = 45; // Score mínimo para considerar sugestão válida

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
  confianca: "alta" | "media" | "baixa";
  alternativas?: Array<{
    produto_id: string;
    descricao: string;
    score: number;
    diferenca: string;
  }>;
}

// ============= ANÁLISE SEMÂNTICA COM DEEPSEEK v3.3 =============
async function analisarComDeepSeek(
  descricaoCliente: string,
  candidatos: Array<{ produto: any; scoreToken: number; scorePgTrgm: number }>,
  contexto: {
    marca?: string;
    quantidade?: number;
    unidade_medida?: string;
    codigo_cliente?: string;
  },
): Promise<any[]> {
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekApiKey) {
    console.warn("⚠️ DEEPSEEK_API_KEY não configurada, pulando análise semântica");
    return [];
  }

  try {
    console.log(`🤖 [DeepSeek] Analisando ${candidatos.length} candidatos...`);

    const candidatosFormatados = candidatos.map((c, idx) => ({
      index: idx,
      nome: c.produto.nome,
      referencia: c.produto.referencia_interna,
      narrativa: c.produto.narrativa || "Sem descrição detalhada",
      unidade: c.produto.unidade_medida,
      estoque: c.produto.quantidade_em_maos,
      scoreToken: c.scoreToken,
      scorePgTrgm: c.scorePgTrgm,
    }));

    const prompt = `Você é um especialista em análise de compatibilidade de produtos médico-hospitalares. Sua função é avaliar com MÁXIMA PRECISÃO se os produtos disponíveis atendem a solicitação do cliente.

**SOLICITAÇÃO DO CLIENTE:**
"${descricaoCliente}"
${contexto.codigo_cliente ? `Código: ${contexto.codigo_cliente}` : ""}
${contexto.marca ? `Marca: ${contexto.marca}` : ""}
${contexto.quantidade ? `Qtd: ${contexto.quantidade} ${contexto.unidade_medida || ""}` : ""}

**PRODUTOS CANDIDATOS:**
${candidatosFormatados
  .map(
    (p) =>
      `[${p.index}] ${p.nome} (Ref: ${p.referencia})
   Descrição: ${p.narrativa}
   Unidade: ${p.unidade} | Estoque: ${p.estoque}
   Scores prévios: token=${p.scoreToken}% | similarity=${p.scorePgTrgm}%`,
  )
  .join("\n\n")}

**CRITÉRIOS DE AVALIAÇÃO (em ordem de importância):**
1. **CATEGORIA DO PRODUTO**: Produtos de categorias diferentes são INCOMPATÍVEIS (ex: luva ≠ seringa)
2. **ESPECIFICAÇÕES TÉCNICAS**: Tamanho, calibre, volume, concentração devem ser equivalentes
3. **FINALIDADE/APLICAÇÃO**: O produto deve servir para o mesmo uso clínico
4. **MARCA**: Se marca específica foi solicitada, avaliar se é crítico ou se aceita similar
5. **UNIDADE DE MEDIDA**: Verificar se é compatível (unidade vs caixa vs frasco)

**RETORNE JSON ARRAY:**
[
  {
    "index": 0,
    "score": 85,
    "justificativa": "Descrição clara em 1 frase do motivo do score",
    "razoes_match": ["razão 1", "razão 2", "razão 3"],
    "categoria_compativel": true,
    "aplicacao_compativel": true,
    "diferenca_critica": null
  }
]

**ESCALA DE SCORE (seja RIGOROSO):**
- 95-100: Match exato - mesma categoria, specs idênticas, marca compatível
- 85-94: Excelente - mesma categoria, specs equivalentes, pode ter marca diferente
- 70-84: Bom - mesma categoria, specs similares com pequenas variações aceitáveis
- 50-69: Razoável - categoria OK mas especificações divergem moderadamente
- 30-49: Fraco - compatibilidade duvidosa, requer revisão humana
- 0-29: Incompatível - categoria diferente ou especificações incompatíveis

**IMPORTANTE**: 
- Se o produto for de OUTRA CATEGORIA, dê score 0-20
- Se specs técnicas forem incompatíveis (ex: tamanho errado), score máximo 40
- Seja conservador: na dúvida, score mais BAIXO
- Retorne APENAS o JSON, sem markdown ou texto extra`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em produtos médico-hospitalares com 20 anos de experiência. Analise com precisão cirúrgica a compatibilidade entre produtos. Seja RIGOROSO: prefira rejeitar (score baixo) do que sugerir produto incompatível. Retorne APENAS JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.15, // Mais determinístico
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit excedido - DeepSeek");
      }
      const errorText = await response.text();
      console.error("❌ [DeepSeek] Erro:", response.status, errorText);
      throw new Error(`DeepSeek error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek retornou resposta vazia");
    }

    // Extrair JSON da resposta (pode vir com markdown)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ [DeepSeek] Resposta sem JSON válido:", content.substring(0, 200));
      throw new Error("DeepSeek não retornou JSON válido");
    }

    const results = JSON.parse(jsonMatch[0]);
    console.log(`✅ [DeepSeek] ${results.length} produtos analisados`);

    return results;
  } catch (error) {
    console.error("❌ [DeepSeek] Erro na análise:", error);
    return [];
  }
}

// ============= BUSCA POR TOKENS v3.3 =============
// Normalização mais preservativa de informação
function normalize(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[|/()]/g, " ") // Remove apenas separadores ambíguos
    .replace(/\s+/g, " ") // Normaliza espaços
    .trim();
}

// Extrai palavras-chave relevantes (mantém pontos e hífens em contextos importantes)
function extractKeywords(str: string): string[] {
  const normalized = normalize(str);
  const stopWords = new Set(["de", "da", "do", "dos", "das", "e", "ou", "para", "com", "em", "o", "a", "os", "as", "um", "uma", "uns", "umas"]);
  
  return normalized
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function extractNumbers(str: string): string[] {
  return str.match(/\d+/g) || [];
}

function tokenize(str: string) {
  return extractKeywords(str);
}

function tokenBasedSimilarity(queryText: string, produtos: any[], limite: number) {
  const queryTokens = tokenize(queryText);
  const queryNumbers = extractNumbers(queryText);
  const queryNormalized = normalize(queryText);

  if (queryTokens.length < 2 && queryNumbers.length === 0) {
    return [];
  }

  return produtos
    .map((p) => {
      const productText = `${p.nome} ${p.referencia_interna} ${p.narrativa || ""}`;
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

      // Cálculo de match ratio
      const matchRatio = queryTokens.length > 0 
        ? (exactMatches + partialMatches * 0.5) / queryTokens.length 
        : 0;

      // Filtro mais seletivo: exige pelo menos 45% de match
      if (matchRatio < 0.45) {
        return { produto: p, score: 0 };
      }

      // Se query tem números, produto DEVE ter pelo menos 1 número correspondente
      const numberMatchCount = queryNumbers.filter((qn) => productNumbers.includes(qn)).length;
      if (queryNumbers.length > 0 && numberMatchCount === 0) {
        return { produto: p, score: 0 };
      }

      // Se query tem 2+ números, produto deve ter pelo menos 50% dos números
      if (queryNumbers.length >= 2 && numberMatchCount < queryNumbers.length * 0.5) {
        return { produto: p, score: 0 };
      }

      const hasExactRef =
        p.referencia_interna &&
        (queryNormalized.includes(normalize(p.referencia_interna)) ||
          normalize(p.referencia_interna).includes(queryNormalized));

      const hasSubstring = productNormalized.includes(queryNormalized) || queryNormalized.includes(productNormalized);

      // Sistema de scoring mais refinado v3.3
      let score = 0;
      
      // Matches exatos valem muito
      score += exactMatches * 35;
      
      // Matches parciais valem menos
      score += partialMatches * 12;
      
      // Números são críticos (especialmente em produtos médicos)
      score += numberMatchCount * 45;
      
      // Referência exata é forte indicador
      if (hasExactRef) score += 70;
      
      // Substring também é bom indicador
      if (hasSubstring) score += 30;
      
      // Bonus por alta taxa de match
      if (matchRatio >= 0.9) score += 30;
      else if (matchRatio >= 0.75) score += 20;
      else if (matchRatio >= 0.6) score += 10;

      // Penalty se o match ratio for baixo mesmo tendo alguns matches
      if (matchRatio < 0.6 && exactMatches < 3) {
        score *= 0.7;
      }

      return {
        produto: p,
        score: Math.min(100, Math.round(score)),
      };
    })
    .filter((s) => s.score >= MIN_SCORE_TOKEN)
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
      modo_analise_completa = false,
    } = body;

    if (!descricao_cliente) {
      return new Response(JSON.stringify({ error: "descricao_cliente é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔍 [v3.3] Buscando produtos para: "${descricao_cliente}"`);

    // 1. Verificar vínculo aprovado existente
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
          confianca: "alta",
        };

        return new Response(
          JSON.stringify({
            sugestoes: [sugestaoVinculo],
            total_produtos_analisados: 1,
            metodo: "vinculo_existente",
            versao: "3.3",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2. Buscar produtos disponíveis
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("id, referencia_interna, nome, preco_venda, unidade_medida, quantidade_em_maos, narrativa")
      .gt("quantidade_em_maos", 0)
      .limit(MAX_PRODUTOS_BUSCA);

    if (produtosError) throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
    if (!produtos || produtos.length === 0) {
      return new Response(JSON.stringify({ sugestoes: [], total_produtos_analisados: 0, metodo: "sem_produtos_catalogo", versao: "3.3" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. NÍVEL 1: Busca por tokens (mais seletiva)
    const candidatosPorToken = tokenBasedSimilarity(descricao_cliente, produtos, 10);
    console.log(`📊 Token matching: ${candidatosPorToken.length} candidatos (melhor: ${candidatosPorToken[0]?.score || 0})`);

    // Se não encontrou candidatos, retornar vazio e marcar como "sem produtos CF"
    if (candidatosPorToken.length === 0) {
      console.log("❌ Nenhum candidato encontrado - marcando como 'sem produtos CF'");
      
      // Marcar item como sem produtos CF se item_id foi fornecido
      if (item_id) {
        await supabase
          .from("edi_cotacoes_itens")
          .update({
            sem_produtos_cf: true,
            motivo_sem_produtos: "Nenhum produto da CF Fernandes compatível foi encontrado após análise automática",
            analisado_por_ia: true,
            analise_ia_em: new Date().toISOString(),
            score_confianca_ia: 0,
          })
          .eq("id", item_id);
      }

      return new Response(
        JSON.stringify({ 
          sugestoes: [], 
          total_produtos_analisados: produtos.length, 
          metodo: "sem_produtos_cf",
          mensagem: "Sem produtos da CF compatíveis",
          versao: "3.3",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. NÍVEL 2: Buscar scores pg_trgm
    console.log("🔍 Calculando similaridade pg_trgm...");
    const produtoIds = candidatosPorToken.slice(0, 10).map((c) => c.produto.id);
    const { data: similarityScores } = await supabase.rpc("buscar_produtos_similares_trgm", {
      texto_busca: descricao_cliente,
      limite_resultados: 10,
      threshold: MIN_SIMILARITY_THRESHOLD,
    });

    const scorePgTrgmMap = new Map<string, number>();
    if (similarityScores && similarityScores.length > 0) {
      similarityScores.forEach((item: any) => {
        scorePgTrgmMap.set(item.produto_id, Math.round(item.similarity * 100));
      });
    }

    // Adicionar scores pg_trgm aos candidatos
    candidatosPorToken.forEach((c) => {
      (c as any).scorePgTrgm = scorePgTrgmMap.get(c.produto.id) || 0;
    });

    // 5. NÍVEL 3: Análise semântica com DeepSeek (top 5)
    const contexto = {
      marca: body.marca_cliente,
      quantidade: quantidade_solicitada,
      unidade_medida: unidade_medida,
      codigo_cliente: codigo_produto_cliente,
    };

    const analiseSemantica = await analisarComDeepSeek(
      descricao_cliente,
      candidatosPorToken.slice(0, LIMITE_CANDIDATOS_IA).map((c) => ({ produto: c.produto, scoreToken: c.score, scorePgTrgm: (c as any).scorePgTrgm })),
      contexto,
    );

    // 6. NÍVEL 4: Buscar ajustes de ML
    console.log("🧠 Buscando ajustes de machine learning...");
    const { data: ajustes } = await supabase
      .from("ia_score_ajustes")
      .select("*")
      .in("produto_id", produtoIds)
      .eq("ativo", true);

    const ajustesPorProduto = new Map<string, number>();
    if (ajustes && ajustes.length > 0) {
      console.log(`📊 ${ajustes.length} ajustes de ML encontrados`);
      ajustes.forEach((ajuste) => {
        const atual = ajustesPorProduto.get(ajuste.produto_id) || 0;
        ajustesPorProduto.set(ajuste.produto_id, atual + (ajuste.ajuste_score || 0));
      });
    }

    // 7. NÍVEL 5: Combinar scores com algoritmo v3.3 refinado
    console.log("🔄 Combinando scores (v3.3)...");
    const sugestoes: SugestaoProduto[] = [];

    for (let i = 0; i < Math.min(candidatosPorToken.length, limite); i++) {
      const candidato = candidatosPorToken[i];
      const analise = analiseSemantica.find((a) => a.index === i);

      const scoreToken = candidato.score;
      const scoreSemantico = analise?.score || 0;
      const scorePgTrgm = (candidato as any).scorePgTrgm || 0;

      // Score de contexto mais robusto
      let scoreContexto = 0;
      let razoeContexto: string[] = [];

      // Marca (muito importante se especificada)
      if (contexto.marca) {
        const marcaNorm = normalize(contexto.marca);
        const produtoNorm = normalize(candidato.produto.nome + " " + (candidato.produto.narrativa || ""));
        if (produtoNorm.includes(marcaNorm)) {
          scoreContexto += 35;
          razoeContexto.push(`Marca ${contexto.marca} encontrada`);
        } else {
          scoreContexto -= 10; // Penalty se marca especificada não bate
          razoeContexto.push(`Marca ${contexto.marca} não encontrada`);
        }
      }

      // Unidade de medida
      if (contexto.unidade_medida && candidato.produto.unidade_medida) {
        const unidadeNorm = normalize(contexto.unidade_medida);
        const unidadeProdutoNorm = normalize(candidato.produto.unidade_medida);
        if (unidadeNorm === unidadeProdutoNorm || unidadeNorm.includes(unidadeProdutoNorm) || unidadeProdutoNorm.includes(unidadeNorm)) {
          scoreContexto += 20;
          razoeContexto.push("Unidade de medida compatível");
        }
      }

      // Código do cliente (se houver, é indicador forte)
      if (contexto.codigo_cliente) {
        const codigoNorm = normalize(contexto.codigo_cliente);
        const refNorm = normalize(candidato.produto.referencia_interna || "");
        if (refNorm.includes(codigoNorm) || codigoNorm.includes(refNorm)) {
          scoreContexto += 40;
          razoeContexto.push("Código do cliente corresponde à referência");
        }
      }

      // Combinar scores com pesos mais balanceados (v3.3)
      let scoreFinal: number;
      
      if (analiseSemantica.length > 0 && scoreSemantico > 0) {
        // Com IA semântica: dar mais peso à IA mas validar com outros scores
        scoreFinal = Math.round(
          scoreToken * 0.15 + // Token ainda importa mas menos
          scoreSemantico * 0.50 + // IA é a principal
          scoreContexto * 0.20 + // Contexto é importante
          scorePgTrgm * 0.15 // pg_trgm como validação adicional
        );

        // Se IA deu score muito baixo (<50), limitar score final
        if (scoreSemantico < 50) {
          scoreFinal = Math.min(scoreFinal, 55);
        }

        // Se IA deu score alto (85+) e outros scores também são bons, boost
        if (scoreSemantico >= 85 && scoreToken >= 60 && scorePgTrgm >= 50) {
          scoreFinal = Math.max(scoreFinal, 85);
        }
      } else {
        // Sem IA: balancear entre token, pg_trgm e contexto
        scoreFinal = Math.round(
          scoreToken * 0.40 + 
          scorePgTrgm * 0.35 + 
          scoreContexto * 0.25
        );
      }

      // Aplicar ajuste de ML (se houver)
      const ajusteML = ajustesPorProduto.get(candidato.produto.id) || 0;
      if (ajusteML !== 0) {
        const scoreAntes = scoreFinal;
        scoreFinal = Math.max(0, Math.min(100, scoreFinal + ajusteML));
        console.log(
          `  🎯 [ML] ${candidato.produto.referencia_interna}: ${scoreAntes} → ${scoreFinal} (ajuste: ${ajusteML > 0 ? "+" : ""}${ajusteML})`,
        );
      }

      // Filtro de score mínimo mais rigoroso
      if (scoreFinal < SCORE_MINIMO_ACEITAVEL) {
        console.log(`  ❌ Produto ${candidato.produto.referencia_interna} rejeitado - score ${scoreFinal} < ${SCORE_MINIMO_ACEITAVEL}`);
        continue;
      }

      // Determinar confiança com thresholds ajustados
      let confianca: "alta" | "media" | "baixa";
      if (scoreFinal >= 80) confianca = "alta";
      else if (scoreFinal >= 60) confianca = "media";
      else confianca = "baixa";

      // Construir justificativa mais detalhada
      let justificativa: string;
      if (analise?.justificativa) {
        justificativa = analise.justificativa;
      } else {
        const partes = [];
        partes.push(`Match textual: ${scoreToken}%`);
        if (scorePgTrgm > 0) partes.push(`Similaridade: ${scorePgTrgm}%`);
        if (scoreContexto > 0) partes.push(`Contexto: +${scoreContexto} pts`);
        justificativa = partes.join(" | ");
      }

      const razoes = [
        ...(analise?.razoes_match || []),
        ...razoeContexto,
        `Score token: ${scoreToken}%`,
        scorePgTrgm > 0 ? `Similarity: ${scorePgTrgm}%` : null,
      ].filter(Boolean) as string[];

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

    // Ordenar por score final
    sugestoes.sort((a, b) => b.score_final - a.score_final);

    console.log(`✅ ${sugestoes.length} sugestões geradas (melhor: ${sugestoes[0]?.score_final || 0}%)`);

    // Se não gerou sugestões válidas, marcar como "sem produtos CF"
    if (sugestoes.length === 0 && item_id) {
      console.log("⚠️ Nenhuma sugestão válida após análise - marcando como 'sem produtos CF'");
      await supabase
        .from("edi_cotacoes_itens")
        .update({
          sem_produtos_cf: true,
          motivo_sem_produtos: `Nenhum produto atingiu score mínimo de ${SCORE_MINIMO_ACEITAVEL}%. Candidatos encontrados: ${candidatosPorToken.length}, mas scores muito baixos.`,
          analisado_por_ia: true,
          analise_ia_em: new Date().toISOString(),
          score_confianca_ia: candidatosPorToken[0]?.score || 0,
        })
        .eq("id", item_id);
    }

    return new Response(
      JSON.stringify({
        sugestoes,
        total_produtos_analisados: produtos.length,
        metodo: analiseSemantica.length > 0 ? "hibrido_deepseek_v3.3" : "token_only_v3.3",
        candidatos_pre_filtrados: candidatosPorToken.length,
        versao: "3.3",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Erro em edi-sugerir-produtos:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno", versao: "3.3" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
