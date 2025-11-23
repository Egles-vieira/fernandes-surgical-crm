import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversaId, propostaId, contatoId, valorTotal } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

    console.log('📊 Criando oportunidade no CRM...');

    // Buscar dados do contato
    const { data: contato, error: contatoError } = await supabase
      .from('contatos')
      .select('conta_id, nome_completo, primeiro_nome, sobrenome')
      .eq('id', contatoId)
      .single();

    if (contatoError || !contato) {
      throw new Error('Contato não encontrado');
    }

    // Buscar proposta
    const { data: proposta, error: propostaError } = await supabase
      .from('whatsapp_propostas_comerciais')
      .select('numero_proposta')
      .eq('id', propostaId)
      .single();

    if (propostaError || !proposta) {
      throw new Error('Proposta não encontrada');
    }

    // Nome do contato
    const nomeContato = contato.nome_completo || 
                       `${contato.primeiro_nome || ''} ${contato.sobrenome || ''}`.trim() ||
                       'Cliente';

    // Criar oportunidade
    const { data: oportunidade, error: oportunidadeError } = await supabase
      .from('oportunidades')
      .insert({
        conta_id: contato.conta_id,
        contato_id: contatoId,
        nome_oportunidade: `WhatsApp - ${nomeContato} - ${proposta.numero_proposta}`,
        valor: valorTotal,
        receita_esperada: valorTotal,
        percentual_probabilidade: 75, // Alta probabilidade (cliente já aceitou proposta)
        origem_lead: 'whatsapp',
        tipo: 'nova_venda',
        descricao: `Oportunidade gerada automaticamente pelo agente de vendas WhatsApp.\nProposta: ${proposta.numero_proposta}\nValor: R$ ${valorTotal.toFixed(2)}`,
      })
      .select()
      .single();

    if (oportunidadeError) {
      console.error('Erro ao criar oportunidade:', oportunidadeError);
      throw oportunidadeError;
    }

    console.log('✅ Oportunidade criada:', oportunidade.id);

    // Atualizar conversa com oportunidade
    await supabase
      .from('whatsapp_conversas')
      .update({ oportunidade_id: oportunidade.id })
      .eq('id', conversaId);

    // Atualizar proposta com oportunidade
    await supabase
      .from('whatsapp_propostas_comerciais')
      .update({ oportunidade_id: oportunidade.id })
      .eq('id', propostaId);

    // Registrar interação
    await supabase.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      proposta_id: propostaId,
      tipo_evento: 'oportunidade_criada',
      descricao: `Oportunidade ${oportunidade.id} criada no CRM`,
      metadata: { oportunidade_id: oportunidade.id },
      executado_por_bot: true,
    });

    return new Response(
      JSON.stringify({
        oportunidadeId: oportunidade.id,
        numero: oportunidade.id,
        status: 'criada',
        nomeOportunidade: oportunidade.nome_oportunidade,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao criar oportunidade:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
