import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Importar módulos do agente inteligente
import { buscarPerfilCliente } from "../_shared/agente/perfil-cliente.ts";
import { gerarRespostaInteligente, executarFerramenta } from "../_shared/agente/gerador-resposta.ts";
import { transcreverAudio, salvarMemoria } from "../_shared/agente/utils.ts";
import { formatarPropostaWhatsApp } from "../_shared/agente/proposta-handler.ts";
import { obterOuCriarSessao, registrarLogAgente } from "../_shared/agente/sessao-manager.ts";
import { chamarLLMComResultadosTools } from "../_shared/agente/llm-provider.ts";
import { isToolV4 } from "../_shared/agente/tools-v4.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sanitiza a resposta removendo textos de function calls vazados do DeepSeek
 */
function sanitizarResposta(texto: string | null): string | null {
  if (!texto) return texto;
  
  let limpo = texto.replace(/<｜DSML｜function_calls>[\s\S]*?<\/｜DSML｜function_calls>/g, '');
  limpo = limpo.replace(/<｜DSML｜[^>]*>[\s\S]*?<\/｜DSML｜[^>]*>/g, '');
  limpo = limpo.replace(/<｜DSML｜[^>]*>/g, '');
  limpo = limpo.replace(/<\/｜DSML｜[^>]*>/g, '');
  limpo = limpo.replace(/\[function_call:[\s\S]*?\]/g, '');
  limpo = limpo.replace(/\n{3,}/g, '\n\n').trim();
  
  return limpo || null;
}

/**
 * Construir system prompt V4 para segunda chamada
 */
function construirSystemPromptV4Resumido(perfilCliente: any, sessao: any): string {
  const ultimaCompraTexto = perfilCliente.ultima_compra_dias < 9999 ? `há ${perfilCliente.ultima_compra_dias} dias` : "nunca comprou";
  const marcadoresTexto = perfilCliente.marcadores?.length > 0 ? `- Marcadores: ${perfilCliente.marcadores.join(", ")}` : "";
  const estadoSessao = sessao?.estado_atual || "coleta";
  
  return `Você é o Beto, vendedor da Cirúrgica Fernandes.

CLIENTE: ${perfilCliente.nome || "não identificado"} | Tipo: ${perfilCliente.tipo} | Última compra: ${ultimaCompraTexto}
${marcadoresTexto}

ESTADO: ${estadoSessao}

ESTILO OBRIGATÓRIO:
- Tudo minúsculo, sem pontuação final, abreviações (vc, pra, tbm)
- Seja breve e direto, máximo 3 linhas por resposta
- Use os resultados das ferramentas para montar a resposta
- Se identificar_cliente retornou cliente, confirme: "é pra faturar no cnpj XX?"
- Se criar_oportunidade_spot retornou, diga: "criei a oportunidade, vou calcular..."
- Se calcular_cesta_datasul retornou valores, apresente o total
- Se gerar_link_proposta retornou link, envie: "aqui está sua proposta: [link]"`;
}

