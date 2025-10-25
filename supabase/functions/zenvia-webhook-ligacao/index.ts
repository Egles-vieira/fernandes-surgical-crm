import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extrair informações do webhook
    const callId = payload.id || payload.call_id;
    const status = payload.status;
    const duration = payload.duration;
    
    // Mapear status da Zenvia para nosso sistema
    let statusMapeado = 'desconhecido';
    let atendida = null;
    
    if (status === 'completed' || status === 'answered') {
      statusMapeado = 'atendida';
      atendida = true;
    } else if (status === 'no-answer' || status === 'not_answered') {
      statusMapeado = 'nao_atendida';
      atendida = false;
    } else if (status === 'busy') {
      statusMapeado = 'ocupado';
      atendida = false;
    } else if (status === 'failed' || status === 'error') {
      statusMapeado = 'erro';
      atendida = false;
    } else if (status === 'ringing' || status === 'in-progress') {
      statusMapeado = 'chamando';
    }

    // Buscar registro da ligação
    const { data: ligacao, error: searchError } = await supabase
      .from('historico_ligacoes')
      .select('*')
      .eq('id_chamada_externa', callId)
      .single();

    if (searchError) {
      console.error('Erro ao buscar ligação:', searchError);
      return new Response(
        JSON.stringify({ error: 'Ligação não encontrada', details: searchError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar registro
    const updateData: any = {
      status: statusMapeado,
      dados_webhook: payload,
      atualizado_em: new Date().toISOString()
    };

    if (atendida !== null) {
      updateData.atendida = atendida;
    }

    if (duration) {
      updateData.duracao_segundos = parseInt(duration);
    }

    if (statusMapeado === 'atendida' && !ligacao.chamada_atendida_em) {
      updateData.chamada_atendida_em = new Date().toISOString();
    }

    if (['atendida', 'nao_atendida', 'ocupado', 'erro'].includes(statusMapeado)) {
      updateData.chamada_encerrada_em = new Date().toISOString();
    }

    if (payload.failure_reason) {
      updateData.motivo_falha = payload.failure_reason;
    }

    const { error: updateError } = await supabase
      .from('historico_ligacoes')
      .update(updateData)
      .eq('id', ligacao.id);

    if (updateError) {
      console.error('Erro ao atualizar ligação:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Ligação atualizada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook processado com sucesso',
        status: statusMapeado
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar webhook',
        message: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
