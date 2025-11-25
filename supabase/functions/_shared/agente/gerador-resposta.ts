import type { PerfilCliente, EstadoConversa } from './types.ts';

/**
 * Gerar resposta personalizada usando Lovable AI (Gemini-2.5-Flash)
 * baseada no perfil do cliente, contexto histórico e estágio da conversa
 */
export async function gerarRespostaPersonalizada(
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
