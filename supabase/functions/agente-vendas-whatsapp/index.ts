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
      }
    });

    // === RESOLUÇÃO DE CLIENTE ===
    if (!clienteId) {
      const { data: conv } = await supabase
        .from('whatsapp_conversas')
        .select('whatsapp_contato_id')
        .eq('id', conversaId)
        .single();
      
      if (conv?.whatsapp_contato_id) {
        const { data: contato } = await supabase
          .from('whatsapp_contatos')
          .select('contato_id')
          .eq('id', conv.whatsapp_contato_id)
          .single();
        
        if (contato?.contato_id) {
          const { data: contatoCRM } = await supabase
            .from('contatos')
            .select('cliente_id')
            .eq('id', contato.contato_id)
            .single();
          
          clienteId = contatoCRM?.cliente_id;
        }
      }
      
      console.log('🔍 Cliente ID:', clienteId || 'não encontrado');
    }

    // === BUSCAR PERFIL DO CLIENTE ===
    const perfilCliente = await buscarPerfilCliente(clienteId, supabase);
    console.log('👤 Perfil:', perfilCliente.tipo);

    // === TRANSCRIÇÃO DE ÁUDIO (se necessário) ===
    if (tipoMensagem === 'audio' || tipoMensagem === 'voice') {
      if (!urlMidia) {
        return new Response(
          JSON.stringify({ resposta: "Não consegui acessar seu áudio. Tente novamente?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transcricao = await transcreverAudio(urlMidia, openAiApiKey, supabase, conversaId);
      if (!transcricao) {
        return new Response(
          JSON.stringify({ resposta: "Não consegui entender seu áudio. Pode enviar texto?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      mensagemTexto = transcricao;
      console.log('🎤 Áudio transcrito:', transcricao.substring(0, 50) + '...');
    }

    // === BUSCAR HISTÓRICO COMPLETO DA CONVERSA ===
    const { data: memorias } = await supabase
      .from('whatsapp_conversas_memoria')
      .select('tipo_interacao, conteudo_resumido, criado_em')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })
      .limit(20); // Últimas 20 interações

    // Construir histórico no formato de mensagens
    const historicoMensagens = (memorias || []).map(m => {
      const isBot = m.tipo_interacao.includes('resposta') || m.tipo_interacao.includes('pergunta');
      return {
        role: isBot ? 'assistant' : 'user',
        content: m.conteudo_resumido
      };
    });

    console.log('📜 Histórico:', historicoMensagens.length, 'mensagens');

    // === BUSCAR CARRINHO ATUAL ===
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('produtos_carrinho, proposta_ativa_id')
      .eq('id', conversaId)
      .single();

    const carrinhoAtual = conversa?.produtos_carrinho || [];
    console.log('🛒 Carrinho:', carrinhoAtual.length, 'produtos');

    // === SALVAR MENSAGEM DO CLIENTE NA MEMÓRIA ===
    await salvarMemoria(supabase, conversaId, `Cliente: ${mensagemTexto}`, 'mensagem_recebida', openAiApiKey);

    // === GERAR RESPOSTA INTELIGENTE COM TOOL CALLING ===
    const { resposta: respostaInicial, toolCalls } = await gerarRespostaInteligente(
      mensagemTexto,
      historicoMensagens,
      perfilCliente,
      carrinhoAtual,
      deepseekApiKey!,
      supabase
    );

    console.log('🔧 Tool calls:', toolCalls.length);

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

        const resultado = await executarFerramenta(
          functionName,
          args,
          supabase,
          conversaId,
          openAiApiKey
        );

        resultadosFerramentas.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(resultado)
        });

        // Processar produtos encontrados
        if (functionName === 'buscar_produtos' && resultado.produtos) {
          produtosEncontrados = resultado.produtos;

          // Atualizar carrinho
          const produtosIds = resultado.produtos.map((p: any) => p.id);
          await supabase
            .from('whatsapp_conversas')
            .update({ produtos_carrinho: produtosIds })
            .eq('id', conversaId);

          // Salvar na memória
          await salvarMemoria(
            supabase,
            conversaId,
            `Produtos encontrados: ${resultado.produtos.map((p: any) => p.nome).slice(0, 3).join(', ')}`,
            'produtos_sugeridos',
            openAiApiKey
          );
        }

        // Processar proposta criada
        if (functionName === 'criar_proposta' && resultado.sucesso) {
          const { data: proposta } = await supabase
            .from('whatsapp_propostas_comerciais')
            .select('*')
            .eq('id', resultado.proposta_id)
            .single();

          if (proposta) {
            const { data: itens } = await supabase
              .from('whatsapp_propostas_itens')
              .select('*, produtos:produto_id (nome, referencia_interna)')
              .eq('proposta_id', proposta.id);

            const mensagemProposta = await formatarPropostaWhatsApp(proposta, itens || []);

            await salvarMemoria(
              supabase,
              conversaId,
              `Proposta ${proposta.numero_proposta} criada`,
              'proposta_criada',
              openAiApiKey
            );

            return new Response(
              JSON.stringify({
                resposta: mensagemProposta,
                proposta_id: proposta.id
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Segunda chamada ao DeepSeek com resultados das ferramentas
      console.log('🔄 Gerando resposta final com resultados das ferramentas');

      const response2 = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `Você é o Beto, vendedor da Cirúrgica Fernandes. Apresente os produtos encontrados de forma natural, destacando 2-3 melhores opções com diferenciais. Seja direto e persuasivo mas não robotizado. Use no máximo 2 emojis.`
            },
            ...historicoMensagens.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: "user", content: mensagemTexto },
            { role: "assistant", content: null, tool_calls: toolCalls },
            ...resultadosFerramentas
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      });

      if (response2.ok) {
        const data2 = await response2.json();
        respostaFinal = data2.choices[0].message.content;
        console.log('✅ Resposta final gerada');
      } else {
        console.error('❌ Erro na segunda chamada DeepSeek');
        // Fallback: apresentar produtos manualmente
        if (produtosEncontrados.length > 0) {
          respostaFinal = `Show! Encontrei algumas opções de cânulas:\n\n` +
            produtosEncontrados.slice(0, 3).map((p, i) => 
              `${i + 1}. *${p.nome}*\n   Cód: ${p.referencia}\n   R$ ${p.preco.toFixed(2)} - Estoque: ${p.estoque} un\n`
            ).join('\n') +
            `\nQual te interessou mais?`;
        }
      }
    }

    // === SALVAR RESPOSTA NA MEMÓRIA ===
    if (respostaFinal) {
      await salvarMemoria(supabase, conversaId, `Beto: ${respostaFinal}`, 'resposta_enviada', openAiApiKey);
    }

    // === RETORNAR RESPOSTA ===
    return new Response(
      JSON.stringify({
        resposta: respostaFinal || "Desculpa, tive um probleminha. Pode repetir?",
        produtos_encontrados: produtosEncontrados.length > 0 ? produtosEncontrados : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
