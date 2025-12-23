// ============================================
// Processar WhatsApp Jobs
// Fire-and-Forget: Processa jobs assíncronos da fila
// Segue diretrizes: Retry com Exponential Backoff (3 tentativas)
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  conversa_id: string;
  tipo: string;
  payload: {
    oportunidade_id?: string;
    oportunidade_codigo?: string;
    cliente_id?: string;
    valor_estimado?: number;
    total_itens?: number;
  };
  status: string;
  tentativas: number;
  max_tentativas: number;
}

// Função para calcular backoff exponencial
function calcularBackoffMs(tentativa: number): number {
  return Math.min(Math.pow(2, tentativa) * 1000, 30000); // Max 30 segundos
}

// Função para log no banco
async function logEvento(
  supabase: any,
  conversaId: string,
  tipoEvento: string,
  dados: any
) {
  try {
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: tipoEvento,
      tool_name: "processar-whatsapp-jobs",
      tool_resultado: dados
    });
  } catch (e) {
    console.error("⚠️ Erro ao logar evento:", e);
  }
}

// Função para enviar mensagem WhatsApp
async function enviarMensagemWhatsApp(
  supabase: any,
  conversaId: string,
  corpo: string
): Promise<boolean> {
  try {
    // Buscar dados da conversa
    const { data: conversa } = await supabase
      .from("whatsapp_conversas")
      .select("whatsapp_conta_id, whatsapp_contato_id")
      .eq("id", conversaId)
      .single();
    
    if (!conversa) {
      console.error("❌ Conversa não encontrada para envio de mensagem");
      return false;
    }
    
    // Criar mensagem pendente (usando colunas corretas da tabela)
    const { data: mensagem, error: msgError } = await supabase
      .from("whatsapp_mensagens")
      .insert({
        conversa_id: conversaId,
        whatsapp_conta_id: conversa.whatsapp_conta_id,
        whatsapp_contato_id: conversa.whatsapp_contato_id,
        direcao: "enviada",
        tipo_mensagem: "texto",            // ✅ Valor correto do enum
        corpo: corpo,
        status: "pendente",
        enviada_por_bot: true,             // ✅ Indica mensagem automática
        enviada_automaticamente: true      // ✅ Indica processamento automático
      })
      .select("id")
      .single();
    
    if (msgError) {
      console.error("❌ Erro ao criar mensagem:", msgError);
      return false;
    }
    
    // Chamar função de envio
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const response = await fetch(`${supabaseUrl}/functions/v1/meta-api-enviar-mensagem`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mensagemId: mensagem.id }),
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      console.error("❌ Erro ao enviar mensagem via Meta API");
      return false;
    }
    
    console.log(`✅ Mensagem enviada: ${mensagem.id}`);
    return true;
    
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem WhatsApp:", error);
    return false;
  }
}

