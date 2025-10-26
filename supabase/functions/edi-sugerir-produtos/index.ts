import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuração balanceada (v3.2)
const MAX_PRODUTOS_BUSCA = 250; // Balanceado entre cobertura e velocidade
const LIMITE_CANDIDATOS_IA = 5; // Máximo para análise IA
const MIN_SCORE_TOKEN = 28; // Equilibrado - nem muito rigoroso nem muito frouxo
const MIN_SIMILARITY_THRESHOLD = 0.18; // Threshold balanceado (18%)

// ============= INTERFACES =============
interface SugestaoProduto {
  produto_id: string;
  score_final: number;
  score_token: number;
  score_semantico: number;
  score_contexto: number;
  score_pg_trgm: number;
  score_ml_ajuste: number;
  descricao: string;
  codigo: string;
  unidade_medida?: string;
  preco_venda?: number;
  estoque_disponivel?: number;
  justificativa: string;
  razoes_match: string[];
  confianca: "alta" | "media" | "baixa";
  detalhes_matching: MatchingDetails;
  alternativas?: Array<{
    produto_id: string;
    descricao: string;
    score: number;
    diferenca: string;
  }>;
}

interface MatchingDetails {
  tokens_exatos: number;
  tokens_parciais: number;
  numeros_match: number;
  referencia_match: boolean;
  substring_match: boolean;
  categoria_match: boolean;
  unidade_compativel: boolean;
}

interface Produto {
  id: string;
  referencia_interna: string;
  nome: string;
  preco_venda: number;
  unidade_medida: string;
  quantidade_em_maos: number;
  narrativa: string;
}

// ============= NORMALIZAÇÃO E TOKENIZAÇÃO AVANÇADA =============
class TextProcessor {
  private static readonly STOP_WORDS = new Set([
    "de",
    "do",
    "da",
    "e",
    "ou",
    "para",
    "com",
    "em",
    "o",
    "a",
    "os",
    "as",
    "un",
    "und",
    "no",
    "na",
    "nos",
    "nas",
    "ao",
    "aos",
    "pela",
    "pelo",
    "um",
    "uma",
    "uns",
    "umas",
    "esse",
    "essa",
    "este",
    "esta",
  ]);

  private static readonly UNIDADE_SINONIMOS = new Map([
    ["und", ["unidade", "unid", "pc", "pcs", "peça", "pecas"]],
    ["cx", ["caixa", "box"]],
    ["pct", ["pacote", "pack", "embalagem"]],
    ["ml", ["mililitro", "mililitros"]],
    ["l", ["litro", "litros"]],
    ["kg", ["quilo", "quilograma", "kilogramas"]],
    ["g", ["grama", "gramas"]],
    ["m", ["metro", "metros"]],
    ["cm", ["centimetro", "centimetros"]],
  ]);

  private static readonly CATEGORIA_PALAVRAS = new Map([
    ["luva", ["luva", "luvas", "glove"]],
    ["mascara", ["mascara", "mascaras", "mask"]],
    ["seringa", ["seringa", "seringas", "syringe"]],
    ["agulha", ["agulha", "agulhas", "needle"]],
    ["cateter", ["cateter", "cateteres", "catheter"]],
    ["sonda", ["sonda", "sondas", "probe"]],
    ["gaze", ["gaze", "gazes", "compressa"]],
    ["atadura", ["atadura", "ataduras", "bandagem", "bandage"]],
    ["algodao", ["algodao", "cotton"]],
    ["alcool", ["alcool", "alcohol", "álcool"]],
  ]);

