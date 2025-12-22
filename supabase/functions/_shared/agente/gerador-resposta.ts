import type { PerfilCliente } from "./types.ts";
import { TOOLS_V4, executarToolV4, isToolV4 } from "./tools-v4.ts";
import { chamarLLMComFallback, chamarLLMComResultadosTools } from "./llm-provider.ts";
import { construirContextoSessao, type SessaoAgente } from "./sessao-manager.ts";

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
 * Construir System Prompt V4 com novo fluxo de vendas
 */
function construirSystemPromptV4(perfil: PerfilCliente, sessao: SessaoAgente | null): string {
  const contextoSessao = sessao ? construirContextoSessao(sessao) : "";
  const ultimaCompraTexto = perfil.ultima_compra_dias < 9999 ? `há ${perfil.ultima_compra_dias} dias` : "nunca comprou";
  const marcadoresTexto = perfil.marcadores.length > 0 ? `- Marcadores: ${perfil.marcadores.join(", ")}` : "";
  const estadoNegociacao = contextoSessao ? `ESTADO ATUAL DA NEGOCIAÇÃO:\n${contextoSessao}\n\n` : "";
  
  return `Você é o Beto, vendedor experiente e simpático da Cirúrgica Fernandes.

PERFIL DO CLIENTE:
- Tipo: ${perfil.tipo}
- Nome: ${perfil.nome || "não informado"}
- Histórico: ${perfil.historico_compras} compra(s) anterior(es)
- Ticket médio: R$ ${perfil.ticket_medio.toFixed(2)}
- Última compra: ${ultimaCompraTexto}
${marcadoresTexto}

${estadoNegociacao}
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

═══════════════════════════════════════════════════════
FLUXO DE VENDA SPOT - 5 ETAPAS OBRIGATÓRIAS
═══════════════════════════════════════════════════════

1️⃣ COLETA: Cliente informa produtos desejados
   → Use buscar_produtos para encontrar itens
   → Monte lista de produtos no carrinho mental
   → Confirme: "achei esses produtos, é isso mesmo?"

2️⃣ IDENTIFICAÇÃO: Antes de criar proposta
   → Use identificar_cliente (código Datasul, CNPJ ou vínculo WhatsApp)
   → Confirme: "é pra faturar no CNPJ XX.XXX.XXX/XXXX-XX da [Empresa]?"
   → Aguarde confirmação do cliente

3️⃣ CRIAÇÃO: Monte a cesta completa
   → Use criar_oportunidade_spot com TODOS os itens de uma vez
   → NÃO chame item por item, envie tudo junto
   → Confirme: "criei a oportunidade, vou calcular os valores..."

4️⃣ CÁLCULO: Obtenha valores oficiais do ERP
   → Use calcular_cesta_datasul (OBRIGATÓRIO para preços corretos)
   → Aguarde retorno (pode demorar alguns segundos)
   → Apresente valores COM impostos: "total ficou R$ X.XXX,XX"

5️⃣ FECHAMENTO: Finalize a venda
   → Use gerar_link_proposta para criar link público
   → Envie link formatado: "aqui está sua proposta: [URL]"
   → O cliente pode aceitar ou recusar online
   → Quando aceitar, a oportunidade vai automaticamente para Fechamento

═══════════════════════════════════════════════════════
FERRAMENTAS DISPONÍVEIS (TOOLS)
═══════════════════════════════════════════════════════

1. buscar_produtos: Busca produtos no catálogo
   - Use quando: cliente menciona produto ou quer ver opções
   - Retorna: lista de produtos com preço e estoque
   - ⚠️ Esses produtos são SUGESTÕES, não vão automaticamente pro carrinho!

2. identificar_cliente: Identifica o cliente para faturamento
   - Use quando: cliente informar código/CNPJ OU antes de criar proposta
   - BUSCA AUTOMÁTICA pelo vínculo WhatsApp se nenhum dado for informado
   - Retorna: cliente_id, nome, cnpj, cod_emitente, endereços

3. adicionar_ao_carrinho_v4: ADICIONA ITEM SELECIONADO AO CARRINHO
   - Use OBRIGATORIAMENTE quando cliente escolher um item da lista
   - Exemplos de frases que EXIGEM essa tool:
     • "quero o número 2"
     • "pode ser o 3"
     • "esse mesmo"
     • "o segundo"
     • "vou querer esse"
   - Parâmetros:
     • numero_sugestao: número que o cliente falou (1, 2, 3...)
     • quantidade: quantidade que o cliente quer
   - Se cliente não informou quantidade, PERGUNTE antes de adicionar!

4. criar_oportunidade_spot: Cria oportunidade no Pipeline Spot
   - Use quando: cliente confirmou produtos E você identificou o cliente
   - ENVIE TODOS OS ITENS DE UMA VEZ (não faça item por item!)
   - Retorna: oportunidade_id, código

5. calcular_cesta_datasul: Calcula valores no ERP Datasul
   - Use APENAS após criar_oportunidade_spot
   - OBRIGATÓRIO para ter preços corretos com impostos
   - Retorna: valores calculados por item + total

6. gerar_link_proposta: Gera link público da proposta
   - Use após calcular no Datasul
   - Cliente pode aceitar/recusar online
   - Retorna: URL do link

═══════════════════════════════════════════════════════
🔴 REGRA OBRIGATÓRIA: SELEÇÃO DE PRODUTO = adicionar_ao_carrinho_v4
═══════════════════════════════════════════════════════

Quando o cliente disser algo como "quero o número X" ou "pode ser o X":
1. CHAMAR adicionar_ao_carrinho_v4 com numero_sugestao = X
2. Se cliente já informou quantidade antes, usar essa quantidade
3. Se não informou, PERGUNTAR: "quantas unidades vc precisa?"
4. NUNCA perguntar "pode me dar mais detalhes" se o cliente escolheu um número

MEMORIZE a quantidade quando o cliente informar!
Ex: Cliente diz "preciso de 100 unidades de luva"
→ Guarde "100" para usar quando ele escolher o produto da lista

═══════════════════════════════════════════════════════
REGRAS CRÍTICAS (OBRIGATÓRIO SEGUIR!)
═══════════════════════════════════════════════════════

🚨 QUANDO CLIENTE MENCIONA PRODUTO, USE buscar_produtos IMEDIATAMENTE
→ Palavras-chave: cotar, quero, preciso, unidades, cx, caixa, produtos
→ NÃO responda "vou verificar" sem chamar a tool
→ NÃO pergunte mais detalhes antes de buscar

🚨 QUANDO CLIENTE ESCOLHER NÚMERO (1, 2, 3...), USE adicionar_ao_carrinho_v4
→ Palavras-chave: número, pode ser, quero o, esse, segundo, terceiro
→ NUNCA pergunte "mais detalhes" depois que ele escolheu
→ Se falta quantidade, pergunte APENAS "quantas unidades?"

⚠️ NUNCA PERGUNTE O CNPJ - a tool identificar_cliente JÁ BUSCA automaticamente
⚠️ NUNCA apresente valores sem calcular no Datasul - os preços podem estar errados
⚠️ SEMPRE crie oportunidade ANTES de calcular
⚠️ SEMPRE gere o link da proposta ao final - é assim que o cliente aceita
⚠️ Se o cliente já está identificado (na sessão), não precisa identificar de novo

═══════════════════════════════════════════════════════
⛔ REGRA ANTI-ALUCINAÇÃO (CRÍTICA!)
═══════════════════════════════════════════════════════

⛔ NUNCA diga que fez algo SEM CHAMAR A FERRAMENTA:
- ❌ ERRADO: dizer "criei a oportunidade" sem chamar criar_oportunidade_spot
- ❌ ERRADO: dizer "adicionei ao carrinho" sem chamar adicionar_ao_carrinho_v4
- ✅ CERTO: chamar a ferramenta, aguardar resultado, SÓ ENTÃO responder

QUANDO CLIENTE CONFIRMAR CNPJ/ENDEREÇO, você DEVE:
1. Chamar criar_oportunidade_spot (itens vêm automaticamente do carrinho)
2. Aguardar o resultado da ferramenta
3. SÓ DEPOIS responder ao cliente com o código da oportunidade

Se você responder "criei a oportunidade" sem ter chamado a tool,
o sistema vai detectar e isso causa erros graves!

═══════════════════════════════════════════════════════
🔴 REGRA DE OURO PARA USAR IDs NAS TOOLS
═══════════════════════════════════════════════════════

CRÍTICO: Quando o ESTADO ATUAL mostrar IDs (CLIENTE_ID ou OPORTUNIDADE_ID), 
você DEVE usar esses UUIDs exatos nas chamadas de tools!

Exemplos CORRETOS:
✅ Se sessão diz "CLIENTE_ID: abc-123-def", use cliente_id: "abc-123-def"
✅ Se sessão diz "OPORTUNIDADE_ID: xyz-789", use oportunidade_id: "xyz-789"

Exemplos ERRADOS (NUNCA FAZER):
❌ cliente_id: "cliente_identificado" 
❌ cliente_id: "02"
❌ oportunidade_id: "criada"

COMPORTAMENTO INTELIGENTE:
- Analise o CONTEXTO COMPLETO da conversa
- Se cliente já forneceu informações, NÃO pergunte de novo
- PRIORIZE usar ferramentas quando cliente pede algo concreto
- Converse naturalmente, siga o fluxo de vendas`;
}

