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

    console.log('📤 Enviando mensagem com botões via W-API:', mensagemId);

    // Buscar mensagem pendente
    const { data: mensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        conversa:whatsapp_conversas!inner(
          whatsapp_contato:whatsapp_contatos!inner(
            numero_whatsapp
          ),
          whatsapp_conta:whatsapp_contas!inner(
            instance_id_wapi,
            token_wapi,
            provedor
          )
        )
      `)
      .eq('id', mensagemId)
      .eq('status', 'pendente')
      .single();

    if (msgError || !mensagem) {
      throw new Error(`Mensagem não encontrada: ${msgError?.message}`);
    }

    // Verificar se é W-API
    const conta = mensagem.conversa.whatsapp_conta;
    if (conta.provedor !== 'w_api') {
      throw new Error('Mensagens com botões só suportadas via W-API');
    }

    const instanceId = conta.instance_id_wapi;
    const token = conta.token_wapi;
    const numeroDestino = mensagem.conversa.whatsapp_contato.numero_whatsapp;

    if (!instanceId || !token) {
      throw new Error('Credenciais W-API não configuradas');
    }

    // Verificar status da instância
    const statusUrl = `https://api.w-api.pro/${instanceId}/instance/status`;
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!statusResponse.ok) {
      throw new Error('Instância W-API não conectada');
    }

    const statusData = await statusResponse.json();
    if (statusData.status !== 'authenticated') {
      throw new Error(`Instância não autenticada: ${statusData.status}`);
    }

    // Determinar tipo de botão e montar payload
    const botoesData = mensagem.botoes_interativos;
    const tipoBotao = mensagem.tipo_botao || 'action';

    let wapiUrl: string;
    let payload: any;

    if (tipoBotao === 'list') {
      // Botões tipo lista
      wapiUrl = `https://api.w-api.pro/${instanceId}/messages/sendList`;
      payload = {
        chatId: `${numeroDestino}@c.us`,
        text: mensagem.corpo,
        title: botoesData.titulo || 'Menu',
        buttonText: botoesData.textoBotao || 'Ver opções',
        sections: botoesData.secoes || [],
      };
    } else {
      // Botões de ação simples
      wapiUrl = `https://api.w-api.pro/${instanceId}/messages/sendButtons`;
      payload = {
        chatId: `${numeroDestino}@c.us`,
        text: mensagem.corpo,
        buttons: (botoesData.botoes || []).map((btn: any) => ({
          id: btn.id,
          text: btn.texto,
        })),
      };
    }

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
      
      await supabase
        .from('whatsapp_mensagens')
        .update({
          status: 'erro',
          erro_envio: `W-API Error: ${response.status} - ${errorText}`,
        })
        .eq('id', mensagemId);

      throw new Error(`W-API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Mensagem com botões enviada:', result);

    // Atualizar status no banco
    await supabase
      .from('whatsapp_mensagens')
      .update({
        status: 'enviada',
        enviada_em: new Date().toISOString(),
        id_externo: result.id || result.messageId,
      })
      .eq('id', mensagemId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem com botões enviada com sucesso',
        wapiResponse: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem com botões:', error);
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
