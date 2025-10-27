import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Cliente API - Início ===');
    
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário autenticado:', user.email);

    // Parse do body
    const body = await req.json();
    console.log('Dados recebidos:', JSON.stringify(body, null, 2));

    // Validação básica
    if (!body.nome_abrev) {
      return new Response(
        JSON.stringify({ error: 'Campo "nome_abrev" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados do cliente
    const clienteData = {
      nome_abrev: body.nome_abrev,
      cgc: body.cgc || null,
      email: body.email || null,
      email_financeiro: body.email_financeiro || null,
      email_xml: body.email_xml || null,
      telefone1: body.telefone1 || null,
      ins_estadual: body.ins_estadual || null,
      cod_suframa: body.cod_suframa || null,
      lim_credito: body.lim_credito || 0,
      observacoes: body.observacoes || null,
      atividade: body.atividade || null,
      coligada: body.coligada || null,
      user_id: user.id,
    };

    console.log('Dados preparados para inserção:', JSON.stringify(clienteData, null, 2));

    // Se tiver ID, atualiza. Senão, cria novo
    if (body.id) {
      // Atualizar cliente existente
      const { data, error } = await supabaseClient
        .from('clientes')
        .update(clienteData)
        .eq('id', body.id)
        .eq('user_id', user.id) // Garante que só atualiza seus próprios clientes
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Cliente atualizado com sucesso:', data.id);
      return new Response(
        JSON.stringify({ success: true, data, message: 'Cliente atualizado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Criar novo cliente
      const { data, error } = await supabaseClient
        .from('clientes')
        .insert(clienteData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar cliente:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Cliente criado com sucesso:', data.id);
      return new Response(
        JSON.stringify({ success: true, data, message: 'Cliente criado com sucesso' }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Erro no endpoint:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
