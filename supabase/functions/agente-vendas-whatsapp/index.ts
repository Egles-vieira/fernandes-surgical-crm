import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface alinhada com a tabela 'produtos'
interface ProdutoRelevante {
  id: string;
  referencia_interna: string;
  nome: string;
  narrativa: string | null;
  preco_venda: number;
  quantidade_em_maos: number;
}

Deno.serve(async (req) => {
  // Tratamento de CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mensagemTexto, conversaId } = await req.json();

    console.log("🤖 Agente de Vendas - Nova mensagem:", { mensagemTexto, conversaId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!deepseekApiKey) throw new Error("DEEPSEEK_API_KEY não configurada");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========================================================================
    // 1️⃣ CÉREBRO LÓGICO (Analista)
    // Objetivo: Apenas extrair dados frios. Temperatura baixa.
    // ========================================================================
    console.log("🧠 Analisando intenção...");
    const analiseResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `Você é um extrator de dados para um CRM de vendas.

TAREFA: Identifique se o usuário busca produtos.
SAÍDA: JSON estrito.

Exemplos:
- "Bom dia" -> {"tem_interesse": false}
- "Qual o preço do rolamento?" -> {"tem_interesse": true, "palavras_chave": ["rolamento"]}
- "Tem parafuso sextavado?" -> {"tem_interesse": true, "palavras_chave": ["parafuso", "sextavado"]}`,
          },
          { role: "user", content: mensagemTexto },
        ],
        temperature: 0.1, // Temperatura baixa para precisão no JSON
        max_tokens: 150,
        response_format: { type: "json_object" }, // Força JSON se a API suportar
      }),
    });

    if (!analiseResponse.ok) throw new Error("Erro na API DeepSeek (Análise)");

    const analiseData = await analiseResponse.json();
    let analise;
    try {
      // Tenta parsear o JSON retornado
      analise = JSON.parse(analiseData.choices[0].message.content);
    } catch (e) {
      // Fallback caso o modelo não retorne JSON limpo
      console.error("Erro parse JSON:", e);
      analise = { tem_interesse: false };
    }

    console.log("📊 Intenção detectada:", analise);

    // ========================================================================
    // 2️⃣ BUSCA NO BANCO (Supabase)
    // ========================================================================
    let produtos: ProdutoRelevante[] = [];
    let encontrouAlgo = false;

    if (analise.tem_interesse && analise.palavras_chave?.length > 0) {
      console.log("🔍 Buscando no banco:", analise.palavras_chave);

      // Busca por produtos usando os campos REAIS da tabela
      const termosBusca = analise.palavras_chave
        .map((p: string) => `nome.ilike.%${p}%,referencia_interna.ilike.%${p}%`)
        .join(",");

      const { data, error } = await supabase
        .from("produtos")
        .select("id, referencia_interna, nome, narrativa, preco_venda, quantidade_em_maos")
        .or(termosBusca)
        .gt("quantidade_em_maos", 0) // Apenas com estoque
        .limit(5);

      if (error) {
        console.error("Erro Supabase:", error);
      } else if (data) {
        produtos = data;
        encontrouAlgo = produtos.length > 0;
      }
    }

    // ========================================================================
    // 3️⃣ PERSONALIDADE (O Vendedor "Beto")
    // Objetivo: Gerar a resposta final humanizada. Temperatura alta.
    // ========================================================================

    // Prepara o contexto dos produtos para o "Beto" ler
    const contextoProdutos = encontrouAlgo
      ? produtos
          .map(
            (p) =>
              `ITEM: ${p.nome} | CÓD: ${p.referencia_interna} | PREÇO: R$ ${p.preco_venda.toFixed(2)} | ESTOQUE: ${p.quantidade_em_maos}`,
          )
          .join("\n")
      : "Nenhum produto exato encontrado no sistema.";

    console.log("🗣️ Gerando resposta humanizada...");

    const respostaResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `
IDENTIDADE:
Você é o "Beto", vendedor na Cirurgica Fernandes.
Você é brasileiro, simpático, usa linguagem coloquial (mas profissional) você não envia emojis.
Você fala como alguém no WhatsApp, respostas curtas e diretas.

DIRETRIZES DE RESPOSTA:
1. NUNCA comece com "Olá, sou o assistente". como exemplo você pode usar: "Opa!", "Fala aí!", "Tudo bom?".
2. Se encontrou produtos:
   - Mostre as opções de forma resumida.
   - Destaque o preço.
   - Pergunte se quer fechar o pedido ou ver mais detalhes.
   - Exemplo: "Achei esse aqui ó: [Nome] por R$ [Preço]. O que acha?"
3. Se NÃO encontrou produtos (mas o cliente queria):
   - Peça desculpas de jeito leve ("Putz, esse eu vou ficar devendo").
   - Pergunte se tem algum detalhe a mais (medida, marca) para tentar achar.
4. Se for só "oi/bom dia":
   - Seja breve: "Opa, beleza? Tô por aqui se precisar de alguma coisa."

CONTEXTO DO SISTEMA (O que você achou no estoque):
${contextoProdutos}

MENSAGEM DO CLIENTE:
"${mensagemTexto}"
`,
          },
        ],
        temperature: 0.8, // Mais criativo para parecer humano
        max_tokens: 250,
      }),
    });

    if (!respostaResponse.ok) throw new Error("Erro ao gerar resposta humanizada");

    const respostaData = await respostaResponse.json();
    const respostaFinal = respostaData.choices[0].message.content;

    // Retorno final para o cliente
    return new Response(
      JSON.stringify({
        resposta: respostaFinal,
        dados_tecnicos: {
          // Útil para debug no frontend, se precisar
          encontrou: encontrouAlgo,
          produtos: produtos,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({
        resposta: "Eita, deu uma travada aqui no meu sistema. Pode mandar de novo?", // Mensagem de erro humanizada
        error: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
