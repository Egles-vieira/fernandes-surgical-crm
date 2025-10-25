import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EDIUnidadeMedida {
  id: string;
  plataforma_id: string;
  codigo_portal: string;
  descricao_portal: string;
  abreviacao_portal: string | null;
  unidade_medida_interna: string;
  ativo: boolean;
  criado_em: string;
  criado_por: string | null;
  atualizado_em: string;
  plataformas_edi?: {
    nome: string;
    slug: string;
  };
}

export const useEDIUnidadesMedida = (plataformaId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unidades, isLoading } = useQuery({
    queryKey: ["edi-unidades-medida", plataformaId],
    queryFn: async () => {
      let query = supabase
        .from("edi_unidades_medida")
        .select(`
          *,
          plataformas_edi(nome, slug)
        `)
        .order("descricao_portal");

      if (plataformaId) {
        query = query.eq("plataforma_id", plataformaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EDIUnidadeMedida[];
    },
  });

  const salvarUnidade = useMutation({
    mutationFn: async (unidade: Partial<EDIUnidadeMedida>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      if (unidade.id) {
        const { error } = await supabase
          .from("edi_unidades_medida")
          .update(unidade)
          .eq("id", unidade.id);

        if (error) throw error;
      } else {
        const { id, plataformas_edi, criado_em, criado_por, atualizado_em, ...unidadeData } = unidade;
        const { error } = await supabase
          .from("edi_unidades_medida")
          .insert([{
            plataforma_id: unidade.plataforma_id,
            codigo_portal: unidade.codigo_portal!,
            descricao_portal: unidade.descricao_portal!,
            abreviacao_portal: unidade.abreviacao_portal || null,
            unidade_medida_interna: unidade.unidade_medida_interna!,
            ativo: unidade.ativo ?? true,
            criado_por: userData.user.id,
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-unidades-medida"] });
      toast({
        title: "Unidade de medida salva",
        description: "As configurações foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar unidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarUnidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("edi_unidades_medida")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-unidades-medida"] });
      toast({
        title: "Unidade deletada",
        description: "A unidade de medida foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar unidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    unidades,
    isLoading,
    salvarUnidade,
    deletarUnidade,
  };
};
