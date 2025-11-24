import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// === TIPOS E ENUMS ===

type EstadoConversa = 
  | 'saudacao_inicial'           // Primeira interação
  | 'descoberta_necessidade'     // Fazendo perguntas qualificadoras
  | 'sugestao_produtos'          // Mostrou produtos, aguardando reação
  | 'aguardando_escolha'         // Cliente viu opções, precisa escolher
  | 'confirmacao_quantidade'     // Cliente escolheu, confirmar qtd
  | 'refinamento_busca'          // Cliente pediu mais opções
  | 'montagem_proposta'          // Preparando proposta
  | 'proposta_apresentada'       // Proposta enviada, aguardando decisão
  | 'negociacao_ativa'           // Cliente quer negociar
  | 'aguardando_aprovacao'       // Aguardando aprovação diretoria
  | 'fechamento'                 // Pedido confirmado
  | 'pos_venda';                 // Acompanhamento após venda

interface ProdutoRelevante {
  id: string;
  referencia_interna: string;
  nome: string;
  narrativa: string | null;
  preco_venda: number;
  quantidade_em_maos: number;
  similarity?: number;
}

interface ContextoConversa {
  estadoAtual: EstadoConversa;
  intencao: any;
  carrinho: string[];
  propostaId: string | null;
  contextoHistorico: string;
}

interface PerfilCliente {
  tipo: 'cliente_novo' | 'cliente_vip' | 'cliente_regular' | 'lead';
  marcadores: string[];
  historico_compras: number;
  ticket_medio: number;
  ultima_compra_dias: number;
  nome?: string;
}

// === FUNÇÕES AUXILIARES ===

