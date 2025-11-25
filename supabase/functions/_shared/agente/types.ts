// === TIPOS E INTERFACES DO AGENTE ===

export interface ProdutoRelevante {
  id: string;
  referencia_interna: string;
  nome: string;
  narrativa: string | null;
  preco_venda: number;
  quantidade_em_maos: number;
  similarity?: number;
}

export interface PerfilCliente {
  tipo: 'cliente_novo' | 'cliente_vip' | 'cliente_regular' | 'lead';
  marcadores: string[];
  historico_compras: number;
  ticket_medio: number;
  ultima_compra_dias: number;
  nome?: string;
}
