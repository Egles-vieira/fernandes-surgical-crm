import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

interface DeleteTemplateRequest {
  contaId: string;
  templateName: string;
  templateId?: string; // ID local para soft delete
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: DeleteTemplateRequest = await req.json();
    const { contaId, templateName, templateId } = body;

    console.log('[meta-api-delete-template] Deletando template', { contaId, templateName, templateId });

    if (!contaId || !templateName) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: contaId, templateName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar conta
    const { data: conta, error: contaError } = await supabase
      .from('whatsapp_contas')
      .select('id, meta_waba_id, meta_access_token')
      .eq('id', contaId)
      .single();

    if (contaError || !conta) {
      return new Response(
        JSON.stringify({ error: 'Conta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!conta.meta_waba_id || !conta.meta_access_token) {
      return new Response(
        JSON.stringify({ error: 'Conta sem configuração Meta API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deletar na Meta API
    const url = `${META_GRAPH_URL}/${META_API_VERSION}/${conta.meta_waba_id}/message_templates?name=${encodeURIComponent(templateName)}`;
    
    console.log('[meta-api-delete-template] URL:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${conta.meta_access_token}`,
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[meta-api-delete-template] Erro Meta API:', responseData);
      
      // Se o erro for "template não encontrado na Meta", ainda podemos deletar localmente
      const isNotFoundError = responseData.error?.code === 100 && 
        (responseData.error?.error_subcode === 2388108 || 
         responseData.error?.message?.includes('does not exist'));

      if (!isNotFoundError) {
        return new Response(
          JSON.stringify({ 
            error: responseData.error?.message || 'Erro ao deletar template na Meta',
            metaError: responseData.error
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('[meta-api-delete-template] Template não existe na Meta, continuando com deleção local');
    }

    console.log('[meta-api-delete-template] Resposta Meta:', responseData);

    // Buscar template local pelo nome (se não temos o ID)
    let localTemplateId = templateId;
    
    if (!localTemplateId) {
      const { data: localTemplate } = await supabase
        .from('whatsapp_templates')
        .select('id, status_aprovacao')
        .eq('whatsapp_conta_id', contaId)
        .eq('nome_template', templateName)
        .maybeSingle();

      localTemplateId = localTemplate?.id;
    }

    // Soft delete no banco local
    if (localTemplateId) {
      // Registrar no histórico antes de deletar
      await supabase
        .from('whatsapp_templates_historico')
        .insert({
          template_id: localTemplateId,
          status_anterior: 'DELETED',
          status_novo: 'DELETED',
          dados_meta: { deleted: true, deletedAt: new Date().toISOString() },
        });

      // Soft delete (marcar como excluído)
      const { error: deleteError } = await supabase
        .from('whatsapp_templates')
        .update({ 
          excluido_em: new Date().toISOString(),
          sincronizado_com_meta: true,
        })
        .eq('id', localTemplateId);

      if (deleteError) {
        console.error('[meta-api-delete-template] Erro ao marcar como excluído:', deleteError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Template deletado com sucesso',
        deletedFromMeta: response.ok,
        deletedLocally: !!localTemplateId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[meta-api-delete-template] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
