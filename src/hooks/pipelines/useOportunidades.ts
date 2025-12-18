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
          contato:contatos(id, primeiro_nome, sobrenome, email, telefone),
          proprietario:perfis_usuario!oportunidades_proprietario_id_fkey(id, nome_completo, foto_perfil_url)
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-oportunidades'] });
    },
  });
}

/**
 * Hook para buscar oportunidades formatadas para Kanban
 */
export function useKanbanOportunidades(pipelineId: string | null | undefined) {
  return useQuery({
    queryKey: ['kanban-oportunidades', pipelineId],
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

      // Buscar oportunidades abertas
      const { data: oportunidades, error: oportunidadesError } = await supabase
        .from('oportunidades')
        .select(`
          id,
          codigo,
          nome_oportunidade,
          valor,
          percentual_probabilidade,
          dias_no_estagio,
          data_fechamento,
          estagio_id,
          campos_customizados,
          conta:contas(nome_conta),
          contato:contatos(primeiro_nome, sobrenome),
          proprietario:perfis_usuario!oportunidades_proprietario_id_fkey(nome_completo)
        `)
        .eq('pipeline_id', pipelineId)
        .eq('esta_fechada', false)
        .is('excluido_em', null);

      if (oportunidadesError) throw oportunidadesError;

      // Montar colunas do Kanban
      const colunas: KanbanColumn[] = (estagios || []).map(estagio => {
        const oportunidadesEstagio = (oportunidades || []).filter(
          op => op.estagio_id === estagio.id
        );

        const cards: OportunidadeCard[] = oportunidadesEstagio.map(op => {
          const diasNoEstagio = op.dias_no_estagio || 0;
          const alertaDias = estagio.alerta_estagnacao_dias;
          const probabilidade = op.percentual_probabilidade;
          
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
            conta: (op.conta as { nome_conta: string } | null)?.nome_conta || null,
            contato: op.contato 
              ? `${(op.contato as unknown as { primeiro_nome: string }).primeiro_nome} ${(op.contato as unknown as { sobrenome: string }).sobrenome}` 
              : null,
            proprietario: op.proprietario 
              ? (op.proprietario as unknown as { nome_completo: string }).nome_completo 
              : null,
            camposKanban: (op.campos_customizados as Record<string, unknown>) || {},
            estaEstagnado: alertaDias !== null && diasNoEstagio >= alertaDias,
          };
        });

        const totalValorColuna = cards.reduce((sum, card) => sum + (card.valor || 0), 0);

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
          totalValor: totalValorColuna,
          totalOportunidades: cards.length,
        };
      });

      const totalValor = colunas.reduce((sum, col) => sum + col.totalValor, 0);
      const totalOportunidades = colunas.reduce((sum, col) => sum + col.totalOportunidades, 0);

      return { colunas, totalValor, totalOportunidades };
    },
    enabled: !!pipelineId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
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
