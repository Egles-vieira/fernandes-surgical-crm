import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PipelineCustomField, UsePipelineFieldsOptions, FieldOption } from '@/types/pipelines';

/**
 * Hook para buscar campos customizados de um pipeline
 */
export function usePipelineFields(options: UsePipelineFieldsOptions) {
  const { 
    pipelineId, 
    estagioId = null, 
    apenasVisivelKanban = false,
    apenasObrigatorios = false 
  } = options;

  return useQuery({
    queryKey: ['pipeline-fields', pipelineId, estagioId, { apenasVisivelKanban, apenasObrigatorios }],
    queryFn: async (): Promise<PipelineCustomField[]> => {
      if (!pipelineId) return [];

      let query = supabase
        .from('pipeline_custom_fields')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      // Buscar campos globais do pipeline (estagio_id IS NULL) ou específicos do estágio
      if (estagioId) {
        query = query.or(`estagio_id.is.null,estagio_id.eq.${estagioId}`);
      } else {
        query = query.is('estagio_id', null);
      }

      if (apenasVisivelKanban) {
        query = query.eq('visivel_kanban', true);
      }

      if (apenasObrigatorios) {
        query = query.eq('obrigatorio', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePipelineFields] Erro ao buscar campos:', error);
        throw error;
      }

      return (data || []) as PipelineCustomField[];
    },
    enabled: !!pipelineId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar campos visíveis no Kanban
 */
export function useKanbanFields(pipelineId: string | null | undefined) {
  return usePipelineFields({
    pipelineId: pipelineId || '',
    apenasVisivelKanban: true,
  });
}

/**
 * Hook para buscar campos obrigatórios de um estágio
 */
export function useCamposObrigatoriosEstagio(pipelineId: string, estagioId: string | null | undefined) {
  return usePipelineFields({
    pipelineId,
    estagioId,
    apenasObrigatorios: true,
  });
}

/**
 * Hook para buscar campos agrupados por categoria
 */
export function usePipelineFieldsAgrupados(pipelineId: string | null | undefined, estagioId?: string | null) {
  const { data: campos, ...rest } = usePipelineFields({
    pipelineId: pipelineId || '',
    estagioId,
  });

  // Agrupar campos por grupo
  const camposAgrupados = (campos || []).reduce<Record<string, PipelineCustomField[]>>((acc, campo) => {
    const grupo = campo.grupo || 'Geral';
    if (!acc[grupo]) {
      acc[grupo] = [];
    }
    acc[grupo].push(campo);
    return acc;
  }, {});

  // Ordenar grupos (Geral primeiro, depois alfabético)
  const gruposOrdenados = Object.keys(camposAgrupados).sort((a, b) => {
    if (a === 'Geral') return -1;
    if (b === 'Geral') return 1;
    return a.localeCompare(b);
  });

  return {
    ...rest,
    campos,
    camposAgrupados,
    gruposOrdenados,
  };
}

/**
 * Helper para parsear opções de campo select/multiselect
 */
export function parseFieldOptions(opcoes: unknown): FieldOption[] {
  if (!opcoes) return [];
  
  if (Array.isArray(opcoes)) {
    return opcoes as FieldOption[];
  }
  
  if (typeof opcoes === 'string') {
    try {
      return JSON.parse(opcoes) as FieldOption[];
    } catch {
      return [];
    }
  }
  
  return [];
}

/**
 * Helper para validar valor de campo
 */
export function validateFieldValue(
  campo: PipelineCustomField, 
  valor: unknown
): { valido: boolean; mensagem?: string } {
  // Campo obrigatório
  if (campo.obrigatorio && (valor === undefined || valor === null || valor === '')) {
    return { valido: false, mensagem: `${campo.label} é obrigatório` };
  }

  // Validações específicas por tipo
  const validacao = campo.validacao as { min?: number; max?: number; pattern?: string; message?: string } | null;
  
  if (validacao && valor !== undefined && valor !== null && valor !== '') {
    // Validação numérica
    if (['number', 'decimal', 'currency', 'percentage'].includes(campo.tipo_campo)) {
      const numValue = Number(valor);
      if (validacao.min !== undefined && numValue < validacao.min) {
        return { valido: false, mensagem: validacao.message || `Valor mínimo: ${validacao.min}` };
      }
      if (validacao.max !== undefined && numValue > validacao.max) {
        return { valido: false, mensagem: validacao.message || `Valor máximo: ${validacao.max}` };
      }
    }

    // Validação de padrão (regex)
    if (validacao.pattern && typeof valor === 'string') {
      const regex = new RegExp(validacao.pattern);
      if (!regex.test(valor)) {
        return { valido: false, mensagem: validacao.message || 'Formato inválido' };
      }
    }
  }

  return { valido: true };
}

/**
 * Helper para validar todos os campos customizados
 */
export function validateAllFields(
  campos: PipelineCustomField[],
  valores: Record<string, unknown>
): { valido: boolean; erros: Record<string, string> } {
  const erros: Record<string, string> = {};

  for (const campo of campos) {
    const valor = valores[campo.nome_campo];
    const resultado = validateFieldValue(campo, valor);
    
    if (!resultado.valido && resultado.mensagem) {
      erros[campo.nome_campo] = resultado.mensagem;
    }
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros,
  };
}
