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
  // Campos de triagem IA
  palavras_chave: string[] | null;
  regras_triagem: string | null;
  prioridade_triagem: number | null;
  tipo_fila: string | null;
}

export interface OperadorFila {
  id: string;
  primeiro_nome: string;
  sobrenome: string;
  url_avatar: string | null;
  status_atendimento_whatsapp: string | null;
  filas_atendimento_ids: string[] | null;
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
  // Campos de triagem IA
  palavras_chave?: string[] | null;
  regras_triagem?: string | null;
  prioridade_triagem?: number | null;
  tipo_fila?: string | null;
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

  // Query para buscar todos os operadores disponíveis
  const { data: operadoresDisponiveis = [], isLoading: isLoadingOperadores } = useQuery({
    queryKey: ["whatsapp_operadores_disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_usuario")
        .select("id, primeiro_nome, sobrenome, url_avatar, status_atendimento_whatsapp, filas_atendimento_ids")
        .order("primeiro_nome", { ascending: true });

      if (error) throw error;
      return data as OperadorFila[];
    },
  });

  // Função para obter operadores de uma fila específica
  const getOperadoresDaFila = (filaId: string): OperadorFila[] => {
    return operadoresDisponiveis.filter(
      (op) => op.filas_atendimento_ids?.includes(filaId)
    );
  };

  // Função para obter operadores NÃO vinculados a uma fila
  const getOperadoresNaoVinculados = (filaId: string): OperadorFila[] => {
    return operadoresDisponiveis.filter(
      (op) => !op.filas_atendimento_ids?.includes(filaId)
    );
  };

  // Mutation para vincular operador à fila
  const vincularOperador = useMutation({
    mutationFn: async ({ operadorId, filaId }: { operadorId: string; filaId: string }) => {
      // Buscar dados atuais diretamente do banco para evitar problemas de cache
      const { data: operadorAtual, error: fetchError } = await supabase
        .from("perfis_usuario")
        .select("filas_atendimento_ids")
        .eq("id", operadorId)
        .single();

      if (fetchError) throw fetchError;

      const filasAtuais = operadorAtual?.filas_atendimento_ids || [];
      
      if (filasAtuais.includes(filaId)) {
        throw new Error("Operador já está vinculado a esta fila");
      }

      const { error } = await supabase
        .from("perfis_usuario")
        .update({ filas_atendimento_ids: [...filasAtuais, filaId] })
        .eq("id", operadorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_operadores_disponiveis"] });
      toast({
        title: "Operador vinculado!",
        description: "O operador foi adicionado à fila com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao vincular operador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para desvincular operador da fila
  const desvincularOperador = useMutation({
    mutationFn: async ({ operadorId, filaId }: { operadorId: string; filaId: string }) => {
      const operador = operadoresDisponiveis.find((op) => op.id === operadorId);
      const filasAtuais = operador?.filas_atendimento_ids || [];
      
      const novasFilas = filasAtuais.filter((id) => id !== filaId);

      const { error } = await supabase
        .from("perfis_usuario")
        .update({ filas_atendimento_ids: novasFilas })
        .eq("id", operadorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_operadores_disponiveis"] });
      toast({
        title: "Operador removido!",
        description: "O operador foi removido da fila com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover operador",
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
    // Operadores
    operadoresDisponiveis,
    isLoadingOperadores,
    getOperadoresDaFila,
    getOperadoresNaoVinculados,
    vincularOperador,
    desvincularOperador,
  };
}
