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
  textColors?: {
    foreground: string;
    mutedForeground: string;
  };
}

export function useThemeConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Carregar configurações globais do tema
  const { data: themeConfig, isLoading } = useQuery({
    queryKey: ['theme-config'],
    queryFn: async () => {
      // Tentar carregar do cache primeiro
      const cached = localStorage.getItem('theme-config-cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Retornar cache enquanto busca atualização
          setTimeout(async () => {
            const { data } = await supabase
              .from('configuracoes_sistema')
              .select('valor')
              .eq('chave', 'theme_customization')
              .maybeSingle();
            
            if (data?.valor) {
              localStorage.setItem('theme-config-cache', JSON.stringify(data.valor));
              queryClient.setQueryData(['theme-config'], data.valor);
            }
          }, 0);
          return parsed as ThemeConfig;
        } catch (e) {
          console.warn('Failed to parse theme cache');
        }
      }

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'theme_customization')
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações do tema:', error);
        return {} as ThemeConfig;
      }

      const config = (data?.valor || {}) as ThemeConfig;
      localStorage.setItem('theme-config-cache', JSON.stringify(config));
      return config;
    },
  });

  // Atualizar configurações do tema
  const updateThemeConfig = useMutation({
    mutationFn: async (newConfig: Partial<ThemeConfig>) => {
      const currentConfig = themeConfig || {};
      const updatedConfig = { ...currentConfig, ...newConfig };

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .upsert(
          { 
            chave: 'theme_customization', 
            valor: updatedConfig 
          },
          { 
            onConflict: 'chave'
          }
        )
        .select('valor, atualizado_em')
        .maybeSingle();

      if (error) throw error;

      // Garantir que o cache usa o que foi salvo no banco
      const saved = (data?.valor || updatedConfig) as ThemeConfig;
      localStorage.setItem('theme-config-cache', JSON.stringify(saved));
      
      return saved;
    },
    onSuccess: (savedConfig) => {
      // Atualizar query cache com o valor retornado do banco
      queryClient.setQueryData(['theme-config'], savedConfig);
      toast({
        title: "Tema atualizado",
        description: "As configurações foram salvas com sucesso",
      });
    },
    onError: (error: any) => {
      console.error('Erro ao salvar configurações do tema:', error);
      
      // Verificar se é erro de permissão (RLS)
      const isPermissionError = error.message?.includes('permission') || 
                                error.message?.includes('policy') ||
                                error.code === '42501';
      
      toast({
        title: "Erro ao salvar tema",
        description: isPermissionError 
          ? "Você precisa ser administrador ou gerente para salvar configurações"
          : error.message || "Não foi possível salvar as configurações",
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
