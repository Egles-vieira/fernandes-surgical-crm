/**
 * ============================================
 * WHATSAPP CLEANUP SESSÕES
 * 
 * Limpa sessões expiradas e dados órfãos
 * Executar via cron a cada hora
 * ============================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🧹 Iniciando cleanup de sessões WhatsApp...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const resultados = {
    sessoes_expiradas: 0,
    sessoes_arquivadas: 0,
    carrinhos_limpos: 0,
    logs_antigos_removidos: 0,
    erros: [] as string[]
  };

  try {
    // ========================================
    // 1. ARQUIVAR SESSÕES EXPIRADAS
    // Sessões que expiraram mas ainda existem
    // ========================================
    const agora = new Date().toISOString();
    
    const { data: sessoesExpiradas, error: errBusca } = await supabase
      .from("whatsapp_agente_sessoes")
      .select("id, conversa_id, estado_atual, total_mensagens, total_tools_executadas, criado_em, expira_em")
      .lt("expira_em", agora)
      .limit(100); // Processar em lotes
    
    if (errBusca) {
      console.error("❌ Erro ao buscar sessões expiradas:", errBusca);
      resultados.erros.push(`Busca sessões: ${errBusca.message}`);
    } else if (sessoesExpiradas && sessoesExpiradas.length > 0) {
      console.log(`📋 Encontradas ${sessoesExpiradas.length} sessões expiradas`);
      
      // Arquivar em tabela de histórico (se existir) ou apenas deletar
      for (const sessao of sessoesExpiradas) {
        try {
          // Logar antes de remover
          await supabase.from("whatsapp_agente_logs").insert({
            conversa_id: sessao.conversa_id,
            sessao_id: sessao.id,
            tipo_evento: "sessao_expirada_cleanup",
            tool_resultado: {
              estado_final: sessao.estado_atual,
              total_mensagens: sessao.total_mensagens,
              total_tools: sessao.total_tools_executadas,
              duracao_minutos: Math.round(
                (new Date(sessao.expira_em).getTime() - new Date(sessao.criado_em).getTime()) / (1000 * 60)
              )
            }
          });
          
          resultados.sessoes_arquivadas++;
        } catch (logErr) {
          console.warn(`⚠️ Erro ao logar sessão ${sessao.id}:`, logErr);
        }
      }
      
      // Deletar sessões expiradas
      const { error: errDelete } = await supabase
        .from("whatsapp_agente_sessoes")
        .delete()
        .lt("expira_em", agora);
      
      if (errDelete) {
        console.error("❌ Erro ao deletar sessões:", errDelete);
        resultados.erros.push(`Delete sessões: ${errDelete.message}`);
      } else {
        resultados.sessoes_expiradas = sessoesExpiradas.length;
        console.log(`✅ ${sessoesExpiradas.length} sessões expiradas removidas`);
      }
    }

    // ========================================
    // 2. LIMPAR CARRINHOS ÓRFÃOS
    // Conversas com carrinho cheio mas sem sessão ativa há mais de 24h
    // ========================================
    const limite24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: conversasOrfas, error: errOrfas } = await supabase
      .from("whatsapp_conversas")
      .select("id, produtos_carrinho")
      .not("produtos_carrinho", "eq", "[]")
      .lt("atualizado_em", limite24h)
      .limit(50);
    
    if (errOrfas) {
      console.error("❌ Erro ao buscar conversas órfãs:", errOrfas);
      resultados.erros.push(`Busca órfãs: ${errOrfas.message}`);
    } else if (conversasOrfas && conversasOrfas.length > 0) {
      // Verificar quais não têm sessão ativa
      for (const conversa of conversasOrfas) {
        const { data: sessaoAtiva } = await supabase
          .from("whatsapp_agente_sessoes")
          .select("id")
          .eq("conversa_id", conversa.id)
          .gte("expira_em", agora)
          .limit(1)
          .single();
        
        // Se não tem sessão ativa, limpar carrinho
        if (!sessaoAtiva) {
          const carrinhoTamanho = Array.isArray(conversa.produtos_carrinho) 
            ? conversa.produtos_carrinho.length 
            : 0;
          
          if (carrinhoTamanho > 0) {
            const { error: errLimpar } = await supabase
              .from("whatsapp_conversas")
              .update({ produtos_carrinho: [] })
              .eq("id", conversa.id);
            
            if (!errLimpar) {
              resultados.carrinhos_limpos++;
              console.log(`🧹 Carrinho limpo: conversa ${conversa.id} (${carrinhoTamanho} itens)`);
            }
          }
        }
      }
    }

    // ========================================
    // 3. LIMPAR LOGS ANTIGOS (mais de 30 dias)
    // Apenas logs de tipo "chamada_llm" para economizar espaço
    // ========================================
    const limite30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { count: logsRemovidos, error: errLogs } = await supabase
      .from("whatsapp_agente_logs")
      .delete({ count: "exact" })
      .lt("criado_em", limite30d)
      .in("tipo_evento", ["chamada_llm", "snapshot_carrinho_pos_adicao"]);
    
    if (errLogs) {
      console.error("❌ Erro ao limpar logs:", errLogs);
      resultados.erros.push(`Limpar logs: ${errLogs.message}`);
    } else {
      resultados.logs_antigos_removidos = logsRemovidos || 0;
      if (logsRemovidos && logsRemovidos > 0) {
        console.log(`🗑️ ${logsRemovidos} logs antigos removidos`);
      }
    }

    // ========================================
    // 4. LIMPAR JOBS COMPLETADOS (mais de 7 dias)
    // ========================================
    const limite7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from("whatsapp_jobs_queue")
      .delete()
      .lt("criado_em", limite7d)
      .in("status", ["completed", "failed"]);

    console.log("✅ Cleanup concluído:", resultados);

    return new Response(JSON.stringify({
      success: true,
      resultados,
      executado_em: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Erro no cleanup:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      resultados
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
