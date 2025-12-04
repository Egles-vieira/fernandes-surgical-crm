import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface GEDTipoDocumento {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  exige_validade: boolean;
  dias_alerta_vencimento: number;
  permite_versoes: boolean;
  extensoes_permitidas: string[];
  ativo: boolean;
  criado_por: string | null;
  criado_em: string;
}

export interface GEDTipoInput {
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
  exige_validade?: boolean;
  dias_alerta_vencimento?: number;
  permite_versoes?: boolean;
  extensoes_permitidas?: string[];
  ativo?: boolean;
}

export function useGEDTipos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tipos, isLoading, error } = useQuery({
    queryKey: ['ged-tipos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ged_tipos_documento')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as GEDTipoDocumento[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const tiposAtivos = tipos?.filter(t => t.ativo) || [];

  const createTipo = useMutation({
    mutationFn: async (input: GEDTipoInput) => {
      const { data, error } = await supabase
        .from('ged_tipos_documento')
        .insert({
          ...input,
          criado_por: user!.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-tipos'] });
      toast.success('Tipo de documento criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar tipo: ' + error.message);
    }
  });

  const updateTipo = useMutation({
    mutationFn: async ({ id, ...input }: Partial<GEDTipoInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('ged_tipos_documento')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-tipos'] });
      toast.success('Tipo de documento atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tipo: ' + error.message);
    }
  });

  const deleteTipo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ged_tipos_documento')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-tipos'] });
      toast.success('Tipo de documento excluído');
    },
    onError: (error) => {
      toast.error('Erro ao excluir tipo: ' + error.message);
    }
  });

  return {
    tipos: tipos || [],
    tiposAtivos,
    isLoading,
    error,
    createTipo,
    updateTipo,
    deleteTipo
  };
}
