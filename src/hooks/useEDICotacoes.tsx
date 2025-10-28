import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EDICotacao {
  id: string;
  plataforma_id: string;
  id_cotacao_externa: string;
  numero_cotacao: string;
  cnpj_cliente: string;
  nome_cliente: string;
  cidade_cliente: string;
  uf_cliente: string;
  data_abertura: string;
  data_vencimento_atual: string;
  step_atual: string;
  resgatada: boolean;
  resgatada_por: string | null;
  resgatada_em: string | null;
  respondido_em: string | null;
  total_itens: number;
  total_itens_respondidos: number;
  valor_total_respondido: number;
  dados_originais: any;
  detalhes: any;
  status_analise_ia: 'pendente' | 'em_analise' | 'concluida' | 'erro' | 'cancelada' | null;
  progresso_analise_percent: number | null;
  analisado_por_ia: boolean | null;
  total_itens_analisados: number | null;
  itens_analisados?: number | null;
  total_itens_para_analise?: number | null;
  tempo_analise_segundos: number | null;
  tags: string[] | null;
  plataformas_edi?: {
    nome: string;
    slug: string;
  };
}

export const useEDICotacoes = (filtros?: {
  step?: string;
  plataforma_id?: string;
  resgatada?: boolean;
  status_analise_ia?: 'pendente' | 'em_analise' | 'concluida' | 'erro' | 'cancelada';
  respondida?: boolean;
  analise_concluida?: boolean;
  limite?: number;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cotacoes, isLoading } = useQuery({
    queryKey: ["edi-cotacoes", filtros],
    queryFn: async () => {
      const limite = filtros?.limite || 100;
      
      let query = supabase
        .from("edi_cotacoes")
        .select(`
          id,
          plataforma_id,
          id_cotacao_externa,
          numero_cotacao,
          cnpj_cliente,
          nome_cliente,
          cidade_cliente,
          uf_cliente,
          data_abertura,
          data_vencimento_atual,
          step_atual,
          resgatada,
          resgatada_por,
          resgatada_em,
          respondido_em,
          total_itens,
          total_itens_respondidos,
          valor_total_respondido,
          dados_originais,
          detalhes,
          status_analise_ia,
          progresso_analise_percent,
          analisado_por_ia,
          total_itens_analisados,
          tempo_analise_segundos,
          tags,
          plataformas_edi(nome, slug)
        `)
        .order("data_vencimento_atual", { ascending: true })
        .limit(limite);

      if (filtros?.step) {
        query = query.eq("step_atual", filtros.step);
      }

      if (filtros?.plataforma_id) {
        query = query.eq("plataforma_id", filtros.plataforma_id);
      }

      if (filtros?.resgatada !== undefined) {
        query = query.eq("resgatada", filtros.resgatada);
      }

      if (filtros?.status_analise_ia) {
        query = query.eq("status_analise_ia", filtros.status_analise_ia);
      }

      if (filtros?.analise_concluida) {
        query = query.eq("status_analise_ia", "concluida").is("respondido_em", null);
      }

      if (filtros?.respondida === true) {
        query = query.not("respondido_em", "is", null);
      } else if (filtros?.respondida === false) {
        query = query.is("respondido_em", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EDICotacao[];
    },
  });

  const resgatarCotacao = useMutation({
    mutationFn: async (cotacaoId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("edi_cotacoes")
        .update({
          resgatada: true,
          resgatada_por: userData.user.id,
          resgatada_em: new Date().toISOString(),
          step_atual: "em_analise",
        })
        .eq("id", cotacaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
      toast({
        title: "Cotação resgatada",
        description: "A cotação foi atribuída a você e movida para análise.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao resgatar cotação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const atualizarStep = useMutation({
    mutationFn: async ({ id, step }: { id: string; step: string }) => {
      const { error } = await supabase
        .from("edi_cotacoes")
        .update({ step_atual: step })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });
      toast({
        title: "Status atualizado",
        description: "O status da cotação foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    cotacoes,
    isLoading,
    resgatarCotacao,
    atualizarStep,
  };
};
