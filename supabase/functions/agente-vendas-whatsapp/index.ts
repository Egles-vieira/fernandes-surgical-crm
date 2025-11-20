import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProdutoRelevante {
  id: string;
  referencia_interna: string;
  nome: string;
  preco_venda: number;
  quantidade_em_maos: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mensagemTexto, conversaId, contatoId } = await req.json();
    
    console.log('🤖 Agente de Vendas - Nova mensagem:', { mensagemTexto, conversaId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1️⃣ Analisar intenção do cliente com DeepSeek
    console.log('🧠 Analisando intenção...');
    const analiseResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que analisa mensagens de clientes para identificar produtos que eles buscam.

TAREFA: Extraia palavras-chave de busca da mensagem do cliente.

Regras:
- Retorne APENAS JSON válido
- Se o cliente quer comprar/buscar produto: {"tem_interesse": true, "palavras_chave": ["palavra1", "palavra2"]}
- Se é apenas conversa social/saudação: {"tem_interesse": false}
- Seja específico nas palavras-chave (ex: "parafuso m6" → ["parafuso", "m6"])

Exemplos:
"Oi, tudo bem?" → {"tem_interesse": false}
"Preciso de parafusos" → {"tem_interesse": true, "palavras_chave": ["parafuso"]}
"Quero comprar rolamento 6205" → {"tem_interesse": true, "palavras_chave": ["rolamento", "6205"]}
"Tem bomba hidraulica?" → {"tem_interesse": true, "palavras_chave": ["bomba", "hidraulica"]}`
          },
          {
            role: 'user',
            content: mensagemTexto
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!analiseResponse.ok) {
      throw new Error('Erro ao analisar mensagem');
    }

    const analiseData = await analiseResponse.json();
    const analiseContent = analiseData.choices[0].message.content;
    
    // Extrair JSON da resposta
    const jsonMatch = analiseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta inválida da análise');
    }
    
    const analise = JSON.parse(jsonMatch[0]);
    console.log('📊 Análise:', analise);

    // Se não há interesse em produtos, responder de forma educada e natural
    if (!analise.tem_interesse) {
      console.log('💬 Resposta social');
      const respostaSocialResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'Você é um vendedor amigável e natural. Responda de forma MUITO BREVE (máximo 15 palavras) de forma casual e simpática. Não mencione que é um assistente.'
            },
            {
              role: 'user',
              content: mensagemTexto
            }
          ],
          temperature: 0.8,
          max_tokens: 50,
        }),
      });

      const respostaSocialData = await respostaSocialResponse.json();
      const respostaSocial = respostaSocialData.choices[0].message.content;

      return new Response(
        JSON.stringify({ 
          resposta: respostaSocial,
          tem_produtos: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2️⃣ Buscar produtos relevantes
    console.log('🔍 Buscando produtos para:', analise.palavras_chave);
    
    let produtos: ProdutoRelevante[] = [];
    
    // Buscar produtos que contenham qualquer uma das palavras-chave
    for (const palavra of analise.palavras_chave) {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, referencia_interna, nome, preco_venda, quantidade_em_maos')
        .or(`nome.ilike.%${palavra}%,referencia_interna.ilike.%${palavra}%`)
        .gt('quantidade_em_maos', 0)
        .limit(3);

      if (data && data.length > 0) {
        produtos = [...produtos, ...data];
      }
    }

    // Remover duplicatas
    produtos = Array.from(new Map(produtos.map(p => [p.id, p])).values()).slice(0, 3);

    console.log(`📦 Encontrados ${produtos.length} produtos`);

    // 3️⃣ Gerar resposta natural com DeepSeek
    const contexto = produtos.length > 0
      ? `PRODUTOS ENCONTRADOS:\n${produtos.map((p, i) => 
          `${i + 1}. ${p.nome} (Cód: ${p.referencia_interna}) - R$ ${p.preco_venda.toFixed(2)} - Estoque: ${p.quantidade_em_maos}`
        ).join('\n')}`
      : 'Nenhum produto encontrado';

    console.log('💬 Gerando resposta natural...');
    const respostaResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Você é um vendedor natural e amigável no WhatsApp.

REGRAS CRÍTICAS:
- Responda de forma MUITO NATURAL, como se fosse um amigo ajudando
- MÁXIMO 40 palavras (seja BREVE!)
- NÃO use formalidades excessivas
- NÃO mencione que é um assistente ou IA
- Use emojis ocasionalmente (máximo 2)
- Fale como uma pessoa real falaria no WhatsApp
- Se tiver produtos: mencione apenas os mais relevantes (máximo 2)
- Se não encontrou: seja empático e peça mais detalhes

PRODUTOS DISPONÍVEIS:
${contexto}

Mensagem do cliente: "${mensagemTexto}"

Responda de forma natural e breve!`
          }
        ],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!respostaResponse.ok) {
      throw new Error('Erro ao gerar resposta');
    }

    const respostaData = await respostaResponse.json();
    const resposta = respostaData.choices[0].message.content;

    console.log('✅ Resposta gerada:', resposta);

    return new Response(
      JSON.stringify({
        resposta,
        tem_produtos: produtos.length > 0,
        produtos: produtos.map(p => ({
          id: p.id,
          codigo: p.referencia_interna,
          descricao: p.nome,
          preco: p.preco_venda,
          estoque: p.quantidade_em_maos
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Erro no agente de vendas:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        resposta: 'Desculpe, tive um problema aqui. Pode repetir?'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
