import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { 
  Oportunidade, 
  MoverEstagioParams,
  UseOportunidadesOptions,
  KanbanColumn,
  OportunidadeCard
} from '@/types/pipelines';

// Tipos específicos para insert/update que correspondem ao schema real
interface OportunidadeInsertReal {
  nome_oportunidade: string;
  pipeline_id: string;
  estagio_id: string;
  conta_id?: string | null;
  contato_id?: string | null;
  proprietario_id?: string | null;
  valor?: number | null;
  percentual_probabilidade?: number | null;
  data_fechamento?: string | null;
  campos_customizados?: Json | null;
  descricao?: string | null;
}

interface OportunidadeUpdateReal {
  nome_oportunidade?: string;
  pipeline_id?: string;
  estagio_id?: string;
  conta_id?: string | null;
  contato_id?: string | null;
  proprietario_id?: string | null;
  valor?: number | null;
  percentual_probabilidade?: number | null;
  data_fechamento?: string | null;
  campos_customizados?: Json | null;
  descricao?: string | null;
  esta_fechada?: boolean;
  foi_ganha?: boolean;
  motivo_perda?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  cliente_cnpj?: string | null;
}

/**
 * Hook para listar oportunidades com filtros
 */
export function useOportunidades(options: UseOportunidadesOptions = {}) {
  const { 
    pipelineId, 
    estagioId, 
    proprietarioId, 
    status,
    limite = 100 
  } = options;

  return useQuery({
    queryKey: ['oportunidades', { pipelineId, estagioId, proprietarioId, status, limite }],
    queryFn: async (): Promise<Oportunidade[]> => {
      let query = supabase
        .from('oportunidades')
        .select(`
          *,
          pipeline:pipelines(id, nome, cor, icone),
          estagio:estagios_pipeline(id, nome_estagio, cor, icone, percentual_probabilidade, eh_ganho_fechado, eh_perdido_fechado, alerta_estagnacao_dias),
          conta:contas(id, nome_conta),
          contato:contatos(id, primeiro_nome, sobrenome),
          proprietario:perfis_usuario!oportunidades_proprietario_id_fkey(id, nome_completo)
        `)
        .is('excluido_em', null)
        .order('criado_em', { ascending: false })
        .limit(limite);

      if (pipelineId) {
        query = query.eq('pipeline_id', pipelineId);
      }

      if (estagioId) {
        query = query.eq('estagio_id', estagioId);
      }

      if (proprietarioId) {
        query = query.eq('proprietario_id', proprietarioId);
      }

      // Filtrar por status usando colunas reais
      if (status === 'ganho') {
        query = query.eq('esta_fechada', true).eq('foi_ganha', true);
      } else if (status === 'perdido') {
        query = query.eq('esta_fechada', true).eq('foi_ganha', false);
      } else if (status === 'aberto') {
        query = query.eq('esta_fechada', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useOportunidades] Erro ao buscar oportunidades:', error);
        throw error;
      }

      // Mapear para o tipo esperado
      return (data || []).map(op => ({
        ...op,
        probabilidade: op.percentual_probabilidade,
        data_fechamento_prevista: op.data_fechamento,
        status: op.esta_fechada 
          ? (op.foi_ganha ? 'ganho' : 'perdido') 
          : 'aberto',
      })) as unknown as Oportunidade[];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar oportunidade por ID
 */
export function useOportunidade(oportunidadeId: string | null | undefined) {
  return useQuery({
    queryKey: ['oportunidade', oportunidadeId],
    queryFn: async (): Promise<Oportunidade | null> => {
      if (!oportunidadeId) return null;

      const { data, error } = await supabase
        .from('oportunidades')
        .select(`
          *,
          pipeline:pipelines(id, nome, cor, icone, configuracoes),
          estagio:estagios_pipeline(*),
          conta:contas(id, nome_conta),
          contato:contatos(id, primeiro_nome, sobrenome, email, telefone)
        `)
        .eq('id', oportunidadeId)
        .maybeSingle();

      if (error) {
        console.error('[useOportunidade] Erro ao buscar oportunidade:', error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        probabilidade: data.percentual_probabilidade,
        data_fechamento_prevista: data.data_fechamento,
        status: data.esta_fechada 
          ? (data.foi_ganha ? 'ganho' : 'perdido') 
          : 'aberto',
      } as unknown as Oportunidade;
    },
    enabled: !!oportunidadeId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para criar oportunidade
 */
export function useCreateOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: OportunidadeInsertReal): Promise<Oportunidade> => {
      const { data, error } = await supabase
        .from('oportunidades')
        .insert(dados)
        .select()
        .single();

      if (error) {
        console.error('[useCreateOportunidade] Erro ao criar:', error);
        throw error;
      }

      return data as unknown as Oportunidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-oportunidades'] });
      toast.success('Oportunidade criada com sucesso!');
    },
    onError: (error) => {
      console.error('[useCreateOportunidade] Erro:', error);
      toast.error('Erro ao criar oportunidade');
    },
  });
}

/**
 * Hook para atualizar oportunidade
 */
export function useUpdateOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: OportunidadeUpdateReal }): Promise<Oportunidade> => {
      const { data, error } = await supabase
        .from('oportunidades')
        .update(dados)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateOportunidade] Erro ao atualizar:', error);
        throw error;
      }

      return data as unknown as Oportunidade;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['oportunidade', data.id] });
      queryClient.invalidateQueries({ queryKey: ['kanban-oportunidades'] });
      toast.success('Oportunidade atualizada!');
    },
    onError: (error) => {
      console.error('[useUpdateOportunidade] Erro:', error);
      toast.error('Erro ao atualizar oportunidade');
    },
  });
}