  static normalize(str: string): string {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[|.,/()\[\]{}"']/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  static extractNumbers(str: string): string[] {
    const numbers = str.match(/\d+(?:[.,]\d+)?/g) || [];
    return numbers.map((n) => n.replace(",", "."));
  }

  static extractMeasurements(str: string): Array<{ valor: number; unidade: string }> {
    const normalized = this.normalize(str);
    const pattern = /(\d+(?:[.,]\d+)?)\s*(ml|l|kg|g|mg|cm|mm|m|und?|un|pc|pcs|cx|pct)/gi;
    const matches = [...normalized.matchAll(pattern)];

    return matches.map((match) => ({
      valor: parseFloat(match[1].replace(",", ".")),
      unidade: this.normalize(match[2]),
    }));
  }

  static tokenize(str: string): string[] {
    const normalized = this.normalize(str);
    return normalized
      .split(" ")
      .filter(Boolean)
      .filter((token) => !this.STOP_WORDS.has(token) && token.length > 1);
  }

  static getBigramsAndTrigrams(tokens: string[]): string[] {
    const ngrams: string[] = [];

    // Bigrams
    for (let i = 0; i < tokens.length - 1; i++) {
      ngrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }

    // Trigrams
    for (let i = 0; i < tokens.length - 2; i++) {
      ngrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
    }

    return ngrams;
  }

  static detectCategory(str: string): string | null {
    const normalized = this.normalize(str);

    for (const [categoria, palavras] of this.CATEGORIA_PALAVRAS) {
      for (const palavra of palavras) {
        if (normalized.includes(palavra)) {
          return categoria;
        }
      }
    }

    return null;
  }

  static unidadesCompativeis(unidade1: string, unidade2: string): boolean {
    if (!unidade1 || !unidade2) return false;

    const u1 = this.normalize(unidade1);
    const u2 = this.normalize(unidade2);

    if (u1 === u2) return true;

    for (const [base, sinonimos] of this.UNIDADE_SINONIMOS) {
      if ((u1 === base || sinonimos.includes(u1)) && (u2 === base || sinonimos.includes(u2))) {
        return true;
      }
    }

    return false;
  }

  static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1, // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  static similarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
  }
}

