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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mensagemId } = await req.json();

    // Validar que o sistema está em modo Gupshup
    const { data: config } = await supabase
      .from('whatsapp_configuracao_global')
      .select('modo_api, provedor_ativo')
      .eq('esta_ativo', true)
      .single();

    if (config?.modo_api !== 'oficial' || config?.provedor_ativo !== 'gupshup') {
      return new Response(
        JSON.stringify({ error: 'Sistema não está em modo Gupshup' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar mensagem pendente com dados da conta
    const { data: mensagem, error: mensagemError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contas (
          api_key_gupshup,
          app_id_gupshup,
          phone_number_id_gupshup,
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
      console.error('Mensagem não encontrada:', mensagemError);
      throw new Error('Mensagem não encontrada');
    }

    const conta = mensagem.whatsapp_contas as any;
    const contato = mensagem.whatsapp_contatos as any;

    if (!conta || !contato) {
      throw new Error('Conta ou contato não encontrado');
    }

    if (conta.provedor !== 'gupshup') {
      throw new Error('Conta não é do provedor Gupshup');
    }

    // Formatar payload para Gupshup
    const gupshupPayload = {
      channel: "whatsapp",
      source: conta.phone_number_id_gupshup,
      destination: (contato.numero_whatsapp || '').replace(/\D/g, ''),
      message: {
        type: "text",
        text: mensagem.corpo
      }
    };

    console.log('Enviando mensagem para Gupshup:', {
      appId: conta.app_id_gupshup,
      destination: (contato.numero_whatsapp || '').replace(/\D/g, '')
    });

    // Enviar mensagem via API Gupshup
    const gupshupResponse = await fetch(
      `https://api.gupshup.io/wa/app/${conta.app_id_gupshup}/msg`,
      {
        method: 'POST',
        headers: {
          'apikey': conta.api_key_gupshup,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gupshupPayload),
      }
    );

    const responseData = await gupshupResponse.json();
    console.log('Resposta Gupshup:', responseData);

    if (!gupshupResponse.ok) {
      console.error('Erro ao enviar mensagem:', responseData);
      
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

      throw new Error(`Erro Gupshup: ${responseData.message || 'Erro desconhecido'}`);
    }

    // Atualizar mensagem com sucesso
    const { error: updateError } = await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        mensagem_externa_id: responseData.messageId || responseData.id || null,
        status_enviada_em: new Date().toISOString(),
      })
      .eq('id', mensagemId);

    if (updateError) {
      console.error('Erro ao atualizar mensagem:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messageId || responseData.id,
        status: responseData.status 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função gupshup-enviar-mensagem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
