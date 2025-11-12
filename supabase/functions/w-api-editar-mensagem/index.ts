import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { mensagemId, novoTexto } = await req.json();

    console.log('✏️ Editando mensagem:', { mensagemId, novoTexto });

    // Buscar mensagem original
    const { data: mensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        conversa:whatsapp_conversas!inner(
          whatsapp_contato:whatsapp_contatos!inner(
            numero_telefone
          ),
          whatsapp_conta:whatsapp_contas!inner(
            instance_id_wapi,
            token_wapi,
            provedor
          )
        )
      `)
      .eq('id', mensagemId)
      .eq('direcao', 'enviada') // Só editar mensagens enviadas
      .single();

    if (msgError || !mensagem) {
      throw new Error(`Mensagem não encontrada ou não pode ser editada: ${msgError?.message}`);
    }

    // Verificar se é W-API
    const conta = mensagem.conversa.whatsapp_conta;
    if (conta.provedor !== 'w_api') {
      throw new Error('Edição só suportada via W-API');
    }

    const instanceId = conta.instance_id_wapi;
    const token = conta.token_wapi;
    const whatsappId = mensagem.id_externo;
    const numeroDestino = mensagem.conversa.whatsapp_contato.numero_telefone;

    if (!instanceId || !token || !whatsappId) {
      throw new Error('Dados insuficientes para editar mensagem');
    }

    // Endpoint W-API PRO para editar
    const wapiUrl = `https://api.w-api.pro/${instanceId}/messages/edit`;

    const payload = {
      chatId: `${numeroDestino}@c.us`,
      messageId: whatsappId,
      text: novoTexto,
    };

    console.log('🌐 Chamando W-API:', { url: wapiUrl, payload });

    const response = await fetch(wapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro W-API:', errorText);
      throw new Error(`W-API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Mensagem editada:', result);

    // Atualizar no banco
    await supabase
      .from('whatsapp_mensagens')
      .update({
        conteudo: novoTexto,
        editada: true,
        editada_em: new Date().toISOString(),
        mensagem_original: mensagem.conteudo,
      })
      .eq('id', mensagemId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem editada com sucesso',
        wapiResponse: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Erro ao editar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