/**
 * Hook para mover oportunidade entre estágios (otimista)
 */
export function useMoverEstagio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ oportunidadeId, novoEstagioId, camposObrigatorios }: MoverEstagioParams) => {
      const updateData: OportunidadeUpdateReal = {
        estagio_id: novoEstagioId,
      };

      // Se há campos obrigatórios, mesclar com campos_customizados
      if (camposObrigatorios && Object.keys(camposObrigatorios).length > 0) {
        const { data: oportunidade } = await supabase
          .from('oportunidades')
          .select('campos_customizados')
          .eq('id', oportunidadeId)
          .single();

        const camposAtuais = (oportunidade?.campos_customizados as Record<string, unknown>) || {};
        updateData.campos_customizados = {
          ...camposAtuais,
          ...camposObrigatorios,
        } as Json;
      }

      const { data, error } = await supabase
        .from('oportunidades')
        .update(updateData)
        .eq('id', oportunidadeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['kanban-oportunidades'] });
      const previousData = queryClient.getQueryData(['kanban-oportunidades']);
      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['kanban-oportunidades'], context.previousData);
      }
      console.error('[useMoverEstagio] Erro:', err);
      toast.error('Erro ao mover oportunidade');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['oportunidade', variables.oportunidadeId] });
    },
  });
}

// Tipo para os limites por estágio
interface LimitesPorEstagio {
  [estagioId: string]: number;
}

interface UseKanbanOportunidadesOptions {
  limitePorEstagioInicial?: number;
}

interface KanbanResult {
  colunas: KanbanColumn[];
  totalValor: number;
  totalOportunidades: number;
  limitesPorEstagio: LimitesPorEstagio;
  carregarMais: (estagioId: string) => void;
  estagioCarregando: string | null;
}

/**
 * Hook para buscar oportunidades formatadas para Kanban - PAGINADO
 * Usa RPC get_oportunidades_pipeline_paginado para escalabilidade
 */
