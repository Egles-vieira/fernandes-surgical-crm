import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EDICondicaoPagamento {
  id: string;
  plataforma_id: string;
  codigo_portal: string;
  descricao_portal: string;
  condicao_pagamento_id: string | null;
  codigo_integracao: string | null;
  ativo: boolean;
  criado_em: string;
  criado_por: string | null;
  atualizado_em: string;
  plataformas_edi?: {
    nome: string;
    slug: string;
  };
  condicoes_pagamento?: {
    nome: string;
  };
}

export const useEDICondicoesPagamento = (plataformaId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: condicoes, isLoading } = useQuery({
    queryKey: ["edi-condicoes-pagamento", plataformaId],
    queryFn: async () => {
      let query = supabase
        .from("edi_condicoes_pagamento")
        .select(`
          *,
          plataformas_edi(nome, slug),
          condicoes_pagamento(nome)
        `)
        .order("descricao_portal");

      if (plataformaId) {
        query = query.eq("plataforma_id", plataformaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EDICondicaoPagamento[];
    },
  });

  const salvarCondicao = useMutation({
    mutationFn: async (condicao: Partial<EDICondicaoPagamento>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      if (condicao.id) {
        const { error } = await supabase
          .from("edi_condicoes_pagamento")
          .update(condicao)
          .eq("id", condicao.id);

        if (error) throw error;
      } else {
        const { id, plataformas_edi, condicoes_pagamento, criado_em, criado_por, atualizado_em, ...condicaoData } = condicao;
        const { error } = await supabase
          .from("edi_condicoes_pagamento")
          .insert([{
            plataforma_id: condicao.plataforma_id,
            codigo_portal: condicao.codigo_portal!,
            descricao_portal: condicao.descricao_portal!,
            condicao_pagamento_id: condicao.condicao_pagamento_id || null,
            codigo_integracao: condicao.codigo_integracao || null,
            ativo: condicao.ativo ?? true,
            criado_por: userData.user.id,
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-condicoes-pagamento"] });
      toast({
        title: "Condição de pagamento salva",
        description: "As configurações foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar condição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletarCondicao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("edi_condicoes_pagamento")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-condicoes-pagamento"] });
      toast({
        title: "Condição deletada",
        description: "A condição de pagamento foi removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar condição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    condicoes,
    isLoading,
    salvarCondicao,
    deletarCondicao,
  };
};
