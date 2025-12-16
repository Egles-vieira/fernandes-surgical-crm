import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WhatsAppFila {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ordem: number;
  sla_primeira_resposta_minutos: number;
  sla_resolucao_minutos: number;
  max_conversas_simultaneas: number | null;
  horario_inicio: string | null;
  horario_fim: string | null;
  dias_semana: number[];
  unidade_id: string | null;
  esta_ativa: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface WhatsAppFilaInsert {
  nome: string;
  descricao?: string | null;
  cor?: string;
  icone?: string;
  ordem?: number;
  sla_primeira_resposta_minutos?: number;
  sla_resolucao_minutos?: number;
  max_conversas_simultaneas?: number | null;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  dias_semana?: number[];
  unidade_id?: string | null;
  esta_ativa?: boolean;
}

export interface WhatsAppFilaUpdate extends Partial<WhatsAppFilaInsert> {
  id: string;
}

export function useWhatsAppFilas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ["whatsapp_filas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_filas")
        .select("*")
        .eq("esta_ativa", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as WhatsAppFila[];
    },
  });

  const { data: todasFilas = [], isLoading: isLoadingTodas } = useQuery({
    queryKey: ["whatsapp_filas_todas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_filas")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as WhatsAppFila[];
    },
  });

  const createFila = useMutation({
    mutationFn: async (fila: WhatsAppFilaInsert) => {
      const { data, error } = await supabase
        .from("whatsapp_filas")
        .insert([fila])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas_todas"] });
      toast({
        title: "Fila criada!",
        description: "A fila de WhatsApp foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar fila",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFila = useMutation({
    mutationFn: async ({ id, ...fila }: WhatsAppFilaUpdate) => {
      const { data, error } = await supabase
        .from("whatsapp_filas")
        .update(fila)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas_todas"] });
      toast({
        title: "Fila atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar fila",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFila = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_filas")
        .update({ esta_ativa: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas_todas"] });
      toast({
        title: "Fila desativada!",
        description: "A fila foi desativada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desativar fila",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reativarFila = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_filas")
        .update({ esta_ativa: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas_todas"] });
      toast({
        title: "Fila reativada!",
        description: "A fila foi reativada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reativar fila",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reordenarFilas = useMutation({
    mutationFn: async (filasOrdenadas: { id: string; ordem: number }[]) => {
      const promises = filasOrdenadas.map(({ id, ordem }) =>
        supabase
          .from("whatsapp_filas")
          .update({ ordem })
          .eq("id", id)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp_filas_todas"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reordenar filas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    filas,
    todasFilas,
    isLoading,
    isLoadingTodas,
    createFila,
    updateFila,
    deleteFila,
    reativarFila,
    reordenarFilas,
  };
}
