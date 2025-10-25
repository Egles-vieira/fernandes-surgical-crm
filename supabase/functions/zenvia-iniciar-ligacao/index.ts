import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { numero_destino, nome_cliente, cliente_id, contato_id } = await req.json();
    
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!numero_destino) {
      return new Response(
        JSON.stringify({ error: 'Número de destino é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const zenviaToken = Deno.env.get('ZENVIA_ACCESS_TOKEN');
    if (!zenviaToken) {
      console.error('ZENVIA_ACCESS_TOKEN não configurado');
      return new Response(
        JSON.stringify({ error: 'Configuração de integração não encontrada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Formatar o número para o padrão da Zenvia (apenas DDD + número, sem +55)
    let numeroFormatado = numero_destino.replace(/\D/g, '');
    
    // Remover o código do país se existir
    if (numeroFormatado.startsWith('55')) {
      numeroFormatado = numeroFormatado.substring(2);
    }

    console.log('Iniciando ligação para:', numeroFormatado);

    // Fazer a chamada para a API da Zenvia
    const response = await fetch('https://voice-api.zenvia.com/verificacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Token': zenviaToken,
      },
      body: JSON.stringify({
        numero_destino: numeroFormatado,
        nome_produto: nome_cliente || 'Cliente',
        tts: 'true'
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro na API Zenvia:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao iniciar ligação',
          details: data 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Ligação iniciada com sucesso:', data);
    
    // Registrar ligação no histórico
    const { data: historico, error: historicoError } = await supabase
      .from('historico_ligacoes')
      .insert({
        cliente_id: cliente_id,
        contato_id: contato_id,
        numero_destino: numeroFormatado,
        nome_contato: nome_cliente,
        iniciada_por: user.id,
        id_chamada_externa: data.id || data.call_id,
        status: 'chamando',
        chamada_iniciada_em: new Date().toISOString(),
        dados_webhook: data
      })
      .select()
      .single();
    
    if (historicoError) {
      console.error('Erro ao registrar histórico:', historicoError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Ligação iniciada com sucesso',
        data,
        historico_id: historico?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno ao processar requisição',
        message: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
