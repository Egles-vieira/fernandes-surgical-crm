import type { EstadoConversa, ContextoConversa } from './types.ts';

/**
 * Mapear estado antigo do banco para novo tipo
 */
export function mapearEstadoAntigo(estadoAntigo: string): EstadoConversa {
  const mapa: Record<string, EstadoConversa> = {
    'inicial': 'saudacao_inicial',
    'buscando_produto': 'descoberta_necessidade',
    'confirmando_itens': 'aguardando_escolha',
    'negociacao': 'negociacao_ativa',
    'aguardando_aprovacao': 'aguardando_aprovacao',
    'fechamento': 'fechamento'
  };
  return mapa[estadoAntigo] || 'saudacao_inicial';
}

/**
 * Máquina de estados: determinar próximo estado baseado em contexto e intenção
 */
export function determinarProximoEstado(contexto: ContextoConversa): EstadoConversa {
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
