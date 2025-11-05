import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserPreferences {
  clientesView?: "card" | "grid";
  iconLibrary?: string;
  [key: string]: any;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar preferências do usuário
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("preferencias")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar preferências:", error);
        setIsLoading(false);
        return;
      }

      // Se o perfil não existe, criar um
      if (!data) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            preferencias: {}
          });

        if (insertError) {
          console.error("Erro ao criar perfil:", insertError);
        }
      } else if (data?.preferencias) {
        setPreferences(data.preferencias as UserPreferences);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao carregar preferências:", error);
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar autenticado",
          variant: "destructive"
        });
        return;
      }

      const newPreferences = { ...preferences, [key]: value };

      // Usar upsert para criar se não existir ou atualizar se existir
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          preferencias: newPreferences
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error("Erro ao salvar preferência:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar a preferência",
          variant: "destructive"
        });
        return;
      }

      setPreferences(newPreferences);
      toast({
        title: "Preferência salva",
        description: "Sua visualização foi salva com sucesso",
      });
    } catch (error) {
      console.error("Erro ao salvar preferência:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a preferência",
        variant: "destructive"
      });
    }
  };

  return {
    preferences,
    updatePreference,
    isLoading
  };
}
