import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Sem autorização')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    // 1. Criar a venda
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .insert({
        user_id: user.id,
        status: 'rascunho',
        etapa_pipeline: 'qualificacao',
        observacoes: '🧪 VENDA DE TESTE - 120 itens aleatórios para teste de cálculo',
        valor_total: 0,
        valor_final: 0
      })
      .select()
      .single()

    if (vendaError) throw vendaError

    // 2. Buscar 120 produtos aleatórios
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, it_codigo, descricao, preco_venda')
      .limit(120)

    if (produtosError) throw produtosError
    if (!produtos || produtos.length === 0) throw new Error('Nenhum produto encontrado')

    // 3. Criar os itens
    const itens = produtos.map((produto, index) => {
      const quantidade = Math.floor(Math.random() * 50) + 1 // 1-50
      const percentual_desconto = Math.floor(Math.random() * 16) // 0-15%
      const preco_unitario = produto.preco_venda || 100
      const valor_desconto = (preco_unitario * quantidade * percentual_desconto) / 100
      const valor_total = (preco_unitario * quantidade) - valor_desconto

      return {
        venda_id: venda.id,
        produto_id: produto.id,
        codigo_produto: produto.it_codigo,
        descricao: produto.descricao,
        quantidade,
        preco_unitario,
        percentual_desconto,
        valor_desconto,
        valor_total,
        sequencia: index + 1
      }
    })

    const { error: itensError } = await supabase
      .from('itens_venda')
      .insert(itens)

    if (itensError) throw itensError

    // 4. Calcular e atualizar totais
    const totalGeral = itens.reduce((acc, item) => acc + item.valor_total, 0)

    const { error: updateError } = await supabase
      .from('vendas')
      .update({
        valor_total: totalGeral,
        valor_final: totalGeral
      })
      .eq('id', venda.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        venda_id: venda.id,
        total_itens: itens.length,
        valor_total: totalGeral
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro ao criar venda de teste:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})