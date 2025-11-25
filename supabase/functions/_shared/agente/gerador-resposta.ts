import type { PerfilCliente } from './types.ts';

/**
 * Gerar resposta inteligente usando DeepSeek com Tool Calling
 * O agente decide quando buscar produtos, criar proposta, etc.
 */
export async function gerarRespostaInteligente(
  mensagemCliente: string,
  historicoCompleto: any[],
  perfil: PerfilCliente,
  carrinhoAtual: string[],
  deepseekApiKey: string,
  supabase: any
): Promise<{
  resposta: string | null;
  toolCalls: any[];
}> {
  console.log('🧠 Gerando resposta inteligente | Perfil:', perfil.tipo, '| Carrinho:', carrinhoAtual.length);
  
  // Construir system prompt com contexto do cliente
  const systemPrompt = `Você é o Beto, vendedor experiente e simpático da Cirúrgica Fernandes.

PERFIL DO CLIENTE:
- Tipo: ${perfil.tipo}
- Nome: ${perfil.nome || 'não informado'}
- Histórico: ${perfil.historico_compras} compra(s) anterior(es)
- Ticket médio: R$ ${perfil.ticket_medio.toFixed(2)}
- Última compra: ${perfil.ultima_compra_dias < 9999 ? `há ${perfil.ultima_compra_dias} dias` : 'nunca comprou'}
${perfil.marcadores.length > 0 ? `- Marcadores: ${perfil.marcadores.join(', ')}` : ''}

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

INSTRUÇÕES CRÍTICAS SOBRE CONTEXTO:
- Você TEM acesso ao histórico completo da conversa (mensagens anteriores estão disponíveis)
- SEMPRE consulte as mensagens anteriores antes de responder
- Se o cliente mencionar produtos ou informações já discutidas, USE ESSE CONTEXTO
- NÃO diga "não tenho acesso ao histórico" - você TEM e DEVE usar
- Se houver produtos no carrinho, considere isso na resposta
- Mantenha continuidade: se já discutiram algo, não reinicie a conversa

FERRAMENTAS DISPONÍVEIS:
Use-as APENAS quando necessário e fizer sentido no contexto:

1. buscar_produtos: Para buscar produtos no catálogo
   - Use quando: cliente menciona produto específico OU quer ver opções
   - NÃO use se: cliente está apenas cumprimentando, tirando dúvida genérica

2. adicionar_ao_carrinho: Para adicionar produto ao carrinho
   - Use quando: cliente escolheu produto específico e quantidade
   - NÃO use sem confirmação explícita do cliente

3. criar_proposta: Para gerar proposta comercial
   - Use quando: cliente confirmou produtos e está pronto para fechar
   - Requer: carrinho com produtos + confirmação do cliente

COMPORTAMENTO INTELIGENTE:
- Analise o CONTEXTO COMPLETO da conversa
- Se cliente já forneceu informações (tipo de produto, quantidade, urgência), NÃO pergunte de novo
- Seja inteligente: se ele disse "preciso de 50 luvas de procedimento para UTI amanhã", você já tem TUDO
- Use ferramentas quando APROPRIADO, não em toda mensagem
- Converse naturalmente, não force fluxo sequencial`;

  // Definir ferramentas disponíveis
  const tools = [
    {
      type: "function",
      function: {
        name: "buscar_produtos",
        description: "Busca produtos no catálogo da Cirúrgica Fernandes. Use quando o cliente menciona um produto específico ou quer ver opções disponíveis.",
        parameters: {
          type: "object",
          properties: {
            termo_busca: {
              type: "string",
              description: "Termo de busca (nome do produto, categoria, uso). Ex: 'luvas', 'sonda vesical', 'máscara N95'"
            },
            contexto_adicional: {
              type: "string",
              description: "Contexto da necessidade do cliente (procedimento, quantidade estimada, urgência)"
            }
          },
          required: ["termo_busca"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "adicionar_ao_carrinho",
        description: "Adiciona um produto ao carrinho do cliente. Use APENAS quando o cliente confirmou explicitamente que quer o produto.",
        parameters: {
          type: "object",
          properties: {
            produto_id: {
              type: "string",
              description: "ID do produto a adicionar"
            },
            quantidade: {
              type: "number",
              description: "Quantidade desejada"
            }
          },
          required: ["produto_id", "quantidade"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "criar_proposta",
        description: "Cria uma proposta comercial com os produtos do carrinho. Use quando o cliente está pronto para fechar o pedido.",
        parameters: {
          type: "object",
          properties: {
            observacoes: {
              type: "string",
              description: "Observações adicionais para a proposta"
            }
          }
        }
      }
    }
  ];

  try {
    // Chamar DeepSeek com histórico completo e tools
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...historicoCompleto.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: "user", content: mensagemCliente }
        ],
        tools,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API DeepSeek:', response.status, errorText);
      throw new Error(`Falha na API: ${response.status}`);
    }
    
    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    
    console.log('✅ Resposta DeepSeek recebida');
    
    // Retornar resposta e tool calls (não executar aqui)
    return {
      resposta: assistantMessage.content,
      toolCalls: assistantMessage.tool_calls || []
    };
    
  } catch (error) {
    console.error('❌ Erro ao gerar resposta:', error);
    return {
      resposta: "Desculpa, tive um problema técnico. Pode repetir?",
      toolCalls: []
    };
  }
}

/**
 * Executar ferramenta solicitada pelo agente
 */
export async function executarFerramenta(
  nomeFerramenta: string,
  argumentos: any,
  supabase: any,
  conversaId: string,
  openAiApiKey: string
): Promise<any> {
  console.log(`⚙️ Executando ferramenta: ${nomeFerramenta}`);
  
  switch (nomeFerramenta) {
    case 'buscar_produtos': {
      const { termo_busca } = argumentos;
      console.log(`🔍 Buscando produtos para: "${termo_busca}"`);
      
      // Gerar embedding para busca semântica
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: termo_busca
        })
      });
      
      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text();
        console.error('❌ Erro ao gerar embedding:', errorText);
        throw new Error(`Erro ao gerar embedding: ${errorText}`);
      }
      
      const embeddingData = await embeddingResponse.json();
      const vetor = embeddingData.data[0].embedding;
      console.log(`✅ Embedding gerado com ${vetor.length} dimensões`);
      
      // Buscar produtos usando RPC híbrido
      console.log('📞 Chamando match_produtos_hibrido...');
      const { data: produtos, error } = await supabase.rpc('match_produtos_hibrido', {
        query_text: termo_busca,
        query_embedding: vetor,
        match_threshold: 0.5,
        match_count: 5
      });
      
      if (error) {
        console.error('❌ Erro na busca:', error);
        return { 
          produtos: [], 
          mensagem: `Erro ao buscar produtos: ${error.message}` 
        };
      }
      
      if (!produtos || produtos.length === 0) {
        console.log('⚠️ Nenhum produto encontrado na base de dados');
        console.log('📊 Detalhes da busca:', { termo_busca, match_threshold: 0.5, match_count: 5 });
        return { 
          produtos: [], 
          mensagem: `Não encontrei produtos em estoque para "${termo_busca}". Vou verificar alternativas.` 
        };
      }
      
      console.log(`✅ ${produtos.length} produto(s) encontrado(s):`);
      produtos.forEach((p: any, i: number) => {
        console.log(`   ${i+1}. ${p.nome} (${p.referencia_interna}) - R$ ${p.preco_venda} - Estoque: ${p.quantidade_em_maos}`);
      });
      
      return {
        produtos: produtos.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          referencia: p.referencia_interna,
          preco: p.preco_venda,
          estoque: p.quantidade_em_maos
        }))
      };
    }
    
    case 'adicionar_ao_carrinho': {
      const { produto_id, quantidade } = argumentos;
      
      // Buscar carrinho atual
      const { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('produtos_carrinho')
        .eq('id', conversaId)
        .single();
      
      // Carrinho agora é array de objetos { id, quantidade }
      const carrinhoAtual: Array<{ id: string, quantidade: number }> = conversa?.produtos_carrinho || [];
      
      // Verificar se produto já existe no carrinho
      const itemExistente = carrinhoAtual.find((item: any) => item.id === produto_id);
      
      if (itemExistente) {
        // Se já existe, atualizar quantidade
        itemExistente.quantidade = quantidade || 1;
      } else {
        // Se não existe, adicionar novo item
        carrinhoAtual.push({ id: produto_id, quantidade: quantidade || 1 });
      }
      
      await supabase
        .from('whatsapp_conversas')
        .update({ produtos_carrinho: carrinhoAtual })
        .eq('id', conversaId);
      
      console.log(`✅ Produto adicionado ao carrinho: ${produto_id} (qtd: ${quantidade || 1})`);
      
      return { sucesso: true, carrinho_total: carrinhoAtual.length };
    }
    
    case 'criar_proposta': {
      // Buscar produtos do carrinho
      const { data: conversa } = await supabase
        .from('whatsapp_conversas')
        .select('produtos_carrinho')
        .eq('id', conversaId)
        .single();
      
      // Carrinho agora é array de objetos { id, quantidade }
      const carrinho: Array<{ id: string, quantidade: number }> = conversa?.produtos_carrinho || [];
      
      if (carrinho.length === 0) {
        return { erro: "Carrinho vazio" };
      }
      
      // Extrair apenas os IDs para buscar os produtos
      const produtoIds = carrinho
        .map((item: any) => item.id)
        .filter((id: string) => id !== undefined && id !== null); // Filtrar IDs inválidos
      
      if (produtoIds.length === 0) {
        console.error('❌ Carrinho não contém IDs válidos:', carrinho);
        return { erro: "Carrinho não contém produtos válidos" };
      }
      
      console.log(`📦 Buscando ${produtoIds.length} produtos do carrinho:`, produtoIds);
      
      // Buscar detalhes dos produtos
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .in('id', produtoIds);
      
      if (produtosError) {
        console.error('❌ Erro ao buscar produtos:', produtosError);
        return { erro: `Erro ao buscar produtos: ${produtosError.message}` };
      }
      
      if (!produtos || produtos.length === 0) {
        console.error('❌ Nenhum produto encontrado para os IDs:', produtoIds);
        return { erro: "Produtos do carrinho não encontrados" };
      }
      
      console.log(`✅ ${produtos.length} produtos encontrados`);
      
      // Importar função de criar proposta
      const { criarProposta } = await import('./proposta-handler.ts');
      
      // Mapear produtos com suas quantidades do carrinho
      const produtosComQtd = produtos.map((p: any) => {
        const itemCarrinho = carrinho.find((item: any) => item.id === p.id);
        return {
          ...p,
          quantidade: itemCarrinho?.quantidade || 1
        };
      });
      
      console.log(`📦 Produtos com quantidades:`, produtosComQtd.map((p: any) => `${p.referencia_interna}: ${p.quantidade}x`));
      
      const proposta = await criarProposta(
        supabase,
        conversaId,
        produtosComQtd,
        null
      );
      
      if (proposta) {
        console.log(`✅ Proposta criada: ${proposta.numero_proposta}`);
        return { sucesso: true, proposta_id: proposta.id, numero: proposta.numero_proposta };
      }
      
      return { erro: "Falha ao criar proposta" };
    }
    
    default:
      console.warn(`⚠️ Ferramenta desconhecida: ${nomeFerramenta}`);
      return { erro: "Ferramenta não encontrada" };
  }
}
