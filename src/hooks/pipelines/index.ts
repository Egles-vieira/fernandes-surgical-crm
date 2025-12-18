// =============================================================================
// HOOKS PARA SISTEMA MULTI-PIPELINE
// =============================================================================

// Hooks de Pipelines
export { 
  usePipelines, 
  usePipeline, 
  useEstagiosPipeline, 
  usePipelineComEstagios 
} from './usePipelines';

// Hooks de Campos Customizados
export { 
  usePipelineFields, 
  useKanbanFields, 
  useCamposObrigatoriosEstagio,
  usePipelineFieldsAgrupados,
  parseFieldOptions,
  validateFieldValue,
  validateAllFields
} from './usePipelineFields';

// Hooks de Oportunidades
export { 
  useOportunidades, 
  useOportunidade,
  useCreateOportunidade,
  useUpdateOportunidade,
  useMoverEstagio,
  useKanbanOportunidades,
  useDeleteOportunidade
} from './useOportunidades';

// Re-export de tipos
export type {
  Pipeline,
  PipelineTipo,
  PipelineConfiguracoes,
  EstagioPipeline,
  PipelineCustomField,
  CustomFieldTipo,
  FieldOption,
  FieldValidation,
  Oportunidade,
  OportunidadeStatus,
  OportunidadeInsert,
  OportunidadeUpdate,
  MoverEstagioParams,
  KanbanColumn,
  OportunidadeCard,
  UsePipelinesOptions,
  UseOportunidadesOptions,
  UsePipelineFieldsOptions,
  PipelineMetrics,
  EstagioMetrics,
} from '@/types/pipelines';
