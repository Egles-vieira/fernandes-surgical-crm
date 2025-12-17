import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IAConfiguracao {
  id: string;
  modulo: string;
  ativo: boolean;
  config: Record<string, any>;
  criado_em: string;
  atualizado_em: string;
}

export interface GlobalConfig {
  provider: string;
  circuit_breaker: {
    limite_falhas: number;
    tempo_reset_segundos: number;
  };
}

export interface EdiAnaliseConfig {
  analise_automatica: boolean;
  fallback_manual: boolean;
  modelo: string;
}

export interface TicketsAssistenteConfig {
  sugerir_respostas: boolean;
  modelo: string;
}

export interface WhatsAppTriagemConfig {
  modelo: string;
  temperature: number;
}

export function useIAConfiguracoes() {
  const queryClient = useQueryClient();

  const { data: configuracoes, isLoading } = useQuery({
    queryKey: ["ia-configuracoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_configuracoes")
        .select("*")
        .order("modulo");

      if (error) throw error;
      return data as IAConfiguracao[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getConfigByModulo = (modulo: string): IAConfiguracao | undefined => {
    return configuracoes?.find((c) => c.modulo === modulo);
  };

  const updateConfig = useMutation({
    mutationFn: async ({
      modulo,
      ativo,
      config,
    }: {
      modulo: string;
      ativo?: boolean;
      config?: Record<string, any>;
    }) => {
      const updates: Partial<IAConfiguracao> = {};
      if (ativo !== undefined) updates.ativo = ativo;
      if (config !== undefined) updates.config = config;

      const { data, error } = await supabase
        .from("ia_configuracoes")
        .update(updates)
        .eq("modulo", modulo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ia-configuracoes"] });
      toast.success("Configuração atualizada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configuração: " + error.message);
    },
  });

  // Helper para obter configurações tipadas
  const globalConfig = getConfigByModulo("global");
  const ediConfig = getConfigByModulo("edi_analise");
  const ticketsConfig = getConfigByModulo("tickets_assistente");
  const triageConfig = getConfigByModulo("whatsapp_triagem");

  return {
    configuracoes,
    isLoading,
    getConfigByModulo,
    updateConfig,
    globalConfig: globalConfig?.config as GlobalConfig | undefined,
    globalAtivo: globalConfig?.ativo,
    ediConfig: ediConfig?.config as EdiAnaliseConfig | undefined,
    ediAtivo: ediConfig?.ativo,
    ticketsConfig: ticketsConfig?.config as TicketsAssistenteConfig | undefined,
    ticketsAtivo: ticketsConfig?.ativo,
    triageConfig: triageConfig?.config as WhatsAppTriagemConfig | undefined,
    triageAtivo: triageConfig?.ativo,
  };
}

// Hook para buscar contas WhatsApp com configuração de agente
export function useWhatsAppContasIA() {
  return useQuery({
    queryKey: ["whatsapp-contas-ia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_contas")
        .select("id, nome_exibicao, numero_whatsapp, agente_vendas_ativo, agente_ia_config")
        .is("excluido_em", null)
        .order("nome_exibicao");

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para buscar filas WhatsApp
export function useWhatsAppFilasIA() {
  return useQuery({
    queryKey: ["whatsapp-filas-ia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_filas")
        .select("id, nome, prioridade_triagem")
        .eq("esta_ativa", true)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
