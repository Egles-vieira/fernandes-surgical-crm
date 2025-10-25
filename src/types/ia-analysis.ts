// Types para análise de IA de cotações

export interface SugestaoProduto {
  produto_id: string;
  score_final: number;
  score_token: number;
  score_semantico: number;
  descricao: string;
  codigo: string;
  unidade_medida?: string;
  preco_venda?: number;
  estoque_disponivel?: number;
  justificativa: string;
  razoes_match: string[];
  confianca: 'alta' | 'media' | 'baixa';
  alternativas?: Array<{
    produto_id: string;
    descricao: string;
    score: number;
    diferenca: string;
  }>;
}

export interface AnaliseIAItem {
  item_id: string;
  sugestoes: SugestaoProduto[];
  sugestao_principal?: SugestaoProduto;
  status: 'pendente' | 'analisando' | 'concluido' | 'erro';
  erro?: string;
  total_produtos_analisados?: number;
  metodo?: string;
}

export interface ProgressoAnaliseIA {
  cotacao_id: string;
  total_itens: number;
  itens_analisados: number;
  itens_pendentes: number;
  percentual: number;
  status: 'iniciando' | 'em_progresso' | 'concluido' | 'erro';
  itens_detalhes: AnaliseIAItem[];
  erro?: string;
}

export interface FeedbackIA {
  id: string;
  cotacao_item_id: string;
  produto_sugerido_id: string;
  produto_correto_id?: string;
  tipo_feedback: string;
  foi_aceito: boolean;
  motivo_rejeicao?: string;
  score_original?: number;
  detalhes_contexto?: any;
  usuario_id?: string;
  criado_em: string;
}

export interface AjusteScore {
  id: string;
  padrao_descricao?: string;
  padrao_codigo?: string;
  produto_id: string;
  cnpj_cliente?: string;
  plataforma_id?: string;
  ajuste_score: number;
  observacoes?: string;
  vezes_utilizado: number;
  ultima_utilizacao_em?: string;
  ativo: boolean;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ConfiguracaoIA {
  peso_token: number; // 0-1 (ex: 0.4)
  peso_semantico: number; // 0-1 (ex: 0.6)
  limite_sugestoes: number; // número de sugestões a retornar
  score_minimo: number; // score mínimo para considerar uma sugestão
  usar_ajustes_historicos: boolean;
}
