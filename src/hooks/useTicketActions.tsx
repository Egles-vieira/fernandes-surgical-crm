import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useTicketActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar usuários disponíveis para transferência
  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios_disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_usuario")
        .select("id, nome_completo, primeiro_nome, sobrenome")
        .eq("esta_ativo", true);

      if (error) throw error;
      return data.map(u => ({
        id: u.id,
        nome: u.nome_completo || `${u.primeiro_nome} ${u.sobrenome}`.trim() || "Usuário",
      }));
    },
  });

  // Calcular tempo efetivo do ticket
  const calcularTempoEfetivo = async (ticketId: string) => {
    const { data, error } = await supabase.rpc("calcular_tempo_efetivo_ticket", {
      ticket_id: ticketId,
    });

    if (error) throw error;
    return data;
  };

  // Pausar ticket
  const pausarTicket = useMutation({
    mutationFn: async ({ ticketId, motivo }: { ticketId: string; motivo: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Criar registro de pausa
      const { error: pausaError } = await supabase.from("tickets_pausas").insert({
        ticket_id: ticketId,
        motivo,
        pausado_por: userData.user?.id,
      });

      if (pausaError) throw pausaError;

      // Atualizar ticket
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          esta_pausado: true,
          pausado_em: new Date().toISOString(),
          motivo_pausa: motivo,
        })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      // Adicionar interação
      await supabase.from("tickets_interacoes").insert({
        ticket_id: ticketId,
        tipo_interacao: "pausa",
        mensagem: `Atendimento pausado: ${motivo}`,
        criado_por: userData.user?.id,
        mensagem_interna: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket"] });
      toast({
        title: "Ticket pausado",
        description: "O atendimento foi pausado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao pausar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Retomar ticket
  const retomarTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data: userData } = await supabase.auth.getUser();

      // Buscar pausa ativa
      const { data: pausaAtiva, error: buscaError } = await supabase
        .from("tickets_pausas")
        .select("*")
        .eq("ticket_id", ticketId)
        .is("retomado_em", null)
        .order("pausado_em", { ascending: false })
        .limit(1)
        .single();

      if (buscaError) throw buscaError;

      // Atualizar pausa com horário de retomada
      const { error: pausaError } = await supabase
        .from("tickets_pausas")
        .update({
          retomado_em: new Date().toISOString(),
        })
        .eq("id", pausaAtiva.id);

      if (pausaError) throw pausaError;

      // Adicionar interação
      await supabase.from("tickets_interacoes").insert({
        ticket_id: ticketId,
        tipo_interacao: "retomada",
        mensagem: "Atendimento retomado",
        criado_por: userData.user?.id,
        mensagem_interna: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket"] });
      toast({
        title: "Ticket retomado",
        description: "O atendimento foi retomado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao retomar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Transferir ticket
  const transferirTicket = useMutation({
    mutationFn: async ({
      ticketId,
      novoResponsavel,
      motivo,
    }: {
      ticketId: string;
      novoResponsavel: string;
      motivo?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Buscar nome do novo responsável
      const { data: novoUsuario } = await supabase
        .from("perfis_usuario")
        .select("nome_completo, primeiro_nome, sobrenome")
        .eq("id", novoResponsavel)
        .single();

      const nomeNovoResponsavel =
        novoUsuario?.nome_completo ||
        `${novoUsuario?.primeiro_nome} ${novoUsuario?.sobrenome}`.trim() ||
        "Usuário";

      // Atualizar ticket
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          atribuido_para: novoResponsavel,
          atribuido_em: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      // Adicionar interação
      await supabase.from("tickets_interacoes").insert({
        ticket_id: ticketId,
        tipo_interacao: "transferencia",
        mensagem: `Ticket transferido para ${nomeNovoResponsavel}${motivo ? `: ${motivo}` : ""}`,
        criado_por: userData.user?.id,
        mensagem_interna: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket"] });
      toast({
        title: "Ticket transferido",
        description: "O ticket foi transferido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao transferir ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    usuarios,
    calcularTempoEfetivo,
    pausarTicket,
    retomarTicket,
    transferirTicket,
  };
}
