/**
 * Criar proposta comercial com produtos no carrinho
 */
export async function criarProposta(
  supabase: any, 
  conversaId: string, 
  produtos: any[], 
  clienteId: string | null
) {
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

/**
 * Formatar proposta para envio via WhatsApp
 */
export async function formatarPropostaWhatsApp(proposta: any, itens: any[]): Promise<string> {
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
