import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EDIProdutoVinculo {
  id: string;
  plataforma_id: string;
  produto_id: string;
  cnpj_cliente: string;
  codigo_produto_cliente: string;
  descricao_cliente: string;
  sugerido_por_ia: boolean;
  score_confianca: number | null;
  sugerido_em: string | null;
  aprovado_em: string | null;
  ativo: boolean;
  produtos?: {
    id: string;
    nome: string;
    referencia_interna: string;
    preco_venda: number;
    quantidade_em_maos: number;
  };
  plataformas_edi?: {
    nome: string;
    slug: string;
  };
}

export const useEDIProdutosVinculo = (filtros?: {
  plataforma_id?: string;
  cnpj_cliente?: string;
  aguardando_aprovacao?: boolean;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vinculos, isLoading } = useQuery({
    queryKey: ["edi-produtos-vinculo", filtros],
    queryFn: async () => {
      let query = supabase
        .from("edi_produtos_vinculo")
        .select(`
          *,
          produtos(id, nome, referencia_interna, preco_venda, quantidade_em_maos),
          plataformas_edi(nome, slug)
        `)
        .order("criado_em", { ascending: false });

      if (filtros?.plataforma_id) {
        query = query.eq("plataforma_id", filtros.plataforma_id);
      }

      if (filtros?.cnpj_cliente) {
        query = query.eq("cnpj_cliente", filtros.cnpj_cliente);
      }

      if (filtros?.aguardando_aprovacao) {
        query = query
          .eq("sugerido_por_ia", true)
          .is("aprovado_em", null)
          .eq("ativo", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EDIProdutoVinculo[];
    },
  });

  const sugerirProdutos = useMutation({
    mutationFn: async ({
      descricao_cliente,
      cnpj_cliente,
      plataforma_id,
    }: {
      descricao_cliente: string;
      cnpj_cliente: string;
      plataforma_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "edi-sugerir-produtos",
        {
          body: {
            descricao_cliente,
            cnpj_cliente,
            plataforma_id,
            limite: 5,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-produtos-vinculo"] });
      toast({
        title: "Sugestões geradas",
        description: "A IA analisou o catálogo e encontrou produtos similares.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar sugestões",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const aprovarVinculo = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("edi_produtos_vinculo")
        .update({
          ativo: true,
          aprovado_por: userData.user.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", vinculoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-produtos-vinculo"] });
      toast({
        title: "Vínculo aprovado",
        description: "O DE-PARA foi aprovado e está ativo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar vínculo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejeitarVinculo = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase
        .from("edi_produtos_vinculo")
        .delete()
        .eq("id", vinculoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-produtos-vinculo"] });
      toast({
        title: "Vínculo rejeitado",
        description: "A sugestão foi removida.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao rejeitar vínculo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    vinculos,
    isLoading,
    sugerirProdutos,
    aprovarVinculo,
    rejeitarVinculo,
  };
};
