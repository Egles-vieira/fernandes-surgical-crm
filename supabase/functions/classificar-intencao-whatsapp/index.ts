import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntencaoClassificada {
  intencao: string;
  confianca: number;
  palavrasChave: string[];
  entidades: {
    produtos?: string[];
    quantidades?: number[];
    valores?: number[];
  };
  proximaAcao: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mensagemTexto, conversaId, contextoAnterior } = await req.json();

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

    console.log('🧠 Classificando intenção:', mensagemTexto);

    // Prompt estruturado para DeepSeek com contexto histórico
    const prompt = `Você é um classificador de intenções para um sistema de vendas via WhatsApp.

CONTEXTO ANTERIOR DA CONVERSA:
${contextoAnterior || 'Primeira interação'}

MENSAGEM ATUAL DO CLIENTE:
"${mensagemTexto}"

IMPORTANTE: Se o CONTEXTO ANTERIOR menciona produtos específicos e o cliente agora diz algo como "quero X unidades", "fechou", "vou levar", isso se refere aos produtos já discutidos.

TAREFA:
Classifique a intenção em JSON estrito com:
{
  "intencao": string, // Uma de: buscar_produto, confirmar_itens, negociar_preco, adicionar_produto, remover_produto, finalizar_pedido, duvida, saudacao, outro
  "confianca": number, // 0-1
  "palavrasChave": string[], // Termos relevantes extraídos
  "entidades": {
    "produtos": string[], // Nomes de produtos mencionados OU produtos do contexto se aplicável
    "quantidades": number[], // Quantidades numéricas
    "valores": number[] // Valores monetários (sem R$)
  },
  "proximaAcao": string // Descrição do que o agente deve fazer
}

EXEMPLOS:
- "Oi, bom dia" -> intencao: saudacao
- "Tem parafuso sextavado?" -> intencao: buscar_produto, palavrasChave: ["parafuso", "sextavado"]
- "Quero 10 unidades desse" (após falar de um produto) -> intencao: confirmar_itens, entidades: { quantidades: [10] }
- "Quero 1000 unidades" (após discussão de produtos) -> intencao: confirmar_itens, entidades: { quantidades: [1000] }
- "Fechou, pode enviar" -> intencao: finalizar_pedido
- "Esse tá caro, faz desconto?" -> intencao: negociar_preco

REGRA CRUCIAL: Se houver produtos no CONTEXTO ANTERIOR e o cliente mencionar quantidade ou confirmação (quero, vou levar, fechou), classifique como "confirmar_itens" ou "adicionar_produto", NÃO como "buscar_produto".`;

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
    const resultado: IntencaoClassificada = JSON.parse(data.choices[0].message.content);

    console.log('✅ Intenção classificada:', resultado);

    // Salvar na memória da conversa
    await supabase.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      tipo_evento: 'intencao_classificada',
      descricao: `Intenção: ${resultado.intencao}`,
      metadata: resultado,
      executado_por_bot: true,
    });

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao classificar intenção:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
