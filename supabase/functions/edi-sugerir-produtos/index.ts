import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProdutoEstoque {
  id: string;
  referencia_interna: string;
  nome: string;
  quantidade_em_maos: number;
  preco_venda: number;
  unidade_medida: string;
  ncm?: string;
  narrativa?: string;
}

interface SugestaoIA {
  produto_id: string;
  score: number;
  motivo: string;
  referencia_interna: string;
  nome_produto: string;
  preco: number;
  estoque: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      descricao_cliente, 
      codigo_produto_cliente, 
      cnpj_cliente,
      plataforma_id,
      limite_sugestoes = 5 
    } = await req.json();

    if (!descricao_cliente) {
      throw new Error('descricao_cliente é obrigatória');
    }

    console.log('🔍 Buscando produtos em estoque...');
    
    // Buscar produtos com estoque disponível
    const { data: produtosEstoque, error: produtosError } = await supabase
      .from('produtos')
      .select('id, referencia_interna, nome, quantidade_em_maos, preco_venda, unidade_medida, ncm, narrativa')
      .gt('quantidade_em_maos', 0)
      .order('quantidade_em_maos', { ascending: false })
      .limit(100); // Limitar para não enviar muitos dados para a IA

    if (produtosError) {
      throw new Error(`Erro ao buscar produtos: ${produtosError.message}`);
    }

    if (!produtosEstoque || produtosEstoque.length === 0) {
      return new Response(
        JSON.stringify({ 
          sugestoes: [], 
          mensagem: 'Nenhum produto em estoque encontrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 ${produtosEstoque.length} produtos em estoque encontrados`);

    // Preparar contexto para a IA
    const catalogoProdutos = produtosEstoque.map((p: ProdutoEstoque) => ({
      id: p.id,
      ref: p.referencia_interna,
      nome: p.nome,
      estoque: p.quantidade_em_maos,
      preco: p.preco_venda,
      unidade: p.unidade_medida,
      ncm: p.ncm || '',
      descricao: p.narrativa || ''
    }));

    const systemPrompt = `Você é um especialista em produtos médico-hospitalares e deve sugerir produtos do nosso estoque que correspondam à descrição fornecida pelo cliente.

**SEU OBJETIVO:**
Analisar a descrição do produto solicitado pelo cliente e encontrar os produtos mais adequados no nosso catálogo.

**REGRAS IMPORTANTES:**
1. Considere APENAS produtos com estoque disponível (estoque > 0)
2. Priorize produtos com maior quantidade em estoque
3. Considere sinônimos, nomes alternativos e descrições similares
4. Se houver NCM, use-o como critério forte de correspondência
5. Retorne no MÁXIMO ${limite_sugestoes} sugestões
6. Ordene por score de confiança (0-100)
7. SEMPRE retorne JSON válido no formato especificado

**CRITÉRIOS DE SCORE:**
- 90-100: Correspondência exata ou muito próxima
- 70-89: Correspondência boa, produto similar
- 50-69: Correspondência razoável, pode ser alternativa
- Abaixo de 50: Não retorne

**FORMATO DE RESPOSTA (JSON):**
{
  "sugestoes": [
    {
      "produto_id": "uuid",
      "score": 95,
      "motivo": "Correspondência exata de nome e NCM"
    }
  ]
}`;

    const userPrompt = `**PRODUTO SOLICITADO PELO CLIENTE:**
Descrição: ${descricao_cliente}
${codigo_produto_cliente ? `Código do Cliente: ${codigo_produto_cliente}` : ''}
${cnpj_cliente ? `CNPJ Cliente: ${cnpj_cliente}` : ''}

**CATÁLOGO DISPONÍVEL (${catalogoProdutos.length} produtos):**
${JSON.stringify(catalogoProdutos, null, 2)}

Analise e retorne as ${limite_sugestoes} melhores sugestões em JSON.`;

    console.log('🤖 Consultando DeepSeek AI...');

    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Baixa temperatura para respostas mais determinísticas
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('❌ Erro DeepSeek:', deepseekResponse.status, errorText);
      throw new Error(`Erro na API DeepSeek: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const respostaIA = deepseekData.choices[0].message.content;

    console.log('✅ Resposta da IA recebida');

    let sugestoesIA;
    try {
      sugestoesIA = JSON.parse(respostaIA);
    } catch (e) {
      console.error('❌ Erro ao parsear JSON da IA:', respostaIA);
      throw new Error('Resposta da IA não está em formato JSON válido');
    }

    // Enriquecer sugestões com dados completos dos produtos
    const sugestoesEnriquecidas: SugestaoIA[] = [];
    
    for (const sugestao of sugestoesIA.sugestoes || []) {
      const produto = produtosEstoque.find((p: ProdutoEstoque) => p.id === sugestao.produto_id);
      
      if (produto) {
        sugestoesEnriquecidas.push({
          produto_id: produto.id,
          score: sugestao.score,
          motivo: sugestao.motivo,
          referencia_interna: produto.referencia_interna,
          nome_produto: produto.nome,
          preco: produto.preco_venda,
          estoque: produto.quantidade_em_maos
        });
      }
    }

    // Ordenar por score
    sugestoesEnriquecidas.sort((a, b) => b.score - a.score);

    // Registrar log de integração
    await supabase.from('edi_logs_integracao').insert({
      plataforma_id: plataforma_id || null,
      operacao: 'sugestao_ia_produtos',
      tipo: 'response',
      parametros: { 
        descricao_cliente, 
        codigo_produto_cliente,
        limite_sugestoes 
      },
      payload_enviado: userPrompt,
      payload_recebido: respostaIA,
      sucesso: true,
      tempo_execucao_ms: 0, // Calcular se necessário
      dados_debug: {
        total_produtos_analisados: catalogoProdutos.length,
        total_sugestoes: sugestoesEnriquecidas.length
      }
    });

    console.log(`✨ ${sugestoesEnriquecidas.length} sugestões retornadas`);

    return new Response(
      JSON.stringify({
        sugestoes: sugestoesEnriquecidas,
        total_analisados: catalogoProdutos.length,
        prompt_usado: systemPrompt,
        resposta_bruta_ia: respostaIA
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        detalhes: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