// ============= MOTOR DE BUSCA AVANÇADO =============
class AdvancedSearchEngine {
  static calculateTokenScore(
    query: string,
    produto: Produto,
  ): {
    score: number;
    details: MatchingDetails;
  } {
    const queryTokens = TextProcessor.tokenize(query);
    const queryNumbers = TextProcessor.extractNumbers(query);
    const queryNormalized = TextProcessor.normalize(query);
    const queryCategory = TextProcessor.detectCategory(query);
    const queryMeasurements = TextProcessor.extractMeasurements(query);

    const productText = `${produto.nome} ${produto.referencia_interna} ${produto.narrativa || ""}`;
    const productTokens = TextProcessor.tokenize(productText);
    const productNumbers = TextProcessor.extractNumbers(productText);
    const productNormalized = TextProcessor.normalize(productText);
    const productCategory = TextProcessor.detectCategory(productText);
    const productMeasurements = TextProcessor.extractMeasurements(productText);

    let exactMatches = 0;
    let partialMatches = 0;
    let fuzzyMatches = 0;

    // 1. Match exato de tokens
    for (const qt of queryTokens) {
      if (productTokens.includes(qt)) {
        exactMatches++;
      } else {
        // 2. Match parcial (substring)
        let foundPartial = false;
        for (const pt of productTokens) {
          if (pt.length >= 4 && qt.length >= 4) {
            if (pt.includes(qt) || qt.includes(pt)) {
              partialMatches++;
              foundPartial = true;
              break;
            }
          }
        }

        // 3. Fuzzy match (Levenshtein)
        if (!foundPartial && qt.length >= 4) {
          for (const pt of productTokens) {
            if (pt.length >= 4) {
              const similarity = TextProcessor.similarity(qt, pt);
              if (similarity >= 0.8) {
                fuzzyMatches++;
                break;
              }
            }
          }
        }
      }
    }

    // 4. N-grams matching (para frases compostas)
    const queryNgrams = TextProcessor.getBigramsAndTrigrams(queryTokens);
    const productNgrams = TextProcessor.getBigramsAndTrigrams(productTokens);
    let ngramMatches = 0;

    for (const qng of queryNgrams) {
      if (productNgrams.some((png) => png.includes(qng) || qng.includes(png))) {
        ngramMatches++;
      }
    }

    // 5. Matching de números (crítico para referências)
    const numberMatchCount = queryNumbers.filter((qn) =>
      productNumbers.some((pn) => Math.abs(parseFloat(qn) - parseFloat(pn)) < 0.01),
    ).length;

    // 6. Match de referência interna
    const hasExactRef =
      produto.referencia_interna &&
      (queryNormalized.includes(TextProcessor.normalize(produto.referencia_interna)) ||
        TextProcessor.normalize(produto.referencia_interna).includes(queryNormalized));

    // 7. Match de substring completa
    const hasSubstring = productNormalized.includes(queryNormalized) || queryNormalized.includes(productNormalized);

    // 8. Match de categoria
    const categoryMatch = queryCategory && productCategory && queryCategory === productCategory;

    // 9. Match de medidas
    let measurementMatch = false;
    if (queryMeasurements.length > 0 && productMeasurements.length > 0) {
      measurementMatch = queryMeasurements.some((qm) =>
        productMeasurements.some(
          (pm) => Math.abs(qm.valor - pm.valor) < 0.1 && TextProcessor.unidadesCompativeis(qm.unidade, pm.unidade),
        ),
      );
    }

    // 10. Match de unidade de medida
    const unidadeCompativel = TextProcessor.unidadesCompativeis(
      query.match(/\b(und?|unidade|cx|pct|ml|l|kg|g)\b/i)?.[0] || "",
      produto.unidade_medida || "",
    );

    // ===== CÁLCULO DE SCORE =====
    let score = 0;
    const totalQueryTokens = queryTokens.length || 1;

    // Pesos ajustados para melhor precisão e recall
    score += exactMatches * 30; // Tokens exatos
    score += partialMatches * 18; // Tokens parciais
    score += fuzzyMatches * 12; // Fuzzy matches
    score += ngramMatches * 15; // N-grams
    score += numberMatchCount * 45; // Números (crítico mas não bloqueante)
    score += hasExactRef ? 80 : 0; // Referência exata (muito importante)
    score += hasSubstring ? 35 : 0; // Substring completa
    score += categoryMatch ? 40 : 0; // Categoria igual
    score += measurementMatch ? 30 : 0; // Medidas compatíveis
    score += unidadeCompativel ? 25 : 0; // Unidade compatível

    // Boost para alta taxa de cobertura
    const matchRatio = (exactMatches + partialMatches * 0.7 + fuzzyMatches * 0.5) / totalQueryTokens;
    if (matchRatio >= 0.8) score += 38;
    else if (matchRatio >= 0.6) score += 28;
    else if (matchRatio >= 0.4) score += 18;
    else if (matchRatio >= 0.25) score += 10;

    // Penalidades BALANCEADAS - importantes mas não bloqueantes
    if (queryNumbers.length > 0 && numberMatchCount === 0) {
      score *= 0.35; // Penalidade moderada-forte
    }

    if (queryNumbers.length > 1 && numberMatchCount < queryNumbers.length * 0.4) {
      score *= 0.5; // Penalidade se não bater 40% dos números
    }

    if (matchRatio < 0.25) {
      score *= 0.55; // Penalidade moderada para baixa cobertura
    }

    // Normalizar para 0-100
    score = Math.min(100, Math.max(0, score));

    return {
      score: Math.round(score),
      details: {
        tokens_exatos: exactMatches,
        tokens_parciais: partialMatches + fuzzyMatches,
        numeros_match: numberMatchCount,
        referencia_match: !!hasExactRef,
        substring_match: hasSubstring,
        categoria_match: !!categoryMatch,
        unidade_compativel: unidadeCompativel,
      },
    };
  }

  static searchProducts(
    query: string,
    produtos: Produto[],
    limite: number = 10,
    minScore: number = 30,
  ): Array<{ produto: Produto; score: number; details: MatchingDetails }> {
    if (!query || TextProcessor.tokenize(query).length === 0) {
      return [];
    }

    const results = produtos
      .map((produto) => {
        const { score, details } = this.calculateTokenScore(query, produto);
        return { produto, score, details };
      })
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limite);

