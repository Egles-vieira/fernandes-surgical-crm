/**
 * ============================================
 * AGENTE VENDAS WHATSAPP V4 - NOVAS TOOLS
 * Tools para Pipeline Spot + Datasul + Link Proposta
 * ============================================
 */

// ============ DEFINIÇÕES DAS TOOLS ============

export const TOOLS_V4 = [
  {
    type: "function",
    function: {
      name: "identificar_cliente",
      description: `Identifica o cliente para faturamento. Use quando:
1) Cliente informar código Datasul ou CNPJ
2) Antes de criar proposta/oportunidade
3) Para validar dados de faturamento

RETORNA: cliente_id, nome, cnpj, cod_emitente, endereços cadastrados`,
      parameters: {
        type: "object",
        properties: {
          codigo_emitente: {
            type: "string",
            description: "Código do cliente no Datasul (ex: '123456')"
          },
          cnpj: {
            type: "string",
            description: "CNPJ do cliente (ex: '12.345.678/0001-90')"
          },
          usar_vinculo_whatsapp: {
            type: "boolean",
            description: "Buscar pelo vínculo do contato WhatsApp (default: true se nenhum outro param)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "criar_oportunidade_spot",
      description: `Cria uma oportunidade no Pipeline Spot com os produtos selecionados.
OBRIGATÓRIO antes de calcular preços no Datasul.

Use quando: cliente confirmou os produtos desejados + você já identificou o cliente

RETORNA: oportunidade_id, codigo da oportunidade`,
      parameters: {
        type: "object",
        properties: {
          cliente_id: {
            type: "string",
            description: "UUID do cliente (retornado por identificar_cliente)"
          },
          itens: {
            type: "array",
            description: "Lista de produtos com quantidade",
            items: {
              type: "object",
              properties: {
                produto_id: { type: "string", description: "UUID do produto" },
                quantidade: { type: "number", description: "Quantidade desejada" },
                preco_unitario: { type: "number", description: "Preço unitário sugerido" }
              },
              required: ["produto_id", "quantidade"]
            }
          },
          observacoes: {
            type: "string",
            description: "Observações adicionais para a oportunidade"
          }
        },
        required: ["cliente_id", "itens"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calcular_cesta_datasul",
      description: `OBRIGATÓRIO antes de apresentar valores finais ao cliente.
Calcula impostos, descontos e valores via API Datasul (ERP).

Use APENAS após ter criado a oportunidade com criar_oportunidade_spot.

RETORNA: valores calculados por item com impostos + resumo total`,
      parameters: {
        type: "object",
        properties: {
          oportunidade_id: {
            type: "string",
            description: "UUID da oportunidade criada"
          }
        },
        required: ["oportunidade_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "gerar_link_proposta",
      description: `Gera link público da proposta para enviar ao cliente.
O cliente pode aceitar ou recusar diretamente pelo link.

Use APÓS calcular no Datasul e apresentar valores ao cliente.

RETORNA: URL do link público da proposta`,
      parameters: {
        type: "object",
        properties: {
          oportunidade_id: {
            type: "string",
            description: "UUID da oportunidade"
          },
          validade_dias: {
            type: "number",
            description: "Dias de validade do link (default: 7)"
          }
        },
        required: ["oportunidade_id"]
      }
    }
  }
];

// ============ CONSTANTES ============

const PIPELINE_SPOT_ID = "d7775301-2f80-4f65-9b1f-174253d69cea";
const ESTAGIO_PROPOSTA_ID = "42182c80-53b3-471b-a31f-cd4aa3fdc9ef"; // Proposta - ordem 3
const ESTAGIO_FECHAMENTO_ID = "30aafadc-ce09-4144-b772-c9f27d973455"; // Fechamento - ordem 6

// ============ EXECUTORES DAS TOOLS ============

/**
 * Identificar cliente por código Datasul, CNPJ ou vínculo WhatsApp
 */
export async function executarIdentificarCliente(
  args: { codigo_emitente?: string; cnpj?: string; usar_vinculo_whatsapp?: boolean },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🔍 [Tool] identificar_cliente", args);
  
  try {
    let cliente: any = null;
    
    // 1. Busca por código emitente (Datasul)
    if (args.codigo_emitente) {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_emit, nome_fantasia, cgc, cod_emitente")
        .eq("cod_emitente", Number(args.codigo_emitente))
        .limit(1)
        .single();
      cliente = data;
      console.log("📋 Busca por cod_emitente:", cliente ? "encontrado" : "não encontrado");
    }
    
    // 2. Busca por CNPJ
    if (!cliente && args.cnpj) {
      const cnpjLimpo = args.cnpj.replace(/\D/g, "");
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_emit, nome_fantasia, cgc, cod_emitente")
        .or(`cgc.eq.${cnpjLimpo},cgc.eq.${args.cnpj}`)
        .limit(1)
        .single();
      cliente = data;
      console.log("📋 Busca por CNPJ:", cliente ? "encontrado" : "não encontrado");
    }
    
    // 3. Busca por vínculo WhatsApp (default se nenhum param)
    if (!cliente && (args.usar_vinculo_whatsapp !== false)) {
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select(`
          whatsapp_contato_id,
          whatsapp_contatos (
            contato_id,
            contatos (
              cliente_id,
              clientes (id, nome_emit, nome_fantasia, cgc, cod_emitente)
            )
          )
        `)
        .eq("id", conversaId)
        .single();
      
      if (conversa?.whatsapp_contatos) {
        const whatsappContato = Array.isArray(conversa.whatsapp_contatos) 
          ? conversa.whatsapp_contatos[0] 
          : conversa.whatsapp_contatos;
        
        if (whatsappContato?.contatos) {
          const contato = Array.isArray(whatsappContato.contatos) 
            ? whatsappContato.contatos[0] 
            : whatsappContato.contatos;
          
          if (contato?.clientes) {
            cliente = Array.isArray(contato.clientes) 
              ? contato.clientes[0] 
              : contato.clientes;
            console.log("📋 Busca por vínculo WhatsApp:", "encontrado");
          }
        }
      }
    }
    
    if (!cliente) {
      return {
        sucesso: false,
        erro: "cliente_nao_encontrado",
        mensagem: "Não encontrei seu cadastro. Pode me informar o código do cliente ou CNPJ?"
      };
    }
    
    // Buscar endereços do cliente
    const { data: enderecos } = await supabase
      .from("enderecos_clientes")
      .select("id, tipo, endereco, numero, bairro, cidade, estado, cep")
      .eq("cliente_id", cliente.id);
    
    const enderecosFormatados = (enderecos || []).map((e: any, idx: number) => ({
      id: e.id,
      numero: idx + 1,
      tipo: e.tipo || "entrega",
      endereco_completo: `${e.endereco || ""}${e.numero ? ", " + e.numero : ""}, ${e.bairro || ""}, ${e.cidade || ""}/${e.estado || ""} - CEP: ${e.cep || ""}`
    }));
    
    console.log(`✅ Cliente identificado: ${cliente.nome_emit} (${cliente.cgc})`);
    console.log(`📍 ${enderecosFormatados.length} endereço(s) encontrado(s)`);
    
    // Atualizar sessão se existir
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ 
        cliente_identificado_id: cliente.id,
        estado_atual: "identificacao"
      })
      .eq("conversa_id", conversaId);
    
    return {
      sucesso: true,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_fantasia || cliente.nome_emit,
      cnpj: cliente.cgc,
      cod_emitente: cliente.cod_emitente,
      enderecos: enderecosFormatados
    };
    
  } catch (error) {
    console.error("❌ Erro em identificar_cliente:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao buscar cliente" };
  }
}

/**
 * Validar se é um UUID válido
 */
function isValidUUID(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Criar oportunidade no Pipeline Spot com itens
 * INCLUI FALLBACK: Se cliente_id não for UUID válido, busca da sessão
 */
export async function executarCriarOportunidadeSpot(
  args: { cliente_id: string; itens: any[]; observacoes?: string },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("📦 [Tool] criar_oportunidade_spot", { cliente_id: args.cliente_id, qtd_itens: args.itens?.length });
  
  try {
    let clienteId = args.cliente_id;
    
    // FALLBACK: Se cliente_id não for UUID válido, buscar da sessão
    if (!isValidUUID(clienteId)) {
      console.warn(`⚠️ [FALLBACK] cliente_id "${clienteId}" não é UUID válido. Buscando da sessão...`);
      
      const { data: sessaoAtual } = await supabase
        .from("whatsapp_agente_sessoes")
        .select("cliente_identificado_id")
        .eq("conversa_id", conversaId)
        .gte("expira_em", new Date().toISOString())
        .order("criado_em", { ascending: false })
        .limit(1)
        .single();
      
      if (sessaoAtual?.cliente_identificado_id) {
        clienteId = sessaoAtual.cliente_identificado_id;
        console.log(`✅ [FALLBACK] Usando cliente_id da sessão: ${clienteId}`);
      } else {
        console.error("❌ [FALLBACK] Não encontrou cliente_id na sessão");
        return { 
          sucesso: false, 
          erro: "cliente_obrigatorio", 
          mensagem: "Preciso identificar o cliente primeiro. Use identificar_cliente antes." 
        };
      }
    }
    
    if (!args.itens || args.itens.length === 0) {
      return { sucesso: false, erro: "itens_obrigatorios", mensagem: "Preciso de pelo menos um produto" };
    }
    
    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nome_emit, nome_fantasia, vendedor_id, cod_emitente")
      .eq("id", clienteId)
      .single();
    
    if (!cliente) {
      console.error(`❌ Cliente não encontrado para ID: ${clienteId}`);
      return { sucesso: false, erro: "cliente_nao_encontrado", mensagem: "Cliente não encontrado. Vou identificar novamente." };
    }
    
    // Buscar produtos para calcular valor estimado
    const produtoIds = args.itens.map(i => i.produto_id);
    const { data: produtos } = await supabase
      .from("produtos")
      .select("id, nome, preco_venda, referencia_interna")
      .in("id", produtoIds);
    
    // Calcular valor estimado
    let valorEstimado = 0;
    const itensComPreco = args.itens.map(item => {
      const produto = produtos?.find((p: any) => p.id === item.produto_id);
      const preco = item.preco_unitario || produto?.preco_venda || 0;
      valorEstimado += preco * item.quantidade;
      return {
        ...item,
        preco_unitario: preco,
        produto_nome: produto?.nome,
        produto_referencia: produto?.referencia_interna
      };
    });
    
    // Criar oportunidade no Pipeline Spot
    const { data: oportunidade, error: opError } = await supabase
      .from("oportunidades")
      .insert({
        nome_oportunidade: `Spot WhatsApp - ${cliente.nome_fantasia || cliente.nome_emit}`,
        pipeline_id: PIPELINE_SPOT_ID,
        estagio_id: ESTAGIO_PROPOSTA_ID,
        cliente_id: clienteId,
        vendedor_id: cliente.vendedor_id,
        valor: valorEstimado,                    // ✅ Coluna correta (era valor_estimado)
        percentual_probabilidade: 50,
        origem_lead: "whatsapp_agente",
        descricao: args.observacoes || null,     // ✅ Coluna correta (era observacoes)
        data_entrada_estagio: new Date().toISOString()
      })
      .select("id, codigo")
      .single();
    
    if (opError) {
      console.error("❌ Erro ao criar oportunidade:", opError);
      return { sucesso: false, erro: "erro_criar_oportunidade", mensagem: "Erro ao criar oportunidade" };
    }
    
    console.log(`✅ Oportunidade criada: ${oportunidade.codigo}`);
    
    // Inserir itens na oportunidade
    const itensParaInserir = itensComPreco.map((item, idx) => ({
      oportunidade_id: oportunidade.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      ordem_linha: idx + 1
    }));
    
    const { error: itensError } = await supabase
      .from("itens_linha_oportunidade")
      .insert(itensParaInserir);
    
    if (itensError) {
      console.error("❌ Erro ao inserir itens:", itensError);
      // Não falhar, oportunidade já foi criada
    } else {
      console.log(`✅ ${itensParaInserir.length} itens inseridos`);
    }
    
    // Atualizar conversa e sessão
    await supabase
      .from("whatsapp_conversas")
      .update({ oportunidade_spot_id: oportunidade.id })
      .eq("id", conversaId);
    
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ 
        oportunidade_spot_id: oportunidade.id,
        estado_atual: "criacao",
        carrinho_itens: itensComPreco
      })
      .eq("conversa_id", conversaId);
    
    // Log
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "oportunidade_criada",
      tool_name: "criar_oportunidade_spot",
      tool_resultado: { oportunidade_id: oportunidade.id, codigo: oportunidade.codigo }
    });
    
    return {
      sucesso: true,
      oportunidade_id: oportunidade.id,
      codigo: oportunidade.codigo,
      valor_estimado: valorEstimado,
      total_itens: itensComPreco.length,
      itens: itensComPreco.map(i => ({
        produto: i.produto_nome,
        ref: i.produto_referencia,
        qtd: i.quantidade,
        preco: i.preco_unitario
      }))
    };
    
  } catch (error) {
    console.error("❌ Erro em criar_oportunidade_spot:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao criar oportunidade" };
  }
}

/**
 * Calcular cesta no Datasul (ERP)
 */
export async function executarCalcularCestaDatasul(
  args: { oportunidade_id: string },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🧮 [Tool] calcular_cesta_datasul", args);
  
  try {
    if (!args.oportunidade_id) {
      return { sucesso: false, erro: "oportunidade_obrigatoria", mensagem: "Preciso da oportunidade primeiro" };
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Chamar Edge Function calcular-oportunidade-datasul
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/functions/v1/calcular-oportunidade-datasul`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ oportunidade_id: args.oportunidade_id }),
      signal: AbortSignal.timeout(120000) // 2 min timeout
    });
    
    const tempoMs = Date.now() - startTime;
    
    const resultado = await response.json();
    
    // Log
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "calculo_datasul",
      tool_name: "calcular_cesta_datasul",
      tool_args: args,
      tool_resultado: resultado,
      tempo_execucao_ms: tempoMs
    });
    
    if (!response.ok || !resultado.success) {
      console.error("❌ Erro no cálculo Datasul:", resultado.error);
      
      // Verificar se é erro de negócio
      if (resultado.error_category === "negocio") {
        return {
          sucesso: false,
          erro: "erro_negocio_datasul",
          mensagem: resultado.error || "Erro no cálculo do ERP",
          detalhes: resultado.error_details
        };
      }
      
      return {
        sucesso: false,
        erro: "erro_calculo_datasul",
        mensagem: resultado.error || "Não consegui calcular no ERP. Tente novamente."
      };
    }
    
    console.log(`✅ Cálculo Datasul concluído em ${tempoMs}ms`);
    
    // Atualizar sessão
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ estado_atual: "calculo" })
      .eq("conversa_id", conversaId);
    
    // Buscar itens atualizados
    const { data: itens } = await supabase
      .from("itens_linha_oportunidade")
      .select(`
        id, quantidade, preco_unitario, ordem_linha,
        datasul_vl_tot_item, datasul_vl_merc_liq,
        produtos:produto_id (nome, referencia_interna)
      `)
      .eq("oportunidade_id", args.oportunidade_id)
      .order("ordem_linha");
    
    const itensFormatados = (itens || []).map((i: any) => ({
      produto: i.produtos?.nome,
      ref: i.produtos?.referencia_interna,
      qtd: i.quantidade,
      preco_unit: i.preco_unitario,
      valor_total: i.datasul_vl_tot_item || (i.preco_unitario * i.quantidade),
      valor_liquido: i.datasul_vl_merc_liq
    }));
    
    const valorTotal = itensFormatados.reduce((sum: number, i: any) => sum + (i.valor_total || 0), 0);
    
    return {
      sucesso: true,
      oportunidade_id: args.oportunidade_id,
      tempo_calculo_ms: tempoMs,
      resumo: {
        total_itens: itensFormatados.length,
        valor_total: valorTotal
      },
      itens: itensFormatados
    };
    
  } catch (error) {
    console.error("❌ Erro em calcular_cesta_datasul:", error);
    
    // Timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        sucesso: false,
        erro: "timeout_datasul",
        mensagem: "O cálculo demorou muito. Vou tentar novamente em instantes."
      };
    }
    
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao calcular no ERP" };
  }
}

/**
 * Gerar link público da proposta
 */
export async function executarGerarLinkProposta(
  args: { oportunidade_id: string; validade_dias?: number },
  supabase: any,
  conversaId: string
): Promise<any> {
  console.log("🔗 [Tool] gerar_link_proposta", args);
  
  try {
    if (!args.oportunidade_id) {
      return { sucesso: false, erro: "oportunidade_obrigatoria", mensagem: "Preciso da oportunidade primeiro" };
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Calcular data de expiração
    const diasValidade = args.validade_dias || 7;
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + diasValidade);
    
    // Chamar Edge Function gerar-link-proposta-oportunidade
    const response = await fetch(`${supabaseUrl}/functions/v1/gerar-link-proposta-oportunidade`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        oportunidadeId: args.oportunidade_id,
        config: {
          expira_em: expiraEm.toISOString(),
          mostrar_precos: true,
          mostrar_descontos: true,
          permitir_aceitar: true,
          permitir_recusar: true,
          permitir_download_pdf: true
        }
      })
    });
    
    const resultado = await response.json();
    
    if (!response.ok || !resultado.success) {
      console.error("❌ Erro ao gerar link:", resultado.error);
      return {
        sucesso: false,
        erro: "erro_gerar_link",
        mensagem: resultado.error || "Não consegui gerar o link da proposta"
      };
    }
    
    // Montar URL completa
    // A origem depende do ambiente - usar variável ou inferir
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://rzzzfprgnoywmmjwepzm.lovableproject.com";
    const linkProposta = `${appOrigin}/proposal-oportunidade/${resultado.token}`;
    
    console.log(`✅ Link gerado: ${linkProposta}`);
    
    // Atualizar sessão
    await supabase
      .from("whatsapp_agente_sessoes")
      .update({ estado_atual: "fechamento" })
      .eq("conversa_id", conversaId);
    
    // Log
    await supabase.from("whatsapp_agente_logs").insert({
      conversa_id: conversaId,
      tipo_evento: "link_proposta_gerado",
      tool_name: "gerar_link_proposta",
      tool_resultado: { token: resultado.token, link: linkProposta }
    });
    
    return {
      sucesso: true,
      link: linkProposta,
      token: resultado.token,
      validade_dias: diasValidade,
      expira_em: expiraEm.toISOString(),
      instrucoes: "Envie este link ao cliente. Ele poderá aceitar ou recusar a proposta diretamente."
    };
    
  } catch (error) {
    console.error("❌ Erro em gerar_link_proposta:", error);
    return { sucesso: false, erro: "erro_interno", mensagem: "Erro ao gerar link" };
  }
}

/**
 * Dispatcher para executar tool V4 pelo nome
 */
export async function executarToolV4(
  nomeTool: string,
  args: any,
  supabase: any,
  conversaId: string
): Promise<any> {
  switch (nomeTool) {
    case "identificar_cliente":
      return executarIdentificarCliente(args, supabase, conversaId);
    
    case "criar_oportunidade_spot":
      return executarCriarOportunidadeSpot(args, supabase, conversaId);
    
    case "calcular_cesta_datasul":
      return executarCalcularCestaDatasul(args, supabase, conversaId);
    
    case "gerar_link_proposta":
      return executarGerarLinkProposta(args, supabase, conversaId);
    
    default:
      return null; // Tool não é V4, deixar para o executor original
  }
}

/**
 * Verificar se é uma tool V4
 */
export function isToolV4(nomeTool: string): boolean {
  return ["identificar_cliente", "criar_oportunidade_spot", "calcular_cesta_datasul", "gerar_link_proposta"].includes(nomeTool);
}
