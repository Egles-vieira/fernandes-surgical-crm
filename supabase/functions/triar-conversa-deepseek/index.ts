import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FilaTriagem {
  id: string;
  nome: string;
  descricao: string | null;
  palavras_chave: string[];
  regras_triagem: string | null;
  prioridade_triagem: number;
  tipo_fila: string;
}

interface ResultadoTriagem {
  fila_id: string | null;
  fila_nome: string | null;
  confianca: number;
  justificativa: string;
  palavras_detectadas: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    const { conversaId, mensagens } = await req.json();

    if (!conversaId || !mensagens) {
      throw new Error('conversaId e mensagens são obrigatórios');
    }

    console.log('🤖 Iniciando triagem DeepSeek para conversa:', conversaId);
    console.log('📝 Mensagens:', mensagens.substring(0, 200) + '...');

    // Buscar filas disponíveis com regras de triagem
    const { data: filas, error: filasError } = await supabase
      .from('whatsapp_filas')
      .select('id, nome, descricao, palavras_chave, regras_triagem, prioridade_triagem, tipo_fila')
      .eq('esta_ativa', true)
      .order('prioridade_triagem', { ascending: true });

    if (filasError) {
      console.error('❌ Erro ao buscar filas:', filasError);
      throw filasError;
    }

    if (!filas || filas.length === 0) {
      console.log('⚠️ Nenhuma fila configurada');
      return new Response(
        JSON.stringify({
          fila_id: null,
          fila_nome: null,
          confianca: 0,
          justificativa: 'Nenhuma fila configurada no sistema',
          palavras_detectadas: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar prompt para DeepSeek
    const filasPrompt = filas.map((f: FilaTriagem) => {
      let info = `- ID: ${f.id}\n  Nome: ${f.nome}`;
      if (f.descricao) info += `\n  Descrição: ${f.descricao}`;
      if (f.palavras_chave?.length > 0) info += `\n  Palavras-chave: ${f.palavras_chave.join(', ')}`;
      if (f.regras_triagem) info += `\n  Regras: ${f.regras_triagem}`;
      info += `\n  Tipo: ${f.tipo_fila}`;
      info += `\n  Prioridade: ${f.prioridade_triagem}`;
      return info;
    }).join('\n\n');

    const prompt = `Você é um sistema de triagem inteligente de atendimento via WhatsApp para uma empresa B2B.

FILAS DISPONÍVEIS:
${filasPrompt}

MENSAGENS DO CLIENTE:
"""
${mensagens}
"""

TAREFA:
Analise as mensagens do cliente e classifique para qual fila o atendimento deve ser direcionado.

REGRAS:
1. Se as mensagens mencionarem produtos, preços, compras, pedidos ou cotações → Fila de VENDAS
2. Se as mensagens mencionarem problemas técnicos, defeitos, trocas ou garantia → Fila de SUPORTE
3. Se as mensagens mencionarem boletos, pagamentos, notas fiscais ou financeiro → Fila FINANCEIRO
4. Se as mensagens forem saudações genéricas sem contexto claro → Fila com menor prioridade (maior número)
5. Considere as palavras-chave e regras específicas de cada fila

RESPONDA EM JSON ESTRITO:
{
  "fila_id": "uuid da fila escolhida",
  "fila_nome": "nome da fila escolhida",
  "confianca": 0.0 a 1.0,
  "justificativa": "explicação breve de 1 frase",
  "palavras_detectadas": ["lista", "de", "palavras", "relevantes"]
}`;

    console.log('📤 Enviando para DeepSeek...');

    // Chamar DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro DeepSeek API:', response.status, errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const resultado: ResultadoTriagem = JSON.parse(data.choices[0].message.content);

    console.log('✅ Resultado da triagem:', JSON.stringify(resultado, null, 2));

    // Validar que a fila retornada existe
    if (resultado.fila_id) {
      const filaExiste = filas.some((f: FilaTriagem) => f.id === resultado.fila_id);
      if (!filaExiste) {
        console.warn('⚠️ Fila retornada não existe, usando primeira fila disponível');
        resultado.fila_id = filas[0].id;
        resultado.fila_nome = filas[0].nome;
      }
    } else {
      // Fallback para primeira fila (menor prioridade)
      resultado.fila_id = filas[0].id;
      resultado.fila_nome = filas[0].nome;
      resultado.justificativa = 'Fallback: sem correspondência clara';
    }

    // Registrar evento de triagem
    await supabase.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      tipo_evento: 'triagem_ia_classificacao',
      descricao: `IA classificou para: ${resultado.fila_nome} (${(resultado.confianca * 100).toFixed(0)}%)`,
      metadata: resultado,
      executado_por_bot: true,
    });

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na triagem DeepSeek:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        fila_id: null,
        fila_nome: null,
        confianca: 0,
        justificativa: 'Erro no processamento',
        palavras_detectadas: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
