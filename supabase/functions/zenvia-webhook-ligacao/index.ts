import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { z } from 'https://esm.sh/zod@3.22.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema for Zenvia webhook
const ZenviaWebhookSchema = z.object({
  id: z.string().min(1, "Call ID required").max(200).optional(),
  call_id: z.string().min(1, "Call ID required").max(200).optional(),
  status: z.string().min(1, "Status required").max(50),
  duration: z.union([z.string(), z.number()]).optional(),
  failure_reason: z.string().max(500).optional(),
}).passthrough();

// Verify Zenvia webhook signature
async function verifyZenviaSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) {
    console.warn('No signature provided - webhook signature verification disabled');
    return true; // Allow for backward compatibility
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const keyData = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payloadText = await req.text();
    const payload = JSON.parse(payloadText);
    console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const zenviaSecret = Deno.env.get('ZENVIA_WEBHOOK_SECRET') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify webhook signature if secret is configured
    if (zenviaSecret) {
      const signature = req.headers.get('x-zenvia-signature');
      const isValid = await verifyZenviaSignature(payloadText, signature, zenviaSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Validate payload structure
    const validationResult = ZenviaWebhookSchema.safeParse(payload);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid payload', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