    return results;
  }
}

// ============= ANÁLISE SEMÂNTICA COM IA (DEEPSEEK) =============
async function analisarComIA(
  descricaoCliente: string,
  candidatos: Array<{ produto: Produto; scoreToken: number; details: MatchingDetails }>,
  contexto: { marca?: string; quantidade?: number; unidade_medida?: string },
): Promise<any[]> {
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

  if (!deepseekApiKey) {
    console.warn("⚠️ DEEPSEEK_API_KEY não configurada, pulando análise semântica");
    return [];
  }
  
  // Limitar candidatos para evitar timeout
  const candidatosLimitados = candidatos.slice(0, LIMITE_CANDIDATOS_IA);

  try {
    console.log(`🤖 [DeepSeek] Analisando ${candidatosLimitados.length} candidatos com IA...`);

    const candidatosFormatados = candidatosLimitados.map((c, idx) => ({
      index: idx,
      nome: c.produto.nome,
      referencia: c.produto.referencia_interna,
      narrativa: c.produto.narrativa || "Sem descrição detalhada",
      unidade: c.produto.unidade_medida,
      estoque: c.produto.quantidade_em_maos,
      preco: c.produto.preco_venda,
      scoreToken: c.scoreToken,
      matching: {
        tokens_exatos: c.details.tokens_exatos,
        tokens_parciais: c.details.tokens_parciais,
        numeros_match: c.details.numeros_match,
        referencia_match: c.details.referencia_match,
        substring_match: c.details.substring_match,
        categoria_match: c.details.categoria_match,
        unidade_compativel: c.details.unidade_compativel,
      },
    }));

    const prompt = `Analise produtos médico-hospitalares de forma PRECISA mas PRAGMÁTICA.

**SOLICITADO:** "${descricaoCliente}"
${contexto.marca ? `Marca: ${contexto.marca}` : ""}

**CANDIDATOS:**
${candidatosFormatados.map((p, idx) => `[${idx}] ${p.nome} | Ref: ${p.referencia} | Score: ${p.scoreToken}%
${p.narrativa}
Match: ${p.matching.tokens_exatos} exatos, ${p.matching.numeros_match}/${p.matching.numeros_match + (p.scoreToken > 60 ? 0 : 1)} números`).join("\n\n")}

**REGRAS:**
1. **Números importantes** (não críticos): Se faltam números mas o resto bate bem, score 75-85
2. **Categoria MESMA aplicação**: Score 85-95
3. **Equivalente funcional**: Mesma função, marca diferente = 75-85
4. **Especificações similares**: Pequenas diferenças aceitáveis = 70-80

**SCORES:**
- **95-100**: Match perfeito
- **85-94**: Equivalente direto (mesma aplicação)
- **70-84**: Compatível (função similar)
- **60-69**: Aceitável com ressalvas
- **<60**: Incompatível

Responda APENAS JSON: [{"index":0,"score":85,"justificativa":"..."}]`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Especialista em produtos médico-hospitalares. Seja preciso mas pragmático. Responda APENAS JSON: [{\"index\":0,\"score\":85,\"justificativa\":\"...\"}]",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [DeepSeek] Erro HTTP ${response.status}:`, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("IA retornou resposta vazia");
    }

    // Extrair JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ [IA] Resposta inválida:", content.substring(0, 300));
      return [];
    }

    const results = JSON.parse(jsonMatch[0]);
    console.log(`✅ [IA] ${results.length} produtos analisados`);

    return results;
  } catch (error: any) {
    console.error("❌ [IA] Erro:", error.message);
    return [];
  }
}

// ============= ANÁLISE DE CONTEXTO =============
function calcularScoreContexto(
  produto: Produto,
  contexto: {
    marca?: string;
    quantidade?: number;
    unidade_medida?: string;
    historico_compras?: Array<{ produto_id: string; frequencia: number }>;
  },
): number {
  let score = 0;

  // Unidade de medida compatível
  if (contexto.unidade_medida && produto.unidade_medida) {
    if (TextProcessor.unidadesCompativeis(contexto.unidade_medida, produto.unidade_medida)) {
      score += 25;
    }
  }

  // Estoque suficiente
  if (contexto.quantidade && produto.quantidade_em_maos) {
    if (produto.quantidade_em_maos >= contexto.quantidade) {
      score += 20;
    } else if (produto.quantidade_em_maos >= contexto.quantidade * 0.5) {
      score += 10;
    }
  }

  // Histórico de compras (se disponível)
  if (contexto.historico_compras) {
    const historico = contexto.historico_compras.find((h) => h.produto_id === produto.id);
    if (historico) {
      score += Math.min(25, historico.frequencia * 5);
    }
  }

  return Math.min(100, score);
}

// ============= HANDLER PRINCIPAL =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      descricao_cliente,
      marca_cliente,
      cnpj_cliente,
      plataforma_id,
      quantidade_solicitada,
      unidade_medida,
      item_id,
      limite = 5,
      min_score = 30,
      usar_ia = true,
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

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔍 BUSCA AVANÇADA DE PRODUTOS`);
    console.log(`${"=".repeat(80)}`);
    console.log(`📝 Query: "${descricao_cliente}"`);
    console.log(`🏷️  Marca: ${marca_cliente || "Não especificada"}`);
    console.log(`📦 Quantidade: ${quantidade_solicitada || "Não especificada"} ${unidade_medida || ""}`);
    console.log(`${"=".repeat(80)}\n`);

    // ===== ETAPA 1: CARREGAR PRODUTOS COM FULL-TEXT SEARCH (pg_trgm) =====
    console.log("📂 [1/6] Carregando produtos com Full-Text Search (pg_trgm)...");
    
    const numerosQuery = TextProcessor.extractNumbers(descricao_cliente);
    const timestampBuscaInicio = Date.now();
    
    let produtos: Produto[] = [];
    let metodoUsado = "";
    let scoresBusca = { texto: 0, numeros: 0 };

    if (numerosQuery.length > 0) {
      // Busca híbrida com números
      console.log(`   🔢 Detectados ${numerosQuery.length} números: [${numerosQuery.join(', ')}]`);
      const { data, error } = await supabase
        .rpc('buscar_produtos_hibrido', {
          p_descricao: descricao_cliente,
          p_numeros: numerosQuery,
          p_limite: MAX_PRODUTOS_BUSCA
        });
      
      if (error) {
        console.error("❌ Erro busca híbrida:", error);
        throw new Error(`Erro busca híbrida: ${error.message}`);
      }
      
      // Mapear resultados com tipo explícito
      produtos = (data || []).map((row: any) => {
        const p: Produto = {
          id: row.id,
          referencia_interna: row.referencia_interna || '',
          nome: row.nome || '',
          preco_venda: row.preco_venda || 0,
          unidade_medida: row.unidade_medida || '',
          quantidade_em_maos: row.quantidade_em_maos || 0,
          narrativa: row.narrativa || '',
        };
        // Adicionar score como propriedade customizada
        (p as any).score_pg_trgm = row.score_total || 0;
        return p;
      });
      
      metodoUsado = "hibrido";
      if (data && data.length > 0) {
        scoresBusca = {
          texto: data[0].score_texto || 0,
          numeros: data[0].score_numeros || 0
        };
      }
      
      console.log(`   ✓ ${produtos.length} produtos (busca híbrida)`);
      console.log(`   📊 Melhor match: texto=${scoresBusca.texto.toFixed(2)}, números=${scoresBusca.numeros.toFixed(2)}`);
    } else {
      // Busca simples por similaridade
      const { data, error } = await supabase
        .rpc('buscar_produtos_similares', {
          p_descricao: descricao_cliente,
          p_limite: MAX_PRODUTOS_BUSCA,
          p_similaridade_minima: MIN_SIMILARITY_THRESHOLD
        });
      
      if (error) {
        console.error("❌ Erro busca similar:", error);
        throw new Error(`Erro busca similar: ${error.message}`);
      }
      
      // Mapear resultados com tipo explícito
      produtos = (data || []).map((row: any) => {
        const p: Produto = {
          id: row.id,
          referencia_interna: row.referencia_interna || '',
          nome: row.nome || '',
          preco_venda: row.preco_venda || 0,
          unidade_medida: row.unidade_medida || '',
          quantidade_em_maos: row.quantidade_em_maos || 0,
          narrativa: row.narrativa || '',
        };
        // Adicionar score como propriedade customizada
        (p as any).score_pg_trgm = row.score_similaridade || 0;
        return p;
      });
      
      metodoUsado = "similaridade";
      if (data && data.length > 0) {
        scoresBusca.texto = data[0].score_similaridade || 0;
      }
      
      console.log(`   ✓ ${produtos.length} produtos (busca por similaridade)`);
      console.log(`   📊 Melhor score: ${scoresBusca.texto.toFixed(2)}`);
    }

    const tempoBusca = Date.now() - timestampBuscaInicio;
    console.log(`   ⏱️  Tempo de busca: ${tempoBusca}ms\n`);

    if (!produtos || produtos.length === 0) {
      console.log("⚠️  Nenhum produto similar encontrado");
      return new Response(
        JSON.stringify({
          sugestoes: [],
          total_produtos_analisados: 0,
          metodo: "sem_similaridade",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`✓ ${produtos.length} produtos carregados (pg_trgm ${metodoUsado})\n`);

    // ===== ETAPA 2: VERIFICAR VÍNCULO EXISTENTE =====
    if (plataforma_id && cnpj_cliente) {
      console.log("🔗 [2/6] Verificando vínculos DE-PARA existentes...");
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
        console.log(`✓ Vínculo encontrado: ${prod.nome} (${prod.referencia_interna})\n`);

        const sugestaoVinculo: SugestaoProduto = {
          produto_id: prod.id,
          score_final: 100,
          score_token: 100,
          score_semantico: 100,
          score_contexto: 100,
          score_pg_trgm: 100,
          score_ml_ajuste: 0,
          descricao: prod.nome,
          codigo: prod.referencia_interna,
          unidade_medida: prod.unidade_medida,
          preco_venda: prod.preco_venda,
          estoque_disponivel: prod.quantidade_em_maos,
          justificativa: "Produto vinculado previamente através de DE-PARA aprovado",
          razoes_match: [
            "Vínculo DE-PARA confirmado e ativo",
            "Histórico de uso validado",
            "Compatibilidade pré-aprovada",
          ],
          confianca: "alta",
          detalhes_matching: {
            tokens_exatos: 0,
            tokens_parciais: 0,
            numeros_match: 0,
            referencia_match: true,
            substring_match: true,
            categoria_match: true,
            unidade_compativel: true,
          },
        };

        return new Response(
          JSON.stringify({
            sugestoes: [sugestaoVinculo],
            total_produtos_analisados: 1,
            metodo: "vinculo_existente",
            tempo_processamento: "< 100ms",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log("✓ Nenhum vínculo encontrado, continuando busca...\n");
    } else {
      console.log("⊘ [2/6] Verificação de vínculo pulada (dados insuficientes)\n");
    }

    // ===== ETAPA 3: BUSCA AVANÇADA POR TOKENS =====
    console.log("🔎 [3/6] Executando busca avançada por tokens...");
    const inicioToken = Date.now();

    const candidatosPorToken = AdvancedSearchEngine.searchProducts(
      descricao_cliente,
      produtos as Produto[],
      Math.min(10, limite * 2), // Reduzido para focar em qualidade
      MIN_SCORE_TOKEN,
    );

    const tempoToken = Date.now() - inicioToken;
    console.log(`✓ ${candidatosPorToken.length} candidatos encontrados (${tempoToken}ms)`);

    if (candidatosPorToken.length > 0) {
      console.log(`  → Melhor score: ${candidatosPorToken[0].score}%`);
      console.log(
        `  → Top 3: ${candidatosPorToken
          .slice(0, 3)
          .map((c) => `${c.produto.referencia_interna} (${c.score}%)`)
          .join(", ")}\n`,
      );
    } else {
      console.log("⚠️  Nenhum candidato atendeu o score mínimo\n");
    }

    if (candidatosPorToken.length === 0) {
      return new Response(
        JSON.stringify({
          sugestoes: [],
          total_produtos_analisados: produtos.length,
          metodo: "token_only",
          mensagem: "Nenhum produto encontrado com similaridade suficiente",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== ETAPA 4: ANÁLISE SEMÂNTICA COM IA =====
    let analiseSemantica: any[] = [];

    if (usar_ia && candidatosPorToken.length > 0) {
      console.log("🤖 [4/6] Iniciando análise semântica com IA...");
      const inicioIA = Date.now();

      const contexto = {
        marca: marca_cliente,
        quantidade: quantidade_solicitada,
        unidade_medida: unidade_medida,
      };

      analiseSemantica = await analisarComIA(
        descricao_cliente,
        candidatosPorToken.slice(0, 5).map((c) => ({
          produto: c.produto,
          scoreToken: c.score,
          details: c.details,
        })),
        contexto,
      );

      const tempoIA = Date.now() - inicioIA;
      console.log(`✓ Análise IA concluída (${tempoIA}ms)\n`);
    } else {
      console.log("⊘ [4/6] Análise IA desabilitada ou sem candidatos\n");
    }

    // ===== ETAPA 5: BUSCAR AJUSTES DE ML =====
    console.log("🧠 [5/6] Buscando ajustes de Machine Learning...");
    const produtoIds = candidatosPorToken.slice(0, limite * 2).map((c) => c.produto.id);
    const { data: ajustes } = await supabase
      .from("ia_score_ajustes")
      .select("*")
      .in("produto_id", produtoIds)
      .eq("ativo", true);

    const ajustesPorProduto = new Map<string, number>();
    if (ajustes && ajustes.length > 0) {
      console.log(`✓ ${ajustes.length} ajustes ML encontrados`);
      ajustes.forEach((ajuste) => {
        const atual = ajustesPorProduto.get(ajuste.produto_id) || 0;
        ajustesPorProduto.set(ajuste.produto_id, atual + (ajuste.ajuste_score || 0));
      });
    } else {
      console.log("✓ Nenhum ajuste ML aplicável");
    }
    console.log();

    // ===== ETAPA 6: COMBINAÇÃO FINAL DE SCORES =====
    console.log("⚡ [6/6] Combinando scores e gerando sugestões finais...");
    const sugestoes: SugestaoProduto[] = [];
    const contexto = {
      marca: marca_cliente,
      quantidade: quantidade_solicitada,
      unidade_medida: unidade_medida,
    };

    for (let i = 0; i < Math.min(candidatosPorToken.length, limite * 2); i++) {
      const candidato = candidatosPorToken[i];
      const analise = analiseSemantica.find((a) => a.index === i);

      // Scores individuais
      const scoreToken = candidato.score;
      const scoreSemantico = analise?.score || 0;
      const scoreContexto = calcularScoreContexto(candidato.produto, contexto);
      const scorePgTrgm = ((candidato.produto as any).score_pg_trgm || 0) * 100; // Converter 0-1 para 0-100
      const ajusteML = ajustesPorProduto.get(candidato.produto.id) || 0;

      // Combinação BALANCEADA
      let scoreFinal: number;
      if (analiseSemantica.length > 0 && scoreSemantico > 0) {
        // Com IA: 20% token + 45% semântico + 15% contexto + 20% pg_trgm
        scoreFinal = Math.round(
          scoreToken * 0.20 + 
          scoreSemantico * 0.45 + 
          scoreContexto * 0.15 + 
          scorePgTrgm * 0.20
        );
      } else {
        // Sem IA: 45% token + 25% contexto + 30% pg_trgm
        scoreFinal = Math.round(
          scoreToken * 0.45 + 
          scoreContexto * 0.25 + 
          scorePgTrgm * 0.30
        );
      }
      
      // Boost se IA aprovou forte
      if (scoreSemantico >= 85) {
        scoreFinal = Math.max(scoreFinal, 80); // Garantir pelo menos 80 se IA aprovou
      }

      // Aplicar ajuste ML
      if (ajusteML !== 0) {
        const scoreAntes = scoreFinal;
        scoreFinal = Math.max(0, Math.min(100, scoreFinal + ajusteML));
        console.log(
          `  🎯 ${candidato.produto.referencia_interna}: ${scoreAntes} → ${scoreFinal} (ML: ${ajusteML > 0 ? "+" : ""}${ajusteML})`,
        );
      }

      // Determinar confiança
      let confianca: "alta" | "media" | "baixa";
      if (scoreFinal >= 85) confianca = "alta";
      else if (scoreFinal >= 65) confianca = "media";
      else confianca = "baixa";
      
      // Filtrar sugestões muito ruins
      if (scoreFinal < Math.max(min_score, 30)) {
        continue;
      }

      // Justificativa e razões
      const justificativa =
        analise?.justificativa || `Compatibilidade de ${scoreToken}% baseada em análise textual avançada`;

      const razoes =
        analise?.razoes_match ||
        ([
          candidato.details.tokens_exatos > 0 ? `${candidato.details.tokens_exatos} tokens com match exato` : null,
          candidato.details.referencia_match ? "Referência interna compatível" : null,
          candidato.details.categoria_match ? "Categoria correspondente" : null,
          candidato.details.unidade_compativel ? "Unidade de medida compatível" : null,
          scoreContexto > 50 ? "Contexto favorável (marca, quantidade, histórico)" : null,
        ].filter(Boolean) as string[]);

      sugestoes.push({
        produto_id: candidato.produto.id,
        score_final: scoreFinal,
        score_token: scoreToken,
        score_semantico: scoreSemantico,
        score_contexto: scoreContexto,
        score_pg_trgm: Math.round(scorePgTrgm),
        score_ml_ajuste: ajusteML,
        descricao: candidato.produto.nome,
        codigo: candidato.produto.referencia_interna,
        unidade_medida: candidato.produto.unidade_medida,
        preco_venda: candidato.produto.preco_venda,
        estoque_disponivel: candidato.produto.quantidade_em_maos,
        justificativa,
        razoes_match: razoes,
        confianca,
        detalhes_matching: candidato.details,
      });
    }

    // Ordenar e limitar
    sugestoes.sort((a, b) => b.score_final - a.score_final);
    const sugestoesFinal = sugestoes.slice(0, limite);

    console.log(`✓ ${sugestoesFinal.length} sugestões geradas`);
    console.log(`  → Melhor match: ${sugestoesFinal[0]?.codigo} (${sugestoesFinal[0]?.score_final}%)`);
    console.log(
      `  → Confiança: ${sugestoesFinal.filter((s) => s.confianca === "alta").length} alta, ${sugestoesFinal.filter((s) => s.confianca === "media").length} média, ${sugestoesFinal.filter((s) => s.confianca === "baixa").length} baixa`,
    );
    console.log(`\n${"=".repeat(80)}`);
    console.log(`✅ BUSCA CONCLUÍDA COM SUCESSO`);
    console.log(`${"=".repeat(80)}\n`);

    return new Response(
      JSON.stringify({
        sugestoes: sugestoesFinal,
        total_produtos_analisados: produtos.length,
        candidatos_pre_filtrados: candidatosPorToken.length,
        metodo: analiseSemantica.length > 0 ? "hibrido_ia_avancado" : "token_avancado",
        motor_busca: "v3.0-pgtrgm",
        metodo_busca: metodoUsado,
        tempo_busca_ms: tempoBusca,
        estatisticas: {
          tempo_token_ms: tempoToken,
          candidatos_token: candidatosPorToken.length,
          analises_ia: analiseSemantica.length,
          ajustes_ml: ajustes?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("\n❌ ERRO CRÍTICO:", error.message);
    console.error(error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || "Erro interno no servidor",
        stack: Deno.env.get("ENVIRONMENT") === "development" ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
