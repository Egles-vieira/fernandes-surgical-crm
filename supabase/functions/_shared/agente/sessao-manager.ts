/**
 * ============================================
 * GERENCIADOR DE SESSÃO DO AGENTE V4
 * Controla estado da conversa e expiração
 * ============================================
 */

export interface SessaoAgente {
  id: string;
  conversa_id: string;
  estado_atual: "coleta" | "identificacao" | "criacao" | "calculo" | "fechamento";
  cliente_identificado_id: string | null;
  oportunidade_spot_id: string | null;
  carrinho_itens: any[];
  criado_em: string;
  atualizado_em: string;
  expira_em: string;
  total_mensagens: number;
  total_tools_executadas: number;
}

/**
 * Obter ou criar sessão para a conversa
 */
export async function obterOuCriarSessao(
  supabase: any,
  conversaId: string
): Promise<SessaoAgente> {
  console.log("📋 Obtendo/criando sessão para conversa:", conversaId);
  
  // Tentar buscar sessão ativa (não expirada)
  const { data: sessaoExistente } = await supabase
    .from("whatsapp_agente_sessoes")
    .select("*")
    .eq("conversa_id", conversaId)
    .gte("expira_em", new Date().toISOString())
    .order("criado_em", { ascending: false })
    .limit(1)
    .single();
  
  if (sessaoExistente) {
    console.log("✅ Sessão ativa encontrada:", sessaoExistente.id);
    
    // Incrementar contador de mensagens
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ 
        total_mensagens: (sessaoExistente.total_mensagens || 0) + 1
        // O trigger cuida de atualizar atualizado_em e expira_em
      })
      .eq("id", sessaoExistente.id);
    
    return sessaoExistente;
  }
  
  // Criar nova sessão
  console.log("🆕 Criando nova sessão");
  
  const { data: novaSessao, error } = await supabase
    .from("whatsapp_agente_sessoes")
    .insert({
      conversa_id: conversaId,
      estado_atual: "coleta",
      carrinho_itens: [],
      total_mensagens: 1,
      total_tools_executadas: 0
    })
    .select()
    .single();
  
  if (error) {
    console.error("❌ Erro ao criar sessão:", error);
    // Retornar sessão virtual para não bloquear o fluxo
    return {
      id: "virtual",
      conversa_id: conversaId,
      estado_atual: "coleta",
      cliente_identificado_id: null,
      oportunidade_spot_id: null,
      carrinho_itens: [],
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      expira_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      total_mensagens: 1,
      total_tools_executadas: 0
    };
  }
  
  // Log de criação
  await supabase.from("whatsapp_agente_logs").insert({
    sessao_id: novaSessao.id,
    conversa_id: conversaId,
    tipo_evento: "sessao_criada"
  });
  
  console.log("✅ Nova sessão criada:", novaSessao.id);
  return novaSessao;
}

/**
 * Atualizar estado da sessão
 */
export async function atualizarEstadoSessao(
  supabase: any,
  conversaId: string,
  novoEstado: SessaoAgente["estado_atual"],
  dadosAdicionais?: Partial<SessaoAgente>
): Promise<void> {
  console.log(`📝 Atualizando estado da sessão: ${novoEstado}`);
  
  const updateData: any = { estado_atual: novoEstado };
  
  if (dadosAdicionais?.cliente_identificado_id) {
    updateData.cliente_identificado_id = dadosAdicionais.cliente_identificado_id;
  }
  
  if (dadosAdicionais?.oportunidade_spot_id) {
    updateData.oportunidade_spot_id = dadosAdicionais.oportunidade_spot_id;
  }
  
  if (dadosAdicionais?.carrinho_itens) {
    updateData.carrinho_itens = dadosAdicionais.carrinho_itens;
  }
  
  await supabase
    .from("whatsapp_agente_sessoes")
    .update(updateData)
    .eq("conversa_id", conversaId)
    .gte("expira_em", new Date().toISOString());
}

/**
 * Incrementar contador de tools executadas
 */
export async function incrementarToolsExecutadas(
  supabase: any,
  sessaoId: string
): Promise<void> {
  if (sessaoId === "virtual") return;
  
  await supabase.rpc("increment_sessao_tools", { sessao_id: sessaoId }).catch(() => {
    // Fallback se RPC não existir
    supabase
      .from("whatsapp_agente_sessoes")
      .update({ total_tools_executadas: supabase.raw("total_tools_executadas + 1") })
      .eq("id", sessaoId);
  });
}

/**
 * Registrar log do agente
 */
export async function registrarLogAgente(
  supabase: any,
  conversaId: string,
  sessaoId: string | null,
  dados: {
    tipo_evento: string;
    tool_name?: string;
    tool_args?: any;
    tool_resultado?: any;
    tempo_execucao_ms?: number;
    tokens_entrada?: number;
    tokens_saida?: number;
    erro_mensagem?: string;
    erro_stack?: string;
    llm_provider?: string;
  }
): Promise<void> {
  try {
    await supabase.from("whatsapp_agente_logs").insert({
      sessao_id: sessaoId !== "virtual" ? sessaoId : null,
      conversa_id: conversaId,
      ...dados
    });
  } catch (error) {
    console.error("❌ Erro ao registrar log:", error);
  }
}

/**
 * Buscar contexto da sessão para o prompt
 * IMPORTANTE: Inclui IDs explícitos para o LLM usar nas tool calls
 */
export function construirContextoSessao(sessao: SessaoAgente): string {
  const partes: string[] = [];
  
  partes.push(`ESTADO DA NEGOCIAÇÃO: ${traduzirEstado(sessao.estado_atual)}`);
  
  // CRÍTICO: Incluir o cliente_id explicitamente para o LLM usar
  if (sessao.cliente_identificado_id) {
    partes.push("✅ Cliente já identificado");
    partes.push(`   ➡️ CLIENTE_ID PARA USAR NAS TOOLS: ${sessao.cliente_identificado_id}`);
  } else {
    partes.push("⚠️ Cliente ainda NÃO identificado - use identificar_cliente primeiro");
  }
  
  // CRÍTICO: Incluir o oportunidade_id explicitamente
  if (sessao.oportunidade_spot_id) {
    partes.push("✅ Oportunidade criada no Pipeline Spot");
    partes.push(`   ➡️ OPORTUNIDADE_ID PARA USAR NAS TOOLS: ${sessao.oportunidade_spot_id}`);
  }
  
  if (sessao.carrinho_itens && sessao.carrinho_itens.length > 0) {
    partes.push(`🛒 Carrinho: ${sessao.carrinho_itens.length} item(ns)`);
  }
  
  return partes.join("\n");
}

function traduzirEstado(estado: string): string {
  const traducoes: Record<string, string> = {
    coleta: "Coletando produtos desejados",
    identificacao: "Identificando cliente",
    criacao: "Oportunidade criada, aguardando cálculo",
    calculo: "Valores calculados, aguardando confirmação",
    fechamento: "Link enviado, aguardando aceite"
  };
  return traducoes[estado] || estado;
}
