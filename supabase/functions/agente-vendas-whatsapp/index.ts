import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProdutoRelevante {
  id: string;
  referencia_interna: string;
  nome: string;
  narrativa: string | null;
  preco_venda: number;
  quantidade_em_maos: number;
  similarity?: number;
}

// === FUNÇÕES AUXILIARES ===

async function transcreverAudio(audioUrl: string, openAiKey: string, supabase: any, conversaId: string): Promise<string> {
  try {
    console.log('🎧 Processando áudio:', audioUrl);
    
    let urlParaBaixar = audioUrl;

    if (audioUrl.includes('mmg.whatsapp.net') && audioUrl.includes('.enc')) {
      console.log('🔓 Detectado áudio criptografado');
      
      const { data: mensagem } = await supabase
        .from('whatsapp_mensagens')
        .select('id')
        .eq('conversa_id', conversaId)
        .eq('url_midia', audioUrl)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (mensagem) {
        const { data: descriptData } = await supabase.functions.invoke('w-api-baixar-midia', {
          body: { mensagemId: mensagem.id }
        });

        if (descriptData?.url) {
          urlParaBaixar = descriptData.url;
          console.log('✅ Áudio descriptografado');
        }
      }
    }
    
    const audioResponse = await fetch(urlParaBaixar);
    if (!audioResponse.ok) return "";
    
    const audioBlob = await audioResponse.blob();
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}` },
      body: formData,
    });

    if (!response.ok) return "";
    return await response.text();
  } catch (e) {
    console.error('❌ Erro na transcrição:', e);
    return "";
  }
}

async function gerarEmbedding(texto: string, openAiKey: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texto.replace(/\n/g, ' '),
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error('Erro ao gerar embedding:', e);
    return [];
  }
}

async function salvarMemoria(supabase: any, conversaId: string, conteudo: string, tipo: string, openAiKey: string) {
  try {
    console.log(`💾 Salvando memória: [${tipo}] ${conteudo.substring(0, 50)}...`);
    
    const embedding = await gerarEmbedding(conteudo, openAiKey);
    
    if (!embedding || embedding.length === 0) {
      console.error('⚠️ Embedding vazio - pulando salvamento');
      return;
    }
    
    const { data, error } = await supabase.from('whatsapp_conversas_memoria').insert({
      conversa_id: conversaId,
      tipo_interacao: tipo,
      conteudo_resumido: conteudo,
      embedding,
      relevancia_score: 1.0,
      expira_em: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }).select();
    
    if (error) {
      console.error('❌ Erro ao salvar memória:', error);
    } else {
      console.log('✅ Memória salva:', data?.[0]?.id);
    }
  } catch (e) {
    console.error('❌ Erro ao salvar memória:', e);
  }
}

async function criarProposta(supabase: any, conversaId: string, produtos: any[], clienteId: string) {
  try {
    const subtotal = produtos.reduce((sum, p) => sum + (p.preco_venda * (p.quantidade || 1)), 0);
    
    console.log(`📋 Criando proposta com ${produtos.length} produtos, subtotal: R$ ${subtotal.toFixed(2)}`);
    
    const { data: proposta, error } = await supabase
      .from('whatsapp_propostas_comerciais')
      .insert({
        conversa_id: conversaId,
        cliente_id: clienteId,
        status: 'rascunho',
        subtotal,
        desconto_percentual: 0,
        desconto_valor: 0,
        valor_frete: 0,
        impostos_percentual: 0,
        impostos_valor: 0,
        valor_total: subtotal
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar proposta:', error);
      throw error;
    }

    // Inserir itens
    const itens = produtos.map(p => ({
      proposta_id: proposta.id,
      produto_id: p.id,
      quantidade: p.quantidade || 1,
      preco_unitario: p.preco_venda,
      desconto_percentual: 0,
      desconto_valor: 0,
      subtotal_item: p.preco_venda * (p.quantidade || 1)
    }));

    console.log(`📦 Inserindo ${itens.length} itens na proposta`);
    
    const { data: itensInseridos, error: itensError } = await supabase
      .from('whatsapp_propostas_itens')
      .insert(itens)
      .select();

    if (itensError) {
      console.error('❌ Erro ao inserir itens:', itensError);
      throw itensError;
    }

    console.log(`✅ ${itensInseridos.length} itens inseridos com sucesso`);

    // Atualizar conversa
    await supabase
      .from('whatsapp_conversas')
      .update({ 
        estagio_agente: 'confirmando_itens',
        proposta_ativa_id: proposta.id 
      })
      .eq('id', conversaId);

    // Registrar interação
    await supabase.from('whatsapp_interacoes').insert({
      conversa_id: conversaId,
      tipo_evento: 'proposta_criada',
      descricao: `Proposta ${proposta.numero_proposta} criada com ${produtos.length} item(ns)`,
      metadata: { proposta_id: proposta.id, subtotal },
      executado_por_bot: true
    });

    console.log('📋 Proposta criada:', proposta.numero_proposta);
    return proposta;
  } catch (e) {
    console.error('❌ Erro ao criar proposta:', e);
    return null;
  }
}

async function formatarPropostaWhatsApp(proposta: any, itens: any[]): Promise<string> {
  console.log(`📝 Formatando proposta ${proposta.numero_proposta} com ${itens.length} itens`);
  
  let mensagem = `*📋 PROPOSTA ${proposta.numero_proposta}*\n\n`;
  
  if (itens.length === 0) {
    console.warn('⚠️ Nenhum item na proposta!');
    mensagem += `⚠️ Proposta sem itens\n\n`;
  }
  
  itens.forEach((item, idx) => {
    const nomeProduto = item.produtos?.nome || item.produto_nome || 'Produto';
    const codProduto = item.produtos?.referencia_interna || item.produto_referencia || 'N/A';
    
    console.log(`  Item ${idx + 1}: ${nomeProduto} (${codProduto})`);
    
    mensagem += `${idx + 1}. *${nomeProduto}*\n`;
    mensagem += `   Cód: ${codProduto}\n`;
    mensagem += `   Qtd: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}\n`;
    mensagem += `   Subtotal: R$ ${item.subtotal_item.toFixed(2)}\n\n`;
  });

  mensagem += `━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `*Subtotal:* R$ ${proposta.subtotal.toFixed(2)}\n`;
  
  if (proposta.desconto_valor > 0) {
    mensagem += `*Desconto (${proposta.desconto_percentual.toFixed(1)}%):* -R$ ${proposta.desconto_valor.toFixed(2)}\n`;
  }
  
  if (proposta.valor_frete > 0) {
    mensagem += `*Frete:* R$ ${proposta.valor_frete.toFixed(2)}\n`;
  }
  
  if (proposta.impostos_valor > 0) {
    mensagem += `*Impostos (${proposta.impostos_percentual.toFixed(1)}%):* R$ ${proposta.impostos_valor.toFixed(2)}\n`;
  }
  
  mensagem += `━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `*💰 VALOR TOTAL: R$ ${proposta.valor_total.toFixed(2)}*\n\n`;
  mensagem += `📅 Válida até: ${new Date(proposta.valida_ate || Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}\n\n`;
  mensagem += `O que você acha? Podemos fechar esse pedido?`;
  
  return mensagem;
}

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
      await salvarMemoria(supabase, conversaId, `Cliente (áudio): ${transcricao}`, 'mensagem_recebida', openAiApiKey);
    }

    // === ETAPA 1: BUSCAR ESTADO DA CONVERSA ===
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('estagio_agente, proposta_ativa_id, produtos_carrinho, ultima_intencao_detectada')
      .eq('id', conversaId)
      .single();

    const estagioAtual = conversa?.estagio_agente || 'inicial';
    console.log('📍 Estágio:', estagioAtual, '| Carrinho:', conversa?.produtos_carrinho?.length || 0, 'produtos');

    // Salvar mensagem do cliente na memória
    await salvarMemoria(supabase, conversaId, `Cliente: ${mensagemTexto}`, 'mensagem_recebida', openAiApiKey);

    // === ETAPA 2: RECUPERAR CONTEXTO HISTÓRICO ===
    
    // Primeiro: buscar últimas 5 mensagens direto da memória (fallback simples)
    const { data: memoriasRecentes, error: memoriaError } = await supabase
      .from('whatsapp_conversas_memoria')
      .select('tipo_interacao, conteudo_resumido, criado_em')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: false })
      .limit(5);

    let contextoRelevante = '';
    
    if (memoriasRecentes && memoriasRecentes.length > 0) {
      contextoRelevante = memoriasRecentes
        .reverse()
        .map(m => `[${m.tipo_interacao}] ${m.conteudo_resumido}`)
        .join('\n');
      console.log('🧠 Contexto:', memoriasRecentes.length, 'memórias recentes');
    } else {
      console.log('⚠️ Nenhuma memória encontrada');
    }

    // Tentar busca semântica (opcional, se falhar usa o contexto acima)
    try {
      const { data: contextoData } = await supabase.functions.invoke('recuperar-contexto-conversa', {
        body: { conversaId, queryTexto: mensagemTexto, limite: 5 }
      });

      if (contextoData?.contextoRelevante && contextoData.contextoRelevante !== 'Nenhum contexto anterior relevante.') {
        contextoRelevante = contextoData.contextoRelevante;
        console.log('🎯 Contexto semântico:', contextoData.memorias?.length, 'memórias');
      }
    } catch (err) {
      console.warn('⚠️ Busca semântica falhou, usando memórias recentes');
    }

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

    // VERIFICAÇÃO RÁPIDA: Se há produtos no carrinho e o cliente menciona quantidade/confirmação
    const temCarrinho = conversa?.produtos_carrinho && conversa.produtos_carrinho.length > 0;
    const mencionaQuantidade = /(\d+)\s*(unidades?|caixas?|peças?|pcs?|quero|vou levar|fechou)/i.test(mensagemTexto);
    
    if (temCarrinho && mencionaQuantidade) {
      console.log('⚡ Atalho: Detectado confirmação com carrinho cheio');
      
      // Pular classificação e ir direto para confirmar itens
      const quantidadeMatch = mensagemTexto.match(/(\d+)/);
      const quantidade = quantidadeMatch ? parseInt(quantidadeMatch[1]) : 1;

      const { data: produtosCarrinho } = await supabase
        .from('produtos')
        .select('id, nome, referencia_interna, preco_venda, quantidade_em_maos')
        .in('id', conversa.produtos_carrinho);

      const produtosComQuantidade = (produtosCarrinho || []).map(p => ({
        ...p,
        quantidade
      }));

      const proposta = await criarProposta(supabase, conversaId, produtosComQuantidade, clienteId);
      
      if (!proposta) {
        return new Response(
          JSON.stringify({ resposta: "Ops, tive um problema ao gerar a proposta. Tenta de novo?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: itens, error: itensError } = await supabase
        .from('whatsapp_propostas_itens')
        .select(`
          *,
          produtos:produto_id (nome, referencia_interna)
        `)
        .eq('proposta_id', proposta.id);

      if (itensError) {
        console.error('❌ Erro ao buscar itens (atalho):', itensError);
      }

      console.log(`📋 Itens encontrados (atalho): ${itens?.length || 0}`);

      const mensagemProposta = await formatarPropostaWhatsApp(proposta, itens || []);
      
      await salvarMemoria(supabase, conversaId, `Proposta ${proposta.numero_proposta} criada com ${quantidade} unidades`, 'proposta_enviada', openAiApiKey);

      return new Response(
        JSON.stringify({ resposta: mensagemProposta, proposta_id: proposta.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Atualizar última intenção
    await supabase
      .from('whatsapp_conversas')
      .update({ ultima_intencao_detectada: intencao.intencao })
      .eq('id', conversaId);

    // === ETAPA 4: ROTEAMENTO POR INTENÇÃO ===
    
    // 4A: BUSCAR PRODUTO
    if (intencao.intencao === 'buscar_produto') {
      const termoBusca = intencao.palavrasChave?.join(' ') || mensagemTexto;
      console.log('🔍 Buscando produtos:', termoBusca);

      const vetorPergunta = await gerarEmbedding(termoBusca, openAiApiKey);
      
      const { data: produtos, error } = await supabase.rpc('match_produtos_hibrido', {
        query_text: termoBusca,
        query_embedding: vetorPergunta,
        match_threshold: 0.5,
        match_count: 5
      });

      if (error || !produtos || produtos.length === 0) {
        await salvarMemoria(supabase, conversaId, `Cliente buscou: ${termoBusca} - Sem resultados`, 'busca_vazia', openAiApiKey);
        
        return new Response(
          JSON.stringify({ 
            resposta: `Putz, não encontrei nada com "${termoBusca}". Pode me dar mais detalhes? Código, modelo, marca?` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Salvar na memória
      await salvarMemoria(
        supabase, 
        conversaId, 
        `Produtos encontrados para "${termoBusca}": ${produtos.map((p: any) => p.nome).join(', ')}`, 
        'produtos_sugeridos',
        openAiApiKey
      );

      // Atualizar carrinho
      const produtosIds = produtos.map((p: any) => p.id);
      await supabase
        .from('whatsapp_conversas')
        .update({ 
          produtos_carrinho: produtosIds,
          estagio_agente: 'buscando_produto'
        })
        .eq('id', conversaId);

      // Gerar resposta humanizada
      const contextoProdutos = produtos
        .map((p: any) => 
          `${p.nome} | Cód: ${p.referencia_interna} | R$ ${p.preco_venda.toFixed(2)} | Estoque: ${p.quantidade_em_maos}`
        )
        .join('\n');

      const respostaResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
              content: `Você é o Beto, vendedor simpático da Cirúrgica Fernandes.
Apresente os produtos encontrados de forma concisa, com preço.
Pergunte se o cliente quer fechar ou precisa de mais informações.
NÃO use emojis. Seja direto.

PRODUTOS ENCONTRADOS:
${contextoProdutos}

CLIENTE DISSE: "${mensagemTexto}"`
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      const respostaJson = await respostaResponse.json();
      const resposta = respostaJson.choices[0].message.content;

      await salvarMemoria(supabase, conversaId, `Beto: ${resposta}`, 'resposta_enviada', openAiApiKey);

      return new Response(
        JSON.stringify({ resposta, produtos_encontrados: produtos }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4B: CONFIRMAR ITENS / ADICIONAR AO CARRINHO / ESPECIFICAR QUANTIDADE
    if (intencao.intencao === 'confirmar_itens' || intencao.intencao === 'adicionar_produto') {
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
      
      await salvarMemoria(supabase, conversaId, `Proposta ${proposta.numero_proposta} criada com ${quantidade} unidades`, 'proposta_enviada', openAiApiKey);

      return new Response(
        JSON.stringify({ resposta: mensagemProposta, proposta_id: proposta.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4C: NEGOCIAR PREÇO
    if (intencao.intencao === 'negociar_preco') {
      if (!conversa?.proposta_ativa_id) {
        return new Response(
          JSON.stringify({ resposta: "Ainda não temos uma proposta ativa. Vamos ver os produtos primeiro?" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Processar resposta do cliente
      const { data: analiseResposta } = await supabase.functions.invoke('processar-resposta-cliente', {
        body: { 
          mensagemTexto, 
          propostaId: conversa.proposta_ativa_id 
        }
      });

      if (analiseResposta?.acao === 'negociar' && analiseResposta.novosValores?.descontoSolicitado) {
        const desconto = analiseResposta.novosValores.descontoSolicitado;
        
        // Buscar proposta atual
        const { data: proposta } = await supabase
          .from('whatsapp_propostas_comerciais')
          .select('*')
          .eq('id', conversa.proposta_ativa_id)
          .single();

        if (proposta) {
          const novoDesconto = typeof desconto === 'number' && desconto < 1 
            ? proposta.subtotal * desconto 
            : desconto;

          const novoTotal = proposta.subtotal - novoDesconto + (proposta.valor_frete || 0) + (proposta.impostos_valor || 0);

          // Verificar se precisa aprovação (desconto > 10%)
          const percentualDesconto = (novoDesconto / proposta.subtotal) * 100;
          
          if (percentualDesconto > 10) {
            await supabase
              .from('whatsapp_propostas_comerciais')
              .update({ status: 'aprovacao_pendente' })
              .eq('id', proposta.id);

            await supabase.from('whatsapp_aprovacoes_diretoria').insert({
              proposta_id: proposta.id,
              usuario_solicitante_id: clienteId,
              justificativa: `Cliente solicitou ${percentualDesconto.toFixed(1)}% de desconto`,
              expira_em: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            });

            return new Response(
              JSON.stringify({ 
                resposta: `Entendi, você quer ${percentualDesconto.toFixed(1)}% de desconto. Esse valor precisa de aprovação da diretoria. Vou pedir autorização e te retorno em breve, ok?` 
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Atualizar proposta com desconto
          await supabase
            .from('whatsapp_propostas_comerciais')
            .update({ 
              desconto_valor: novoDesconto,
              desconto_percentual: percentualDesconto,
              valor_total: novoTotal,
              status: 'negociacao'
            })
            .eq('id', proposta.id);

          return new Response(
            JSON.stringify({ 
              resposta: `Consegui aprovar ${percentualDesconto.toFixed(1)}% de desconto! Valor total fica R$ ${novoTotal.toFixed(2)}. Fechamos?` 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 4D: FINALIZAR PEDIDO
    if (intencao.intencao === 'finalizar_pedido') {
      if (!conversa?.proposta_ativa_id) {
        return new Response(
          JSON.stringify({ resposta: "Ainda não temos uma proposta. Quer ver alguns produtos?" }),
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

      await salvarMemoria(
        supabase, 
        conversaId, 
        `Pedido fechado - Oportunidade criada`, 
        'pedido_fechado',
        openAiApiKey
      );

      await supabase
        .from('whatsapp_conversas')
        .update({ 
          estagio_agente: 'fechamento',
          status: 'fechado'
        })
        .eq('id', conversaId);

      return new Response(
        JSON.stringify({ 
          resposta: `Show! Pedido confirmado! 🎉\n\nVou processar tudo por aqui e te mando os detalhes de pagamento e entrega. Qualquer coisa, só chamar!`,
          oportunidade_id: oportunidade?.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4E: SAUDAÇÃO / DÚVIDA / OUTRO
    const respostaResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
            content: `Você é o Beto, vendedor da Cirúrgica Fernandes.
Responda de forma simpática e profissional.
Se for saudação, cumprimente e pergunte como pode ajudar.
Se for dúvida, responda e ofereça ajuda.
NÃO use emojis. Seja breve e direto.`
          },
          { role: "user", content: mensagemTexto }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    const respostaJson = await respostaResponse.json();
    const resposta = respostaJson.choices[0].message.content;

    await salvarMemoria(supabase, conversaId, `Beto: ${resposta}`, 'resposta_enviada', openAiApiKey);

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
