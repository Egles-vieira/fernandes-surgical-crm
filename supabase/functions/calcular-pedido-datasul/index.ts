import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VendaData {
  id: string;
  numero_venda: string;
  cod_emitente: number;
  faturamento_parcial: string | null;
  tipo_pedido_id: string | null;
  condicao_pagamento_id: string | null;
  vendedor_id: string | null;
}

interface EmpresaData {
  codigo_estabelecimento: string;
  natureza_operacao: string;
}

interface TipoPedidoData {
  nome: string;
}

interface CondicaoPagamentoData {
  codigo_integracao: number;
}

interface PerfilData {
  codigo_vendedor: number;
}

interface VendaItemData {
  sequencia_item: number;
  quantidade: number;
  preco_tabela: number;
  desconto: number;
  produto_id: string;
  produtos: {
    referencia_interna: string;
  }[] | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Obter variáveis de ambiente
    const DATASUL_USER = Deno.env.get('DATASUL_USER');
    const DATASUL_PASS = Deno.env.get('DATASUL_PASS');
    const DATASUL_URL = 'http://172.19.245.25:8080/api/rest-api/v1/CalculaPedido';

    if (!DATASUL_USER || !DATASUL_PASS) {
      throw new Error('Credenciais Datasul não configuradas');
    }

    // Obter venda_id do body
    const { venda_id } = await req.json();

    if (!venda_id) {
      return new Response(
        JSON.stringify({ error: 'venda_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando cálculo de pedido para venda:', venda_id);

    // 1. Buscar dados da venda
    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .select('id, numero_venda, cod_emitente, faturamento_parcial, tipo_pedido_id, condicao_pagamento_id, vendedor_id')
      .eq('id', venda_id)
      .maybeSingle<VendaData>();

    if (vendaError || !venda) {
      throw new Error(`Venda não encontrada: ${vendaError?.message || 'ID inválido'}`);
    }

    // Validar campos obrigatórios da venda
    if (!venda.tipo_pedido_id) {
      throw new Error('Venda sem tipo de pedido definido. Por favor, selecione um tipo de pedido.');
    }
    if (!venda.condicao_pagamento_id) {
      throw new Error('Venda sem condição de pagamento definida. Por favor, selecione uma condição de pagamento.');
    }
    if (!venda.vendedor_id) {
      throw new Error('Venda sem vendedor definido. Por favor, selecione um vendedor.');
    }

    // 2. Buscar dados da empresa (assumindo uma empresa única)
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('codigo_estabelecimento, natureza_operacao')
      .limit(1)
      .maybeSingle<EmpresaData>();

    if (empresaError || !empresa) {
      throw new Error('Dados da empresa não encontrados. Configure a empresa no sistema.');
    }

    // 3. Buscar tipo de pedido
    const { data: tipoPedido, error: tipoPedidoError } = await supabase
      .from('tipos_pedido')
      .select('nome')
      .eq('id', venda.tipo_pedido_id)
      .maybeSingle<TipoPedidoData>();

    if (tipoPedidoError || !tipoPedido) {
      throw new Error(`Tipo de pedido não encontrado (ID: ${venda.tipo_pedido_id}). Verifique se o tipo de pedido existe.`);
    }

    // 4. Buscar condição de pagamento
    const { data: condicaoPagamento, error: condicaoPagamentoError } = await supabase
      .from('condicoes_pagamento')
      .select('codigo_integracao')
      .eq('id', venda.condicao_pagamento_id)
      .maybeSingle<CondicaoPagamentoData>();

    if (condicaoPagamentoError || !condicaoPagamento) {
      throw new Error(`Condição de pagamento não encontrada (ID: ${venda.condicao_pagamento_id}). Verifique se a condição de pagamento existe.`);
    }

    // 5. Buscar dados do vendedor
    const { data: perfil, error: perfilError } = await supabase
      .from('perfis_usuario')
      .select('codigo_vendedor')
      .eq('id', venda.vendedor_id)
      .maybeSingle<PerfilData>();

    if (perfilError || !perfil) {
      throw new Error(`Vendedor não encontrado (ID: ${venda.vendedor_id}). Verifique se o vendedor existe.`);
    }

    if (!perfil.codigo_vendedor) {
      throw new Error('Vendedor sem código de vendedor definido. Configure o código no perfil do vendedor.');
    }

    // 6. Buscar itens da venda com produtos
    const { data: itens, error: itensError } = await supabase
      .from('vendas_itens')
      .select(`
        sequencia_item,
        quantidade,
        preco_tabela,
        desconto,
        produto_id,
        produtos!inner (
          referencia_interna
        )
      `)
      .eq('venda_id', venda_id)
      .order('sequencia_item');

    if (itensError || !itens || itens.length === 0) {
      throw new Error('Nenhum item encontrado na venda');
    }

    // Validar campos obrigatórios
    const camposFaltando = [];
    if (!empresa.codigo_estabelecimento) camposFaltando.push('código do estabelecimento');
    if (!empresa.natureza_operacao) camposFaltando.push('natureza de operação');
    if (!condicaoPagamento.codigo_integracao) camposFaltando.push('código da condição de pagamento');
    if (!perfil.codigo_vendedor) camposFaltando.push('código do vendedor');

    if (camposFaltando.length > 0) {
      throw new Error(`Campos obrigatórios faltando: ${camposFaltando.join(', ')}`);
    }

    // 7. Montar payload para Datasul
    const datasulPayload = {
      pedido: [
        {
          'cod-emitente': venda.cod_emitente,
          'tipo-pedido': tipoPedido.nome,
          'cotacao': venda.numero_venda,
          'cod-estabel': empresa.codigo_estabelecimento,
          'nat-operacao': empresa.natureza_operacao,
          'cod-cond-pag': condicaoPagamento.codigo_integracao,
          'cod-transp': 24249,
          'vl-frete-inf': 0.0,
          'cod-rep': perfil.codigo_vendedor,
          'nr-tabpre': 'SE-CFI',
          'perc-desco1': 0.0,
          'fat-parcial': venda.faturamento_parcial === 'YES' ? 'S' : 'N',
          item: itens.map((item) => {
            const produtoRef = Array.isArray(item.produtos) && item.produtos.length > 0 
              ? item.produtos[0].referencia_interna 
              : '';
            
            return {
              'nr-sequencia': item.sequencia_item,
              'it-codigo': produtoRef,
              'cod-refer': '',
              'nat-operacao': '610809',
              'qt-pedida': item.quantidade,
              'vl-preuni': item.preco_tabela,
              'vl-pretab': item.preco_tabela,
              'vl-preori': item.preco_tabela,
              'vl-preco-base': item.preco_tabela,
              'per-des-item': item.desconto,
            };
          }),
        },
      ],
    };

    console.log('Payload montado:', JSON.stringify(datasulPayload, null, 2));

    // 8. Enviar para Datasul
    const authHeader = btoa(`${DATASUL_USER}:${DATASUL_PASS}`);
    
    console.log('Enviando requisição para Datasul...');
    
    const datasulResponse = await fetch(DATASUL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datasulPayload),
      signal: AbortSignal.timeout(30000), // 30 segundos timeout
    });

    const tempoResposta = Date.now() - startTime;
    
    let datasulData = null;
    let responseText = '';
    
    try {
      responseText = await datasulResponse.text();
      datasulData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError);
      datasulData = { raw: responseText };
    }

