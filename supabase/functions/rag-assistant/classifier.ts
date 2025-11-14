import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface IntencaoClassificada {
  tipo: 'clientes' | 'vendas' | 'tickets' | 'equipes' | 'produtos' | 'geral' | 'navegacao';
  subtipo?: string;
  entidades: {
    nomes?: string[];
    ids?: string[];
    datas?: { inicio?: string; fim?: string };
    status?: string[];
    numeros?: number[];
  };
  filtros: Record<string, any>;
  precisaBuscarDados: boolean;
  confianca: number;
}

export async function classificarIntencao(
  pergunta: string,
  contextoUrl: any,
  deepseekApiKey: string
): Promise<IntencaoClassificada> {
  console.log("🔍 Classificando intenção da pergunta:", pergunta);
  console.log("📍 Contexto URL:", contextoUrl);

  const promptClassificacao = `Analise a pergunta do usuário e classifique sua intenção.

CONTEXTO DA TELA ATUAL:
- Tipo: ${contextoUrl.tipo || 'geral'}
- ID: ${contextoUrl.id || 'nenhum'}
- Rota: ${contextoUrl.rota || '/'}

PERGUNTA: "${pergunta}"

Classifique em:
1. **tipo**: clientes | vendas | tickets | equipes | produtos | geral | navegacao
2. **subtipo**: mais específico (ex: "listar", "buscar", "metricas", "analise", "comparar")
3. **entidades**: extraia nomes, IDs, datas, status mencionados
4. **filtros**: condições específicas (período, status, valores)
5. **precisaBuscarDados**: true se precisa consultar banco, false se é pergunta geral
6. **confianca**: 0.0 a 1.0

EXEMPLOS:
- "Me mostre os clientes inativos" → tipo: clientes, subtipo: listar, filtros: {ativo: false}, precisaBuscarDados: true
- "Quantas vendas fechamos este mês?" → tipo: vendas, subtipo: metricas, filtros: {periodo: mes_atual}, precisaBuscarDados: true
- "Como criar um ticket?" → tipo: tickets, subtipo: navegacao, precisaBuscarDados: false
- "Qual o ticket médio?" → tipo: vendas, subtipo: metricas, precisaBuscarDados: true

IMPORTANTE: Se o usuário está em uma tela específica (ex: detalhes de cliente), considere isso no contexto.

Responda APENAS com JSON válido:
{
  "tipo": "...",
  "subtipo": "...",
  "entidades": {...},
  "filtros": {...},
  "precisaBuscarDados": true/false,
  "confianca": 0.9
}`;

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
          { role: "system", content: "Você é um classificador de intenções preciso. Responda APENAS com JSON válido." },
          { role: "user", content: promptClassificacao }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na classificação: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    // Extrair JSON do conteúdo (pode vir com markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Resposta não contém JSON válido");
    }

    const classificacao = JSON.parse(jsonMatch[0]);
    
    console.log("✅ Classificação:", classificacao);
    
    return classificacao;
  } catch (error) {
    console.error("❌ Erro na classificação:", error);
    
    // Fallback: classificação básica por palavras-chave
    return classificarPorPalavrasChave(pergunta, contextoUrl);
  }
}

function classificarPorPalavrasChave(pergunta: string, contextoUrl: any): IntencaoClassificada {
  const perguntaLower = pergunta.toLowerCase();
  
  // Clientes
  if (perguntaLower.match(/cliente|cnpj|empresa|contato/)) {
    return {
      tipo: 'clientes',
      subtipo: perguntaLower.match(/listar|mostrar|todos/) ? 'listar' : 'buscar',
      entidades: {},
      filtros: {},
      precisaBuscarDados: true,
      confianca: 0.6
    };
  }
  
  // Vendas
  if (perguntaLower.match(/venda|pedido|faturamento|receita|valor/)) {
    return {
      tipo: 'vendas',
      subtipo: perguntaLower.match(/quanto|total|valor/) ? 'metricas' : 'listar',
      entidades: {},
      filtros: {},
      precisaBuscarDados: true,
      confianca: 0.6
    };
  }
  
  // Tickets
  if (perguntaLower.match(/ticket|atendimento|suporte|chamado/)) {
    return {
      tipo: 'tickets',
      subtipo: 'listar',
      entidades: {},
      filtros: {},
      precisaBuscarDados: true,
      confianca: 0.6
    };
  }
  
  // Equipes
  if (perguntaLower.match(/equipe|vendedor|meta|performance/)) {
    return {
      tipo: 'equipes',
      subtipo: 'metricas',
      entidades: {},
      filtros: {},
      precisaBuscarDados: true,
      confianca: 0.6
    };
  }
  
  // Se está em uma tela específica, use o contexto
  if (contextoUrl.tipo) {
    return {
      tipo: contextoUrl.tipo as any,
      subtipo: 'contexto',
      entidades: { ids: contextoUrl.id ? [contextoUrl.id] : [] },
      filtros: {},
      precisaBuscarDados: true,
      confianca: 0.7
    };
  }
  
  // Geral
  return {
    tipo: 'geral',
    subtipo: 'informacao',
    entidades: {},
    filtros: {},
    precisaBuscarDados: false,
    confianca: 0.5
  };
}
