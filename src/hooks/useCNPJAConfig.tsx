import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConfiguracoesCNPJA } from "@/types/cnpja";

const DEFAULT_CONFIG: Omit<ConfiguracoesCNPJA, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  sempre_validar_cep: true,
  trabalha_com_icms: true,
  operacoes_interestaduais: true,
  emite_nf: true,
  gerar_comprovantes_automaticamente: false,
  tempo_cache_office_dias: 30,
  tempo_cache_company_dias: 30,
  tempo_cache_simples_dias: 30,
  tempo_cache_sintegra_dias: 90,
  tempo_cache_suframa_dias: 180,
  limite_consultas_simultaneas: 5,
  configs_extras: {},
};

export function useCNPJAConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar configurações
  const { data: config, isLoading } = useQuery({
    queryKey: ["cnpja-config"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("cnpja_configuracoes")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Se não existir configuração, retornar default
        if (error.code === 'PGRST116') {
          return { ...DEFAULT_CONFIG, user_id: user.id };
        }
        throw error;
      }

      return data as ConfiguracoesCNPJA;
    },
  });

  // Salvar configurações
  const saveConfig = useMutation({
    mutationFn: async (newConfig: Partial<ConfiguracoesCNPJA>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se já existe configuração
      const { data: existing } = await supabase
        .from("cnpja_configuracoes")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Atualizar
        const { data, error } = await supabase
          .from("cnpja_configuracoes")
          .update(newConfig)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Inserir
        const { data, error } = await supabase
          .from("cnpja_configuracoes")
          .insert({ ...DEFAULT_CONFIG, ...newConfig, user_id: user.id })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cnpja-config"] });
      toast({
        title: "Configurações salvas!",
        description: "As alterações foram aplicadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resetar para padrão
  const resetConfig = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("cnpja_configuracoes")
        .upsert({ ...DEFAULT_CONFIG, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cnpja-config"] });
      toast({
        title: "Configurações restauradas!",
        description: "As configurações padrão foram aplicadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resetar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    config: config || { ...DEFAULT_CONFIG, user_id: '' },
    isLoading,
    saveConfig,
    resetConfig,
    defaultConfig: DEFAULT_CONFIG,
  };
}
