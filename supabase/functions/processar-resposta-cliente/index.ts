import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RespostaProcessada {
  acao: 'aceitar' | 'rejeitar' | 'negociar' | 'duvida';
  confianca: number;
  novosValores?: {
    descontoSolicitado?: number;
    novaQuantidade?: Record<string, number>;
  };
  motivoRejeicao?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mensagemTexto, propostaId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');

    if (!deepseekKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    });

    console.log('🔍 Processando resposta do cliente para proposta:', propostaId);

    // Buscar dados da proposta
    const { data: proposta, error: propostaError } = await supabase
      .from('whatsapp_propostas_comerciais')
      .select('numero_proposta, valor_total, subtotal, desconto_valor')
      .eq('id', propostaId)
      .single();

    if (propostaError || !proposta) {
      throw new Error('Proposta não encontrada');
    }

    // Prompt para análise da resposta
    const prompt = `Você é um analisador de respostas de clientes para propostas comerciais.

PROPOSTA:
- Número: ${proposta.numero_proposta}
- Valor Total: R$ ${proposta.valor_total.toFixed(2)}
- Desconto Atual: R$ ${proposta.desconto_valor?.toFixed(2) || '0.00'}

MENSAGEM DO CLIENTE:
"${mensagemTexto}"

TAREFA:
Analise a intenção do cliente e retorne JSON estrito:
{
  "acao": string, // Uma de: aceitar, rejeitar, negociar, duvida
  "confianca": number, // 0-1
  "novosValores": {
    "descontoSolicitado": number, // Valor ou percentual de desconto solicitado
    "novaQuantidade": {} // Objeto com produto_id: quantidade se cliente mudou quantidade
  },
  "motivoRejeicao": string // Se rejeitou, qual o motivo
}

EXEMPLOS:
- "Ok, fechou!" -> acao: aceitar
- "Não quero mais" -> acao: rejeitar
- "Muito caro, faz por R$ 1000?" -> acao: negociar, novosValores: {descontoSolicitado: valor implícito}
- "Pode fazer 10% de desconto?" -> acao: negociar, novosValores: {descontoSolicitado: 10}
- "Qual o prazo de entrega?" -> acao: duvida`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const resultado: RespostaProcessada = JSON.parse(data.choices[0].message.content);

    console.log('✅ Resposta processada:', resultado);

    // Registrar interação
    await supabase.from('whatsapp_interacoes').insert({
      proposta_id: propostaId,
      tipo_evento: 'resposta_cliente_processada',
      descricao: `Cliente ${resultado.acao} a proposta`,
      metadata: resultado,
      executado_por_bot: true,
    });

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao processar resposta:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
