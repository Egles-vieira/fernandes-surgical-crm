import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Importar módulos do agente inteligente
import { buscarPerfilCliente } from "../_shared/agente/perfil-cliente.ts";
import { gerarRespostaInteligente, executarFerramenta } from "../_shared/agente/gerador-resposta.ts";
import { transcreverAudio, salvarMemoria } from "../_shared/agente/utils.ts";
import { formatarPropostaWhatsApp } from "../_shared/agente/proposta-handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// === HANDLER PRINCIPAL ===

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { mensagemTexto, conversaId, tipoMensagem, urlMidia, clienteId } = await req.json();

    console.log("🤖 Agente Vendas Inteligente v3 - Iniciando", { conversaId, tipoMensagem, clienteId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

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
      .limit(20); // Últimas 20 interações

    // Construir histórico no formato de mensagens
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

    // === GERAR RESPOSTA INTELIGENTE COM TOOL CALLING ===
    const { resposta: respostaInicial, toolCalls } = await gerarRespostaInteligente(
      mensagemTexto,
      historicoMensagens,
      perfilCliente,
      carrinhoAtual,
      deepseekApiKey!,
      supabase,
    );

    console.log("🔧 Tool calls:", toolCalls.length);

    // === EXECUTAR FERRAMENTAS E GERAR RESPOSTA FINAL ===
    let produtosEncontrados: any[] = [];
    let respostaFinal = respostaInicial;

    if (toolCalls.length > 0) {
      // Executar todas as ferramentas
      const resultadosFerramentas: any[] = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`⚙️ Executando: ${functionName}`);

        const resultado = await executarFerramenta(functionName, args, supabase, conversaId, openAiApiKey);

        resultadosFerramentas.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(resultado),
        });

        // Processar produtos encontrados
        if (functionName === "buscar_produtos" && resultado.produtos) {
          produtosEncontrados = resultado.produtos;

          // Atualizar carrinho com formato correto: [{ id, quantidade }]
          const produtosCarrinho = resultado.produtos.map((p: any) => ({
            id: p.id,
            quantidade: 1, // quantidade padrão inicial
          }));

          console.log(
            "🛒 Atualizando carrinho com:",
            produtosCarrinho.map((p: any) => `${p.id} (${p.quantidade}x)`),
          );

          await supabase
            .from("whatsapp_conversas")
            .update({ produtos_carrinho: produtosCarrinho })
            .eq("id", conversaId);

          // Salvar na memória
          await salvarMemoria(
            supabase,
            conversaId,
            `Produtos encontrados: ${resultado.produtos
              .map((p: any) => p.nome)
              .slice(0, 3)
              .join(", ")}`,
            "produtos_sugeridos",
            openAiApiKey,
          );
        }

        // Processar proposta criada
        if (functionName === "criar_proposta") {
          console.log("🔍 Proposta criada detectada. Resultado:", JSON.stringify(resultado));
          
          if (resultado.sucesso) {
            console.log("✅ Resultado com sucesso. Buscando proposta ID:", resultado.proposta_id);
            
            const { data: proposta, error: propostaError } = await supabase
              .from("whatsapp_propostas_comerciais")
              .select("*")
              .eq("id", resultado.proposta_id)
              .single();

            if (propostaError) {
              console.error("❌ Erro ao buscar proposta:", propostaError);
            }
            
            console.log("📋 Proposta encontrada:", proposta ? "sim" : "não");

            if (proposta) {
            const { data: itens } = await supabase
              .from("whatsapp_propostas_itens")
              .select("*, produtos:produto_id (nome, referencia_interna)")
              .eq("proposta_id", proposta.id);

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

            // AUTOMÁTICO: Validar dados do cliente imediatamente após criar proposta
            console.log("🔍 Auto-validando dados do cliente...");
            const dadosCliente = await executarFerramenta(
              "validar_dados_cliente",
              {},
              supabase,
              conversaId,
              openAiApiKey,
            );

            // Adicionar resultado da validação aos resultados das ferramentas
            resultadosFerramentas.push({
              tool_call_id: "auto_validacao_" + Date.now(),
              role: "tool",
              name: "validar_dados_cliente",
              content: JSON.stringify(dadosCliente),
            });

            console.log("✅ Validação automática concluída:", dadosCliente.sucesso ? "sucesso" : "erro");
          } else {
            console.warn("⚠️ Proposta não encontrada no banco. Pulando validação automática.");
          }
        } else {
          console.warn("⚠️ criar_proposta falhou. Resultado.sucesso:", resultado.sucesso);
        }
        }

        // Processar validação de dados do cliente
        if (functionName === "validar_dados_cliente") {
          if (resultado.sucesso) {
            console.log("✅ Dados validados:", resultado.cnpj);
            await salvarMemoria(
              supabase,
              conversaId,
              `Cliente validado: ${resultado.cliente_nome} | CNPJ: ${resultado.cnpj} | ${resultado.enderecos?.length || 0} endereço(s)`,
              "dados_validados",
              openAiApiKey,
            );
          } else if (resultado.erro) {
            console.warn("⚠️ Erro na validação:", resultado.erro);
          }
        }

        // Processar finalização de pedido
        if (functionName === "finalizar_pedido") {
          if (resultado.sucesso) {
            console.log("✅ Pedido finalizado:", resultado.numero_pedido);
            await salvarMemoria(
              supabase,
              conversaId,
              `Pedido ${resultado.numero_pedido} finalizado - R$ ${resultado.valor_total}`,
              "pedido_finalizado",
              openAiApiKey,
            );
          }
        }
      }

      // Segunda chamada ao DeepSeek com resultados das ferramentas
      console.log("🔄 Gerando resposta final com resultados das ferramentas");

      // Construir system prompt completo (mesmo da primeira chamada)
      const systemPromptCompleto = `Você é o Beto, vendedor experiente e simpático da Cirúrgica Fernandes.

PERFIL DO CLIENTE:
- Tipo: ${perfilCliente.tipo}
- Nome: ${perfilCliente.nome || "não informado"}
- Histórico: ${perfilCliente.historico_compras} compra(s) anterior(es)
- Ticket médio: R$ ${perfilCliente.ticket_medio.toFixed(2)}
- Última compra: ${perfilCliente.ultima_compra_dias < 9999 ? `há ${perfilCliente.ultima_compra_dias} dias` : "nunca comprou"}
${perfilCliente.marcadores.length > 0 ? `- Marcadores: ${perfilCliente.marcadores.join(", ")}` : ""}

SOBRE A EMPRESA:
- Cirúrgica Fernandes vende produtos hospitalares e cirúrgicos
- Atende hospitais, clínicas e profissionais de saúde
- Grande variedade em estoque, diversas marcas reconhecidas

SUA PERSONALIDADE:
- Simpático e profissional
- Direto ao ponto, sem enrolação
- Usa linguagem natural e informal (você, não "senhor/senhora")
- Máximo 2 emojis por mensagem (use com moderação)
- NÃO siga script rígido - seja contextual e inteligente
- Se o cliente já deu informações, NÃO pergunte novamente
- Seja proativo mas não robotizado

INSTRUÇÕES CRÍTICAS:
- Você tem acesso ao HISTÓRICO COMPLETO da conversa
- Consulte as mensagens anteriores para entender o contexto
- Se o cliente mencionar algo que já foi discutido, relembre e use esse contexto
- NÃO diga que não tem acesso ao histórico - você TEM e deve usar
- Apresente os produtos encontrados de forma natural, destacando 2-3 melhores opções
- Seja direto e persuasivo mas não robotizado`;

      const response2 = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPromptCompleto },
            ...historicoMensagens.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: "user", content: mensagemTexto },
            { role: "assistant", content: null, tool_calls: toolCalls },
            ...resultadosFerramentas,
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (response2.ok) {
        const data2 = await response2.json();
        respostaFinal = data2.choices[0].message.content;
        console.log("✅ Resposta final gerada");
      } else {
        console.error("❌ Erro na segunda chamada DeepSeek");
        // Fallback: apresentar produtos manualmente
        if (produtosEncontrados.length > 0) {
          respostaFinal =
            `Show! Encontrei algumas opções de cânulas:\n\n` +
            produtosEncontrados
              .slice(0, 3)
              .map(
                (p, i) =>
                  `${i + 1}. *${p.nome}*\n   Cód: ${p.referencia}\n   R$ ${p.preco.toFixed(2)} - Estoque: ${p.estoque} un\n`,
              )
              .join("\n") +
            `\nQual te interessou mais?`;
        }
      }
    }

    // === SALVAR RESPOSTA NA MEMÓRIA ===
    if (respostaFinal) {
      await salvarMemoria(supabase, conversaId, ` ${respostaFinal}`, "resposta_enviada", openAiApiKey);
    }

    // === RETORNAR RESPOSTA ===
    return new Response(
      JSON.stringify({
        resposta: respostaFinal || "Desculpa, tive um probleminha. Pode repetir?",
        produtos_encontrados: produtosEncontrados.length > 0 ? produtosEncontrados : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Erro Geral:", error);
    return new Response(
      JSON.stringify({
        resposta: "Opa, deu um probleminha técnico. Pode repetir?",
        error: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
