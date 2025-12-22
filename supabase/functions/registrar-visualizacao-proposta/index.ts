import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📊 [registrar-visualizacao-proposta] Requisição recebida');

  try {
    // Suporte a vendaId OU oportunidadeId
    const { tokenId, vendaId, oportunidadeId, sessionId, deviceInfo } = await req.json();

    console.log('📊 [registrar-visualizacao-proposta] Dados:', { tokenId, vendaId, oportunidadeId, sessionId });

    if (!tokenId || !sessionId) {
      console.error('❌ Parâmetros obrigatórios ausentes');
      return new Response(
        JSON.stringify({ error: 'tokenId e sessionId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deve ter vendaId OU oportunidadeId
    if (!vendaId && !oportunidadeId) {
      console.error('❌ vendaId ou oportunidadeId é obrigatório');
      return new Response(
        JSON.stringify({ error: 'vendaId ou oportunidadeId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar SERVICE_ROLE_KEY para bypass de RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Inserir registro de analytics
    const insertData: Record<string, unknown> = {
      proposta_token_id: tokenId,
      session_id: sessionId,
      device_type: deviceInfo?.device_type || 'unknown',
      os_name: deviceInfo?.os_name || 'Unknown',
      os_version: deviceInfo?.os_version || '',
      browser_name: deviceInfo?.browser_name || 'Unknown',
      browser_version: deviceInfo?.browser_version || '',
      screen_width: deviceInfo?.screen_width || 0,
      screen_height: deviceInfo?.screen_height || 0
    };

    // Adicionar venda_id OU oportunidade_id
    if (vendaId) {
      insertData.venda_id = vendaId;
    } else {
      insertData.oportunidade_id = oportunidadeId;
    }

    const { data, error } = await supabase
      .from('propostas_analytics')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erro ao inserir analytics:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Analytics registrado com sucesso:', data.id);

    // Notificação para vendedor
    if (vendaId) {
      // Buscar dados da venda
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .select('numero_venda, vendedor_id')
        .eq('id', vendaId)
        .single();

      if (vendaError) {
        console.error('❌ Erro ao buscar venda para notificação:', vendaError);
      } else if (venda?.vendedor_id) {
        const numeroProposta = venda.numero_venda || 'S/N';
        const linkProposta = `/vendas/${vendaId}`;
        
        await supabase
          .from('notificacoes')
          .insert({
            usuario_id: venda.vendedor_id,
            titulo: '👁️ Cliente visualizando proposta',
            descricao: `Um cliente está visualizando a proposta #${numeroProposta}`,
            tipo: 'proposta_visualizacao',
            entidade_id: vendaId,
            entidade_tipo: 'venda',
            metadata: {
              numero_proposta: numeroProposta,
              link: linkProposta,
              device_type: deviceInfo?.device_type || 'unknown',
              browser_name: deviceInfo?.browser_name || 'Unknown'
            }
          });

        console.log('📢 Notificação criada para vendedor:', venda.vendedor_id);
      }
    } else if (oportunidadeId) {
      // Buscar dados da oportunidade
      const { data: oportunidade, error: opError } = await supabase
        .from('oportunidades')
        .select('codigo, nome_oportunidade, proprietario_id, vendedor_id')
        .eq('id', oportunidadeId)
        .single();

      if (opError) {
        console.error('❌ Erro ao buscar oportunidade para notificação:', opError);
      } else {
        const vendedorIdOp = oportunidade?.proprietario_id || oportunidade?.vendedor_id;
        if (vendedorIdOp) {
          const nomeOportunidade = oportunidade.codigo || oportunidade.nome_oportunidade || 'S/N';
          const linkOportunidade = `/pipelines?oportunidade=${oportunidadeId}`;
          
          await supabase
            .from('notificacoes')
            .insert({
              usuario_id: vendedorIdOp,
              titulo: '👁️ Cliente visualizando proposta',
              descricao: `Um cliente está visualizando a proposta da oportunidade "${nomeOportunidade}"`,
              tipo: 'proposta_visualizacao',
              entidade_id: oportunidadeId,
              entidade_tipo: 'oportunidade',
              metadata: {
                nome_oportunidade: nomeOportunidade,
                link: linkOportunidade,
                device_type: deviceInfo?.device_type || 'unknown',
                browser_name: deviceInfo?.browser_name || 'Unknown'
              }
            });

          console.log('📢 Notificação criada para proprietário da oportunidade:', vendedorIdOp);
        }
      }
    }

    return new Response(
      JSON.stringify({ id: data.id, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