    console.log('Resposta Datasul recebida:', datasulResponse.status);

    // 9. Armazenar log da integração
    const logData = {
      venda_id: venda.id,
      numero_venda: venda.numero_venda,
      request_payload: datasulPayload,
      response_payload: datasulData,
      status: datasulResponse.ok ? 'sucesso' : 'erro',
      error_message: datasulResponse.ok ? null : `HTTP ${datasulResponse.status}: ${responseText}`,
      tempo_resposta_ms: tempoResposta,
    };

    const { error: logError } = await supabase
      .from('integracoes_totvs_calcula_pedido')
      .insert(logData);

    if (logError) {
      console.error('Erro ao salvar log:', logError);
    }

    // 10. Se houve erro no Datasul, retornar erro
    if (!datasulResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro Datasul: HTTP ${datasulResponse.status}`,
          details: responseText,
          log_id: logData,
        }),
        {
          status: datasulResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 11. Montar resumo de totais (extrair do retorno Datasul)
    const resumo = {
      total_itens: itens.length,
      tempo_resposta_ms: tempoResposta,
    };

    // 12. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        venda_id: venda.id,
        numero_venda: venda.numero_venda,
        resumo,
        datasul_response: datasulData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao processar cálculo de pedido:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Tentar salvar log de erro se possível
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { venda_id } = await req.clone().json().catch(() => ({ venda_id: null }));

      if (venda_id) {
        await supabase
          .from('integracoes_totvs_calcula_pedido')
          .insert({
            venda_id,
            numero_venda: 'ERRO',
            request_payload: {},
            response_payload: null,
            status: 'erro',
            error_message: errorMessage,
            tempo_resposta_ms: Date.now() - startTime,
          });
      }
    } catch (logError) {
      console.error('Erro ao salvar log de erro:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