// Processar job de cálculo Datasul e resposta
async function processarCalculoDatasulEResponder(
  supabase: any,
  job: Job
): Promise<{ sucesso: boolean; erro?: string; resultado?: any }> {
  const { oportunidade_id, oportunidade_codigo, valor_estimado, total_itens } = job.payload;
  
  if (!oportunidade_id) {
    return { sucesso: false, erro: "oportunidade_id não fornecido no payload" };
  }
  
  console.log(`🧮 Processando cálculo Datasul para oportunidade: ${oportunidade_codigo}`);
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  // Chamar Edge Function de cálculo com timeout
  const startTime = Date.now();
  let resultado: any;
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/calcular-oportunidade-datasul`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ oportunidade_id }),
      signal: AbortSignal.timeout(120000) // 2 min timeout
    });
    
    resultado = await response.json();
    const tempoMs = Date.now() - startTime;
    
    console.log(`📊 Cálculo Datasul concluído em ${tempoMs}ms`);
    
    if (!response.ok || !resultado.success) {
      // Verificar se é erro de negócio ou técnico
      const erroMsg = resultado.error || "Erro desconhecido no cálculo";
      console.error("❌ Erro no cálculo Datasul:", erroMsg);
      
      // Enviar mensagem de fallback ao cliente
      await enviarMensagemWhatsApp(
        supabase,
        job.conversa_id,
        `⚠️ Não consegui calcular os valores exatos no momento. O pedido foi criado com código *${oportunidade_codigo}* e valor estimado de R$ ${(valor_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.\n\nUm vendedor entrará em contato em breve com os valores finais, ou você pode tentar novamente mais tarde.`
      );
      
      await logEvento(supabase, job.conversa_id, "calculo_datasul_erro", {
        job_id: job.id,
        oportunidade_id,
        erro: erroMsg,
        tempo_ms: tempoMs
      });
      
      return { sucesso: false, erro: erroMsg };
    }
    
    // Sucesso! Gerar link da proposta automaticamente (sem mostrar totais)
    const resumo = resultado.resumo || {};
    const valorTotal = resumo.valor_total || valor_estimado || 0;
    
    console.log(`🔗 Gerando link da proposta automaticamente...`);
    
    // ======================================================
    // GERAR LINK DA PROPOSTA AUTOMATICAMENTE
    // ======================================================
    try {
      // Calcular data de expiração (30 dias)
      const validadeDias = 30;
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + validadeDias);
      
      // Gerar token único
      const publicToken = crypto.randomUUID();
      
      // Inserir token público
      const { data: tokenData, error: tokenError } = await supabase
        .from("propostas_publicas_tokens")
        .insert({
          oportunidade_id: oportunidade_id,
          public_token: publicToken,
          expira_em: dataExpiracao.toISOString(),
          ativo: true
        })
        .select("id, public_token")
        .single();
      
      if (tokenError) {
        console.error("❌ Erro ao gerar token da proposta:", tokenError);
        throw new Error(`Erro ao gerar token: ${tokenError.message}`);
      }
      
      console.log(`✅ Token gerado: ${publicToken}`);
      
      // Montar URL do link público
      // Usar domínio do projeto (pegar da oportunidade ou usar padrão)
      const projetoDomain = Deno.env.get("PUBLIC_SITE_URL") || "https://convertiai.online";
      const linkProposta = `${projetoDomain}/proposal-oportunidade/${publicToken}`;
      
      console.log(`🔗 Link gerado: ${linkProposta}`);
      
      // Montar mensagem com link (SEM MOSTRAR TOTAIS)
      const mensagem = `✅ *Proposta pronta!*\n\n` +
        `📋 *Código:* ${oportunidade_codigo}\n` +
        `📦 *Itens:* ${total_itens}\n\n` +
        `Acesse o link abaixo para conferir os detalhes e confirmar:\n\n` +
        `👉 ${linkProposta}\n\n` +
        `O link é válido por ${validadeDias} dias.`;
      
      // Enviar mensagem com link
      const enviou = await enviarMensagemWhatsApp(supabase, job.conversa_id, mensagem);
      
      if (enviou) {
        await logEvento(supabase, job.conversa_id, "proposta_link_enviado", {
          job_id: job.id,
          oportunidade_id,
          link: linkProposta,
          valor_total: valorTotal,
          tempo_ms: tempoMs,
          mensagem_enviada: true
        });
        
        // Atualizar sessão para estado "proposta_enviada"
        await supabase
          .from("whatsapp_agente_sessoes")
          .update({ estado_atual: "proposta_enviada" })
          .eq("conversa_id", job.conversa_id);
        
        return { 
          sucesso: true, 
          resultado: { 
            valor_total: valorTotal, 
            link_proposta: linkProposta,
            mensagem_enviada: true 
          } 
        };
      } else {
        console.error("❌ Falha ao enviar mensagem com link - job entrará em retry");
        
        await logEvento(supabase, job.conversa_id, "proposta_link_msg_falhou", {
          job_id: job.id,
          oportunidade_id,
          link: linkProposta,
          valor_total: valorTotal,
          tempo_ms: tempoMs,
          mensagem_enviada: false
        });
        
        return { sucesso: false, erro: "Link gerado, mas falha ao enviar mensagem" };
      }
      
    } catch (linkError) {
      const erroLink = linkError instanceof Error ? linkError.message : "Erro ao gerar link";
      console.error("❌ Erro ao gerar link da proposta:", erroLink);
      
      // Fallback: enviar mensagem simples sem link
      const mensagemFallback = `✅ *Proposta calculada!*\n\n` +
        `📋 *Código:* ${oportunidade_codigo}\n` +
        `📦 *Itens:* ${total_itens}\n\n` +
        `Não consegui gerar o link agora. Um vendedor entrará em contato em breve com a proposta completa.`;
      
      await enviarMensagemWhatsApp(supabase, job.conversa_id, mensagemFallback);
      
      await logEvento(supabase, job.conversa_id, "proposta_link_erro", {
        job_id: job.id,
        oportunidade_id,
        erro: erroLink,
        tempo_ms: tempoMs
      });
      
      // Ainda retorna sucesso pois o cálculo funcionou
      return { sucesso: true, resultado: { valor_total: valorTotal, link_erro: erroLink } };
    }
    
  } catch (fetchError) {
    const erro = fetchError instanceof Error ? fetchError.message : "Erro de conexão";
    console.error("❌ Erro de fetch no cálculo Datasul:", erro);
    
    // Se for timeout ou erro de rede, é retryable
    if (erro.includes("timeout") || erro.includes("network")) {
      return { sucesso: false, erro: `Timeout/Rede: ${erro}` };
    }
    
    return { sucesso: false, erro };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { job_id } = body;

    console.log(`📋 [processar-whatsapp-jobs] ====== INÍCIO ======`);
    console.log(`📋 job_id específico: ${job_id || 'nenhum (batch)'}`);

    // Buscar jobs pendentes
    let query = supabase
      .from("whatsapp_jobs_queue")
      .select("*")
      .eq("status", "pending")
      .lt("tentativas", 3) // Só tenta 3 vezes max
      .order("criado_em", { ascending: true })
      .limit(5); // Processar em batch pequeno
    
    // Se foi passado job_id específico, filtrar por ele
    if (job_id) {
      query = supabase
        .from("whatsapp_jobs_queue")
        .select("*")
        .eq("id", job_id)
        .in("status", ["pending", "error"]) // Permitir reprocessar erros
        .lt("tentativas", 3);
    }

    const { data: jobs, error: jobsError } = await query;

    if (jobsError) {
      console.error("❌ Erro ao buscar jobs:", jobsError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar jobs", details: jobsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      console.log("✅ Nenhum job pendente para processar");
      return new Response(
        JSON.stringify({ success: true, message: "Nenhum job pendente", processados: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 ${jobs.length} job(s) encontrado(s) para processar`);

    const resultados: any[] = [];

    for (const job of jobs as Job[]) {
      console.log(`\n🔄 Processando job ${job.id} (tipo: ${job.tipo}, tentativa: ${job.tentativas + 1})`);

      // Marcar como processing
      await supabase
        .from("whatsapp_jobs_queue")
        .update({ 
          status: "processing",
          tentativas: job.tentativas + 1
        })
        .eq("id", job.id);

      let resultado: { sucesso: boolean; erro?: string; resultado?: any };

      // Dispatcher de tipos de job
      switch (job.tipo) {
        case "calcular_datasul_e_responder":
          resultado = await processarCalculoDatasulEResponder(supabase, job);
          break;
        
        default:
          resultado = { sucesso: false, erro: `Tipo de job desconhecido: ${job.tipo}` };
      }

      // Atualizar status do job
      if (resultado.sucesso) {
        await supabase
          .from("whatsapp_jobs_queue")
          .update({
            status: "completed",
            processado_em: new Date().toISOString(),
            erro_mensagem: null
          })
          .eq("id", job.id);
        
        console.log(`✅ Job ${job.id} concluído com sucesso`);
        
      } else {
        // Verificar se deve tentar novamente
        const novasTentativas = job.tentativas + 1;
        
        if (novasTentativas >= job.max_tentativas) {
          // Máximo de tentativas atingido
          await supabase
            .from("whatsapp_jobs_queue")
            .update({
              status: "error",
              processado_em: new Date().toISOString(),
              erro_mensagem: resultado.erro
            })
            .eq("id", job.id);
          
          console.error(`❌ Job ${job.id} falhou permanentemente após ${novasTentativas} tentativas`);
          
          // Enviar mensagem de fallback
          await enviarMensagemWhatsApp(
            supabase,
            job.conversa_id,
            `⚠️ Desculpe, não consegui processar sua solicitação no momento. Por favor, tente novamente mais tarde ou aguarde que um atendente entrará em contato.`
          );
          
        } else {
          // Agendar retry com backoff
          const backoffMs = calcularBackoffMs(novasTentativas);
          const proximoRetry = new Date(Date.now() + backoffMs);
          
          await supabase
            .from("whatsapp_jobs_queue")
            .update({
              status: "pending",
              proximo_retry_em: proximoRetry.toISOString(),
              erro_mensagem: resultado.erro
            })
            .eq("id", job.id);
          
          console.log(`⏳ Job ${job.id} agendado para retry em ${backoffMs}ms (tentativa ${novasTentativas + 1})`);
        }
      }

      resultados.push({
        job_id: job.id,
        tipo: job.tipo,
        sucesso: resultado.sucesso,
        erro: resultado.erro
      });
    }

    const tempoTotal = Date.now() - startTime;
    console.log(`\n📋 [processar-whatsapp-jobs] ====== FIM (${tempoTotal}ms) ======`);

    return new Response(
      JSON.stringify({
        success: true,
        processados: resultados.length,
        resultados,
        tempo_ms: tempoTotal
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em processar-whatsapp-jobs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
