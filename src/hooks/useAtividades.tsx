import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Atividade {
  id: string;
  numero_atividade: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  status: string;
  prioridade: string;
  cliente_id: string | null;
  venda_id: string | null;
  responsavel_id: string | null;
  criado_por: string | null;
  equipe_id: string | null;
  data_vencimento: string | null;
  data_conclusao: string | null;
  codigo_disposicao_id: string | null;
  resultado_descricao: string | null;
  proximo_passo: string | null;
  score_prioridade: number;
  nba_sugestao_tipo: string | null;
  nba_confianca: number | null;
  tags: string[];
  criado_em: string;
  concluida_no_prazo: boolean | null;
  clientes?: any;
  perfis_usuario?: any;
  codigos_disposicao?: any;
  vendas?: any;
}

export interface FiltrosAtividades {
  status?: string[];
  tipo?: string[];
  prioridade?: string[];
  responsavel_id?: string;
  cliente_id?: string;
  venda_id?: string;
  search?: string;
}

export function useAtividades(options: { filtros?: FiltrosAtividades; ordenarPor?: string; limite?: number } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { filtros = {}, limite = 50, ordenarPor = 'score_prioridade' } = options;

  const { data: atividades, isLoading, refetch } = useQuery({
    queryKey: ['atividades', filtros, limite],
    queryFn: async () => {
      let query = supabase
        .from('atividades')
        .select(`
          *,
          clientes (nome_abrev, nome_emit),
          codigos_disposicao (codigo, nome, cor),
          vendas (numero_venda)
        `)
        .is('excluido_em', null)
        .order('score_prioridade', { ascending: false })
        .limit(limite);

      if (filtros.status?.length) {
        query = query.in('status', filtros.status as any);
      }
      if (filtros.responsavel_id) {
        query = query.eq('responsavel_id', filtros.responsavel_id);
      }
      if (filtros.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id);
      }
      if (filtros.venda_id) {
        query = query.eq('venda_id', filtros.venda_id);
      }
      if (filtros.search) {
        query = query.ilike('titulo', `%${filtros.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Atividade[];
    },
    enabled: !!user
  });

  const { data: totalCount } = useQuery({
    queryKey: ['atividades-count', filtros],
    queryFn: async () => {
      const { count } = await supabase
        .from('atividades')
        .select('id', { count: 'exact', head: true })
        .is('excluido_em', null);
      return count || 0;
    },
    enabled: !!user
  });

  const criarAtividade = useMutation({
    mutationFn: async (dados: Partial<Atividade>) => {
      const { data, error } = await supabase
        .from('atividades')
        .insert(dados as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      toast.success('Atividade criada');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const atualizarAtividade = useMutation({
    mutationFn: async ({ id, ...dados }: Partial<Atividade> & { id: string }) => {
      const { error } = await supabase.from('atividades').update(dados as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      toast.success('Atividade atualizada');
    }
  });

  const excluirAtividade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('atividades').update({ excluido_em: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      toast.success('Atividade excluída');
    }
  });

  const concluirAtividade = useMutation({
    mutationFn: async (params: {
      atividade_id: string;
      codigo_disposicao_id: string;
      resultado_descricao?: string;
      proximo_passo?: string;
      criar_proxima_atividade?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('concluir-atividade', { body: params });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      toast.success('Atividade concluída');
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return { atividades: atividades || [], totalCount: totalCount || 0, isLoading, refetch, criarAtividade, atualizarAtividade, excluirAtividade, concluirAtividade };
}

export function useCodigosDisposicao(tipoAtividade?: string) {
  return useQuery({
    queryKey: ['codigos-disposicao', tipoAtividade],
    queryFn: async () => {
      const { data, error } = await supabase.from('codigos_disposicao').select('*').eq('ativo', true).order('ordem');
      if (error) throw error;
      return data;
    }
  });
}

export function useAtividade(id: string | undefined) {
  return useQuery({
    queryKey: ['atividade', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('atividades')
        .select(`*, clientes (id, nome_abrev, nome_emit), codigos_disposicao (id, codigo, nome, cor, requer_proximo_passo), vendas (id, numero_venda)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as Atividade;
    },
    enabled: !!id
  });
}
