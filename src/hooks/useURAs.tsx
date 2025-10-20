import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface URA {
  id: string;
  nome: string;
  descricao: string | null;
  numero_telefone: string | null;
  ativo: boolean | null;
  mensagem_boas_vindas: string;
  tipo_mensagem_boas_vindas: string | null;
  url_audio_boas_vindas: string | null;
  voz_tts: string | null;
  tempo_espera_digito: number | null;
  opcao_invalida_mensagem: string | null;
  max_tentativas_invalidas: number | null;
  acao_apos_max_tentativas: string | null;
  ramal_transferencia_padrao: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  criado_por: string | null;
}

export interface URAOpcao {
  id: string;
  ura_id: string;
  numero_opcao: number;
  titulo: string;
  tipo_acao: string;
  ura_submenu_id: string | null;
  ramal_destino: string | null;
  numero_destino: string | null;
  mensagem_antes_acao: string | null;
  url_audio: string | null;
  ordem: number | null;
  ativo: boolean | null;
  horario_disponivel: any;
  criado_em: string | null;
}

export interface URALog {
  id: string;
  ura_id: string | null;
  chamada_id: string | null;
  numero_origem: string | null;
  opcoes_selecionadas: any;
  duracao_total: number | null;
  status_final: string | null;
  transferido_para: string | null;
  tentativas_invalidas: number | null;
  gravacao_url: string | null;
  criado_em: string | null;
  metadata: any;
}

export function useURAs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todas as URAs
  const { data: uras, isLoading: isLoadingURAs } = useQuery({
    queryKey: ["uras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uras")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data as URA[];
    },
  });

  // Buscar estatísticas
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["uras-stats"],
    queryFn: async () => {
      // Total de URAs ativas
      const { count: urasAtivas } = await supabase
        .from("uras")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);

      // Total de chamadas hoje
      const hoje = new Date().toISOString().split("T")[0];
      const { count: chamadasHoje } = await supabase
        .from("ura_logs")
        .select("*", { count: "exact", head: true })
        .gte("criado_em", hoje);

      // Duração média e taxa de transferência
      const { data: logs } = await supabase
        .from("ura_logs")
        .select("duracao_total, status_final")
        .gte("criado_em", hoje);

      const duracaoMedia = logs?.length
        ? Math.round(
            logs.reduce((acc, log) => acc + (log.duracao_total || 0), 0) /
              logs.length
          )
        : 0;

      const taxaTransferencia = logs?.length
        ? Math.round(
            (logs.filter((log) => log.status_final === "transferida").length /
              logs.length) *
              100
          )
        : 0;

      return {
        urasAtivas: urasAtivas || 0,
        chamadasHoje: chamadasHoje || 0,
        duracaoMedia,
        taxaTransferencia,
      };
    },
  });

  // Buscar opções de uma URA
  const useOpcoes = (uraId?: string) =>
    useQuery({
      queryKey: ["ura-opcoes", uraId],
      queryFn: async () => {
        if (!uraId) return [];
        const { data, error } = await supabase
          .from("ura_opcoes")
          .select("*")
          .eq("ura_id", uraId)
          .order("ordem");

        if (error) throw error;
        return data as URAOpcao[];
      },
      enabled: !!uraId,
    });

  // Buscar logs de uma URA
  const useLogs = (uraId?: string) =>
    useQuery({
      queryKey: ["ura-logs", uraId],
      queryFn: async () => {
        if (!uraId) return [];
        const { data, error } = await supabase
          .from("ura_logs")
          .select("*")
          .eq("ura_id", uraId)
          .order("criado_em", { ascending: false })
          .limit(100);

        if (error) throw error;
        return data as URALog[];
      },
      enabled: !!uraId,
    });

  // Criar nova URA
  const criarURA = useMutation({
    mutationFn: async (novaURA: Omit<URA, 'id' | 'criado_em' | 'atualizado_em' | 'criado_por'>) => {
      const { data, error } = await supabase
        .from("uras")
        .insert([novaURA as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uras"] });
      queryClient.invalidateQueries({ queryKey: ["uras-stats"] });
      toast({
        title: "URA criada com sucesso!",
        description: "A nova URA foi adicionada ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar URA",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar URA
  const atualizarURA = useMutation({
    mutationFn: async ({ id, ...dados }: Partial<URA> & { id: string }) => {
      const { data, error } = await supabase
        .from("uras")
        .update(dados)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uras"] });
      queryClient.invalidateQueries({ queryKey: ["uras-stats"] });
      toast({
        title: "URA atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar URA",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Excluir URA
  const excluirURA = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("uras").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uras"] });
      queryClient.invalidateQueries({ queryKey: ["uras-stats"] });
      toast({
        title: "URA excluída com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir URA",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle status ativo/inativo
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("uras")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["uras"] });
      queryClient.invalidateQueries({ queryKey: ["uras-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    uras,
    isLoadingURAs,
    stats,
    isLoadingStats,
    useOpcoes,
    useLogs,
    criarURA,
    atualizarURA,
    excluirURA,
    toggleAtivo,
  };
}