// Buscar perfil do cliente
async function buscarPerfilCliente(clienteId: string | null, supabase: any): Promise<PerfilCliente> {
  console.log('👤 Buscando perfil do cliente:', clienteId);
  
  if (!clienteId) {
    return {
      tipo: 'lead',
      marcadores: ['cliente_novo'],
      historico_compras: 0,
      ticket_medio: 0,
      ultima_compra_dias: 9999
    };
  }
  
  try {
    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome_emit, nome_fantasia, criado_em')
      .eq('id', clienteId)
      .single();
    
    // Buscar histórico de vendas
    const { data: vendas } = await supabase
      .from('vendas')
      .select('valor_total, criado_em')
      .eq('cliente_id', clienteId)
      .order('criado_em', { ascending: false });
    
    const totalCompras = vendas?.length || 0;
    const ticketMedio = vendas?.reduce((sum: number, v: any) => sum + (v.valor_total || 0), 0) / (totalCompras || 1);
    
    // Calcular dias desde última compra
    let ultimaCompraDias = 9999;
    if (vendas && vendas.length > 0) {
      const ultimaCompra = new Date(vendas[0].criado_em);
      const hoje = new Date();
      ultimaCompraDias = Math.floor((hoje.getTime() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // Determinar tipo de cliente
    let tipo: 'cliente_novo' | 'cliente_vip' | 'cliente_regular' = 'cliente_regular';
    const marcadores: string[] = [];
    
    if (totalCompras === 0) {
      tipo = 'cliente_novo';
      marcadores.push('cliente_novo');
    } else if (totalCompras > 10 && ticketMedio > 5000) {
      tipo = 'cliente_vip';
      marcadores.push('cliente_vip', 'alto_valor');
    } else {
      tipo = 'cliente_regular';
    }
    
    // Marcadores adicionais
    if (ticketMedio > 10000) marcadores.push('ticket_alto');
    if (totalCompras > 20) marcadores.push('frequente');
    if (ultimaCompraDias > 90 && totalCompras > 0) marcadores.push('inativo');
    if (ultimaCompraDias < 30 && totalCompras > 0) marcadores.push('ativo_recente');
    
    const perfil = {
      tipo,
      marcadores,
      historico_compras: totalCompras,
      ticket_medio: ticketMedio,
      ultima_compra_dias: ultimaCompraDias,
      nome: cliente?.nome_fantasia || cliente?.nome_emit
    };
    
    console.log('✅ Perfil:', perfil);
    return perfil;
    
  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    return {
      tipo: 'lead',
      marcadores: ['erro_perfil'],
      historico_compras: 0,
      ticket_medio: 0,
      ultima_compra_dias: 9999
    };
  }
}

// Gerar resposta personalizada baseada no perfil e contexto
async function gerarRespostaPersonalizada(
  mensagemCliente: string,
  contextoHistorico: string,
  perfil: PerfilCliente,
  produtos: any[],
  estado: EstadoConversa,
  lovableApiKey: string
): Promise<string> {
  console.log('🎨 Gerando resposta personalizada - Estado:', estado, '| Perfil:', perfil.tipo);
  
  // Construir prompt contextualizado
  let systemPrompt = `Você é o Beto, vendedor experiente e simpático da Cirúrgica Fernandes.

PERFIL DO CLIENTE:
- Tipo: ${perfil.tipo}
- Nome: ${perfil.nome || 'não informado'}
- Histórico: ${perfil.historico_compras} compra(s) anterior(es)
- Ticket médio: R$ ${perfil.ticket_medio.toFixed(2)}
- Última compra: ${perfil.ultima_compra_dias < 9999 ? `há ${perfil.ultima_compra_dias} dias` : 'nunca comprou'}
${perfil.marcadores.length > 0 ? `- Marcadores: ${perfil.marcadores.join(', ')}` : ''}

ESTÁGIO DA CONVERSA: ${estado}

CONTEXTO DA CONVERSA:
${contextoHistorico}

SOBRE A EMPRESA:
- Cirúrgica Fernandes vende produtos hospitalares e cirúrgicos
- Atende hospitais, clínicas e profissionais de saúde
- Grande variedade em estoque, diversas marcas reconhecidas

SUA PERSONALIDADE:
- Simpático e profissional
- Direto ao ponto, sem enrolação
- Usa linguagem natural e informal (você, não "senhor/senhora")
- Máximo 2 emojis por mensagem (use com moderação)
- Faz perguntas para entender melhor a necessidade
- Empático e atencioso`;

  // Adicionar instruções específicas por perfil
  if (perfil.tipo === 'cliente_vip') {
    systemPrompt += `\n\nINSTRUÇÕES ESPECIAIS (CLIENTE VIP):
- Reconheça que é um cliente especial e agradeça a preferência
- Ofereça atenção diferenciada e personalizada
- Mencione que pode verificar condições especiais se necessário`;
  } else if (perfil.tipo === 'cliente_novo') {
    systemPrompt += `\n\nINSTRUÇÕES ESPECIAIS (CLIENTE NOVO):
- Dê boas-vindas calorosas
- Se apresente brevemente como Beto da Cirúrgica Fernandes
- Explique que está aqui para ajudar a encontrar o que precisa`;
  } else if (perfil.marcadores.includes('inativo')) {
    systemPrompt += `\n\nINSTRUÇÕES ESPECIAIS (CLIENTE INATIVO):
- Mencione que é bom ter ele de volta
- Mostre entusiasmo em ajudar novamente`;
  }
  
  // Adicionar contexto de produtos se houver
  if (produtos && produtos.length > 0) {
    systemPrompt += `\n\nPRODUTOS ENCONTRADOS:
${produtos.slice(0, 5).map(p => 
  `• ${p.nome} (${p.referencia_interna}) - R$ ${p.preco_venda?.toFixed(2) || 'N/A'} - Estoque: ${p.quantidade_em_maos || 0}`
).join('\n')}`;
  }
  
  // Instruções específicas por estágio
  if (estado === 'sugestao_produtos') {
    systemPrompt += `\n\nINSTRUÇÕES PARA SUGESTÃO DE PRODUTOS:
- Apresente os 2-3 melhores produtos (não todos)
- Destaque DIFERENCIAIS de cada um: "Mais vendido", "Melhor custo-benefício", "Alta qualidade", "Recomendado para..."
- Use linguagem de vendas persuasiva mas não agressiva
- Pergunte se quer saber mais detalhes ou já quer fechar
- Seja conciso (máximo 4-5 linhas)`;
  } else if (estado === 'proposta_apresentada') {
    systemPrompt += `\n\nINSTRUÇÕES PARA PROPOSTA:
- Use linguagem de fechamento positiva
- Reforce benefícios da escolha
- Ofereça flexibilidade: parcelamento, desconto para volume
- Mostre confiança no valor da proposta`;
  } else if (estado === 'negociacao_ativa') {
    systemPrompt += `\n\nINSTRUÇÕES PARA NEGOCIAÇÃO:
- Seja empático com a preocupação de preço
- Mostre valor agregado (qualidade, economia no longo prazo)
- Ofereça alternativas criativas
- Mantenha tom positivo e solucionador`;
  }
  
  systemPrompt += `\n\nCLIENTE DISSE: "${mensagemCliente}"

TAREFA: Responda de forma natural, contextualizada e persuasiva. Seja autêntico como um vendedor experiente.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mensagemCliente }
        ],
        temperature: 0.85,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      console.error('❌ Erro na API Lovable:', response.status);
      throw new Error('Falha na API');
    }
    
    const data = await response.json();
    const respostaGerada = data.choices[0].message.content;
    
    console.log('✅ Resposta gerada:', respostaGerada.substring(0, 100) + '...');
    return respostaGerada;
    
  } catch (error) {
    console.error('❌ Erro ao gerar resposta:', error);
    // Fallback simples
    return "Desculpa, tive um problema técnico. Pode repetir?";
  }
}

// Banco de perguntas qualificadoras
const PERGUNTAS_QUALIFICADORAS = {
  tipo_procedimento: [
    "Para te ajudar melhor, me conta: é para uso hospitalar, clínica ou outro ambiente?",
    "Qual tipo de procedimento você realiza com esses produtos?",
    "Você já usa algum produto similar? Qual marca ou modelo?",
  ],
  quantidade: [
    "Qual a quantidade você precisa? É uma compra pontual ou reposição de estoque?",
    "Precisa de quantas unidades aproximadamente?",
    "É para começar com uma quantidade menor para testar ou já sabe quanto precisa?",
  ],
  urgencia: [
    "Para quando você precisa desses produtos?",
    "É urgente ou posso te apresentar algumas opções com calma?",
    "Está precisando com urgência ou é para planejamento futuro?",
  ],
  orcamento: [
    "Tem um orçamento definido para esse pedido?",
    "Prefere investir mais na qualidade ou busca melhor custo-benefício?",
    "Quer ver opções em diferentes faixas de preço?",
  ],
  preferencias: [
    "Tem preferência por alguma marca específica que já conhece?",
    "Já comprou com a gente antes? Como foi a experiência?",
    "Existe algum requisito técnico específico que preciso saber?",
  ]
};

// Identificar lacunas de informação no contexto
function identificarLacunasInformacao(contexto: string, mensagemAtual: string): string[] {
  const lacunas: string[] = [];
  const textoCompleto = `${contexto}\n${mensagemAtual}`.toLowerCase();
  
  // Verifica tipo de procedimento
  if (!textoCompleto.match(/cirurgia|ambulatório|uti|pronto\s*socorro|internação|clínica|hospital|consultório/i)) {
    lacunas.push('tipo_procedimento');
  }
  
  // Verifica quantidade
  if (!textoCompleto.match(/\d+\s*(unidades?|caixas?|peças?|pcs?|kits?)|quantidade|qtd/i)) {
    lacunas.push('quantidade');
  }
  
  // Verifica urgência
  if (!textoCompleto.match(/urgente|rápido|hoje|amanhã|essa\s*semana|prazo|quando\s*precis/i)) {
    lacunas.push('urgencia');
  }
  
  // Verifica orçamento
  if (!textoCompleto.match(/orçamento|valor|preço|custo|r\$\s*\d+|reais/i)) {
    lacunas.push('orcamento');
  }
  
  // Verifica preferências (sempre última a perguntar)
  const temPreferencia = textoCompleto.match(/marca|modelo|preferência|prefiro|gosto de/i);
  if (!temPreferencia && lacunas.length < 2) {
    lacunas.push('preferencias');
  }
  
  console.log('🔍 Lacunas identificadas:', lacunas);
  return lacunas;
}

// Escolher próxima pergunta mais relevante
function escolherProximaPergunta(lacunas: string[], contexto: string): string {
  // Prioridade: tipo_procedimento > urgencia > quantidade > orcamento > preferencias
  
  if (lacunas.includes('tipo_procedimento')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.tipo_procedimento;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('urgencia')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.urgencia;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('quantidade')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.quantidade;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('orcamento')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.orcamento;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  if (lacunas.includes('preferencias')) {
    const perguntas = PERGUNTAS_QUALIFICADORAS.preferencias;
    return perguntas[Math.floor(Math.random() * perguntas.length)];
  }
  
  // Fallback genérico
  return "Me conta um pouco mais sobre o que você precisa para eu te ajudar melhor?";
}

// Verificar se tem informações suficientes para buscar produtos
function verificarInformacoesSuficientes(contexto: string, mensagemAtual: string): boolean {
  const lacunas = identificarLacunasInformacao(contexto, mensagemAtual);
  
  // Precisa de pelo menos: produto específico mencionado + (tipo_procedimento OU quantidade)
  const temProdutoEspecifico = /sonda|luva|máscara|campo|bisturi|cateter|seringa|agulha|gaze|atadura/i.test(`${contexto}\n${mensagemAtual}`);
  const temContextoMinimo = !lacunas.includes('tipo_procedimento') || !lacunas.includes('quantidade');
  
  const suficiente = temProdutoEspecifico && temContextoMinimo;
  console.log('✅ Informações suficientes?', suficiente, '| Produto específico:', temProdutoEspecifico, '| Contexto mínimo:', temContextoMinimo);
  
  return suficiente;
}

// Fazer perguntas qualificadoras
async function fazerPerguntasQualificadoras(
  supabase: any,
  conversaId: string,
  contexto: string,
  mensagemAtual: string,
  openAiKey: string
): Promise<Response> {
  console.log('❓ Iniciando descoberta de necessidade');
  
  // Verificar se já tem informações suficientes
  if (verificarInformacoesSuficientes(contexto, mensagemAtual)) {
    console.log('✅ Informações suficientes - avançando para busca de produtos');
    return new Response(
      JSON.stringify({ pular_pergunta: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Identificar lacunas
  const lacunas = identificarLacunasInformacao(contexto, mensagemAtual);
  
  if (lacunas.length === 0) {
    console.log('✅ Todas informações coletadas');
    return new Response(
      JSON.stringify({ pular_pergunta: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Escolher próxima pergunta
  const perguntaBase = escolherProximaPergunta(lacunas, contexto);
  
  // Usar IA para personalizar a pergunta com base no contexto
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  const respostaIA = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Você é o Beto, vendedor da Cirúrgica Fernandes.

CONTEXTO DA CONVERSA:
${contexto}

CLIENTE DISSE: "${mensagemAtual}"

PERGUNTA BASE SUGERIDA: "${perguntaBase}"

INSTRUÇÕES:
- Faça UMA pergunta qualificadora natural e amigável
- Seja direto mas não robotizado
- Use linguagem informal (você, não "senhor/senhora")
- Máximo 2 linhas
- Máximo 1 emoji
- Conecte com o que o cliente acabou de dizer
- Faça parecer uma conversa natural, não um questionário`
        }
      ],
      temperature: 0.8,
      max_tokens: 100
    })
  });
  
  const respostaJson = await respostaIA.json();
  const perguntaPersonalizada = respostaJson.choices[0].message.content;
  
  // Salvar interação
  await supabase.from('whatsapp_interacoes').insert({
    conversa_id: conversaId,
    tipo_evento: 'pergunta_qualificadora',
    descricao: `Pergunta: ${perguntaPersonalizada}`,
    metadata: { lacunas, pergunta_base: perguntaBase },
    executado_por_bot: true
  });
  
  // Salvar na memória
  await salvarMemoria(supabase, conversaId, `Beto fez pergunta: ${perguntaPersonalizada}`, 'pergunta_qualificadora', openAiKey);
  
  console.log('❓ Pergunta enviada:', perguntaPersonalizada);
  
  return new Response(
    JSON.stringify({ resposta: perguntaPersonalizada, tipo: 'pergunta_qualificadora' }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Função de transição de estados
function determinarProximoEstado(contexto: ContextoConversa): EstadoConversa {
  const { estadoAtual, intencao, carrinho, propostaId, contextoHistorico } = contexto;
  
  console.log(`🔄 Transição de estado: ${estadoAtual} + ${intencao.intencao}`);
  
  // Regras de transição por estado atual
  switch(estadoAtual) {
    case 'saudacao_inicial':
      if (intencao.intencao === 'buscar_produto') return 'descoberta_necessidade';
      if (intencao.intencao === 'saudacao' || intencao.intencao === 'duvida') return 'saudacao_inicial';
      break;
    
    case 'descoberta_necessidade':
      // Só avança se tiver produtos no carrinho (significa que já buscou)
      if (intencao.intencao === 'buscar_produto' && carrinho.length > 0) return 'sugestao_produtos';
      // Permanece em descoberta até ter informações suficientes
      if (intencao.intencao === 'buscar_produto') return 'descoberta_necessidade';
      break;
    
    case 'sugestao_produtos':
      if (intencao.intencao === 'confirmar_itens' || intencao.intencao === 'adicionar_produto') return 'aguardando_escolha';
      if (intencao.intencao === 'buscar_produto') return 'refinamento_busca';
      break;
    
    case 'aguardando_escolha':
      if (intencao.intencao === 'confirmar_itens') return 'confirmacao_quantidade';
      if (intencao.intencao === 'buscar_produto') return 'refinamento_busca';
      break;
    
    case 'confirmacao_quantidade':
      return 'montagem_proposta';
    
    case 'montagem_proposta':
      if (propostaId) return 'proposta_apresentada';
      break;
    
    case 'proposta_apresentada':
      if (intencao.intencao === 'negociar_preco') return 'negociacao_ativa';
      if (intencao.intencao === 'finalizar_pedido') return 'fechamento';
      if (intencao.intencao === 'buscar_produto') return 'refinamento_busca';
      break;
    
    case 'negociacao_ativa':
      if (intencao.intencao === 'finalizar_pedido') return 'fechamento';
      break;
    
    case 'refinamento_busca':
      if (carrinho.length > 0) return 'sugestao_produtos';
      break;
    
    case 'fechamento':
      return 'pos_venda';
    
    case 'aguardando_aprovacao':
      // Permanece aguardando até aprovação externa
      break;
  }
  
  // Se não houver transição, permanece no estado atual
  return estadoAtual;
}

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

async function criarProposta(supabase: any, conversaId: string, produtos: any[], clienteId: string | null) {
  try {
    const subtotal = produtos.reduce((sum, p) => sum + (p.preco_venda * (p.quantidade || 1)), 0);
    
    console.log(`📋 Criando proposta com ${produtos.length} produtos, subtotal: R$ ${subtotal.toFixed(2)}`);
    
    const { data: proposta, error } = await supabase
      .from('whatsapp_propostas_comerciais')
      .insert({
        conversa_id: conversaId,
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
      subtotal: p.preco_venda * (p.quantidade || 1),
      referencia_interna: p.referencia_interna || null,
      nome_produto: p.nome
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
    const nomeProduto = item.produtos?.nome || item.nome_produto || 'Produto';
    const codProduto = item.produtos?.referencia_interna || item.referencia_interna || 'N/A';
    
    console.log(`  Item ${idx + 1}: ${nomeProduto} (${codProduto})`);
    
    mensagem += `${idx + 1}. *${nomeProduto}*\n`;
    mensagem += `   Cód: ${codProduto}\n`;
    mensagem += `   Qtd: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)}\n`;
    mensagem += `   Subtotal: R$ ${item.subtotal.toFixed(2)}\n\n`;
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
      await salvarMemoria(supabase, conversaId, `Cliente (áudio): ${transcricao}`, 'mensagem_recebida', openAiApiKey);
    }

    // === ETAPA 1: BUSCAR ESTADO DA CONVERSA ===
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('estagio_agente, proposta_ativa_id, produtos_carrinho, ultima_intencao_detectada')
      .eq('id', conversaId)
      .single();

    // Normalizar estado para os novos tipos
    const mapearEstadoAntigo = (estadoAntigo: string): EstadoConversa => {
      const mapa: Record<string, EstadoConversa> = {
        'inicial': 'saudacao_inicial',
        'buscando_produto': 'descoberta_necessidade',
        'confirmando_itens': 'aguardando_escolha',
        'negociacao': 'negociacao_ativa',
        'aguardando_aprovacao': 'aguardando_aprovacao',
        'fechamento': 'fechamento'
      };
      return mapa[estadoAntigo] || 'saudacao_inicial';
    };

    const estadoAtual = mapearEstadoAntigo(conversa?.estagio_agente || 'inicial');
    console.log('📍 Estado:', estadoAtual, '| Carrinho:', conversa?.produtos_carrinho?.length || 0, 'produtos');

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

    // Não usar atalhos - seguir o fluxo de classificação de intenção

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
        openAiApiKey
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

      await salvarMemoria(supabase, conversaId, `Beto: ${resposta}`, 'resposta_enviada', openAiApiKey);

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

      await salvarMemoria(supabase, conversaId, `Beto apresentou produtos: ${resposta}`, 'produtos_apresentados', openAiApiKey);

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
      
      await salvarMemoria(supabase, conversaId, `Proposta ${proposta.numero_proposta} criada com ${quantidade} unidades`, 'proposta_enviada', openAiApiKey);

      return new Response(
        JSON.stringify({ resposta: mensagemProposta, proposta_id: proposta.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ESTADO: PROPOSTA APRESENTADA (aguardando feedback do cliente)
    if (proximoEstado === 'proposta_apresentada' && conversa?.proposta_ativa_id) {
      // Proposta já foi criada e enviada, agora aguarda resposta
      // Este estado é passivo, a ação ocorre quando cliente responde
      
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

    // ESTADO: FECHAMENTO
    if (proximoEstado === 'fechamento') {
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

    await salvarMemoria(supabase, conversaId, `Beto: ${resposta}`, 'conversa_geral', openAiApiKey);

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
