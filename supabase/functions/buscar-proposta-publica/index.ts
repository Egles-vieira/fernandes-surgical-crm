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

    // Usar service_role para bypassa RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar token
    const { data: tokenData, error: tokenError } = await supabase
      .from('propostas_publicas_tokens')
      .select('*')
      .eq('public_token', token)
      .eq('ativo', true)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token não encontrado:', tokenError);
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

    // Buscar venda
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .select('*, clientes:cliente_id(nome_abrev, nome_emit, cgc)')
      .eq('id', tokenData.venda_id)
      .single();

    if (vendaError) {
      console.error('Erro ao buscar venda:', vendaError);
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar proposta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar itens
    const { data: itens, error: itensError } = await supabase
      .from('vendas_itens')
      .select('*, produtos:produto_id(nome, referencia_interna, unidade_medida)')
      .eq('venda_id', tokenData.venda_id)
      .order('sequencia_item', { ascending: true });

    if (itensError) {
      console.error('Erro ao buscar itens:', itensError);
    }

    // Buscar vendedor
    let vendedor = null;
    if (venda?.vendedor_id) {
      const { data: vendedorData } = await supabase
        .from('perfis_usuario')
        .select('primeiro_nome, sobrenome, telefone, celular')
        .eq('id', venda.vendedor_id)
        .single();
      vendedor = vendedorData;
    }

    // Retornar dados completos
    const resultado = {
      ...tokenData,
      venda,
      itens: itens || [],
      vendedor
    };

    console.log('Proposta carregada com sucesso:', tokenData.id);

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
