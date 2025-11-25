import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Importar módulos refatorados
import type { EstadoConversa, ContextoConversa } from "../_shared/agente/types.ts";
import { buscarPerfilCliente } from "../_shared/agente/perfil-cliente.ts";
import { gerarRespostaPersonalizada } from "../_shared/agente/gerador-resposta.ts";
import { fazerPerguntasQualificadoras } from "../_shared/agente/perguntas-qualificadoras.ts";
import { mapearEstadoAntigo, determinarProximoEstado } from "../_shared/agente/estado-conversa.ts";
import { transcreverAudio, gerarEmbedding, salvarMemoria } from "../_shared/agente/utils.ts";
import { criarProposta, formatarPropostaWhatsApp } from "../_shared/agente/proposta-handler.ts";

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

    console.log("🤖 Agente Vendas v2 - Iniciando", { conversaId, tipoMensagem, clienteId });

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

    // Se não tiver clienteId, buscar da conversa/contato
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
      
      console.log('🔍 Cliente ID encontrado via conversa:', clienteId);
    }

    // === ETAPA 0.5: BUSCAR PERFIL DO CLIENTE ===
    const perfilCliente = await buscarPerfilCliente(clienteId, supabase);

    // === ETAPA 0: TRANSCRIÇÃO DE ÁUDIO ===
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
      salvarMemoria(supabase, conversaId, `Cliente (áudio): ${transcricao}`, 'mensagem_recebida', openAiApiKey)
        .catch(err => console.warn('⚠️ Erro ao salvar memória:', err));
    }

    // === ETAPA 1: BUSCAR ESTADO DA CONVERSA ===
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('estagio_agente, proposta_ativa_id, produtos_carrinho, ultima_intencao_detectada')
      .eq('id', conversaId)
      .single();

    const estadoAtual = mapearEstadoAntigo(conversa?.estagio_agente || 'inicial');
    console.log('📍 Estado:', estadoAtual, '| Carrinho:', conversa?.produtos_carrinho?.length || 0, 'produtos');

    // Salvar mensagem do cliente na memória (assíncrono)
    salvarMemoria(supabase, conversaId, `Cliente: ${mensagemTexto}`, 'mensagem_recebida', openAiApiKey)
      .catch(err => console.warn('⚠️ Erro ao salvar memória:', err));

    // === ETAPA 2: RECUPERAR CONTEXTO HISTÓRICO (SIMPLIFICADO) ===
    
    // Buscar últimas 3 mensagens direto da memória (mais rápido)
    const { data: memoriasRecentes } = await supabase
      .from('whatsapp_conversas_memoria')
      .select('tipo_interacao, conteudo_resumido')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: false })
      .limit(3);

    const contextoRelevante = memoriasRecentes && memoriasRecentes.length > 0
      ? memoriasRecentes
          .reverse()
          .map(m => `[${m.tipo_interacao}] ${m.conteudo_resumido}`)
          .join('\n')
      : '';
    
    console.log('🧠 Contexto:', memoriasRecentes?.length || 0, 'memórias');

    // === ETAPA 3: CLASSIFICAR INTENÇÃO COM CONTEXTO ===
    
    // Enriquecer contexto com produtos do carrinho
    let contextoCompleto = contextoRelevante;
    if (conversa?.produtos_carrinho && conversa.produtos_carrinho.length > 0) {
      const { data: produtosCarrinho } = await supabase
        .from('produtos')
        .select('nome, referencia_interna, preco_venda')
        .in('id', conversa.produtos_carrinho);
      
      if (produtosCarrinho && produtosCarrinho.length > 0) {
        contextoCompleto += `\n\n=== PRODUTOS JÁ NO CARRINHO ===\n${produtosCarrinho.map(p => `- ${p.nome} (${p.referencia_interna}) - R$ ${p.preco_venda.toFixed(2)}`).join('\n')}`;
        console.log('🛒 Carrinho:', produtosCarrinho.length, 'produtos');
      }
    }

    const { data: intencaoData } = await supabase.functions.invoke('classificar-intencao-whatsapp', {
      body: { 
        mensagemTexto, 
        conversaId,
        contextoAnterior: contextoCompleto 
      }
    });

    const intencao = intencaoData || { intencao: 'outro', confianca: 0 };
    console.log('🎯 Intenção:', intencao.intencao, '| Confiança:', intencao.confianca);

    // === ETAPA 4: DETERMINAR PRÓXIMO ESTADO ===
    const contextoTransicao: ContextoConversa = {
      estadoAtual,
      intencao,
      carrinho: conversa?.produtos_carrinho || [],
      propostaId: conversa?.proposta_ativa_id || null,
      contextoHistorico: contextoCompleto
    };

    const proximoEstado = determinarProximoEstado(contextoTransicao);
    console.log(`➡️  Estado: ${estadoAtual} → ${proximoEstado}`);

    // Atualizar estado e intenção no banco
    await supabase
      .from('whatsapp_conversas')
      .update({ 
        ultima_intencao_detectada: intencao.intencao,
        estagio_agente: proximoEstado 
      })
      .eq('id', conversaId);

    // === ETAPA 5: PROCESSAMENTO POR ESTADO ===
    
    // ESTADO: DESCOBERTA DE NECESSIDADE
    if (proximoEstado === 'descoberta_necessidade') {
      console.log('🎯 Estado: Descoberta de Necessidade');
      
      // Fazer perguntas qualificadoras até ter informações suficientes
      const respostaPerguntas = await fazerPerguntasQualificadoras(
        supabase,
        conversaId,
        contextoCompleto,
        mensagemTexto,
        openAiApiKey,
        corsHeaders
      );
      
      const dadosResposta = await respostaPerguntas.json();
      
      // Se já tem informações suficientes, buscar produtos
      if (dadosResposta.pular_pergunta) {
        console.log('✅ Pulando perguntas - buscando produtos');
        // Continua para busca de produtos abaixo
      } else {
        // Retorna a pergunta qualificadora
        return respostaPerguntas;
      }
    }
    
    // ESTADO: REFINAMENTO DE BUSCA ou continuação após descoberta
    if (proximoEstado === 'descoberta_necessidade' || proximoEstado === 'refinamento_busca') {
      // Filtrar palavras não-técnicas das palavrasChave
      const palavrasProibidas = ['cotar', 'cotação', 'comprar', 'quero', 'preciso', 'gostaria', 'pode', 'tem', 'vende', 'oi', 'olá', 'bom', 'dia', 'tarde', 'noite'];
      
      let termoBusca: string;
      
      if (intencao.palavrasChave && intencao.palavrasChave.length > 0) {
        const palavrasFiltradas = intencao.palavrasChave.filter(
          (palavra: string) => !palavrasProibidas.includes(palavra.toLowerCase())
        );
        termoBusca = palavrasFiltradas.length > 0 
          ? palavrasFiltradas.join(' ') 
          : (intencao.entidades?.produtos?.[0] || mensagemTexto);
      } else {
        // Fallback: usar produtos das entidades ou mensagem completa
        termoBusca = intencao.entidades?.produtos?.[0] || mensagemTexto;
      }
      
      console.log('🔍 Buscando produtos:', termoBusca, '| Palavras originais:', intencao.palavrasChave);

      const vetorPergunta = await gerarEmbedding(termoBusca, openAiApiKey);
      
      const { data: produtos, error } = await supabase.rpc('match_produtos_hibrido', {
        query_text: termoBusca,
        query_embedding: vetorPergunta,
        match_threshold: 0.5,
        match_count: 5
      });

      if (error || !produtos || produtos.length === 0) {
        const respostaSemProdutos = `Putz, não encontrei nada com "${termoBusca}". Pode me dar mais detalhes? Código, modelo, marca?`;
        
        // Salvar memória de forma assíncrona
        salvarMemoria(supabase, conversaId, `Cliente buscou: ${termoBusca} - Sem resultados`, 'busca_vazia', openAiApiKey)
          .catch(err => console.warn('⚠️ Erro ao salvar memória:', err));
        
        return new Response(
          JSON.stringify({ resposta: respostaSemProdutos }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atualizar carrinho (sobrescreve se refinamento, mantém se descoberta)
      const produtosIds = produtos.map((p: any) => p.id);
      await supabase
        .from('whatsapp_conversas')
        .update({ 
          produtos_carrinho: produtosIds
        })
        .eq('id', conversaId);

      // Gerar resposta humanizada e personalizada
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      const resposta = await gerarRespostaPersonalizada(
        mensagemTexto,
        contextoCompleto,
        perfilCliente,
        produtos,
        proximoEstado,
        lovableApiKey!
      );

      // Salvar memórias de forma assíncrona (não bloqueante)
      Promise.all([
        salvarMemoria(supabase, conversaId, `Produtos encontrados para "${termoBusca}": ${produtos.map((p: any) => p.nome).join(', ')}`, 'produtos_sugeridos', openAiApiKey),
        salvarMemoria(supabase, conversaId, `Beto: ${resposta}`, 'resposta_enviada', openAiApiKey)
      ]).catch(err => console.warn('⚠️ Erro ao salvar memórias:', err));

      return new Response(
        JSON.stringify({ resposta, produtos_encontrados: produtos }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ESTADO: SUGESTÃO DE PRODUTOS (produtos já buscados, apresentar)
    if (proximoEstado === 'sugestao_produtos' && conversa?.produtos_carrinho && conversa.produtos_carrinho.length > 0) {
      const { data: produtosCarrinho } = await supabase
        .from('produtos')
        .select('id, nome, referencia_interna, preco_venda, quantidade_em_maos')
        .in('id', conversa.produtos_carrinho);

      if (!produtosCarrinho || produtosCarrinho.length === 0) {
        return new Response(
          JSON.stringify({ resposta: "Ops, perdi o carrinho. Pode me dizer o que precisa novamente?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Gerar resposta humanizada e personalizada
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      const resposta = await gerarRespostaPersonalizada(
        mensagemTexto,
        contextoCompleto,
        perfilCliente,
        produtosCarrinho,
        proximoEstado,
        lovableApiKey!
      );

      await salvarMemoria(supabase, conversaId, `Beto apresentou produtos: ${resposta}`, 'produtos_apresentados', openAiApiKey)
        .catch(err => console.warn('⚠️ Erro ao salvar memória:', err));

      return new Response(
        JSON.stringify({ resposta, produtos_encontrados: produtosCarrinho }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ESTADO: AGUARDANDO ESCOLHA / CONFIRMAÇÃO DE QUANTIDADE
    if (proximoEstado === 'aguardando_escolha' || proximoEstado === 'confirmacao_quantidade') {
      const carrinho = conversa?.produtos_carrinho || [];
      
      if (carrinho.length === 0) {
        return new Response(
          JSON.stringify({ resposta: "Você ainda não adicionou nenhum produto. O que você precisa?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extrair quantidade da mensagem
      const quantidadeMatch = mensagemTexto.match(/(\d+)\s*(unidades?|caixas?|peças?|pcs?)?/i);
      const quantidade = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 1;

      console.log(`📦 Quantidade detectada: ${quantidade}`);

      // Buscar produtos do carrinho
      const { data: produtosCarrinho } = await supabase
        .from('produtos')
        .select('id, nome, referencia_interna, preco_venda, quantidade_em_maos')
        .in('id', carrinho);

      // Adicionar quantidade aos produtos
      const produtosComQuantidade = (produtosCarrinho || []).map(p => ({
        ...p,
        quantidade
      }));

      console.log(`📋 Montando proposta com ${produtosComQuantidade.length} produtos`);
      
      // Criar proposta
      const proposta = await criarProposta(supabase, conversaId, produtosComQuantidade, clienteId);
      
      if (!proposta) {
        return new Response(
          JSON.stringify({ resposta: "Ops, tive um problema ao gerar a proposta. Tenta de novo?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar itens completos
      const { data: itens, error: itensError } = await supabase
        .from('whatsapp_propostas_itens')
        .select(`
          *,
          produtos:produto_id (nome, referencia_interna)
        `)
        .eq('proposta_id', proposta.id);

      if (itensError) {
        console.error('❌ Erro ao buscar itens da proposta:', itensError);
      }

      console.log(`📋 Itens encontrados: ${itens?.length || 0}`);

      const mensagemProposta = await formatarPropostaWhatsApp(proposta, itens || []);
      
      salvarMemoria(supabase, conversaId, `Proposta ${proposta.numero_proposta} criada com ${quantidade} unidades`, 'proposta_enviada', openAiApiKey)
        .catch(err => console.warn('⚠️ Erro ao salvar memória:', err));

      return new Response(
        JSON.stringify({ resposta: mensagemProposta, proposta_id: proposta.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ESTADO: PROPOSTA APRESENTADA (aguardando feedback do cliente)
    if (proximoEstado === 'proposta_apresentada' && conversa?.proposta_ativa_id) {
      const { data: proposta } = await supabase
        .from('whatsapp_propostas_comerciais')
        .select('*')
        .eq('id', conversa.proposta_ativa_id)
        .single();

      if (proposta) {
        const { data: itens } = await supabase
          .from('whatsapp_propostas_itens')
          .select('*, produtos:produto_id (nome, referencia_interna)')
          .eq('proposta_id', proposta.id);

        const mensagemProposta = await formatarPropostaWhatsApp(proposta, itens || []);

        return new Response(
          JSON.stringify({ resposta: mensagemProposta, proposta_id: proposta.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ESTADO: NEGOCIAÇÃO ATIVA
    if (proximoEstado === 'negociacao_ativa') {
      if (!conversa?.proposta_ativa_id) {
        return new Response(
          JSON.stringify({ resposta: "Ainda não temos uma proposta ativa. Vamos ver os produtos primeiro?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atualizar proposta para aceita
      await supabase
        .from('whatsapp_propostas_comerciais')
        .update({ 
          status: 'aceita',
          aceita_em: new Date().toISOString()
        })
        .eq('id', conversa.proposta_ativa_id);

      // Criar oportunidade no CRM
      const { data: oportunidade } = await supabase.functions.invoke('criar-oportunidade-venda', {
        body: { 
          propostaId: conversa.proposta_ativa_id,
          clienteId 
        }
      });

      salvarMemoria(
        supabase, 
        conversaId, 
        `Pedido fechado - Oportunidade criada`, 
        'pedido_fechado',
        openAiApiKey
      ).catch(err => console.warn('⚠️ Erro ao salvar memória:', err));

      await supabase
        .from('whatsapp_conversas')
        .update({ 
          status: 'fechado'
        })
        .eq('id', conversaId);

      const respostaFechamento = `Show! Pedido confirmado! 🎉\n\nVou processar tudo por aqui e te mando os detalhes de pagamento e entrega. Qualquer coisa, só chamar!`;

      return new Response(
        JSON.stringify({ 
          resposta: respostaFechamento,
          oportunidade_id: oportunidade?.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ESTADO: SAUDAÇÃO INICIAL ou OUTROS - Conversa natural
    console.log('💬 Resposta conversacional - Estado:', proximoEstado);
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    // Gerar resposta humanizada e personalizada
    const resposta = await gerarRespostaPersonalizada(
      mensagemTexto,
      contextoCompleto,
      perfilCliente,
      [],
      proximoEstado,
      lovableApiKey!
    );

    salvarMemoria(supabase, conversaId, `Beto: ${resposta}`, 'conversa_geral', openAiApiKey)
      .catch(err => console.warn('⚠️ Erro ao salvar memória:', err));

    return new Response(
      JSON.stringify({ resposta }),
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