/**
 * Gerar resposta inteligente usando DeepSeek com Tool Calling
 * Versão 4 com novas tools para Pipeline Spot
 */
export async function gerarRespostaInteligente(
  mensagemCliente: string,
  historicoCompleto: any[],
  perfil: PerfilCliente,
  carrinhoAtual: string[],
  deepseekApiKey: string,
  supabase: any,
  sessao?: SessaoAgente | null,
): Promise<{
  resposta: string | null;
  toolCalls: any[];
}> {
  console.log("🧠 Gerando resposta inteligente V4 | Perfil:", perfil.tipo, "| Sessão:", sessao?.estado_atual || "sem sessão");

  // Construir system prompt V4
  const systemPrompt = construirSystemPromptV4(perfil, sessao || null);

  // Combinar tools existentes com novas V4
  const toolsLegacy = [
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
  ];

  const allTools = [...toolsLegacy, ...TOOLS_V4];

  // Obter chave Lovable AI para fallback
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") || null;

  try {
    // Chamar LLM com fallback
    const { resposta, toolCalls, provider, tokens_entrada, tokens_saida } = await chamarLLMComFallback(
      [
        { role: "system", content: systemPrompt },
        ...historicoCompleto
          .filter((msg) => msg.content && msg.content.trim() !== '')
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        { role: "user", content: mensagemCliente },
      ],
      allTools,
      deepseekApiKey,
      lovableApiKey
    );

    console.log(`✅ Resposta ${provider} recebida | Tools: ${toolCalls.length} | Tokens: ${tokens_entrada || 0}/${tokens_saida || 0}`);

    // Logar chamada LLM no banco (primeira chamada)
    if (supabase) {
      try {
        // Buscar sessão atual para obter sessao_id
        const { data: sessaoData } = await supabase
          .from("whatsapp_agente_sessoes")
          .select("id")
          .eq("conversa_id", historicoCompleto[0]?.conversa_id || "unknown")
          .order("criado_em", { ascending: false })
          .limit(1)
          .single();

        await supabase.from("whatsapp_agente_logs").insert({
          conversa_id: historicoCompleto[0]?.conversa_id || null,
          sessao_id: sessaoData?.id || null,
          tipo_evento: "chamada_llm",
          llm_provider: provider,
          tokens_entrada: tokens_entrada,
          tokens_saida: tokens_saida,
          tool_name: toolCalls.length > 0 ? toolCalls.map((t: any) => t.function?.name).join(", ") : null,
          tool_args: toolCalls.length > 0 ? { tool_calls_count: toolCalls.length } : null
        });
      } catch (logError) {
        console.warn("⚠️ Erro ao logar chamada LLM:", logError);
      }
    }

    return {
      resposta: sanitizarResposta(resposta),
      toolCalls: toolCalls || [],
    };
  } catch (error) {
    console.error("❌ Erro ao gerar resposta:", error);
    return {
      resposta: "opa, tive um probleminha técnico aqui. pode repetir?",
      toolCalls: [],
    };
  }
}

