import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descricao_cliente, cnpj_cliente, plataforma_id, limite = 5 } = await req.json();
    
    if (!descricao_cliente) {
      return new Response(
        JSON.stringify({ error: 'descricao_cliente é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: 'DEEPSEEK_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todos os produtos em estoque
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, referencia_interna, nome, unidade_medida, preco_venda, quantidade_em_maos, ncm, narrativa')
      .gt('quantidade_em_maos', 0)
      .order('nome');

    if (produtosError) {
      console.error('Erro ao buscar produtos:', produtosError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar produtos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar se já existe vínculo para esta descrição
    const { data: vinculoExistente } = await supabase
      .from('edi_produtos_vinculo')
      .select('produto_id, score_confianca')
      .eq('descricao_cliente', descricao_cliente)
      .eq('cnpj_cliente', cnpj_cliente)
      .eq('plataforma_id', plataforma_id)
      .maybeSingle();

    if (vinculoExistente) {
      const produtoVinculado = produtos?.find(p => p.id === vinculoExistente.produto_id);
      return new Response(
        JSON.stringify({
          sugestoes: produtoVinculado ? [{
            produto_id: produtoVinculado.id,
            nome: produtoVinculado.nome,
            referencia: produtoVinculado.referencia_interna,
            preco: produtoVinculado.preco_venda,
            estoque: produtoVinculado.quantidade_em_maos,
            score: vinculoExistente.score_confianca || 100,
            motivo: 'Vínculo já cadastrado',
            ja_vinculado: true
          }] : [],
          total_produtos_analisados: produtos?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Preparar contexto dos produtos para a IA
    const contextoProdutos = produtos?.slice(0, 100).map(p => 
      `ID: ${p.id} | REF: ${p.referencia_interna} | NOME: ${p.nome} | UN: ${p.unidade_medida} | PREÇO: ${p.preco_venda} | ESTOQUE: ${p.quantidade_em_maos}${p.narrativa ? ` | DESC: ${p.narrativa}` : ''}`
    ).join('\n');

    // 4. Montar prompt para DeepSeek
    const systemPrompt = `Você é um especialista em matching de produtos farmacêuticos/hospitalares.

Sua missão: Analisar a descrição de um produto solicitado pelo cliente e encontrar os ${limite} melhores produtos correspondentes em nosso catálogo.

REGRAS CRÍTICAS:
1. Retorne APENAS JSON válido, sem texto adicional
2. Analise: nome do produto, princípio ativo, dosagem, forma farmacêutica, apresentação
3. Considere variações de nomenclatura (genérico vs. comercial)
4. Score de 0-100: 90-100 = match perfeito, 70-89 = muito similar, 50-69 = provável, <50 = incerto
5. Se não encontrar match razoável (score < 50), retorne array vazio

FORMATO DE RESPOSTA (JSON):
{
  "sugestoes": [
    {
      "produto_id": "uuid-do-produto",
      "score": 95,
      "motivo": "Match perfeito: mesmo princípio ativo, dosagem e apresentação"
    }
  ]
}`;

    const userPrompt = `PRODUTO SOLICITADO PELO CLIENTE:
"${descricao_cliente}"

NOSSO CATÁLOGO (${produtos?.length || 0} produtos disponíveis):
${contextoProdutos}

Encontre os ${limite} produtos mais similares e retorne em JSON.`;

    console.log('🤖 Consultando DeepSeek AI...');

    // 5. Chamar DeepSeek AI
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
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('Erro DeepSeek:', deepseekResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar DeepSeek AI', detalhes: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const respostaIA = deepseekData.choices[0].message.content;

    console.log('🤖 Resposta bruta da IA:', respostaIA);

    // 6. Parse da resposta
    let sugestoesIA;
    try {
      // Limpar possível markdown
      const jsonMatch = respostaIA.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : respostaIA;
      sugestoesIA = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta IA:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Formato de resposta inválido da IA', 
          resposta_bruta: respostaIA 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Enriquecer sugestões com dados completos dos produtos
    const sugestoesEnriquecidas = sugestoesIA.sugestoes
      .map((sug: any) => {
        const produto = produtos?.find(p => p.id === sug.produto_id);
        if (!produto) return null;
        
        return {
          produto_id: produto.id,
          nome: produto.nome,
          referencia: produto.referencia_interna,
          preco: produto.preco_venda,
          estoque: produto.quantidade_em_maos,
          unidade: produto.unidade_medida,
          score: sug.score,
          motivo: sug.motivo,
          ja_vinculado: false
        };
      })
      .filter((s: any) => s !== null)
      .sort((a: any, b: any) => b.score - a.score);

    // 8. Salvar sugestões no banco (para auditoria)
    if (sugestoesEnriquecidas.length > 0) {
      const melhorSugestao = sugestoesEnriquecidas[0];
      
      // Criar vínculo sugerido (não aprovado ainda)
      const { error: insertError } = await supabase
        .from('edi_produtos_vinculo')
        .insert({
          plataforma_id,
          produto_id: melhorSugestao.produto_id,
          cnpj_cliente,
          descricao_cliente,
          sugerido_por_ia: true,
          score_confianca: melhorSugestao.score,
          sugerido_em: new Date().toISOString(),
          prompt_ia: userPrompt,
          resposta_ia: { 
            modelo: 'deepseek-chat',
            todas_sugestoes: sugestoesEnriquecidas,
            timestamp: new Date().toISOString()
          },
          ativo: false, // Inativo até aprovação manual
        });

      if (insertError && insertError.code !== '23505') { // Ignora erro de duplicata
        console.error('Erro ao salvar vínculo sugerido:', insertError);
      }
    }

    // 9. Retornar resultado
    return new Response(
      JSON.stringify({
        sugestoes: sugestoesEnriquecidas,
        total_produtos_analisados: produtos?.length || 0,
        prompt_usado: userPrompt,
        resposta_ia_bruta: respostaIA
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