export function useKanbanOportunidades(
  pipelineId: string | null | undefined,
  options: UseKanbanOportunidadesOptions = {}
): KanbanResult & { isLoading: boolean; data: { colunas: KanbanColumn[]; totalValor: number; totalOportunidades: number } | undefined } {
  const { limitePorEstagioInicial = 20 } = options;
  const queryClient = useQueryClient();
  const [limitesPorEstagio, setLimitesPorEstagio] = useState<LimitesPorEstagio>({});
  const [estagioCarregando, setEstagioCarregando] = useState<string | null>(null);

  // Query principal com RPC paginada
  const query = useQuery({
    queryKey: ['kanban-oportunidades', pipelineId, limitesPorEstagio],
    queryFn: async (): Promise<{ colunas: KanbanColumn[]; totalValor: number; totalOportunidades: number }> => {
      if (!pipelineId) {
        return { colunas: [], totalValor: 0, totalOportunidades: 0 };
      }

      // Buscar estágios
      const { data: estagios, error: estagiosError } = await supabase
        .from('estagios_pipeline')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('ordem_estagio', { ascending: true });

      if (estagiosError) throw estagiosError;

      // Chamar RPC paginada
      const { data: oportunidadesRPC, error: rpcError } = await supabase
        .rpc('get_oportunidades_pipeline_paginado', {
          p_pipeline_id: pipelineId,
          p_limites_por_estagio: limitesPorEstagio,
          p_limite_default: limitePorEstagioInicial,
        });

      if (rpcError) {
        console.error('[useKanbanOportunidades] RPC Error:', rpcError);
        throw rpcError;
      }

      // Agrupar totais por estágio (vem na primeira oportunidade de cada estágio)
      const totaisPorEstagio: Record<string, { total: number; valor: number }> = {};
      (oportunidadesRPC || []).forEach((op: {
        estagio_id: string;
        total_estagio: number;
        valor_total_estagio: number;
      }) => {
        if (!totaisPorEstagio[op.estagio_id]) {
          totaisPorEstagio[op.estagio_id] = {
            total: Number(op.total_estagio) || 0,
            valor: Number(op.valor_total_estagio) || 0,
          };
        }
      });

      // Montar colunas do Kanban
      const colunas: KanbanColumn[] = (estagios || []).map(estagio => {
        const oportunidadesEstagio = (oportunidadesRPC || []).filter(
          (op) => op.estagio_id === estagio.id
        );

        const cards: OportunidadeCard[] = oportunidadesEstagio.map((op) => {
          const diasNoEstagio = op.dias_no_estagio || 0;
          const alertaDias = estagio.alerta_estagnacao_dias;
          const probabilidade = op.percentual_probabilidade;
          const camposCustom = (typeof op.campos_customizados === 'object' && op.campos_customizados !== null)
            ? op.campos_customizados as Record<string, unknown>
            : {};
          
          return {
            id: op.id,
            codigo: op.codigo,
            nome: op.nome_oportunidade,
            valor: op.valor,
            valorPonderado: op.valor && probabilidade 
              ? (op.valor * probabilidade) / 100 
              : null,
            probabilidade,
            diasNoEstagio,
            dataFechamento: op.data_fechamento,
            conta: op.conta_nome || null,
            contato: op.contato_nome || null,
            proprietario: null,
            camposKanban: camposCustom,
            estaEstagnado: alertaDias !== null && diasNoEstagio >= alertaDias,
          };
        });

        const totais = totaisPorEstagio[estagio.id] || { total: 0, valor: 0 };

        return {
          id: estagio.id,
          nome: estagio.nome_estagio,
          cor: estagio.cor || '#94A3B8',
          icone: estagio.icone,
          ordem: estagio.ordem_estagio,
          probabilidade: estagio.percentual_probabilidade || 0,
          ehGanho: estagio.eh_ganho_fechado || false,
          ehPerdido: estagio.eh_perdido_fechado || false,
          alertaEstagnacaoDias: estagio.alerta_estagnacao_dias,
          oportunidades: cards,
          totalValor: totais.valor,
          totalOportunidades: totais.total,
        };
      });

      const totalValor = colunas.reduce((sum, col) => sum + col.totalValor, 0);
      const totalOportunidades = colunas.reduce((sum, col) => sum + col.totalOportunidades, 0);

      return { colunas, totalValor, totalOportunidades };
    },
    enabled: !!pipelineId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData, // keepPreviousData
  });

  // Função para carregar mais oportunidades de um estágio
  const carregarMais = useCallback((estagioId: string) => {
    setEstagioCarregando(estagioId);
    setLimitesPorEstagio(prev => ({
      ...prev,
      [estagioId]: (prev[estagioId] || limitePorEstagioInicial) + 20,
    }));
    
    // Limpar o estado de carregando após a query atualizar
    setTimeout(() => setEstagioCarregando(null), 500);
  }, [limitePorEstagioInicial]);

  const colunas = query.data?.colunas || [];
  const totalValor = query.data?.totalValor || 0;
  const totalOportunidades = query.data?.totalOportunidades || 0;

  return {
    data: query.data,
    isLoading: query.isLoading,
    colunas,
    totalValor,
    totalOportunidades,
    limitesPorEstagio,
    carregarMais,
    estagioCarregando,
  };
}

/**
 * Hook para deletar oportunidade
 */
export function useDeleteOportunidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (oportunidadeId: string) => {
      const { error } = await supabase
        .from('oportunidades')
        .delete()
        .eq('id', oportunidadeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-oportunidades'] });
      toast.success('Oportunidade removida');
    },
    onError: (error) => {
      console.error('[useDeleteOportunidade] Erro:', error);
      toast.error('Erro ao remover oportunidade');
    },
  });
}

// Re-export tipos para conveniência
export type { OportunidadeInsertReal, OportunidadeUpdateReal };
