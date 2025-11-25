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
    const { resposta, ferramentasChamadas } = await gerarRespostaInteligente(
      mensagemTexto,
      historicoMensagens,
      perfilCliente,
      carrinhoAtual,
      deepseekApiKey!,
      supabase
    );

    console.log('💬 Resposta gerada:', resposta.substring(0, 100) + '...');
    console.log('🔧 Ferramentas chamadas:', ferramentasChamadas.length);

    // === EXECUTAR FERRAMENTAS SOLICITADAS ===
    let produtosEncontrados: any[] = [];
    let propostaGerada: any = null;

    for (const ferramenta of ferramentasChamadas) {
      const resultado = await executarFerramenta(
        ferramenta.nome,
        ferramenta.argumentos,
        supabase,
        conversaId,
        openAiApiKey
      );

      console.log(`✅ Ferramenta ${ferramenta.nome} executada`);

      // Processar resultados
      if (ferramenta.nome === 'buscar_produtos' && resultado.produtos) {
        produtosEncontrados = resultado.produtos;
        
        // Atualizar carrinho com produtos encontrados
        const produtosIds = resultado.produtos.map((p: any) => p.id);
        await supabase
          .from('whatsapp_conversas')
          .update({ produtos_carrinho: produtosIds })
          .eq('id', conversaId);

        // Salvar na memória
        await salvarMemoria(
          supabase,
          conversaId,
          `Produtos encontrados: ${resultado.produtos.map((p: any) => p.nome).join(', ')}`,
          'produtos_sugeridos',
          openAiApiKey
        );
      }

      if (ferramenta.nome === 'criar_proposta' && resultado.sucesso) {
        propostaGerada = resultado;

        // Buscar proposta completa para formatar
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

          // Formatar proposta para WhatsApp
          const mensagemProposta = await formatarPropostaWhatsApp(proposta, itens || []);

          // Salvar na memória
          await salvarMemoria(
            supabase,
            conversaId,
            `Proposta ${proposta.numero_proposta} criada`,
            'proposta_criada',
            openAiApiKey
          );

          // Retornar proposta formatada
          return new Response(
            JSON.stringify({ 
              resposta: mensagemProposta,
              proposta_id: proposta.id,
              produtos_encontrados: produtosEncontrados
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // === SALVAR RESPOSTA DO BETO NA MEMÓRIA ===
    await salvarMemoria(supabase, conversaId, `Beto: ${resposta}`, 'resposta_enviada', openAiApiKey);

    // === RETORNAR RESPOSTA ===
    return new Response(
      JSON.stringify({ 
        resposta,
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
