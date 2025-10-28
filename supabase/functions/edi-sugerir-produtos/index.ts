import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const SugerirProdutosSchema = z.object({
  descricao_cliente: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres").max(500, "Descrição muito longa").trim(),
  codigo_produto_cliente: z.string().max(100, "Código muito longo").optional(),
  cnpj_cliente: z.string().regex(/^\d{14}$/, "CNPJ inválido (14 dígitos)").optional().or(z.literal('')),
  plataforma_id: z.string().uuid("ID de plataforma inválido").optional(),
  quantidade_solicitada: z.number().positive("Quantidade deve ser positiva").optional(),
  unidade_medida: z.string().max(20, "Unidade de medida inválida").optional(),
  item_id: z.string().uuid("ID de item inválido").optional(),
  limite: z.number().int().min(1).max(20, "Limite deve estar entre 1 e 20").default(5),
  modo_analise_completa: z.boolean().optional().default(false),
});

// ============= CONFIGURAÇÃO v3.5 - OTIMIZADA PARA VELOCIDADE =============
const MAX_PRODUTOS_BUSCA = 3000; // Reduzido para melhor performance (Supabase limita a ~1000 por query)
const MIN_SCORE_TOKEN = 30; // Balanceado
const MIN_SIMILARITY_THRESHOLD = 0.18; // pg_trgm balanceado
const LIMITE_CANDIDATOS_IA = 5; // Reduzido de 8 para 5 = 40% mais rápido
const SCORE_MINIMO_ACEITAVEL = 35; // Score mínimo aceitável

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
  ajuste_ml?: number; // Ajuste de Machine Learning aplicado
  alternativas?: Array<{
    produto_id: string;
    descricao: string;
    score: number;
    diferenca: string;
  }>;
}

// ============= CIRCUIT BREAKER PARA DEEPSEEK =============
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'closed',
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Abre após 5 falhas
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 60 segundos em estado aberto
const CIRCUIT_BREAKER_HALF_OPEN_TIMEOUT = 30000; // 30 segundos em half-open

function updateCircuitBreaker(success: boolean) {
  if (success) {
    circuitBreaker.failures = 0;
    circuitBreaker.state = 'closed';
    console.log('🟢 Circuit Breaker: Estado FECHADO (funcionando normalmente)');
  } else {
    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = Date.now();
    
    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.state = 'open';
      console.error(`🔴 Circuit Breaker: Estado ABERTO (${circuitBreaker.failures} falhas consecutivas)`);
    }
  }
}

function canCallDeepSeek(): { allowed: boolean; reason?: string } {
  const now = Date.now();
  
  if (circuitBreaker.state === 'closed') {
    return { allowed: true };
  }
  
  if (circuitBreaker.state === 'open') {
    const timeSinceFailure = now - circuitBreaker.lastFailureTime;
    
    if (timeSinceFailure >= CIRCUIT_BREAKER_TIMEOUT) {
      circuitBreaker.state = 'half-open';
      console.log('🟡 Circuit Breaker: Tentando reconexão (HALF-OPEN)');
      return { allowed: true };
    }
    
    return { 
      allowed: false, 
      reason: `Circuit breaker aberto. Tentando novamente em ${Math.ceil((CIRCUIT_BREAKER_TIMEOUT - timeSinceFailure) / 1000)}s` 
    };
  }
  
  // half-open state
  return { allowed: true };
}

