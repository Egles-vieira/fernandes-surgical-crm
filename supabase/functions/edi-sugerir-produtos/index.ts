import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface para resultado de análise semântica
interface SemanticResult {
  index: number;
  score: number;
  motivo: string;
  categoria_match: boolean;
  aplicacao_match: boolean;
}

// Função para análise semântica com DeepSeek
async function semanticMatchingWithDeepSeek(
  descricaoCliente: string,
  candidatos: Array<{ produto: any; score: number; motivo: string }>,
  contexto: { marca?: string; quantidade?: number; unidade_medida?: string },
  apiKey: string,
  limite: number = 5
): Promise<SemanticResult[]> {
  try {
    console.log("🤖 Iniciando análise semântica com DeepSeek...");
    
    // Formatar produtos para análise
    const produtosFormatados = candidatos.map((c, idx) => ({
      index: idx,
      nome: c.produto.nome,
      referencia: c.produto.referencia_interna,
      narrativa: c.produto.narrativa || 'Sem descrição detalhada',
      unidade: c.produto.unidade_medida,
      estoque: c.produto.quantidade_em_maos,
      score_token: c.score
    }));

    // Construir prompt estruturado
    const prompt = `Você é um especialista em análise de produtos médicos e hospitalares. Analise a compatibilidade entre a solicitação do cliente e os produtos candidatos.

**SOLICITAÇÃO DO CLIENTE:**
Descrição: "${descricaoCliente}"
${contexto.marca ? `Marca solicitada: ${contexto.marca}` : ''}
${contexto.quantidade ? `Quantidade: ${contexto.quantidade} ${contexto.unidade_medida || ''}` : ''}

**PRODUTOS CANDIDATOS:**
${produtosFormatados.map(p => 
  `[${p.index}] ${p.nome} (Ref: ${p.referencia})
   Descrição: ${p.narrativa}
   Unidade: ${p.unidade} | Estoque: ${p.estoque}
   Score por tokens: ${p.score_token}`
).join('\n\n')}

**INSTRUÇÕES:**
Analise cada produto considerando:
1. Compatibilidade de categoria (mesmo tipo de produto)
2. Compatibilidade de aplicação (mesma finalidade)
3. Equivalência de especificações técnicas
4. Correspondência de marca (se aplicável)
5. Adequação da unidade de medida

Retorne um JSON array com este formato EXATO:
[
  {
    "index": 0,
    "score": 85,
    "motivo": "Explicação breve da compatibilidade",
    "categoria_match": true,
    "aplicacao_match": true
  }
]

Retorne APENAS o JSON array, sem texto adicional. Score de 0-100 onde:
- 90-100: Match perfeito ou equivalente
- 70-89: Compatível com pequenas diferenças
- 50-69: Parcialmente compatível
- 0-49: Incompatível ou muito diferente

Ordene por score decrescente e retorne no máximo ${limite} produtos.`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Você é um especialista em análise e matching de produtos. Retorne sempre respostas em JSON válido." },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro DeepSeek API:", response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("❌ Resposta DeepSeek sem JSON válido:", content);
      return [];
    }
    
    const results = JSON.parse(jsonMatch[0]) as SemanticResult[];
    console.log(`✅ DeepSeek analisou ${results.length} produtos`);
    
    return results.slice(0, limite);
    
  } catch (error) {
    console.error("❌ Erro na análise semântica DeepSeek:", error);
    return [];
  }
}

// Função para combinar scores de token e semântico
function combinarScores(
  candidatosToken: Array<{ produto: any; score: number; motivo: string }>,
  analiseSemantica: SemanticResult[],
  limite: number
): Array<{ produto_id: string; score: number; motivo: string; metodo: string }> {
  
  const resultadosCombinados = candidatosToken.map((candidato, idx) => {
    // Buscar análise semântica correspondente
    const analise = analiseSemantica.find(a => a.index === idx);
    
    if (!analise) {
      // Se não tem análise semântica, usar apenas score de tokens
      return {
        produto_id: candidato.produto.id,
        score: candidato.score,
        motivo: `Token: ${candidato.motivo}`,
        metodo: 'token_only'
      };
    }
    
    // Combinar scores: 40% tokens + 60% semântico
    const scoreFinal = Math.round((candidato.score * 0.4) + (analise.score * 0.6));
    
    // Combinar motivos
    const motivoCombinado = `Token: ${candidato.motivo} | IA: ${analise.motivo} (${analise.score}/100)`;
    
    return {
      produto_id: candidato.produto.id,
      score: scoreFinal,
      motivo: motivoCombinado,
      metodo: 'hibrido_deepseek',
      categoria_match: analise.categoria_match,
      aplicacao_match: analise.aplicacao_match
    };
  });
  
  // Filtrar scores muito baixos e ordenar
  return resultadosCombinados
    .filter(r => r.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);
}

