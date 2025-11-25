import type { PerfilCliente } from "./types.ts";

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
  supabase: any,
): Promise<{
  resposta: string | null;
  toolCalls: any[];
}> {
  console.log("🧠 Gerando resposta inteligente | Perfil:", perfil.tipo, "| Carrinho:", carrinhoAtual.length);

  // Construir system prompt com contexto do cliente
  const systemPrompt = `Você é o Beto, vendedor experiente e simpático da Cirúrgica Fernandes.

PERFIL DO CLIENTE:
- Tipo: ${perfil.tipo}
- Nome: ${perfil.nome || "não informado"}
- Histórico: ${perfil.historico_compras} compra(s) anterior(es)
- Ticket médio: R$ ${perfil.ticket_medio.toFixed(2)}
- Última compra: ${perfil.ultima_compra_dias < 9999 ? `há ${perfil.ultima_compra_dias} dias` : "nunca comprou"}
${perfil.marcadores.length > 0 ? `- Marcadores: ${perfil.marcadores.join(", ")}` : ""}

SOBRE A EMPRESA:
- Cirúrgica Fernandes vende produtos hospitalares e cirúrgicos
- Atende hospitais, clínicas e profissionais de saúde
- Grande variedade em estoque, diversas marcas reconhecidas

SUA PERSONALIDADE (ESTILO DE ESCRITA OBRIGATÓRIO):
- ZERO cara de robô. Aja como um humano digitando no celular na correria.
- USE TUDO EM MINÚSCULO (exceto nomes próprios e siglas como CNPJ).
- NÃO use pontuação final em frases curtas (ex: "tudo bem", não "Tudo bem.").
- Abrevie palavras comuns: "você" -> "vc", "também" -> "tbm", "para" -> "pra", "está" -> "ta".
- Use marcadores de conversa humana: "opa", "então", "deixa eu ver aqui", "peraí".
- Se for mandar uma lista, NÃO use bullet points (*) ou números (1.). Mande em linhas separadas simples.
- Seja breve. Ninguém lê textão no zap.
- Use gírias leves de ambiente de trabalho: "show", "beleza", "fechado", "tranquilo".

EXEMPLOS DE COMO FALAR:
Robô: "Olá, senhor. Segue a lista de produtos encontrados." (NÃO FAÇA ISSO)
Beto: "opa, achei esses aqui ó:"

Robô: "Gostaria de adicionar algo mais ao carrinho?" (NÃO FAÇA ISSO)
Beto: "vai querer mais alguma coisa ou fecho esse?"

Robô: "O endereço selecionado foi o número 1." (NÃO FAÇA ISSO)
Beto: "blz, vai pro endereço 1 então. vou gerar o pedido"

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

3. criar_proposta: Para gerar proposta comercial com os produtos do carrinho
   - Use quando: cliente confirmou TODOS os itens que deseja comprar
   - Requer: carrinho com produtos + confirmação do cliente
   - IMPORTANTE: criar_proposta NÃO finaliza o pedido, apenas GERA a proposta
   - APÓS CRIAR: apresente a proposta formatada e PERGUNTE se o cliente quer FINALIZAR
   - Exemplo: "proposta gerada! são 3 itens por R$ 1.250,00. quer que eu feche esse pedido?"

4. validar_dados_cliente: CRÍTICO - busca AUTOMATICAMENTE o CNPJ e endereços do cliente
   - Use quando: cliente ACEITAR/CONFIRMAR a proposta (ex: "pode fechar", "confirmo", "quero")
   - ⚠️ NUNCA PERGUNTE O CNPJ: esta ferramenta JÁ BUSCA automaticamente o CNPJ vinculado ao contato WhatsApp
   - Retorna: CNPJ do cliente + lista completa de endereços cadastrados
   - Você DEVE APRESENTAR o CNPJ encontrado e perguntar confirmação
   - Depois MOSTRAR TODOS os endereços numerados para escolha
   - Esta é a ÚNICA forma de obter CNPJ - NÃO existe outra ferramenta para isso

5. finalizar_pedido: Cria a venda no sistema (última etapa)
   - Use APENAS após: 1) validar_dados_cliente, 2) cliente confirmar CNPJ, 3) cliente escolher endereço
   - Requer: cliente_id + cnpj_confirmado + endereco_id (UUID do endereço escolhido)
   - Após finalizar: informe o número do pedido gerado com entusiasmo

⚠️ REGRA CRÍTICA - NUNCA PERGUNTE O CNPJ:
- A ferramenta validar_dados_cliente JÁ BUSCA o CNPJ automaticamente do sistema
- Você NUNCA deve escrever: "qual seu cnpj?", "precisa de cnpj?", "me passa o cnpj"
- FLUXO CORRETO quando cliente aceitar proposta:
  1. Você chama validar_dados_cliente (ela busca CNPJ sozinha)
  2. Você APRESENTA o resultado: "achei seu cnpj aqui: 07.501.860/0001-58. é nesse mesmo o faturamento?"
  3. Cliente confirma ("sim", "esse mesmo", "confirma")
  4. Você mostra endereços numerados
  5. Cliente escolhe endereço
  6. Você finaliza com finalizar_pedido

FLUXO DE FECHAMENTO DE PEDIDO - 4 ETAPAS OBRIGATÓRIAS:

ETAPA 1 - CRIAR PROPOSTA:
- Cliente confirma produtos: "só isso", "pode gerar", "é isso mesmo"
- Você chama criar_proposta
- Você APRESENTA a proposta formatada com itens e valor total
- Você PERGUNTA: "quer que eu feche esse pedido?" ou "confirma pra eu processar?"
- ⚠️ NÃO considere fechado ainda - apenas apresentou a proposta

ETAPA 2 - VALIDAR DADOS (CNPJ + ENDEREÇOS):
- Cliente confirma fechamento: "pode fechar", "sim", "quero", "confirma"
- Você chama validar_dados_cliente (NÃO pergunte CNPJ!)
- Sistema retorna CNPJ + lista de endereços
- Você APRESENTA: "é nesse cnpj (XX.XXX.XXX/XXXX-XX) o faturamento?"
- ⚠️ AGUARDE confirmação do CNPJ antes de prosseguir

ETAPA 3 - SELECIONAR ENDEREÇO:
- Cliente confirma CNPJ: "sim", "esse mesmo", "confirma"
- Você mostra TODOS os endereços em formato numerado claro:
  "1️⃣ Av. Brigadeiro, 321, Jardins, São Paulo/SP - CEP: 01451-000
   2️⃣ Rua Augusta, 500, Consolação, São Paulo/SP - CEP: 01305-000
   qual endereço vc quer pra entrega? digita o número"
- ⚠️ AGUARDE cliente escolher o endereço

ETAPA 4 - FINALIZAR PEDIDO:
- Cliente escolhe endereço: "1", "o primeiro", "numero 2"
- Você identifica o UUID do endereço escolhido
- Você chama finalizar_pedido com cliente_id, cnpj_confirmado, endereco_id
- Você informa: "fechado! pedido {numero} criado. vamos processar e enviar em breve 🎉"

COMPORTAMENTO INTELIGENTE:
- Analise o CONTEXTO COMPLETO da conversa
- Se cliente já forneceu informações (tipo de produto, quantidade, urgência), NÃO pergunte de novo
- Seja inteligente: se ele disse "preciso de 50 luvas de procedimento para UTI amanhã", você já tem TUDO
- Use ferramentas quando APROPRIADO, não em toda mensagem
- Converse naturalmente, mas SIGA O FLUXO DE FECHAMENTO quando cliente aceitar proposta`;

  // Definir ferramentas disponíveis
  const tools = [
    {
      type: "function",
      function: {
        name: "buscar_produtos",
        description:
          "Busca produtos no catálogo da Cirúrgica Fernandes. Use quando o cliente menciona um produto específico ou quer ver opções disponíveis.",
        parameters: {
          type: "object",
          properties: {
            termo_busca: {
              type: "string",
              description:
                "Termo de busca (nome do produto, categoria, uso). Ex: 'luvas', 'sonda vesical', 'máscara N95'",
            },
            contexto_adicional: {
              type: "string",
              description: "Contexto da necessidade do cliente (procedimento, quantidade estimada, urgência)",
            },
          },
          required: ["termo_busca"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "adicionar_ao_carrinho",
        description:
          "Adiciona um produto ao carrinho do cliente. Use APENAS quando o cliente confirmou explicitamente que quer o produto.",
        parameters: {
          type: "object",
          properties: {
            produto_id: {
              type: "string",
              description: "ID do produto a adicionar",
            },
            quantidade: {
              type: "number",
              description: "Quantidade desejada",
            },
          },
          required: ["produto_id", "quantidade"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "criar_proposta",
        description:
          "Cria uma proposta comercial com os produtos do carrinho. Use quando o cliente confirmou TODOS os itens desejados. ATENÇÃO: Isso NÃO finaliza o pedido, apenas gera a proposta. Após criar, você DEVE apresentar a proposta ao cliente e PERGUNTAR se ele quer finalizar (ex: 'quer que eu feche esse pedido?'). O fechamento real ocorre com validar_dados_cliente + finalizar_pedido.",
        parameters: {
          type: "object",
          properties: {
            observacoes: {
              type: "string",
              description: "Observações adicionais para a proposta",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "validar_dados_cliente",
        description:
          "⚠️ CRÍTICO - BUSCA AUTOMÁTICA DE CNPJ: Esta ferramenta BUSCA AUTOMATICAMENTE o CNPJ e endereços do cliente vinculados ao contato WhatsApp. Use quando cliente ACEITAR/CONFIRMAR a proposta (ex: 'pode fechar', 'confirmo', 'quero finalizar'). NUNCA PERGUNTE O CNPJ AO CLIENTE - a ferramenta já retorna o CNPJ encontrado no sistema. Você deve APRESENTAR o CNPJ retornado e pedir confirmação (ex: 'é nesse cnpj (XX.XXX.XXX/XXXX-XX) o faturamento?'). Depois, APRESENTAR todos os endereços numerados para escolha.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    {
      type: "function",
      function: {
        name: "finalizar_pedido",
        description:
          "ÚLTIMA ETAPA: Finaliza o pedido e cria a venda no sistema. Use APENAS após: 1) ter chamado validar_dados_cliente, 2) cliente confirmar o CNPJ, 3) cliente escolher o endereço. Esta ferramenta cria o pedido oficial no sistema.",
        parameters: {
          type: "object",
          properties: {
            cliente_id: {
              type: "string",
              description: "UUID do cliente retornado por validar_dados_cliente",
            },
            cnpj_confirmado: {
              type: "string",
              description: "CNPJ que o cliente confirmou (ex: '12.345.678/0001-90')",
            },
            endereco_id: {
              type: "string",
              description: "UUID do endereço que o cliente escolheu da lista apresentada",
            },
          },
          required: ["cliente_id", "cnpj_confirmado", "endereco_id"],
        },
      },
    },
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
          ...historicoCompleto.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: mensagemCliente },
        ],
        tools,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na API DeepSeek:", response.status, errorText);
      throw new Error(`Falha na API: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    console.log("✅ Resposta DeepSeek recebida");

    // Retornar resposta e tool calls (não executar aqui)
    return {
      resposta: assistantMessage.content,
      toolCalls: assistantMessage.tool_calls || [],
    };
  } catch (error) {
    console.error("❌ Erro ao gerar resposta:", error);
    return {
      resposta: "Desculpa, tive um problema técnico. Pode repetir?",
      toolCalls: [],
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
  openAiApiKey: string,
): Promise<any> {
  console.log(`⚙️ Executando ferramenta: ${nomeFerramenta}`);

  switch (nomeFerramenta) {
    case "buscar_produtos": {
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
          input: termo_busca,
        }),
      });

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text();
        console.error("❌ Erro ao gerar embedding:", errorText);
        throw new Error(`Erro ao gerar embedding: ${errorText}`);
      }

      const embeddingData = await embeddingResponse.json();
      const vetor = embeddingData.data[0].embedding;
      console.log(`✅ Embedding gerado com ${vetor.length} dimensões`);

      // Buscar produtos usando RPC híbrido
      console.log("📞 Chamando match_produtos_hibrido...");
      const { data: produtos, error } = await supabase.rpc("match_produtos_hibrido", {
        query_text: termo_busca,
        query_embedding: vetor,
        match_threshold: 0.5,
        match_count: 5,
      });

      if (error) {
        console.error("❌ Erro na busca:", error);
        return {
          produtos: [],
          mensagem: `Erro ao buscar produtos: ${error.message}`,
        };
      }

      if (!produtos || produtos.length === 0) {
        console.log("⚠️ Nenhum produto encontrado na base de dados");
        console.log("📊 Detalhes da busca:", { termo_busca, match_threshold: 0.5, match_count: 5 });
        return {
          produtos: [],
          mensagem: `Não encontrei produtos em estoque para "${termo_busca}". Vou verificar alternativas.`,
        };
      }

      console.log(`✅ ${produtos.length} produto(s) encontrado(s):`);
      produtos.forEach((p: any, i: number) => {
        console.log(
          `   ${i + 1}. ${p.nome} (${p.referencia_interna}) - R$ ${p.preco_venda} - Estoque: ${p.quantidade_em_maos}`,
        );
      });

      return {
        produtos: produtos.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          referencia: p.referencia_interna,
          preco: p.preco_venda,
          estoque: p.quantidade_em_maos,
        })),
      };
    }

    case "adicionar_ao_carrinho": {
      const { produto_id, quantidade } = argumentos;

      // Buscar carrinho atual
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("produtos_carrinho")
        .eq("id", conversaId)
        .single();

      // Carrinho agora é array de objetos { id, quantidade }
      const carrinhoAtual: Array<{ id: string; quantidade: number }> = conversa?.produtos_carrinho || [];

      // Verificar se produto já existe no carrinho
      const itemExistente = carrinhoAtual.find((item: any) => item.id === produto_id);

      if (itemExistente) {
        // Se já existe, atualizar quantidade
        itemExistente.quantidade = quantidade || 1;
      } else {
        // Se não existe, adicionar novo item
        carrinhoAtual.push({ id: produto_id, quantidade: quantidade || 1 });
      }

      await supabase.from("whatsapp_conversas").update({ produtos_carrinho: carrinhoAtual }).eq("id", conversaId);

      console.log(`✅ Produto adicionado ao carrinho: ${produto_id} (qtd: ${quantidade || 1})`);

      return { sucesso: true, carrinho_total: carrinhoAtual.length };
    }

    case "criar_proposta": {
      // Buscar produtos do carrinho
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("produtos_carrinho")
        .eq("id", conversaId)
        .single();

      // Carrinho agora é array de objetos { id, quantidade }
      const carrinho: Array<{ id: string; quantidade: number }> = conversa?.produtos_carrinho || [];

      if (carrinho.length === 0) {
        return { erro: "Carrinho vazio" };
      }

      // Extrair apenas os IDs para buscar os produtos
      const produtoIds = carrinho.map((item: any) => item.id).filter((id: string) => id !== undefined && id !== null); // Filtrar IDs inválidos

      if (produtoIds.length === 0) {
        console.error("❌ Carrinho não contém IDs válidos:", carrinho);
        return { erro: "Carrinho não contém produtos válidos" };
      }

      console.log(`📦 Buscando ${produtoIds.length} produtos do carrinho:`, produtoIds);

      // Buscar detalhes dos produtos
      const { data: produtos, error: produtosError } = await supabase.from("produtos").select("*").in("id", produtoIds);

      if (produtosError) {
        console.error("❌ Erro ao buscar produtos:", produtosError);
        return { erro: `Erro ao buscar produtos: ${produtosError.message}` };
      }

      if (!produtos || produtos.length === 0) {
        console.error("❌ Nenhum produto encontrado para os IDs:", produtoIds);
        return { erro: "Produtos do carrinho não encontrados" };
      }

      console.log(`✅ ${produtos.length} produtos encontrados`);

      // Importar função de criar proposta
      const { criarProposta } = await import("./proposta-handler.ts");

      // Mapear produtos com suas quantidades do carrinho
      const produtosComQtd = produtos.map((p: any) => {
        const itemCarrinho = carrinho.find((item: any) => item.id === p.id);
        return {
          ...p,
          quantidade: itemCarrinho?.quantidade || 1,
        };
      });

      console.log(
        `📦 Produtos com quantidades:`,
        produtosComQtd.map((p: any) => `${p.referencia_interna}: ${p.quantidade}x`),
      );

      const proposta = await criarProposta(supabase, conversaId, produtosComQtd, null);

      if (proposta) {
        console.log(`✅ Proposta criada: ${proposta.numero_proposta}`);
        return { sucesso: true, proposta_id: proposta.id, numero: proposta.numero_proposta };
      }

      return { erro: "Falha ao criar proposta" };
    }

    case "validar_dados_cliente": {
      console.log("🔍 Validando dados do cliente");

      // Buscar contato e cliente vinculado
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select(
          `
          whatsapp_contato_id,
          whatsapp_contatos (
            nome_whatsapp,
            contato_id,
            contatos (
              id,
              primeiro_nome,
              cliente_id,
              clientes (
                id,
                nome_emit,
                cgc
              )
            )
          )
        `,
        )
        .eq("id", conversaId)
        .single();

      if (!conversa?.whatsapp_contatos) {
        return { erro: "Contato WhatsApp não encontrado" };
      }

      const whatsappContato = Array.isArray(conversa.whatsapp_contatos)
        ? conversa.whatsapp_contatos[0]
        : conversa.whatsapp_contatos;

      if (!whatsappContato?.contatos) {
        return {
          erro: "contato_nao_vinculado",
          mensagem: "Seu número ainda não está vinculado a um contato no sistema.",
        };
      }

      const contato = Array.isArray(whatsappContato.contatos) ? whatsappContato.contatos[0] : whatsappContato.contatos;

      if (!contato.cliente_id || !contato.clientes) {
        return {
          erro: "cliente_nao_vinculado",
          mensagem:
            "Você ainda não está cadastrado como cliente em nosso sistema. Vou precisar de alguns dados antes de finalizar.",
        };
      }

      const clienteData = contato.clientes;
      const cliente = Array.isArray(clienteData) ? clienteData[0] : clienteData;

      // Buscar endereços na tabela correta (enderecos_clientes)
      const { data: enderecos, error: enderecosError } = await supabase
        .from("enderecos_clientes")
        .select("id, tipo, endereco, cep, bairro, cidade, estado, numero")
        .eq("cliente_id", cliente.id);

      if (enderecosError) {
        console.error("❌ Erro ao buscar endereços:", enderecosError);
        return {
          erro: "erro_buscar_enderecos",
          mensagem: "Erro ao consultar endereços cadastrados",
        };
      }

      if (!enderecos || enderecos.length === 0) {
        return {
          erro: "sem_enderecos",
          cnpj: cliente.cgc,
          mensagem: "Cliente encontrado mas sem endereços cadastrados",
        };
      }

      // Formatar endereços para o agente apresentar ao cliente
      const enderecosFormatados = enderecos.map((e: any, idx: number) => ({
        id: e.id,
        numero: idx + 1,
        tipo: e.tipo || "entrega",
        endereco_completo: `${e.endereco || ""}${e.numero ? ", " + e.numero : ""}, ${e.bairro || ""}, ${e.cidade || ""}/${e.estado || ""} - CEP: ${e.cep || ""}`,
      }));

      console.log(`✅ Cliente validado: ${cliente.nome_emit} (${cliente.cgc})`);
      console.log(`📍 ${enderecosFormatados.length} endereço(s) encontrado(s)`);

      return {
        sucesso: true,
        cliente_id: cliente.id,
        cliente_nome: cliente.nome_emit,
        cnpj: cliente.cgc,
        enderecos: enderecosFormatados,
      };
    }

    case "finalizar_pedido": {
      const { cliente_id, cnpj_confirmado, endereco_id } = argumentos;
      console.log("🎯 Finalizando pedido e criando venda no sistema");
      console.log(`   Cliente ID: ${cliente_id}`);
      console.log(`   CNPJ: ${cnpj_confirmado}`);
      console.log(`   Endereço ID: ${endereco_id}`);

      // Buscar proposta ativa da conversa
      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("proposta_ativa_id")
        .eq("id", conversaId)
        .single();

      if (!conversa?.proposta_ativa_id) {
        console.error("❌ Nenhuma proposta ativa encontrada");
        return { erro: "Nenhuma proposta ativa para finalizar" };
      }

      // Chamar edge function para converter proposta em venda
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/converter-proposta-venda`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propostaId: conversa.proposta_ativa_id,
            conversaId: conversaId,
            clienteId: cliente_id,
            cnpjConfirmado: cnpj_confirmado,
            enderecoId: endereco_id,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Erro ao converter proposta:", errorText);
          return { erro: "Erro ao finalizar pedido" };
        }

        const resultado = await response.json();
        console.log("✅ Pedido finalizado:", resultado.venda.numero_venda);

        // Limpar carrinho e atualizar estágio
        await supabase
          .from("whatsapp_conversas")
          .update({
            produtos_carrinho: [],
            estagio_agente: "fechamento",
            proposta_ativa_id: null,
          })
          .eq("id", conversaId);

        return {
          sucesso: true,
          numero_pedido: resultado.venda.numero_venda,
          valor_total: resultado.venda.valor_total,
        };
      } catch (error) {
        console.error("❌ Erro na conversão:", error);
        return { erro: "Erro ao processar pedido" };
      }
    }

    default:
      console.warn(`⚠️ Ferramenta desconhecida: ${nomeFerramenta}`);
      return { erro: "Ferramenta não encontrada" };
  }
}