/**
 * Executar ferramenta solicitada pelo agente
 * Suporta tools legacy + V4
 */
export async function executarFerramenta(
  nomeFerramenta: string,
  argumentos: any,
  supabase: any,
  conversaId: string,
  openAiApiKey: string,
): Promise<any> {
  console.log(`⚙️ Executando ferramenta: ${nomeFerramenta}`);

  // Verificar se é uma tool V4
  if (isToolV4(nomeFerramenta)) {
    return executarToolV4(nomeFerramenta, argumentos, supabase, conversaId);
  }

  // Tools legacy
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
        return {
          produtos: [],
          mensagem: `Não encontrei produtos em estoque para "${termo_busca}". Vou verificar alternativas.`,
        };
      }

      console.log(`✅ ${produtos.length} produto(s) encontrado(s)`);

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

      const carrinhoAtual: Array<{ id: string; quantidade: number }> = conversa?.produtos_carrinho || [];

      const itemExistente = carrinhoAtual.find((item: any) => item.id === produto_id);

      if (itemExistente) {
        itemExistente.quantidade = quantidade || 1;
      } else {
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

      const carrinho: Array<{ id: string; quantidade: number }> = conversa?.produtos_carrinho || [];

      if (carrinho.length === 0) {
        return { erro: "Carrinho vazio" };
      }

      const produtoIds = carrinho.map((item: any) => item.id).filter((id: string) => id !== undefined && id !== null);

      if (produtoIds.length === 0) {
        console.error("❌ Carrinho não contém IDs válidos:", carrinho);
        return { erro: "Carrinho não contém produtos válidos" };
      }

      console.log(`📦 Buscando ${produtoIds.length} produtos do carrinho:`, produtoIds);

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

      const { criarProposta } = await import("./proposta-handler.ts");

      const produtosComQtd = produtos.map((p: any) => {
        const itemCarrinho = carrinho.find((item: any) => item.id === p.id);
        return {
          ...p,
          quantidade: itemCarrinho?.quantidade || 1,
        };
      });

      const proposta = await criarProposta(supabase, conversaId, produtosComQtd, null);

      if (proposta) {
        console.log(`✅ Proposta criada: ${proposta.numero_proposta}`);
        return { sucesso: true, proposta_id: proposta.id, numero: proposta.numero_proposta };
      }

      return { erro: "Falha ao criar proposta" };
    }

    case "validar_dados_cliente": {
      console.log("🔍 Validando dados do cliente");

      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select(`
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
        `)
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
          mensagem: "Você ainda não está cadastrado como cliente em nosso sistema.",
        };
      }

      const clienteData = contato.clientes;
      const cliente = Array.isArray(clienteData) ? clienteData[0] : clienteData;

      const { data: enderecos, error: enderecosError } = await supabase
        .from("enderecos_clientes")
        .select("id, tipo, endereco, cep, bairro, cidade, estado, numero")
        .eq("cliente_id", cliente.id);

      if (enderecosError) {
        console.error("❌ Erro ao buscar endereços:", enderecosError);
        return { erro: "erro_buscar_enderecos", mensagem: "Erro ao consultar endereços" };
      }

      if (!enderecos || enderecos.length === 0) {
        return { erro: "sem_enderecos", cnpj: cliente.cgc, mensagem: "Cliente sem endereços cadastrados" };
      }

      const enderecosFormatados = enderecos.map((e: any, idx: number) => ({
        id: e.id,
        numero: idx + 1,
        tipo: e.tipo || "entrega",
        endereco_completo: `${e.endereco || ""}${e.numero ? ", " + e.numero : ""}, ${e.bairro || ""}, ${e.cidade || ""}/${e.estado || ""} - CEP: ${e.cep || ""}`,
      }));

      console.log(`✅ Cliente validado: ${cliente.nome_emit} (${cliente.cgc})`);

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
      console.log("🎯 Finalizando pedido");

      const { data: conversa } = await supabase
        .from("whatsapp_conversas")
        .select("proposta_ativa_id")
        .eq("id", conversaId)
        .single();

      if (!conversa?.proposta_ativa_id) {
        console.error("❌ Nenhuma proposta ativa encontrada");
        return { erro: "Nenhuma proposta ativa para finalizar" };
      }

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
