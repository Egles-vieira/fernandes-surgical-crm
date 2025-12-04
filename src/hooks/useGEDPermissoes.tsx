import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface GEDPermissao {
  id: string;
  documento_id: string;
  tipo: 'todos' | 'role' | 'equipe' | 'usuario';
  role_nome: string | null;
  equipe_id: string | null;
  usuario_id: string | null;
  nivel: 'visualizar' | 'download' | 'editar';
  criado_em: string;
  criado_por: string | null;
  equipe?: { id: string; nome: string } | null;
  usuario?: { id: string; primeiro_nome: string; sobrenome: string } | null;
}

export interface GEDPermissaoInput {
  documento_id: string;
  tipo: 'todos' | 'role' | 'equipe' | 'usuario';
  role_nome?: string;
  equipe_id?: string;
  usuario_id?: string;
  nivel?: 'visualizar' | 'download' | 'editar';
}

export function useGEDPermissoes(documentoId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: permissoes, isLoading, error } = useQuery({
    queryKey: ['ged-permissoes', documentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ged_permissoes')
        .select(`
          *,
          equipe:equipes(id, nome)
        `)
        .eq('documento_id', documentoId!)
        .order('criado_em');

      if (error) throw error;
      return (data || []) as unknown as GEDPermissao[];
    },
    enabled: !!user && !!documentoId,
  });

  const addPermissao = useMutation({
    mutationFn: async (input: GEDPermissaoInput) => {
      const { data, error } = await supabase
        .from('ged_permissoes')
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
      queryClient.invalidateQueries({ queryKey: ['ged-permissoes', documentoId] });
      toast.success('Permissão adicionada');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar permissão: ' + error.message);
    }
  });

  const removePermissao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ged_permissoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-permissoes', documentoId] });
      toast.success('Permissão removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover permissão: ' + error.message);
    }
  });

  return {
    permissoes: permissoes || [],
    isLoading,
    error,
    addPermissao,
    removePermissao
  };
}
