import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Produto API - Início ===')
    
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Erro de autenticação:', authError)
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Usuário autenticado:', user.email)

    // Parse do body
    const body = await req.json()
    console.log('Dados recebidos:', JSON.stringify(body, null, 2))

    // Validação básica
    if (!body.referencia_interna) {
      return new Response(
        JSON.stringify({ error: 'Campo "referencia_interna" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.nome) {
      return new Response(
        JSON.stringify({ error: 'Campo "nome" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.unidade_medida) {
      return new Response(
        JSON.stringify({ error: 'Campo "unidade_medida" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.preco_venda === undefined || body.preco_venda === null) {
      return new Response(
        JSON.stringify({ error: 'Campo "preco_venda" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.ncm) {
      return new Response(
        JSON.stringify({ error: 'Campo "ncm" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Preparar dados do produto
    const produtoData = {
      referencia_interna: body.referencia_interna,
      nome: body.nome,
      unidade_medida: body.unidade_medida.toUpperCase(),
      preco_venda: body.preco_venda,
      ncm: body.ncm,
      custo: body.custo || 0,
      quantidade_em_maos: body.quantidade_em_maos || 0,
      icms_sp_percent: body.icms_sp_percent || 0,
      aliquota_ipi: body.aliquota_ipi || 0,
      dtr: body.dtr || 0,
      lote_multiplo: body.lote_multiplo || 1,
      grupo_estoque: body.grupo_estoque || 0,
      qtd_cr: body.qtd_cr || 0,
      cod_trib_icms: body.cod_trib_icms || 'Tributado',
      narrativa: body.narrativa || null,
      responsavel: body.responsavel || null,
      marcadores_produto: body.marcadores_produto || [],
      previsao_chegada: body.previsao_chegada || null,
      quantidade_prevista: body.quantidade_prevista || 0,
    }

    console.log('Dados preparados para inserção:', JSON.stringify(produtoData, null, 2))

    // Se tiver ID, atualiza. Senão, cria novo
    if (body.id) {
      // Atualizar produto existente
      const { data, error } = await supabaseClient
        .from('produtos')
        .update(produtoData)
        .eq('id', body.id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar produto:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Produto atualizado com sucesso:', data.id)
      return new Response(
        JSON.stringify({ success: true, data, message: 'Produto atualizado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Criar novo produto
      const { data, error } = await supabaseClient
        .from('produtos')
        .insert(produtoData)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar produto:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Produto criado com sucesso:', data.id)
      return new Response(
        JSON.stringify({ success: true, data, message: 'Produto criado com sucesso' }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Erro no endpoint:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
