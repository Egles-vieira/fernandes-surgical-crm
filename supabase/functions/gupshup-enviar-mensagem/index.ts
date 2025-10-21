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

    // Buscar mensagem pendente com dados da conta
    const { data: mensagem, error: mensagemError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contas (
          api_key,
          app_id,
          phone_number_id
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

    // Formatar payload para Gupshup
    const gupshupPayload = {
      channel: "whatsapp",
      source: conta.phone_number_id,
      destination: contato.numero_whatsapp,
      message: {
        type: "text",
        text: mensagem.corpo
      }
    };

    console.log('Enviando mensagem para Gupshup:', {
      appId: conta.app_id,
      destination: contato.numero_whatsapp
    });

    // Enviar mensagem via API Gupshup
    const gupshupResponse = await fetch(
      `https://api.gupshup.io/wa/app/${conta.app_id}/msg`,
      {
        method: 'POST',
        headers: {
          'apikey': conta.api_key,
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
          erro_detalhes: JSON.stringify(responseData),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', mensagemId);

      throw new Error(`Erro Gupshup: ${responseData.message || 'Erro desconhecido'}`);
    }

    // Atualizar mensagem com sucesso
    const { error: updateError } = await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        id_mensagem_externa: responseData.messageId || responseData.id,
        enviada_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
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