// Similaridade baseada em tokens
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
  // Stopwords reduzida - manter termos técnicos importantes
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
  
  // Requer ao menos 2 palavras significativas OU números
  if (queryTokens.length < 2 && queryNumbers.length === 0) {
    return [];
  }
  
  return produtos.map(p => {
    const productText = `${p.nome} ${p.referencia_interna} ${p.narrativa || ''}`;
    const productTokens = tokenize(productText);
    const productNumbers = extractNumbers(productText);
    const productNormalized = normalize(productText);
    
    // 1. CORRESPONDÊNCIA EXATA DE PALAVRAS (peso maior)
    let exactMatches = 0;
    let partialMatches = 0;
    
    for (const qt of queryTokens) {
      // Match exato
      if (productTokens.includes(qt)) {
        exactMatches++;
      } 
      // Match parcial (palavra contém ou é contida) - apenas palavras longas
      else if (qt.length >= 4) {
        for (const pt of productTokens) {
          if (pt.length >= 4 && (pt.includes(qt) || qt.includes(pt))) {
            partialMatches++;
            break;
          }
        }
      }
    }
    
    // Calcular percentual de palavras correspondidas
    const matchRatio = (exactMatches + partialMatches * 0.5) / queryTokens.length;
    
    // Penalização severa se poucas palavras correspondem
    if (matchRatio < 0.4) {
      return { produto_id: p.id, score: 0, motivo: 'Poucas palavras correspondem', metodo: 'token_enhanced' };
    }
    
    // 2. CORRESPONDÊNCIA DE NÚMEROS (crítico para produtos técnicos)
    const numberMatchCount = queryNumbers.filter(qn => productNumbers.includes(qn)).length;
    const numberMatchRatio = queryNumbers.length > 0 ? numberMatchCount / queryNumbers.length : 1;
    
    // Se query tem números mas produto não tem NENHUM match, penalizar muito
    if (queryNumbers.length > 0 && numberMatchCount === 0) {
      return { produto_id: p.id, score: 0, motivo: 'Números não correspondem', metodo: 'token_enhanced' };
    }
    
    // 3. REFERÊNCIA EXATA
    const hasExactRef = p.referencia_interna && 
      (queryNormalized.includes(normalize(p.referencia_interna)) || 
       normalize(p.referencia_interna).includes(queryNormalized));
    
    // 4. SUBSTRING MATCH
    const hasSubstring = productNormalized.includes(queryNormalized) || 
                        queryNormalized.includes(productNormalized);
    
    // 5. SEQUÊNCIAS DE PALAVRAS (bigrams)
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
      if (productBigrams.some(pbg => pbg === bg)) {
        bigramMatches += 2; // Match exato de bigram
      } else if (productBigrams.some(pbg => pbg.includes(bg) || bg.includes(pbg))) {
        bigramMatches += 1; // Match parcial
      }
    }
    const bigramRatio = queryBigrams.length > 0 ? bigramMatches / (queryBigrams.length * 2) : 0;
    
    // CÁLCULO FINAL DE SCORE
    let score = 0;
    
    // Palavras exatas valem muito (30 pontos cada)
    score += exactMatches * 30;
    
    // Palavras parciais valem menos (15 pontos cada)
    score += partialMatches * 15;
    
    // Números valem MUITO (40 pontos cada)
    score += numberMatchCount * 40;
    
    // Bônus por referência exata
    if (hasExactRef) score += 60;
    
    // Bônus por substring
    if (hasSubstring) score += 25;
    
    // Bônus por bigrams
    score += bigramRatio * 30;
    
    // Bônus por alta taxa de correspondência
    if (matchRatio >= 0.8) score += 20;
    else if (matchRatio >= 0.6) score += 10;
    
    // Bônus por todos os números corresponderem
    if (queryNumbers.length > 0 && numberMatchRatio === 1) {
      score += 30;
    }
    
    const finalScore = Math.min(100, Math.round(score));
    
    return { 
      produto_id: p.id, 
      score: finalScore, 
      motivo: `${exactMatches} exatas, ${partialMatches} parciais, ${numberMatchCount} números (${Math.round(matchRatio * 100)}% match)`,
      metodo: 'token_enhanced'
    };
  })
  .filter(s => s.score >= 30) // Threshold aumentado para 30 (somente matches bons)
  .sort((a, b) => b.score - a.score)
  .slice(0, limite);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descricao_cliente, cnpj_cliente, plataforma_id, limite = 5, item_id } = await req.json();

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
            metodo: 'vinculo_existente',
            item_id
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. BUSCA HÍBRIDA EM 3 NÍVEIS COM DEEPSEEK
    
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    
    console.log("🔍 Iniciando busca híbrida para:", descricao_cliente);
    
    // NÍVEL 1: Filtragem rápida por tokens (top 10 candidatos)
    const candidatosPorToken = tokenBasedSimilarity(descricao_cliente, produtos, 10);
    console.log(`📊 Nível 1 - Token matching: ${candidatosPorToken.length} candidatos encontrados`);
    
    let sugestoesFinais: any[] = [];
    let metodoUtilizado = 'token_only';
    let analiseSemanticaAplicada = false;
    
    // NÍVEL 2 e 3: Análise semântica com DeepSeek (se houver candidatos razoáveis e API key disponível)
    if (candidatosPorToken.length > 0 && candidatosPorToken[0].score >= 30 && deepseekApiKey) {
      try {
        console.log("🤖 Nível 2 - Iniciando análise semântica com DeepSeek...");
        
        // Preparar candidatos no formato correto (top 5 para análise rápida)
        const candidatosParaAnalise = candidatosPorToken.slice(0, 5).map(c => {
          const produto = produtos.find(p => p.id === c.produto_id);
          return {
            produto: produto!,
            score: c.score,
            motivo: c.motivo
          };
        });
        
        // Extrair contexto adicional da requisição
        const { data: itemCotacao } = item_id ? await supabase
          .from("edi_cotacoes_itens")
          .select("marca_produto_cliente, quantidade_solicitada, unidade_medida")
          .eq("id", item_id)
          .maybeSingle() : { data: null };
        
        const contexto = {
          marca: itemCotacao?.marca_produto_cliente,
          quantidade: itemCotacao?.quantidade_solicitada,
          unidade_medida: itemCotacao?.unidade_medida
        };
        
        // Análise semântica
        const analiseSemantica = await semanticMatchingWithDeepSeek(
          descricao_cliente,
          candidatosParaAnalise,
          contexto,
          deepseekApiKey,
          limite
        );
        
        if (analiseSemantica.length > 0) {
          console.log("✅ Nível 3 - Combinando scores (40% token + 60% semântico)");
          
          // Combinar scores
          sugestoesFinais = combinarScores(candidatosParaAnalise, analiseSemantica, limite);
          metodoUtilizado = 'hibrido_deepseek';
          analiseSemanticaAplicada = true;
          
          console.log(`✨ Score final do melhor match: ${sugestoesFinais[0]?.score || 0}`);
        } else {
          console.log("⚠️ Análise semântica não retornou resultados, usando apenas tokens");
          sugestoesFinais = candidatosPorToken.slice(0, limite).map(c => ({
            produto_id: c.produto_id,
            score: c.score,
            motivo: c.motivo,
            metodo: 'token_fallback'
          }));
          metodoUtilizado = 'token_fallback';
        }
        
      } catch (error) {
        console.error("❌ Erro na análise DeepSeek, usando fallback de tokens:", error);
        sugestoesFinais = candidatosPorToken.slice(0, limite).map(c => ({
          produto_id: c.produto_id,
          score: c.score,
          motivo: c.motivo,
          metodo: 'token_fallback'
        }));
        metodoUtilizado = 'token_fallback';
      }
    } else {
      // Sem candidatos bons ou sem API key, usar apenas tokens
      const motivo = !deepseekApiKey ? "API key não configurada" : "Nenhum candidato com score >= 25";
      console.log(`⚠️ Análise semântica pulada: ${motivo}`);
      
      sugestoesFinais = candidatosPorToken.slice(0, limite).map(c => ({
        produto_id: c.produto_id,
        score: c.score,
        motivo: c.motivo,
        metodo: 'token_only'
      }));
      metodoUtilizado = 'token_only';
    }
    
    // 4. Enriquecer sugestões com dados completos
    const sugestoesEnriquecidas = sugestoesFinais.map(sug => {
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
        metodo: sug.metodo || metodoUtilizado
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
        metodo: metodoUtilizado,
        candidatos_pre_filtrados: candidatosPorToken.length,
        analise_semantica_aplicada: analiseSemanticaAplicada,
        item_id
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
