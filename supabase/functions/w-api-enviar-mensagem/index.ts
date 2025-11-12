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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { mensagemId } = await req.json();

    // Validar que o sistema está em modo W-API
    const { data: config } = await supabase
      .from('whatsapp_configuracao_global')
      .select('modo_api, provedor_ativo')
      .eq('esta_ativo', true)
      .single();

    if (config?.modo_api !== 'nao_oficial' || config?.provedor_ativo !== 'w_api') {
      return new Response(
        JSON.stringify({ error: 'Sistema não está em modo W-API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar mensagem pendente com dados da conta
    const { data: mensagem, error: mensagemError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contas (
          instance_id_wapi,
          token_wapi,
          provedor
        ),
        whatsapp_contatos (
          numero_whatsapp
        )
      `)
      .eq('id', mensagemId)
      .eq('status', 'pendente')
      .single();

    if (mensagemError || !mensagem) {
      console.error('❌ Mensagem não encontrada:', mensagemError);
      throw new Error('Mensagem não encontrada');
    }

    const conta = mensagem.whatsapp_contas as any;
    const contato = mensagem.whatsapp_contatos as any;

    if (!conta || !contato) {
      throw new Error('Conta ou contato não encontrado');
    }

    if (conta.provedor !== 'w_api') {
      throw new Error('Conta não é do provedor W-API');
    }

    // Formatar número para W-API (somente dígitos, com DDI)
    let numeroDestino = (contato.numero_whatsapp || '').replace(/\D/g, '');
    if (!numeroDestino.startsWith('55')) {
      numeroDestino = `55${numeroDestino}`;
    }

    console.log('🔍 Dados da conta W-API:', {
      instance_id: conta.instance_id_wapi,
      tem_token: !!conta.token_wapi,
      provedor: conta.provedor
    });

    console.log('📞 Número formatado:', {
      original: contato.numero_whatsapp,
      formatado: numeroDestino
    });

    // Formatar payload para W-API
    const wapiPayload = {
      phone: numeroDestino,
      message: mensagem.corpo,
      delayMessage: 3  // delay de 3 segundos (padrão)
    };

    console.log('📤 Enviando mensagem para W-API:', {
      url: `https://api.w-api.app/v1/message/send-text?instanceId=${conta.instance_id_wapi}`,
      payload: wapiPayload
    });

    // Enviar mensagem via W-API
    const wapiResponse = await fetch(
      `https://api.w-api.app/v1/message/send-text?instanceId=${conta.instance_id_wapi}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${conta.token_wapi}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wapiPayload),
      }
    );

    const responseData = await wapiResponse.json();
    console.log('📥 Resposta W-API:', {
      status: wapiResponse.status,
      ok: wapiResponse.ok,
      data: responseData
    });

    if (!wapiResponse.ok || responseData.error) {
      console.error('❌ Erro ao enviar via W-API:', {
        status: wapiResponse.status,
        statusText: wapiResponse.statusText,
        response: responseData
      });
      
      // Atualizar status para erro
      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_mensagem: (responseData.message || JSON.stringify(responseData)),
          erro_codigo: responseData.code || null,
          status_falhou_em: new Date().toISOString(),
        })
        .eq('id', mensagemId);

      throw new Error(`Erro W-API: ${responseData.message || 'Erro desconhecido'}`);
    }

    // Atualizar mensagem com sucesso
    await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        mensagem_externa_id: responseData.messageId || responseData.id || null,
        status_enviada_em: new Date().toISOString(),
      })
      .eq('id', mensagemId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messageId,
        insertedId: responseData.insertedId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na função w-api-enviar-mensagem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
