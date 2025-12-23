import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar token (filtrando por oportunidade_id não nulo)
    const { data: tokenData, error: tokenError } = await supabase
      .from('propostas_publicas_tokens')
      .select('*')
      .eq('public_token', token)
      .eq('ativo', true)
      .not('oportunidade_id', 'is', null)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token de oportunidade não encontrado:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Proposta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar expiração
    if (tokenData.expira_em && new Date(tokenData.expira_em) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Esta proposta expirou' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar oportunidade
    const { data: oportunidade, error: opError } = await supabase
      .from('oportunidades')
      .select(`
        *,
        pipeline:pipeline_id(nome),
        estagio:estagio_id(nome_estagio, cor)
      `)
      .eq('id', tokenData.oportunidade_id)
      .single();

    if (opError) {
      console.error('Erro ao buscar oportunidade:', opError);
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar proposta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar itens da oportunidade
    const { data: itens, error: itensError } = await supabase
      .from('itens_linha_oportunidade')
      .select(`
        *,
        produto:produto_id(nome, referencia_interna, unidade_medida)
      `)
      .eq('oportunidade_id', tokenData.oportunidade_id)
      .order('ordem_linha', { ascending: true });

    if (itensError) {
      console.error('Erro ao buscar itens:', itensError);
    }

    // Buscar cliente (pode vir de cliente_id ou cliente_nome/cliente_cnpj)
    let cliente = null;
    if (oportunidade.cliente_id) {
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('nome_abrev, nome_emit, cgc')
        .eq('id', oportunidade.cliente_id)
        .single();
      cliente = clienteData;
    } else if (oportunidade.cliente_nome) {
      cliente = {
        nome_abrev: oportunidade.cliente_nome,
        nome_emit: oportunidade.cliente_nome,
        cgc: oportunidade.cliente_cnpj
      };
    }

    // Buscar vendedor/proprietário
    let vendedor = null;
    const vendedorId = oportunidade.proprietario_id || oportunidade.vendedor_id;
    if (vendedorId) {
      const { data: vendedorData } = await supabase
        .from('perfis_usuario')
        .select('primeiro_nome, sobrenome, telefone, celular')
        .eq('id', vendedorId)
        .single();
      vendedor = vendedorData;
    }

    // Montar resultado compatível com estrutura de vendas
    const resultado = {
      ...tokenData,
      oportunidade,
      // Mapear para estrutura similar à de vendas para reutilizar componentes
      venda: {
        id: oportunidade.id,
        numero_venda: oportunidade.codigo || oportunidade.nome_oportunidade,
        valor_total: oportunidade.valor,
        data_venda: oportunidade.criado_em,
        validade_proposta: oportunidade.validade_proposta,
        observacoes: oportunidade.descricao,
        cliente_id: oportunidade.cliente_id,
        vendedor_id: vendedorId,
        clientes: cliente
      },
      itens: (itens || []).map(item => ({
        id: item.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        preco_total: item.preco_total,
        valor_desconto: item.valor_desconto,
        percentual_desconto: item.percentual_desconto,
        sequencia_item: null,
        produtos: item.produto
      })),
      vendedor,
      isOportunidade: true // Flag para identificar que é oportunidade
    };

    console.log('Proposta de oportunidade carregada:', tokenData.id, '- Oportunidade:', oportunidade.id);

    return new Response(
      JSON.stringify(resultado),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
