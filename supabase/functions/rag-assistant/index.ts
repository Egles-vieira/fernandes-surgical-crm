import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { classificarIntencao } from "./classifier.ts";
import { executarQueries } from "./queries.ts";
import { construirContexto } from "./context-builder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { messages, contextoUrl } = await req.json();

    console.log("🚀 RAG Assistant iniciado");
    console.log("📨 Total de mensagens:", messages.length);
    console.log("📍 Contexto URL:", contextoUrl);

    // Obter a API key do DeepSeek
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY não configurada");
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter a última pergunta do usuário
    const ultimaMensagem = messages[messages.length - 1];
    const pergunta = ultimaMensagem?.content || "";

    console.log("❓ Pergunta:", pergunta);

    // PASSO 1: Classificar intenção
    const intencao = await classificarIntencao(
      pergunta,
      contextoUrl || { tipo: 'geral', rota: '/' },
      DEEPSEEK_API_KEY
    );

    console.log("🎯 Intenção classificada:", {
      tipo: intencao.tipo,
      subtipo: intencao.subtipo,
      precisaBuscarDados: intencao.precisaBuscarDados,
      confianca: intencao.confianca
    });

    let contextoEnriquecido = "";

    // PASSO 2: Buscar dados se necessário
    if (intencao.precisaBuscarDados) {
      const dadosContexto = await executarQueries(
        intencao,
        contextoUrl || { tipo: 'geral', rota: '/' },
        supabase
      );

      console.log("📊 Dados recuperados:", dadosContexto.length, "conjuntos");

      // PASSO 3: Construir contexto estruturado
      contextoEnriquecido = construirContexto(
        intencao,
        dadosContexto,
        contextoUrl || { tipo: 'geral', rota: '/' }
      );
    } else {
      // Contexto básico para perguntas gerais
      contextoEnriquecido = `Você é um assistente inteligente do sistema ConvertIA CRM.

CONTEXTO DO SISTEMA:
- Sistema de CRM completo com gestão de clientes, vendas, tickets e equipes
- Integração com WhatsApp para atendimento
- Sistema de cotações e análise de produtos com IA
- Gestão de metas e performance de vendedores
- Módulo de URA (atendimento automático)
- Cadastro inteligente via CNPJ usando APIs externas

SUAS RESPONSABILIDADES:
1. Ajudar usuários a navegar e usar o sistema
2. Responder perguntas sobre funcionalidades
3. Sugerir melhores práticas
4. Orientar sobre como realizar tarefas

DIRETRIZES:
- Seja conciso e direto
- Use linguagem profissional mas amigável
- Use formatação markdown para melhor legibilidade
- Quando não souber algo, seja honesto
- Sugira próximos passos quando apropriado
`;
    }

    const tempoClassificacao = Date.now() - startTime;
    console.log(`⏱️ Tempo de classificação e busca: ${tempoClassificacao}ms`);

    // PASSO 4: Preparar mensagens para DeepSeek
    const deepseekMessages = [
      { role: "system", content: contextoEnriquecido },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    console.log("🤖 Chamando DeepSeek API com streaming...");
    console.log("📏 Tamanho do contexto:", contextoEnriquecido.length, "caracteres");

    // PASSO 5: Chamar DeepSeek com streaming
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: deepseekMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na DeepSeek API:", response.status, errorText);
      
      let errorMessage = "Erro ao processar sua pergunta";
      if (response.status === 429) {
        errorMessage = "Muitas requisições. Aguarde um momento.";
      } else if (response.status === 401) {
        errorMessage = "API key inválida. Verifique a configuração.";
      }
      
      throw new Error(errorMessage);
    }

    const tempoTotal = Date.now() - startTime;
    console.log(`✅ RAG processado com sucesso em ${tempoTotal}ms`);
    console.log(`📈 Estatísticas:
  - Classificação: ${intencao.tipo} (${(intencao.confianca * 100).toFixed(0)}%)
  - Dados buscados: ${intencao.precisaBuscarDados ? 'Sim' : 'Não'}
  - Tempo total: ${tempoTotal}ms
`);

    // Retornar o stream diretamente
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ Erro no RAG Assistant:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
