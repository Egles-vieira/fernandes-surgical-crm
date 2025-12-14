import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = 'https://graph.facebook.com';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  text?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
}

interface CreateTemplateRequest {
  contaId: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: TemplateComponent[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateTemplateRequest = await req.json();
    const { contaId, name, category, language, components } = body;

    console.log('[meta-api-create-template] Criando template', { contaId, name, category, language });

    // Validações básicas
    if (!contaId || !name || !category || !language || !components?.length) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: contaId, name, category, language, components' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar nome do template (apenas lowercase, underscore, números)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(name)) {
      return new Response(
        JSON.stringify({ error: 'Nome do template deve conter apenas letras minúsculas, números e underscore' }),
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

    // Montar payload para Meta API
    const metaPayload = {
      name,
      category,
      language,
      components,
    };

    console.log('[meta-api-create-template] Enviando para Meta API:', JSON.stringify(metaPayload));

    // Enviar para Meta API
    const url = `${META_GRAPH_URL}/${META_API_VERSION}/${conta.meta_waba_id}/message_templates`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${conta.meta_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[meta-api-create-template] Erro Meta API:', responseData);
      
      // Mapear erros comuns
      let errorMessage = responseData.error?.message || 'Erro ao criar template na Meta';
      const errorCode = responseData.error?.code;
      
      if (errorCode === 100 && responseData.error?.error_subcode === 2388093) {
        errorMessage = 'Nome do template já existe. Escolha outro nome.';
      } else if (errorCode === 100 && responseData.error?.error_subcode === 2388094) {
        errorMessage = 'Categoria inválida para este tipo de template.';
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          metaError: responseData.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[meta-api-create-template] Template criado na Meta:', responseData);

    const metaTemplateId = responseData.id;

    // Extrair campos dos components para salvar localmente
    const headerComponent = components.find((c: TemplateComponent) => c.type === 'HEADER');
    const bodyComponent = components.find((c: TemplateComponent) => c.type === 'BODY');
    const footerComponent = components.find((c: TemplateComponent) => c.type === 'FOOTER');

    const titulo = headerComponent?.text || null;
    const corpo = bodyComponent?.text || '';
    const rodape = footerComponent?.text || null;

    // Criar registro local
    const { data: newTemplate, error: insertError } = await supabase
      .from('whatsapp_templates')
      .insert({
        whatsapp_conta_id: contaId,
        nome_template: name,
        template_externo_id: metaTemplateId,
        status_aprovacao: 'PENDING',
        categoria: category.toLowerCase(),
        idioma: language,
        titulo,
        corpo,
        rodape,
        components_meta: components,
        sincronizado_com_meta: true,
        ultima_sincronizacao_em: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[meta-api-create-template] Erro ao salvar localmente:', insertError);
      // Template foi criado na Meta, mas falhou localmente
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Template criado na Meta, mas erro ao salvar localmente',
          metaTemplateId,
          error: insertError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar no histórico
    if (newTemplate) {
      await supabase
        .from('whatsapp_templates_historico')
        .insert({
          template_id: newTemplate.id,
          status_anterior: null,
          status_novo: 'PENDING',
          dados_meta: { created: true, metaTemplateId },
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        templateId: newTemplate?.id,
        metaTemplateId,
        status: 'PENDING'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[meta-api-create-template] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
