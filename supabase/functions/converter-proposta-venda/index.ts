import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  propostaId: string;
  conversaId: string;
  cnpjConfirmado?: string;
  enderecoId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { propostaId, conversaId, cnpjConfirmado, enderecoId }: RequestBody = await req.json();
    console.log(`🔄 Convertendo proposta ${propostaId} em venda`);
    console.log(`   CNPJ confirmado: ${cnpjConfirmado || 'não informado'}`);
    console.log(`   Endereço ID: ${enderecoId || 'não informado'}`);

    // Buscar proposta e seus itens
    const { data: proposta, error: propostaError } = await supabaseClient
      .from('whatsapp_propostas_comerciais')
      .select(`
        *,
        whatsapp_propostas_itens (
          produto_id,
          quantidade,
          preco_unitario,
          desconto_valor,
          subtotal,
          referencia_interna,
          nome_produto
        )
      `)
      .eq('id', propostaId)
      .single();

    if (propostaError || !proposta) {
      console.error('❌ Erro ao buscar proposta:', propostaError);
      return new Response(
        JSON.stringify({ error: 'Proposta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do cliente pela conversa
    const { data: conversa, error: conversaError } = await supabaseClient
      .from('whatsapp_conversas')
      .select(`
        whatsapp_contato_id,
        whatsapp_contatos (
          nome,
          numero,
          cliente_id,
          clientes (
            id,
            nome_emit,
            cgc
          )
        )
      `)
      .eq('id', conversaId)
      .single();

    if (conversaError || !conversa) {
      console.error('❌ Erro ao buscar conversa:', conversaError);
      return new Response(
        JSON.stringify({ error: 'Conversa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contato = Array.isArray(conversa.whatsapp_contatos) 
      ? conversa.whatsapp_contatos[0] 
      : conversa.whatsapp_contatos;
    const clienteData = contato?.clientes;
    const cliente = Array.isArray(clienteData) ? clienteData[0] : clienteData;

    // Gerar número da venda (formato: VW-YYYYMM-#####)
    const hoje = new Date();
    const ano = hoje.getFullYear().toString();
    const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const prefixo = `VW-${ano}${mes}`;

    const { data: ultimaVenda } = await supabaseClient
      .from('vendas')
      .select('numero_venda')
      .like('numero_venda', `${prefixo}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let numeroSequencial = 1;
    if (ultimaVenda?.numero_venda) {
      const match = ultimaVenda.numero_venda.match(/\d+$/);
      if (match) {
        numeroSequencial = parseInt(match[0]) + 1;
      }
    }

    const numeroVenda = `${prefixo}-${numeroSequencial.toString().padStart(5, '0')}`;
    console.log(`📝 Número da venda: ${numeroVenda}`);

    // Criar venda
    const vendaData: any = {
      numero_venda: numeroVenda,
      cliente_nome: cliente?.nome_emit || contato?.nome || 'Cliente WhatsApp',
      cliente_cnpj: cnpjConfirmado || cliente?.cgc,
      cliente_id: cliente?.id,
      valor_total: proposta.subtotal,
      desconto: proposta.desconto_percentual || 0,
      valor_final: proposta.valor_total,
      origem_lead: 'whatsapp',
      status: 'pendente',
      etapa_pipeline: 'proposta',
      observacoes: `Venda gerada automaticamente via WhatsApp\nProposta: ${proposta.numero_proposta}${enderecoId ? `\nEndereço ID: ${enderecoId}` : ''}`,
      user_id: (await supabaseClient.auth.getUser()).data.user?.id || '00000000-0000-0000-0000-000000000000'
    };

    const { data: venda, error: vendaError } = await supabaseClient
      .from('vendas')
      .insert(vendaData)
      .select()
      .single();

    if (vendaError || !venda) {
      console.error('❌ Erro ao criar venda:', vendaError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar venda', details: vendaError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Venda criada: ${venda.numero_venda}`);

    // Criar itens da venda
    const itensVenda = proposta.whatsapp_propostas_itens.map((item: any) => ({
      venda_id: venda.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      desconto: 0,
      valor_total: item.subtotal
    }));

    const { error: itensError } = await supabaseClient
      .from('vendas_itens')
      .insert(itensVenda);

    if (itensError) {
      console.error('❌ Erro ao criar itens da venda:', itensError);
      // Reverter venda se falhar
      await supabaseClient.from('vendas').delete().eq('id', venda.id);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar itens da venda', details: itensError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ ${itensVenda.length} itens criados na venda`);

    // Atualizar proposta com status aceita e venda_id
    const { error: updatePropostaError } = await supabaseClient
      .from('whatsapp_propostas_comerciais')
      .update({
        status: 'aceita',
        venda_id: venda.id
      })
      .eq('id', propostaId);

    if (updatePropostaError) {
      console.error('⚠️ Erro ao atualizar proposta:', updatePropostaError);
    }

    // Registrar interação
    await supabaseClient.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      tipo_evento: 'venda_criada',
      descricao: `Pedido ${numeroVenda} criado a partir da proposta ${proposta.numero_proposta}`,
      metadata: { 
        venda_id: venda.id, 
        proposta_id: propostaId,
        valor_total: venda.valor_final 
      },
      executado_por_bot: true
    });

    console.log('✅ Conversão concluída com sucesso');

    return new Response(
      JSON.stringify({
        sucesso: true,
        venda: {
          id: venda.id,
          numero_venda: venda.numero_venda,
          valor_total: venda.valor_final
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na conversão:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});