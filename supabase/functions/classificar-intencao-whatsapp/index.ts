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

REGRAS DE CLASSIFICAÇÃO:
1. SAUDAÇÃO: Cumprimentos simples como "oi", "olá", "bom dia", "tudo bem"
2. DUVIDA: Perguntas gerais sobre empresa, horários, formas de pagamento
3. BUSCAR_PRODUTO: Cliente menciona produto específico, código, modelo ou característica técnica
4. CONFIRMAR_ITENS: Cliente confirma quantidade de produtos já discutidos ("quero X", "fechou", "vou levar")
5. NEGOCIAR_PRECO: Cliente pede desconto ou negocia valores
6. FINALIZAR_PEDIDO: Cliente aceita proposta e quer fechar ("pode enviar", "confirmo", "fechado")
7. OUTRO: Qualquer outra mensagem

IMPORTANTE: 
- Se a mensagem é apenas cumprimento SEM mencionar produtos, classifique como SAUDACAO
- Se é uma pergunta geral SEM produto específico, classifique como DUVIDA
- Só classifique como BUSCAR_PRODUTO se houver menção clara a produto, código ou especificação técnica

TAREFA:
Classifique a intenção em JSON estrito com:
{
  "intencao": string, // Uma de: saudacao, duvida, buscar_produto, confirmar_itens, negociar_preco, finalizar_pedido, outro
  "confianca": number, // 0-1
  "palavrasChave": string[], // APENAS termos técnicos de produtos (marcas, modelos, especificações técnicas, códigos). NUNCA inclua verbos como "cotar", "comprar", "quero", "preciso"
  "entidades": {
    "produtos": string[], // Nomes de produtos mencionados OU produtos do contexto se aplicável
    "quantidades": number[], // Quantidades numéricas
    "valores": number[] // Valores monetários (sem R$)
  },
  "proximaAcao": string // Descrição do que o agente deve fazer
}

PALAVRAS QUE NUNCA DEVEM ESTAR EM palavrasChave:
- Verbos de ação: cotar, comprar, quero, preciso, gostaria, pode, tem, vende
- Cumprimentos: oi, olá, bom dia, boa tarde
- Quantificadores genéricos: muito, pouco, mais, menos
APENAS inclua termos técnicos: nomes de produtos, códigos, marcas, especificações, medidas

EXEMPLOS:
- "Oi, bom dia" -> intencao: saudacao
- "Tudo bem?" -> intencao: saudacao
- "Vocês trabalham com que?" -> intencao: duvida
- "Qual o horário de atendimento?" -> intencao: duvida
- "Tem sonda aramada 4,5?" -> intencao: buscar_produto
- "Preciso de parafuso sextavado M6" -> intencao: buscar_produto
- "Quero 10 unidades" (após discussão) -> intencao: confirmar_itens
- "Fechou, pode enviar" -> intencao: finalizar_pedido
- "Esse tá caro, faz desconto?" -> intencao: negociar_preco`;


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
