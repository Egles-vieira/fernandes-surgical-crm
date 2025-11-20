/**
 * Utilitário compartilhado para geração de embeddings via OpenAI
 * Modelo: text-embedding-3-small (1536 dimensões)
 */

const OPENAI_EMBEDDING_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";

export interface EmbeddingResponse {
  embedding: number[];
  tokensUsados: number;
}

/**
 * Gera um embedding vetorial usando OpenAI text-embedding-3-small
 * @param texto - Texto a ser vetorizado
 * @param apiKey - OpenAI API Key
 * @returns Vetor de 1536 dimensões e número de tokens usados
 */
export async function gerarEmbedding(
  texto: string,
  apiKey: string
): Promise<EmbeddingResponse> {
  if (!texto || texto.trim().length === 0) {
    throw new Error("Texto vazio não pode ser vetorizado");
  }

  const response = await fetch(OPENAI_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texto,
      encoding_format: "float", // Retorna array de floats
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro OpenAI:", response.status, errorText);
    
    // Tratamento específico de erros comuns
    if (response.status === 429) {
      throw new Error("Rate limit da OpenAI atingido. Aguarde alguns segundos.");
    }
    if (response.status === 401) {
      throw new Error("OPENAI_API_KEY inválida ou expirada");
    }
    if (response.status === 400) {
      throw new Error(`Requisição inválida: ${errorText}`);
    }
    
    throw new Error(`Erro ao gerar embedding: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  return {
    embedding: data.data[0].embedding,
    tokensUsados: data.usage?.total_tokens || 0,
  };
}

/**
 * Monta o texto otimizado para vetorização de produtos
 * Combina: Código + Nome + Descrição + Tags
 */
export function montarTextoVetorizacao(produto: {
  referencia_interna: string;
  nome: string;
  narrativa: string | null;
  marcadores_produto: string[] | null;
}): string {
  const partes: string[] = [];
  
  // Código (sempre presente)
  partes.push(`Código: ${produto.referencia_interna}`);
  
  // Nome (sempre presente)
  partes.push(`Produto: ${produto.nome}`);
  
  // Descrição (se existir)
  if (produto.narrativa && produto.narrativa.trim().length > 0) {
    // Limitar a 500 caracteres para não estourar tokens
    const narrativaLimpa = produto.narrativa.substring(0, 500).trim();
    partes.push(`Detalhes: ${narrativaLimpa}`);
  }
  
  // Tags/Marcadores (se existirem)
  if (produto.marcadores_produto && produto.marcadores_produto.length > 0) {
    const tags = produto.marcadores_produto.join(", ");
    partes.push(`Tags: ${tags}`);
  }
  
  return partes.join(" | ");
}
