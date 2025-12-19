// =============================================================================
// TIPOS TYPESCRIPT PARA SISTEMA MULTI-PIPELINE
// =============================================================================

import { Json } from '@/integrations/supabase/types';

// Tipos de Pipeline
export type PipelineTipo = 'spot' | 'padronizacao' | 'licitacao' | 'equipamento' | 'hunter' | 'farmer' | 'edi';

// Tipos de Campo Customizado (nomes em português conforme banco de dados)
export type CustomFieldTipo = 
  | 'texto' 
  | 'textarea' 
  | 'numero' 
  | 'decimal' 
  | 'moeda' 
  | 'percentual'
  | 'data' 
  | 'datetime' 
  | 'select' 
  | 'multiselect' 
  | 'checkbox' 
  | 'boolean'
  | 'radio'
  | 'email' 
  | 'telefone' 
  | 'url' 
  | 'cnpj' 
  | 'cpf' 
  | 'cep'
  | 'arquivo' 
  | 'usuario' 
  | 'cliente' 
  | 'produto'
  // Tipos especiais que buscam de tabelas auxiliares
  | 'select_tipo_pedido'
  | 'select_condicao_pagamento'
  | 'select_tipo_frete';

// Status da Oportunidade
export type OportunidadeStatus = 'aberto' | 'ganho' | 'perdido' | 'suspenso';

// =============================================================================
// INTERFACES PRINCIPAIS
// =============================================================================

export interface Pipeline {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo_pipeline?: string | null;
  esta_ativo?: boolean | null;
  ordem_exibicao?: number | null;
  configuracoes?: PipelineConfiguracoes | null;
  icone?: string | null;
  cor?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface PipelineConfiguracoes {
  tipo?: PipelineTipo;
  cor_tema?: string;
  permite_handover?: boolean;
  handover_para?: PipelineTipo;
  recebe_handover?: boolean;
  campos_especiais?: string[];
  integracao_automatica?: boolean;
  permite_comodato?: boolean;
}

export interface EstagioPipeline {
  id: string;
  pipeline_id: string;
  nome_estagio: string;
  descricao?: string | null;
  percentual_probabilidade?: number | null;
  ordem_estagio: number;
  eh_ganho_fechado?: boolean | null;
  eh_perdido_fechado?: boolean | null;
  cor?: string | null;
  icone?: string | null;
  duracao_esperada_dias?: number | null;
  campos_obrigatorios?: string[] | Json | null;
  validacoes?: Json | null;
  automacoes?: Json | null;
  alerta_estagnacao_dias?: number | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface PipelineCustomField {
  id: string;
  pipeline_id: string;
  estagio_id?: string | null;
  nome_campo: string;
  label: string;
  placeholder?: string | null;
  dica?: string | null;
  descricao?: string | null;
  tipo_campo: CustomFieldTipo;
  opcoes?: FieldOption[] | Json | null;
  valor_padrao?: Json | null;
  obrigatorio: boolean;
  validacao?: FieldValidation | Json | null;
  ordem: number;
  grupo?: string | null;
  largura?: 'full' | 'half' | 'third' | string | null;
  visivel_kanban: boolean;
  visivel_lista?: boolean | null;
  visivel_formulario?: boolean | null;
  ativo: boolean;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

// =============================================================================
// OPORTUNIDADE (DEAL)
// =============================================================================

export interface Oportunidade {
  id: string;
  nome_oportunidade: string;
  codigo?: string | null;
  pipeline_id?: string | null;
  estagio_id?: string | null;
  conta_id?: string | null;
  contato_id?: string | null;
  proprietario_id?: string | null;
  valor?: number | null;
  probabilidade?: number | null;
  valor_ponderado?: number | null;
  data_fechamento_prevista?: string | null;
  status?: OportunidadeStatus | null;
  campos_customizados?: Record<string, unknown> | Json | null;
  dias_no_estagio?: number | null;
  data_entrada_estagio?: string | null;
  venda_id?: string | null;
  motivo_perda_id?: string | null;
  observacoes?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
  // Relacionamentos expandidos
  pipeline?: Pipeline | null;
  estagio?: EstagioPipeline | null;
  conta?: { id: string; nome_conta: string } | null;
  contato?: { id: string; primeiro_nome: string; sobrenome: string } | null;
  proprietario?: { id: string; nome_completo: string } | null;
}

export interface OportunidadeComRelacionamentos extends Oportunidade {
  pipeline: Pipeline;
  estagio: EstagioPipeline;
}

// =============================================================================
// TIPOS PARA FORMULÁRIOS E MUTATIONS
// =============================================================================

export interface OportunidadeInsert {
  nome_oportunidade: string;
  pipeline_id: string;
  estagio_id: string;
  conta_id?: string | null;
  contato_id?: string | null;
  proprietario_id?: string | null;
  valor?: number | null;
  probabilidade?: number | null;
  data_fechamento_prevista?: string | null;
  campos_customizados?: Record<string, unknown> | null;
  observacoes?: string | null;
}

export interface OportunidadeUpdate {
  nome_oportunidade?: string;
  pipeline_id?: string;
  estagio_id?: string;
  conta_id?: string | null;
  contato_id?: string | null;
  proprietario_id?: string | null;
  valor?: number | null;
  probabilidade?: number | null;
  data_fechamento_prevista?: string | null;
  status?: OportunidadeStatus;
  campos_customizados?: Record<string, unknown> | null;
  motivo_perda_id?: string | null;
  observacoes?: string | null;
}

export interface MoverEstagioParams {
  oportunidadeId: string;
  novoEstagioId: string;
  camposObrigatorios?: Record<string, unknown>;
}

// =============================================================================
// TIPOS PARA KANBAN
// =============================================================================

export interface KanbanColumn {
  id: string;
  nome: string;
  cor: string;
  icone?: string | null;
  ordem: number;
  probabilidade: number;
  ehGanho: boolean;
  ehPerdido: boolean;
  alertaEstagnacaoDias?: number | null;
  oportunidades: OportunidadeCard[];
  totalValor: number;
  totalOportunidades: number;
}

export interface OportunidadeCard {
  id: string;
  codigo?: string | null;
  nome: string;
  valor?: number | null;
  valorPonderado?: number | null;
  probabilidade?: number | null;
  diasNoEstagio: number;
  dataFechamento?: string | null;
  conta?: string | null;
  contato?: string | null;
  proprietario?: string | null;
  camposKanban: Record<string, unknown>;
  estaEstagnado: boolean;
}

// =============================================================================
// TIPOS PARA HOOKS
// =============================================================================

export interface UsePipelinesOptions {
  apenasAtivos?: boolean;
}

export interface UseOportunidadesOptions {
  pipelineId?: string | null;
  estagioId?: string | null;
  proprietarioId?: string | null;
  status?: OportunidadeStatus;
  limite?: number;
}

export interface UsePipelineFieldsOptions {
  pipelineId: string;
  estagioId?: string | null;
  apenasVisivelKanban?: boolean;
  apenasObrigatorios?: boolean;
}

// =============================================================================
// TIPOS PARA MÉTRICAS
// =============================================================================

export interface PipelineMetrics {
  pipelineId: string;
  pipelineNome: string;
  totalOportunidades: number;
  valorTotal: number;
  valorPonderado: number;
  taxaConversao: number;
  tempoMedioCiclo: number;
  oportunidadesEstagnadas: number;
}

export interface EstagioMetrics {
  estagioId: string;
  estagioNome: string;
  totalOportunidades: number;
  valorTotal: number;
  tempoMedio: number;
}
