import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { contaId } = await req.json();

    // Buscar dados da conta W-API
    const { data: conta, error: contaError } = await supabase
      .from('whatsapp_contas')
      .select('instance_id_wapi, token_wapi, provedor')
      .eq('id', contaId)
      .eq('provedor', 'w_api')
      .single();

    if (contaError || !conta) {
      console.error('❌ Conta W-API não encontrada:', contaError);
      return new Response(
        JSON.stringify({ error: 'Conta W-API não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📲 Gerando QR Code para instância:', conta.instance_id_wapi);

    // Gerar QR Code via W-API
    const qrResponse = await fetch(
      `https://api.w-api.app/v1/instance/qr-code?instanceId=${conta.instance_id_wapi}&image=enable`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${conta.token_wapi}`,
        }
      }
    );

    const qrData = await qrResponse.json();
    console.log('📥 Resposta QR Code:', {
      status: qrResponse.status,
      ok: qrResponse.ok,
      hasQrcode: !!qrData.qrcode
    });

    if (!qrResponse.ok || qrData.error) {
      console.error('❌ Erro ao gerar QR Code:', qrData);
      return new Response(
        JSON.stringify({ 
          error: qrData.message || 'Erro ao gerar QR Code',
          details: qrData 
        }),
        { status: qrResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        qrcode: qrData.qrcode,
        instanceId: qrData.instanceId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na função w-api-gerar-qrcode:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
