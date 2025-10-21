import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Ticket = Tables<"tickets">;
type TicketInsert = TablesInsert<"tickets">;
type TicketUpdate = TablesUpdate<"tickets">;
type TicketInteracao = Tables<"tickets_interacoes">;

export function useTickets(filtros?: {
  status?: Tables<"tickets">["status"];
  prioridade?: Tables<"tickets">["prioridade"];
  atribuido_para?: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", filtros],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*")
        .order("data_abertura", { ascending: false });

      if (filtros?.status) {
        query = query.eq("status", filtros.status);
      }
      if (filtros?.prioridade) {
        query = query.eq("prioridade", filtros.prioridade);
      }
      if (filtros?.atribuido_para) {
        query = query.eq("atribuido_para", filtros.atribuido_para);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ticket[];
    },
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ["tickets_interacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets_interacoes")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TicketInteracao[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async (ticket: Omit<TicketInsert, "aberto_por" | "numero_ticket">) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData: any = {
        ...ticket,
        aberto_por: userData.user?.id,
      };

      const { data, error } = await supabase
        .from("tickets")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Criar primeira interação
      await supabase.from("tickets_interacoes").insert({
        ticket_id: data.id,
        tipo_interacao: "criacao",
        mensagem: "Ticket criado",
        criado_por: userData.user?.id,
        mensagem_interna: true,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({
        title: "Ticket criado!",
        description: "O ticket foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, ...ticket }: TicketUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tickets")
        .update(ticket)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets_interacoes"] });
      toast({
        title: "Ticket atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addInteracao = useMutation({
    mutationFn: async ({
      ticket_id,
      mensagem,
      mensagem_interna = false,
    }: {
      ticket_id: string;
      mensagem: string;
      mensagem_interna?: boolean;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("tickets_interacoes")
        .insert({
          ticket_id,
          tipo_interacao: "comentario",
          mensagem,
          mensagem_interna,
          criado_por: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets_interacoes"] });
      toast({
        title: "Comentário adicionado!",
        description: "Sua mensagem foi registrada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    tickets,
    isLoading,
    interacoes,
    createTicket,
    updateTicket,
    addInteracao,
  };
}
