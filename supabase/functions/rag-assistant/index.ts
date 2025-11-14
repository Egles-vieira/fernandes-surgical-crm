import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const { messages, pergunta } = await req.json();

    // Obter a API key do DeepSeek
    const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
    if (!DEEPSEEK_API_KEY) {
      throw new Error("DEEPSEEK_API_KEY não configurada");
    }

    // Inicializar cliente Supabase para buscar contexto
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar contexto relevante do sistema (exemplo: documentos, FAQs, etc)
    // TODO: Implementar busca vetorial quando necessário
    const contextoSistema = `
Você é um assistente inteligente do sistema ConvertIA CRM.

Contexto do Sistema:
- Sistema de CRM completo com gestão de clientes, vendas, tickets e equipes
- Integração com WhatsApp para atendimento
- Sistema de cotações e análise de produtos com IA
- Gestão de metas e performance de vendedores
- Módulo de URA (atendimento automático)
- Cadastro inteligente via CNPJ usando APIs externas

Suas responsabilidades:
1. Ajudar usuários a navegar e usar o sistema
2. Responder perguntas sobre funcionalidades
3. Fornecer insights sobre dados quando solicitado
4. Auxiliar na resolução de problemas
5. Sugerir melhores práticas

Diretrizes:
- Seja conciso e direto
- Use linguagem profissional mas amigável
- Quando não souber algo, seja honesto
- Sugira próximos passos quando apropriado
- Contextualize suas respostas baseado na tela atual do usuário
`;

    // Preparar mensagens para DeepSeek
    const deepseekMessages = [
      { role: "system", content: contextoSistema },
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    console.log("Chamando DeepSeek API com streaming...");

    // Fazer chamada para DeepSeek API
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
      console.error("Erro na DeepSeek API:", response.status, errorText);
      
      let errorMessage = "Erro ao processar sua pergunta";
      if (response.status === 429) {
        errorMessage = "Muitas requisições. Aguarde um momento.";
      } else if (response.status === 401) {
        errorMessage = "API key inválida. Verifique a configuração.";
      }
      
      throw new Error(errorMessage);
    }

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
    console.error("Erro no RAG Assistant:", error);
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
