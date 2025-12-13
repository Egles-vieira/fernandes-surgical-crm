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

    const { conversaId, filaId, unidadeId, forcarDistribuicao = false } = await req.json();

    if (!conversaId) {
      throw new Error('conversaId é obrigatório');
    }

    console.log('🔄 Distribuindo conversa:', { conversaId, filaId, unidadeId });

    // Call the database function for distribution
    const { data, error } = await supabase.rpc('distribuir_conversa_whatsapp', {
      p_conversa_id: conversaId,
      p_fila_id: filaId || null,
    });

    if (error) {
      console.error('❌ Distribution error:', error);
      throw error;
    }

    const result = data as { sucesso: boolean; atendente_id?: string; motivo?: string };

    if (result.sucesso && result.atendente_id) {
      // Get attendant info
      const { data: atendente } = await supabase
        .from('perfis_usuario')
        .select('id, nome')
        .eq('id', result.atendente_id)
        .single();

      // Audit log
      await supabase.from('whatsapp_auditoria').insert({
        tipo_evento: 'conversa_distribuida',
        descricao: `Conversa distribuída para ${atendente?.nome || 'atendente'}`,
        usuario_id: result.atendente_id,
        whatsapp_conversa_id: conversaId,
        dados_evento: {
          atendente_id: result.atendente_id,
          atendente_nome: atendente?.nome,
          fila_id: filaId,
          unidade_id: unidadeId,
        },
      });

      // Send notification to attendant
      await supabase.from('notificacoes').insert({
        user_id: result.atendente_id,
        tipo: 'whatsapp_nova_conversa',
        titulo: 'Nova conversa WhatsApp',
        descricao: 'Uma nova conversa foi atribuída a você',
        dados: { conversa_id: conversaId },
      });

      return new Response(
        JSON.stringify({
          success: true,
          atendenteId: result.atendente_id,
          atendentNome: atendente?.nome,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No attendant available - add to queue
    console.log('⏳ No attendant available, adding to queue:', result.motivo);

    // Check if already in queue
    const { data: existingQueue } = await supabase
      .from('whatsapp_fila_espera')
      .select('id')
      .eq('conversa_id', conversaId)
      .eq('status', 'aguardando')
      .single();

    if (!existingQueue) {
      // Get conversation priority
      const { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('prioridade')
        .eq('id', conversaId)
        .single();

      await supabase.from('whatsapp_fila_espera').insert({
        conversa_id: conversaId,
        fila_id: filaId || null,
        unidade_id: unidadeId || null,
        prioridade: conversa?.prioridade || 'normal',
        status: 'aguardando',
      });

      // Update conversation
      await supabase
        .from('whatsapp_conversas')
        .update({
          em_distribuicao: true,
          distribuicao_iniciada_em: new Date().toISOString(),
          tentativas_distribuicao: 1,
        })
        .eq('id', conversaId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        queued: true,
        reason: result.motivo || 'Nenhum atendente disponível',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in whatsapp-distribuir-conversa:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
