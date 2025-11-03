import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserPreferences {
  clientesView?: "card" | "grid";
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
        .single();

      if (error) {
        console.error("Erro ao carregar preferências:", error);
        setIsLoading(false);
        return;
      }

      if (data?.preferencias) {
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

      const { error } = await supabase
        .from("profiles")
        .update({ preferencias: newPreferences })
        .eq("id", user.id);

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
