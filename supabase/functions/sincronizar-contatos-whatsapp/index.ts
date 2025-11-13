import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { normalizarNumeroWhatsApp, buscarContatoCRM } from '../_shared/phone-utils.ts';

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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Iniciando sincronização de contatos WhatsApp com CRM...');

    // Buscar todos os contatos WhatsApp que não têm vínculo com CRM
    const { data: contatosWhatsApp, error: erroConsulta } = await supabase
      .from('whatsapp_contatos')
      .select('id, numero_whatsapp, whatsapp_conta_id, contato_id')
      .is('contato_id', null);

    if (erroConsulta) {
      console.error('❌ Erro ao buscar contatos WhatsApp:', erroConsulta);
      throw erroConsulta;
    }

    console.log(`📊 Encontrados ${contatosWhatsApp?.length || 0} contatos WhatsApp sem vínculo CRM`);

    let vinculados = 0;
    let atualizados = 0;
    let erros = 0;

    // Processar cada contato
    for (const contatoWA of contatosWhatsApp || []) {
      try {
        // Normalizar o número
        const numeroNormalizado = normalizarNumeroWhatsApp(contatoWA.numero_whatsapp);
        
        // Atualizar o número normalizado se necessário
        if (numeroNormalizado !== contatoWA.numero_whatsapp) {
          console.log(`📝 Normalizando número: ${contatoWA.numero_whatsapp} → ${numeroNormalizado}`);
          const { error: erroUpdate } = await supabase
            .from('whatsapp_contatos')
            .update({ numero_whatsapp: numeroNormalizado })
            .eq('id', contatoWA.id);
          
          if (!erroUpdate) {
            atualizados++;
          }
        }

        // Buscar contato no CRM
        const contatoIdCRM = await buscarContatoCRM(supabase, numeroNormalizado);

        if (contatoIdCRM) {
          console.log(`🔗 Vinculando contato WhatsApp ${contatoWA.id} ao CRM ${contatoIdCRM}`);
          
          const { error: erroVinculo } = await supabase
            .from('whatsapp_contatos')
            .update({ contato_id: contatoIdCRM })
            .eq('id', contatoWA.id);

          if (erroVinculo) {
            console.error('❌ Erro ao vincular contato:', erroVinculo);
            erros++;
          } else {
            vinculados++;
          }
        }
      } catch (error) {
        console.error('❌ Erro ao processar contato:', error);
        erros++;
      }
    }

    const resultado = {
      total: contatosWhatsApp?.length || 0,
      vinculados,
      atualizados,
      erros,
      sucesso: true,
    };

    console.log('✅ Sincronização concluída:', resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        sucesso: false, 
        erro: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
