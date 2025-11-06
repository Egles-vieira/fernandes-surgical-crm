import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ThemeConfig {
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  font?: string;
  radius?: string;
  border?: string;
  shadow?: string;
  iconStroke?: string;
  iconVisual?: string;
  menuColors?: {
    background: string;
    icon: string;
    text: string;
  };
}

export function useThemeConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar configurações globais do tema
  const { data: themeConfig, isLoading } = useQuery({
    queryKey: ['theme-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'theme_customization')
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações do tema:', error);
        return {} as ThemeConfig;
      }

      return (data?.valor || {}) as ThemeConfig;
    },
  });

  // Atualizar configurações do tema
  const updateThemeConfig = useMutation({
    mutationFn: async (newConfig: Partial<ThemeConfig>) => {
      const currentConfig = themeConfig || {};
      const updatedConfig = { ...currentConfig, ...newConfig };

      const { error } = await supabase
        .from('configuracoes_sistema')
        .update({ valor: updatedConfig })
        .eq('chave', 'theme_customization');

      if (error) throw error;

      return updatedConfig;
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(['theme-config'], updatedConfig);
      toast({
        title: "Tema atualizado",
        description: "As cores foram salvas para todos os usuários",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao salvar configurações do tema:', error);
      toast({
        title: "Erro ao salvar tema",
        description: error.message || "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    },
  });

  return {
    themeConfig: themeConfig || {},
    isLoading,
    updateThemeConfig: updateThemeConfig.mutate,
    isUpdating: updateThemeConfig.isPending,
  };
}