// ============= ANÁLISE SEMÂNTICA COM DEEPSEEK v4.0 - COM RETRY E CIRCUIT BREAKER =============
async function analisarComDeepSeek(
  descricaoCliente: string,
  candidatos: Array<{ produto: any; scoreToken: number; scorePgTrgm: number }>,
  contexto: {
    marca?: string;
    quantidade?: number;
    unidade_medida?: string;
    codigo_cliente?: string;
  },
): Promise<{ results: any[]; error?: string }> {
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!deepseekApiKey) {
    console.warn("⚠️ DEEPSEEK_API_KEY não configurada, pulando análise semântica");
    return { results: [], error: "API key não configurada" };
  }

  // Verificar circuit breaker
  const circuitCheck = canCallDeepSeek();
  if (!circuitCheck.allowed) {
    console.warn(`⚠️ Circuit Breaker impediu chamada: ${circuitCheck.reason}`);
    return { results: [], error: circuitCheck.reason };
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1 segundo
  const TIMEOUT_MS = 30000; // 30 segundos de timeout

  for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
    try {
      console.log(`🤖 [DeepSeek] Tentativa ${tentativa}/${MAX_RETRIES} - Analisando ${candidatos.length} candidatos...`);

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

      const prompt = `Você é um especialista em análise de compatibilidade de produtos médico-hospitalares. Sua função é avaliar se os produtos disponíveis atendem a solicitação do cliente, considerando que pode haver variações de marca, embalagem ou apresentação.

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

**CRITÉRIOS DE AVALIAÇÃO:**
1. **CATEGORIA/FUNÇÃO**: O produto serve para o mesmo propósito? (ex: luva ≠ seringa)
2. **ESPECIFICAÇÕES TÉCNICAS**: Tamanho, calibre, volume, concentração são compatíveis?
3. **MARCA/SIMILAR**: Marca diferente é aceitável se o produto for equivalente
4. **UNIDADE DE MEDIDA**: Verificar se é compatível para conversão
5. **APLICAÇÃO**: O produto pode substituir o solicitado na prática clínica?

**ESCALA DE PONTUAÇÃO (seja realista, não super rigoroso):**
- 85-100: Produto altamente compatível, mesma categoria e specs similares
- 70-84: Compatível com pequenas diferenças (marca, embalagem)
- 55-69: Compatível mas com algumas diferenças relevantes
- 40-54: Parcialmente compatível, pode servir dependendo do contexto
- 0-39: Incompatível ou categoria/aplicação muito diferente

**RETORNE JSON ARRAY:**
[
  {
    "index": 0,
    "score": 75,
    "justificativa": "Descrição clara e objetiva do motivo do score",
    "razoes_match": ["razão 1", "razão 2", "razão 3"],
    "categoria_compativel": true,
    "aplicacao_compativel": true,
    "diferenca_critica": null
  }
]

**IMPORTANTE**: 
- Seja EQUILIBRADO: produtos similares de marcas diferentes podem ser compatíveis
- Marca diferente NÃO elimina automaticamente se função e specs são similares
- Na dúvida entre 2 scores próximos, escolha o mais alto se o produto for funcional
- Retorne APENAS o JSON, sem markdown ou texto extra`;

      // Criar AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
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
                content: "Você é um especialista em produtos médico-hospitalares com experiência em substituições e equivalências. Analise compatibilidade considerando que marcas diferentes podem ser equivalentes se mesma função e especificações similares. Seja realista e prático. Retorne APENAS JSON válido.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.25,
            max_tokens: 1800,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Rate limit - retry com backoff exponencial
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : BASE_DELAY * Math.pow(2, tentativa - 1);
            
            if (tentativa < MAX_RETRIES) {
              console.warn(`⏳ Rate limit (429). Aguardando ${delayMs}ms antes de tentar novamente...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }
            throw new Error("Rate limit excedido após todas as tentativas");
          }

          // Outros erros HTTP
          const errorText = await response.text();
          console.error(`❌ [DeepSeek] Erro HTTP ${response.status}:`, errorText);
          throw new Error(`DeepSeek API error: ${response.status} - ${errorText.substring(0, 100)}`);
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
        console.log(`✅ [DeepSeek] ${results.length} produtos analisados com sucesso`);
        
        // Sucesso - resetar circuit breaker
        updateCircuitBreaker(true);
        
        return { results };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error(`⏱️ Timeout de ${TIMEOUT_MS}ms excedido na tentativa ${tentativa}`);
          if (tentativa < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, BASE_DELAY * tentativa));
            continue;
          }
          throw new Error(`Timeout após ${MAX_RETRIES} tentativas`);
        }
        
        throw fetchError;
      }

    } catch (error: any) {
      const isLastAttempt = tentativa === MAX_RETRIES;
      const errorMsg = error.message || String(error);
      
      console.error(`❌ [DeepSeek] Tentativa ${tentativa} falhou:`, errorMsg);
      
      if (isLastAttempt) {
        // Atualizar circuit breaker após falha final
        updateCircuitBreaker(false);
        
        return { 
          results: [], 
          error: `Falha após ${MAX_RETRIES} tentativas: ${errorMsg}` 
        };
      }
      
      // Backoff exponencial antes da próxima tentativa
      const delayMs = BASE_DELAY * Math.pow(2, tentativa - 1);
      console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Não deveria chegar aqui, mas por segurança
  updateCircuitBreaker(false);
  return { results: [], error: "Todas as tentativas falharam" };
}

// ============= BUSCA POR TOKENS v3.5 OTIMIZADA =============
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

      // Filtro menos restritivo: exige pelo menos 30% de match
      if (matchRatio < 0.30) {
        return { produto: p, score: 0 };
      }

      // Se query tem números, é preferível mas não obrigatório ter correspondência
      const numberMatchCount = queryNumbers.filter((qn) => productNumbers.includes(qn)).length;
      const hasNumberMatch = numberMatchCount > 0;

      // Se query tem 2+ números, produto deve ter pelo menos 1 número correspondente
      if (queryNumbers.length >= 2 && numberMatchCount === 0) {
        return { produto: p, score: 0 };
      }

      const hasExactRef =
        p.referencia_interna &&
        (queryNormalized.includes(normalize(p.referencia_interna)) ||
          normalize(p.referencia_interna).includes(queryNormalized));

      const hasSubstring = productNormalized.includes(queryNormalized) || queryNormalized.includes(productNormalized);

      // Sistema de scoring mais balanceado v3.4
      let score = 0;
      
      // Matches exatos valem muito
      score += exactMatches * 30;
      
      // Matches parciais valem menos
      score += partialMatches * 15;
      
      // Números são importantes mas não eliminatórios
      if (hasNumberMatch) score += numberMatchCount * 40;
      
      // Referência exata é forte indicador
      if (hasExactRef) score += 65;
      
      // Substring também é bom indicador
      if (hasSubstring) score += 25;
      
      // Bonus por alta taxa de match
      if (matchRatio >= 0.85) score += 35;
      else if (matchRatio >= 0.70) score += 25;
      else if (matchRatio >= 0.50) score += 15;
      else if (matchRatio >= 0.35) score += 8;

      // Penalty suave se o match ratio for baixo
      if (matchRatio < 0.50 && exactMatches < 2) {
        score *= 0.85;
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
    
    // Validate input
    const validationResult = SugerirProdutosSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      descricao_cliente,
      codigo_produto_cliente,
      cnpj_cliente,
      plataforma_id,
      quantidade_solicitada,
      unidade_medida,
      item_id,
      limite,
      modo_analise_completa,
    } = validationResult.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔍 [v3.5 OTIMIZADA] Buscando produtos para: "${descricao_cliente}"`);

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
            versao: "3.5",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2. Buscar produtos disponíveis (Supabase limita a ~1000 por padrão, usar range para mais)
    const { data: produtos, error: produtosError } = await supabase
      .from("produtos")
      .select("id, referencia_interna, nome, preco_venda, unidade_medida, quantidade_em_maos, narrativa")
      .gt("quantidade_em_maos", 0)
      .range(0, 2999) // Busca até 3000 produtos (0-2999)
      .limit(MAX_PRODUTOS_BUSCA);

    if (produtosError) throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
    if (!produtos || produtos.length === 0) {
      return new Response(JSON.stringify({ sugestoes: [], total_produtos_analisados: 0, metodo: "sem_produtos_catalogo", versao: "3.5" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📦 ${produtos.length} produtos disponíveis em estoque`);

    // 3. NÍVEL 1: Busca por tokens (reduzido para 15 candidatos = mais rápido)
    let candidatosPorToken = tokenBasedSimilarity(descricao_cliente, produtos, 15);
    console.log(`📊 Token matching: ${candidatosPorToken.length} candidatos (melhor: ${candidatosPorToken[0]?.score || 0})`);

    // Fallback: se não encontrou candidatos, relaxar critérios e tentar novamente antes de desistir
    if (candidatosPorToken.length === 0) {
      console.log("⚠️ Nenhum candidato via tokens — ativando fallback relaxado");

      const queryTokens = tokenize(descricao_cliente);
      const queryNumbers = extractNumbers(descricao_cliente);
      const queryNorm = normalize(descricao_cliente);

      // Estratégia relaxada: considerar qualquer ocorrência de token (>=4 chars) ou referência/substring
      const fallback = produtos
        .map((p) => {
          const textoProduto = `${p.nome} ${p.referencia_interna} ${p.narrativa || ""}`;
          const produtoNorm = normalize(textoProduto);
          const produtoTokens = tokenize(textoProduto);
          const produtoNumbers = extractNumbers(textoProduto);

          let hits = 0;
          for (const t of queryTokens) {
            if (t.length >= 4 && (produtoTokens.includes(t) || produtoNorm.includes(t))) hits++;
          }

          const numberHits = queryNumbers.filter((n) => produtoNumbers.includes(n)).length;
          const hasRef = p.referencia_interna && (queryNorm.includes(normalize(p.referencia_interna)) || normalize(p.referencia_interna).includes(queryNorm));
          const hasSubstring = produtoNorm.includes(queryNorm) || queryNorm.includes(produtoNorm);

          // Score simples e permissivo
          let score = 0;
          score += hits * 20;
          score += numberHits * 30;
          if (hasRef) score += 60;
          if (hasSubstring) score += 20;

          return { produto: p, score: Math.min(100, Math.round(score)) };
        })
        .filter((c) => c.score >= 10)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (fallback.length > 0) {
        candidatosPorToken = fallback;
        console.log(`🛟 Fallback relaxado recuperou ${fallback.length} candidatos (melhor: ${fallback[0].score})`);
      } else {
        console.log("❌ Nenhum candidato encontrado mesmo após fallback - marcando como 'sem produtos CF'");

        // Marcar item como sem produtos CF se item_id foi fornecido
        if (item_id) {
          await supabase
            .from("edi_cotacoes_itens")
            .update({
              sem_produtos_cf: true,
              motivo_sem_produtos: "Nenhum produto da CF Fernandes compatível encontrado (token e fallback)",
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
            versao: "3.5",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 4. NÍVEL 2: Buscar scores pg_trgm (reduzido para 15 = mais rápido)
    console.log("🔍 Calculando pg_trgm...");
    const produtoIds = candidatosPorToken.slice(0, 15).map((c) => c.produto.id);
    const { data: similarityScores } = await supabase.rpc("buscar_produtos_similares_trgm", {
      texto_busca: descricao_cliente,
      limite_resultados: 15,
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

    const { results: analiseSemantica, error: erroDeepSeek } = await analisarComDeepSeek(
      descricao_cliente,
      candidatosPorToken.slice(0, LIMITE_CANDIDATOS_IA).map((c) => ({ produto: c.produto, scoreToken: c.score, scorePgTrgm: (c as any).scorePgTrgm })),
      contexto,
    );

    // Log de erro se DeepSeek falhou
    if (erroDeepSeek) {
      console.error(`⚠️ Erro na análise DeepSeek: ${erroDeepSeek}`);
    }

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

    // 7. NÍVEL 5: Combinar scores (v3.5 otimizado)
    console.log("🔄 Combinando scores...");
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

      // Combinar scores com pesos mais balanceados (v3.4)
      let scoreFinal: number;
      
      if (analiseSemantica.length > 0 && scoreSemantico > 0) {
        // Com IA semântica: dar mais peso à IA mas validar com outros scores
        scoreFinal = Math.round(
          scoreToken * 0.18 + // Token importa
          scoreSemantico * 0.45 + // IA é importante mas não dominante
          scoreContexto * 0.22 + // Contexto é muito importante
          scorePgTrgm * 0.15 // pg_trgm como validação adicional
        );

        // Se IA deu score muito baixo (<45), limitar score final
        if (scoreSemantico < 45) {
          scoreFinal = Math.min(scoreFinal, 52);
        }

        // Se IA deu score alto (80+) e outros scores também são bons, boost
        if (scoreSemantico >= 80 && scoreToken >= 50 && scorePgTrgm >= 40) {
          scoreFinal = Math.max(scoreFinal, 80);
        }
      } else {
        // Sem IA: balancear entre token, pg_trgm e contexto
        scoreFinal = Math.round(
          scoreToken * 0.42 + 
          scorePgTrgm * 0.33 + 
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
      if (scoreFinal >= 75) confianca = "alta";
      else if (scoreFinal >= 55) confianca = "media";
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
        ajusteML !== 0 ? `ML ajuste: ${ajusteML > 0 ? '+' : ''}${ajusteML}` : null,
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
        ajuste_ml: ajusteML, // Adicionar ajuste ML para visibilidade no frontend
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
        metodo: analiseSemantica.length > 0 ? "hibrido_deepseek_v4.0" : "token_only_v3.5",
        candidatos_pre_filtrados: candidatosPorToken.length,
        deepseek_error: erroDeepSeek || null,
        versao: "4.0-retry-circuit-breaker",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Erro em edi-sugerir-produtos:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno", versao: "3.5" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
