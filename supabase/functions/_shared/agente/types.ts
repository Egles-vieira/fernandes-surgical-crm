// === TIPOS E INTERFACES DO AGENTE ===

export type EstadoConversa = 
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

export interface ProdutoRelevante {
  id: string;
  referencia_interna: string;
  nome: string;
  narrativa: string | null;
  preco_venda: number;
  quantidade_em_maos: number;
  similarity?: number;
}

export interface ContextoConversa {
  estadoAtual: EstadoConversa;
  intencao: any;
  carrinho: string[];
  propostaId: string | null;
  contextoHistorico: string;
}

export interface PerfilCliente {
  tipo: 'cliente_novo' | 'cliente_vip' | 'cliente_regular' | 'lead';
  marcadores: string[];
  historico_compras: number;
  ticket_medio: number;
  ultima_compra_dias: number;
  nome?: string;
}
