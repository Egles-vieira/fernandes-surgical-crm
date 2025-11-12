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
      .select('instance_id_wapi, token_wapi, provedor, numero_whatsapp')
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

    console.log('🔍 Verificando status da instância:', conta.instance_id_wapi);

    // Verificar status via W-API
    const statusResponse = await fetch(
      `https://api.w-api.app/v1/instance/status-instance?instanceId=${conta.instance_id_wapi}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${conta.token_wapi}`,
        }
      }
    );

    const statusData = await statusResponse.json();
    console.log('📥 Status da instância:', {
      status: statusResponse.status,
      ok: statusResponse.ok,
      connected: statusData.connected,
      connectedPhone: statusData.connectedPhone
    });

    if (!statusResponse.ok) {
      console.error('❌ Erro ao verificar status:', statusData);
      return new Response(
        JSON.stringify({ 
          error: statusData.message || 'Erro ao verificar status',
          details: statusData 
        }),
        { status: statusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar status da conta no banco se conectada
    if (statusData.connected && statusData.connectedPhone) {
      await supabase
        .from('whatsapp_contas')
        .update({
          status: 'ativo',
          verificada: true,
          conectada_em: new Date().toISOString(),
          desconectada_em: null
        })
        .eq('id', contaId);
    } else {
      await supabase
        .from('whatsapp_contas')
        .update({
          status: 'desconectado',
          desconectada_em: new Date().toISOString()
        })
        .eq('id', contaId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        connected: statusData.connected || false,
        connectedPhone: statusData.connectedPhone || null,
        instanceId: statusData.instanceId,
        platform: statusData.platform,
        profilePictureUrl: statusData.profilePictureUrl,
        name: statusData.name,
        status: statusData.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na função w-api-verificar-status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
