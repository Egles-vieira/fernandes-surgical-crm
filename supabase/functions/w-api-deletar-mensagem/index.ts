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
    const { mensagemId } = await req.json();

    console.log('🗑️ Deletando mensagem:', { mensagemId });

    // Buscar mensagem
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
      .eq('direcao', 'enviada') // Só deletar mensagens enviadas
      .single();

    if (msgError || !mensagem) {
      throw new Error(`Mensagem não encontrada ou não pode ser deletada: ${msgError?.message}`);
    }

    // Verificar se é W-API
    const conta = mensagem.conversa.whatsapp_conta;
    if (conta.provedor !== 'w_api') {
      throw new Error('Exclusão só suportada via W-API');
    }

    const instanceId = conta.instance_id_wapi;
    const token = conta.token_wapi;
    const whatsappId = mensagem.id_externo;
    const numeroDestino = mensagem.conversa.whatsapp_contato.numero_telefone;

    if (!instanceId || !token || !whatsappId) {
      throw new Error('Dados insuficientes para deletar mensagem');
    }

    // Endpoint W-API PRO para deletar
    const wapiUrl = `https://api.w-api.pro/${instanceId}/messages/delete`;

    const payload = {
      chatId: `${numeroDestino}@c.us`,
      messageId: whatsappId,
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
    console.log('✅ Mensagem deletada:', result);

    // Soft delete no banco
    await supabase
      .from('whatsapp_mensagens')
      .update({
        deletada: true,
        deletada_em: new Date().toISOString(),
      })
      .eq('id', mensagemId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem deletada com sucesso',
        wapiResponse: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Erro ao deletar:', error);
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
