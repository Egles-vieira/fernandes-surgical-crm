import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function formatarPropostaWhatsApp(proposta: any, itens: any[]): Promise<string> {
  let mensagem = `*📋 PROPOSTA ${proposta.numero_proposta}*\n\n`;
  
  itens.forEach((item, idx) => {
    mensagem += `${idx + 1}. *${item.produtos?.nome || 'Produto'}*\n`;
    mensagem += `   Cód: ${item.produtos?.referencia_interna}\n`;
    mensagem += `   Qtd: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}\n`;
    mensagem += `   Subtotal: R$ ${item.subtotal_item.toFixed(2)}\n\n`;
  });

  mensagem += `━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `*Subtotal:* R$ ${proposta.subtotal.toFixed(2)}\n`;
  
  if (proposta.desconto_valor > 0) {
    mensagem += `*Desconto (${proposta.desconto_percentual.toFixed(1)}%):* -R$ ${proposta.desconto_valor.toFixed(2)}\n`;
  }
  
  if (proposta.valor_frete > 0) {
    mensagem += `*Frete:* R$ ${proposta.valor_frete.toFixed(2)}\n`;
  }
  
  if (proposta.impostos_valor > 0) {
    mensagem += `*Impostos (${proposta.impostos_percentual.toFixed(1)}%):* R$ ${proposta.impostos_valor.toFixed(2)}\n`;
  }
  
  mensagem += `━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `*💰 VALOR TOTAL: R$ ${proposta.valor_total.toFixed(2)}*\n\n`;
  mensagem += `📅 Válida até: ${new Date(proposta.valida_ate || Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}\n\n`;
  mensagem += `O que você acha? Podemos fechar esse pedido?`;
  
  return mensagem;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propostaId, conversaId } = await req.json();

    if (!propostaId || !conversaId) {
      throw new Error('propostaId e conversaId são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

    console.log('📤 Enviando proposta via WhatsApp:', propostaId);

    // Buscar proposta
    const { data: proposta, error: propostaError } = await supabase
      .from('whatsapp_propostas_comerciais')
      .select('*')
      .eq('id', propostaId)
      .single();

    if (propostaError || !proposta) {
      throw new Error('Proposta não encontrada');
    }

    // Buscar itens da proposta com produtos
    const { data: itens, error: itensError } = await supabase
      .from('whatsapp_propostas_itens')
      .select(`
        *,
        produtos:produto_id (
          nome,
          referencia_interna
        )
      `)
      .eq('proposta_id', propostaId);

    if (itensError || !itens) {
      throw new Error('Erro ao buscar itens da proposta');
    }

    // Formatar mensagem
    const mensagemFormatada = await formatarPropostaWhatsApp(proposta, itens);

    // Buscar conversa para pegar conta WhatsApp
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('whatsapp_conta_id, whatsapp_contato_id')
      .eq('id', conversaId)
      .single();

    if (!conversa) {
      throw new Error('Conversa não encontrada');
    }

    // Buscar contato
    const { data: contato } = await supabase
      .from('whatsapp_contatos')
      .select('numero_whatsapp')
      .eq('id', conversa.whatsapp_contato_id)
      .single();

    if (!contato) {
      throw new Error('Contato não encontrado');
    }

    // Criar mensagem no banco
    const { data: mensagem, error: mensagemError } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        conversa_id: conversaId,
        whatsapp_conta_id: conversa.whatsapp_conta_id,
        direcao: 'saida',
        tipo_mensagem: 'text',
        corpo: mensagemFormatada,
        status: 'pendente',
        enviada_por_bot: true,
        metadata: {
          proposta_id: propostaId,
          tipo: 'proposta_comercial'
        }
      })
      .select()
      .single();

    if (mensagemError) {
      throw new Error('Erro ao criar mensagem');
    }

    // Enviar via adapter (W-API ou Gupshup)
    const { data: envioData, error: envioError } = await supabase.functions.invoke(
      'w-api-enviar-mensagem',
      { body: { mensagemId: mensagem.id } }
    );

    if (envioError) {
      console.error('Erro ao enviar via W-API:', envioError);
      
      // Tentar Gupshup como fallback
      const { data: gupshupData } = await supabase.functions.invoke(
        'gupshup-enviar-mensagem',
        { body: { mensagemId: mensagem.id } }
      );
      
      if (!gupshupData) {
        throw new Error('Falha ao enviar proposta por ambos os provedores');
      }
    }

    // Atualizar status da proposta
    await supabase
      .from('whatsapp_propostas_comerciais')
      .update({ 
        status: 'enviada',
        enviada_em: new Date().toISOString()
      })
      .eq('id', propostaId);

    // Registrar interação
    await supabase.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      tipo_evento: 'proposta_enviada',
      descricao: `Proposta ${proposta.numero_proposta} enviada via WhatsApp`,
      metadata: { proposta_id: propostaId },
      executado_por_bot: true
    });

    console.log('✅ Proposta enviada com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        mensagem_id: mensagem.id,
        proposta_numero: proposta.numero_proposta
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar proposta:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