// === HANDLER PRINCIPAL ===

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    let { mensagemTexto, conversaId, tipoMensagem, urlMidia, clienteId, mensagemId } = await req.json();

    console.log("🤖 Agente Vendas V4 - Iniciando", { conversaId, tipoMensagem, clienteId, mensagemId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!deepseekApiKey || !openAiApiKey) {
      throw new Error("Chaves de API faltando");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // === OBTER/CRIAR SESSÃO V4 ===
    const sessao = await obterOuCriarSessao(supabase, conversaId);
    console.log("📋 Sessão:", sessao.id, "| Estado:", sessao.estado_atual);

    // === FALLBACK: Buscar mensagemTexto pelo mensagemId se não veio no body ===
    if (!mensagemTexto && mensagemId) {
      console.log("🔍 mensagemTexto não recebido, buscando pelo mensagemId:", mensagemId);
      const { data: msgData } = await supabase
        .from('whatsapp_mensagens')
        .select('corpo')
        .eq('id', mensagemId)
        .single();
      
      mensagemTexto = msgData?.corpo || '';
      console.log("📝 mensagemTexto recuperada:", mensagemTexto?.substring(0, 50));
    }

    // Validar que mensagemTexto existe e não está vazia
    if (!mensagemTexto || mensagemTexto.trim() === '') {
      console.warn("⚠️ Mensagem vazia, ignorando...");
      return new Response(JSON.stringify({ resposta: null, erro: 'Mensagem vazia' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === RESOLUÇÃO DE CLIENTE ===
    if (!clienteId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversas")
        .select("whatsapp_contato_id")
        .eq("id", conversaId)
        .single();

      if (conv?.whatsapp_contato_id) {
        const { data: contato } = await supabase
          .from("whatsapp_contatos")
          .select("contato_id")
          .eq("id", conv.whatsapp_contato_id)
          .single();

        if (contato?.contato_id) {
          const { data: contatoCRM } = await supabase
            .from("contatos")
            .select("cliente_id")
            .eq("id", contato.contato_id)
            .single();

          clienteId = contatoCRM?.cliente_id;
        }
      }

      console.log("🔍 Cliente ID:", clienteId || "não encontrado");
    }

    // === BUSCAR PERFIL DO CLIENTE ===
    const perfilCliente = await buscarPerfilCliente(clienteId, supabase);
    console.log("👤 Perfil:", perfilCliente.tipo);

    // === TRANSCRIÇÃO DE ÁUDIO (se necessário) ===
    if (tipoMensagem === "audio" || tipoMensagem === "voice") {
      if (!urlMidia) {
        return new Response(JSON.stringify({ resposta: "Não consegui acessar seu áudio. Tente novamente?" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transcricao = await transcreverAudio(urlMidia, openAiApiKey, supabase, conversaId);
      if (!transcricao) {
        return new Response(JSON.stringify({ resposta: "Não consegui entender seu áudio. Pode enviar texto?" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      mensagemTexto = transcricao;
      console.log("🎤 Áudio transcrito:", transcricao.substring(0, 50) + "...");
    }

    // === BUSCAR HISTÓRICO COMPLETO DA CONVERSA ===
    const { data: memorias } = await supabase
      .from("whatsapp_conversas_memoria")
      .select("tipo_interacao, conteudo_resumido, criado_em")
      .eq("conversa_id", conversaId)
      .order("criado_em", { ascending: true })
      .limit(20);

    const historicoMensagens = (memorias || []).map((m) => {
      const isBot = m.tipo_interacao.includes("resposta") || m.tipo_interacao.includes("pergunta");
      return {
        role: isBot ? "assistant" : "user",
        content: m.conteudo_resumido,
      };
    });

    console.log("📜 Histórico:", historicoMensagens.length, "mensagens");

    // === BUSCAR CARRINHO ATUAL ===
    const { data: conversa } = await supabase
      .from("whatsapp_conversas")
      .select("produtos_carrinho, proposta_ativa_id")
      .eq("id", conversaId)
      .single();

    const carrinhoAtual = conversa?.produtos_carrinho || [];
    console.log("🛒 Carrinho:", carrinhoAtual.length, "produtos");

    // === SALVAR MENSAGEM DO CLIENTE NA MEMÓRIA ===
    await salvarMemoria(supabase, conversaId, `Cliente: ${mensagemTexto}`, "mensagem_recebida", openAiApiKey);

    // === GERAR RESPOSTA INTELIGENTE COM TOOL CALLING V4 ===
    const { resposta: respostaInicial, toolCalls } = await gerarRespostaInteligente(
      mensagemTexto,
      historicoMensagens,
      perfilCliente,
      carrinhoAtual,
      deepseekApiKey!,
      supabase,
      sessao, // ← Passa sessão para contexto V4
    );

    console.log("🔧 Tool calls:", toolCalls.length);

    // === EXECUTAR FERRAMENTAS E GERAR RESPOSTA FINAL ===
    let produtosEncontrados: any[] = [];
    let respostaFinal = sanitizarResposta(respostaInicial);

    if (toolCalls.length > 0) {
      const resultadosFerramentas: any[] = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        const toolStartTime = Date.now();

        console.log(`⚙️ Executando: ${functionName}`);

        const resultado = await executarFerramenta(functionName, args, supabase, conversaId, openAiApiKey);

        const toolDuration = Date.now() - toolStartTime;

        // Log da execução da tool
        await registrarLogAgente(supabase, conversaId, sessao.id !== "virtual" ? sessao.id : null, {
          tipo_evento: "tool_executada",
          tool_name: functionName,
          tool_args: args,
          tool_resultado: resultado,
          tempo_execucao_ms: toolDuration,
        });

        resultadosFerramentas.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(resultado),
        });

        // === HANDLERS ESPECÍFICOS POR TOOL ===

        // BUSCAR PRODUTOS (legacy)
        if (functionName === "buscar_produtos" && resultado.produtos) {
          produtosEncontrados = resultado.produtos;

          const produtosCarrinho = resultado.produtos.map((p: any) => ({
            id: p.id,
            quantidade: 1,
          }));

          await supabase
            .from("whatsapp_conversas")
            .update({ produtos_carrinho: produtosCarrinho })
            .eq("id", conversaId);

          await salvarMemoria(
            supabase,
            conversaId,
            `Produtos encontrados: ${resultado.produtos.map((p: any) => p.nome).slice(0, 3).join(", ")}`,
            "produtos_sugeridos",
            openAiApiKey,
          );
        }

        // IDENTIFICAR CLIENTE (V4)
        if (functionName === "identificar_cliente") {
          if (resultado.sucesso) {
            console.log(`✅ Cliente identificado: ${resultado.cliente_nome} (${resultado.cnpj})`);
            await salvarMemoria(
              supabase,
              conversaId,
              `Cliente identificado: ${resultado.cliente_nome} | CNPJ: ${resultado.cnpj} | ${resultado.enderecos?.length || 0} endereço(s)`,
              "cliente_identificado",
              openAiApiKey,
            );
          } else {
            console.warn("⚠️ Cliente não identificado:", resultado.erro);
          }
        }

        // CRIAR OPORTUNIDADE SPOT (V4)
        if (functionName === "criar_oportunidade_spot") {
          if (resultado.sucesso) {
            console.log(`✅ Oportunidade Spot criada: ${resultado.codigo}`);
            await salvarMemoria(
              supabase,
              conversaId,
              `Oportunidade ${resultado.codigo} criada com ${resultado.total_itens} itens - R$ ${resultado.valor_estimado?.toFixed(2)}`,
              "oportunidade_criada",
              openAiApiKey,
            );
          } else {
            console.warn("⚠️ Erro ao criar oportunidade:", resultado.erro);
          }
        }

        // CALCULAR CESTA DATASUL (V4)
        if (functionName === "calcular_cesta_datasul") {
          if (resultado.sucesso) {
            console.log(`✅ Cálculo Datasul: R$ ${resultado.resumo?.valor_total?.toFixed(2)} em ${resultado.tempo_calculo_ms}ms`);
            await salvarMemoria(
              supabase,
              conversaId,
              `Valores calculados no ERP: ${resultado.resumo?.total_itens} itens - Total R$ ${resultado.resumo?.valor_total?.toFixed(2)}`,
              "calculo_datasul",
              openAiApiKey,
            );
          } else {
            console.warn("⚠️ Erro no cálculo Datasul:", resultado.erro);
            // Não bloquear fluxo, agente vai lidar
          }
        }

        // GERAR LINK PROPOSTA (V4)
        if (functionName === "gerar_link_proposta") {
          if (resultado.sucesso) {
            console.log(`✅ Link proposta gerado: ${resultado.link}`);
            await salvarMemoria(
              supabase,
              conversaId,
              `Link de proposta gerado: ${resultado.link} (validade: ${resultado.validade_dias} dias)`,
              "link_proposta",
              openAiApiKey,
            );
          } else {
            console.warn("⚠️ Erro ao gerar link:", resultado.erro);
          }
        }

        // CRIAR PROPOSTA (legacy)
        if (functionName === "criar_proposta" && resultado.sucesso) {
          const { data: proposta } = await supabase
            .from("whatsapp_propostas_comerciais")
            .select("*")
            .eq("id", resultado.proposta_id)
            .single();

          if (proposta) {
            await supabase
              .from("whatsapp_conversas")
              .update({
                proposta_ativa_id: resultado.proposta_id,
                estagio_agente: "aguardando_aprovacao",
              })
              .eq("id", conversaId);

            await salvarMemoria(
              supabase,
              conversaId,
              `Proposta ${proposta.numero_proposta} criada`,
              "proposta_criada",
              openAiApiKey,
            );

            // Auto-validar cliente
            const dadosCliente = await executarFerramenta("validar_dados_cliente", {}, supabase, conversaId, openAiApiKey);
            resultadosFerramentas.push({
              tool_call_id: "auto_validacao_" + Date.now(),
              role: "tool",
              name: "validar_dados_cliente",
              content: JSON.stringify(dadosCliente),
            });
          }
        }

        // VALIDAR DADOS CLIENTE (legacy)
        if (functionName === "validar_dados_cliente" && resultado.sucesso) {
          await salvarMemoria(
            supabase,
            conversaId,
            `Cliente validado: ${resultado.cliente_nome} | CNPJ: ${resultado.cnpj}`,
            "dados_validados",
            openAiApiKey,
          );
        }

        // FINALIZAR PEDIDO (legacy)
        if (functionName === "finalizar_pedido" && resultado.sucesso) {
          await salvarMemoria(
            supabase,
            conversaId,
            `Pedido ${resultado.numero_pedido} finalizado - R$ ${resultado.valor_total}`,
            "pedido_finalizado",
            openAiApiKey,
          );
        }
      }

      // === SEGUNDA CHAMADA COM FALLBACK DeepSeek → Lovable AI ===
      console.log("🔄 Gerando resposta final com resultados das ferramentas");

      const systemPromptCompleto = construirSystemPromptV4Resumido(perfilCliente, sessao);

      try {
        const { resposta, provider, tokens_entrada, tokens_saida } = await chamarLLMComResultadosTools(
          systemPromptCompleto,
          historicoMensagens,
          mensagemTexto,
          toolCalls,
          resultadosFerramentas,
          deepseekApiKey!,
          lovableApiKey || null,
        );

        respostaFinal = sanitizarResposta(resposta);
        console.log(`✅ Resposta final via ${provider} | Tokens: ${tokens_entrada || 0}/${tokens_saida || 0}`);

        // Log da resposta LLM
        await registrarLogAgente(supabase, conversaId, sessao.id !== "virtual" ? sessao.id : null, {
          tipo_evento: "resposta_gerada",
          llm_provider: provider,
          tokens_entrada,
          tokens_saida,
          tempo_execucao_ms: Date.now() - startTime,
        });

      } catch (llmError) {
        console.error("❌ Erro em ambos LLMs, usando fallback manual");
        
        // Fallback manual baseado nos resultados
        if (produtosEncontrados.length > 0) {
          respostaFinal =
            `opa, achei essas opções:\n\n` +
            produtosEncontrados
              .slice(0, 3)
              .map((p, i) => `${i + 1}. ${p.nome}\n   cód: ${p.referencia} - R$ ${p.preco?.toFixed(2) || '0.00'}`)
              .join("\n\n") +
            `\n\nqual te interessou?`;
        } else {
          respostaFinal = "opa, tive um probleminha técnico. pode repetir?";
        }

        // Log do erro
        await registrarLogAgente(supabase, conversaId, sessao.id !== "virtual" ? sessao.id : null, {
          tipo_evento: "erro_llm",
          erro_mensagem: llmError instanceof Error ? llmError.message : String(llmError),
        });
      }

      // Fallback se resposta vazia
      if (!respostaFinal && produtosEncontrados.length > 0) {
        respostaFinal =
          `achei essas opções:\n\n` +
          produtosEncontrados
            .slice(0, 3)
            .map((p, i) => `${i + 1}. ${p.nome}\n   cód: ${p.referencia} - R$ ${p.preco?.toFixed(2) || '0.00'}`)
            .join("\n\n") +
          `\n\nqual vc quer?`;
      } else if (!respostaFinal) {
        respostaFinal = "opa, deixa eu ver aqui... pode me dar mais detalhes?";
      }
    }

    // === SALVAR RESPOSTA NA MEMÓRIA ===
    if (respostaFinal) {
      await salvarMemoria(supabase, conversaId, respostaFinal, "resposta_enviada", openAiApiKey);
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Agente V4 concluído em ${totalTime}ms`);

    // === RETORNAR RESPOSTA ===
    return new Response(
      JSON.stringify({
        resposta: respostaFinal || "desculpa, tive um probleminha. pode repetir?",
        produtos_encontrados: produtosEncontrados.length > 0 ? produtosEncontrados : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Erro Geral:", error);
    return new Response(
      JSON.stringify({
        resposta: "opa, deu um probleminha técnico. pode repetir?",
        error: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
