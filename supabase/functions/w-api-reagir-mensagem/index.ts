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
    const { mensagemId, emoji, acao } = await req.json();

    console.log('📤 Reagindo a mensagem:', { mensagemId, emoji, acao });

    // Buscar mensagem e conta
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
            provedor,
            criado_por
          )
        )
      `)
      .eq('id', mensagemId)
      .single();

    if (msgError || !mensagem) {
      throw new Error(`Mensagem não encontrada: ${msgError?.message}`);
    }

    // Verificar se é W-API
    const conta = mensagem.conversa.whatsapp_conta;
    if (conta.provedor !== 'w_api') {
      throw new Error('Reações só suportadas via W-API');
    }

    const instanceId = conta.instance_id_wapi;
    const token = conta.token_wapi;
    const whatsappId = mensagem.id_externo; // ID da mensagem no WhatsApp
    const numeroDestino = mensagem.conversa.whatsapp_contato.numero_whatsapp;

    if (!instanceId || !token || !whatsappId) {
      throw new Error('Dados insuficientes para enviar reação');
    }

    // Endpoint W-API PRO para reações
    const wapiUrl = `https://api.w-api.pro/${instanceId}/messages/react`;

    const payload = {
      chatId: `${numeroDestino}@c.us`,
      messageId: whatsappId,
      emoji: acao === 'adicionar' ? emoji : '', // emoji vazio remove reação
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
    console.log('✅ Reação enviada:', result);

    // Atualizar reações no banco
    const reacoes = mensagem.reacoes || [];
    const userId = mensagem.conversa.whatsapp_conta.criado_por;

    let novasReacoes = [...reacoes];
    if (acao === 'adicionar') {
      // Remover reação anterior do mesmo usuário, se existir
      novasReacoes = novasReacoes.filter((r: any) => r.usuario_id !== userId);
      // Adicionar nova reação
      novasReacoes.push({
        emoji,
        usuario_id: userId,
        criado_em: new Date().toISOString(),
      });
    } else {
      // Remover reação
      novasReacoes = novasReacoes.filter((r: any) => 
        !(r.usuario_id === userId && r.emoji === emoji)
      );
    }

    await supabase
      .from('whatsapp_mensagens')
      .update({ reacoes: novasReacoes })
      .eq('id', mensagemId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Reação enviada com sucesso',
        wapiResponse: result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Erro ao reagir:', error);
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
