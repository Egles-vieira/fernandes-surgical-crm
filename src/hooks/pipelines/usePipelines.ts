import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Pipeline, EstagioPipeline, UsePipelinesOptions } from '@/types/pipelines';

/**
 * Hook para listar todos os pipelines
 */
export function usePipelines(options: UsePipelinesOptions = {}) {
  const { apenasAtivos = true } = options;

  return useQuery({
    queryKey: ['pipelines', { apenasAtivos }],
    queryFn: async (): Promise<Pipeline[]> => {
      let query = supabase
        .from('pipelines')
        .select('*')
        .order('ordem_exibicao', { ascending: true });

      if (apenasAtivos) {
        query = query.eq('esta_ativo', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePipelines] Erro ao buscar pipelines:', error);
        throw error;
      }

      return (data || []) as Pipeline[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook para buscar um pipeline específico por ID
 */
export function usePipeline(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ['pipeline', pipelineId],
    queryFn: async (): Promise<Pipeline | null> => {
      if (!pipelineId) return null;

      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('id', pipelineId)
        .maybeSingle();

      if (error) {
        console.error('[usePipeline] Erro ao buscar pipeline:', error);
        throw error;
      }

      return data as Pipeline | null;
    },
    enabled: !!pipelineId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para listar estágios de um pipeline
 */
export function useEstagiosPipeline(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ['estagios-pipeline', pipelineId],
    queryFn: async (): Promise<EstagioPipeline[]> => {
      if (!pipelineId) return [];

      const { data, error } = await supabase
        .from('estagios_pipeline')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('ordem_estagio', { ascending: true });

      if (error) {
        console.error('[useEstagiosPipeline] Erro ao buscar estágios:', error);
        throw error;
      }

      return (data || []) as EstagioPipeline[];
    },
    enabled: !!pipelineId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar pipeline com seus estágios
 */
export function usePipelineComEstagios(pipelineId: string | null | undefined) {
  const pipelineQuery = usePipeline(pipelineId);
  const estagiosQuery = useEstagiosPipeline(pipelineId);

  return {
    pipeline: pipelineQuery.data,
    estagios: estagiosQuery.data || [],
    isLoading: pipelineQuery.isLoading || estagiosQuery.isLoading,
    isError: pipelineQuery.isError || estagiosQuery.isError,
    error: pipelineQuery.error || estagiosQuery.error,
    refetch: () => {
      pipelineQuery.refetch();
      estagiosQuery.refetch();
    },
  };
}
