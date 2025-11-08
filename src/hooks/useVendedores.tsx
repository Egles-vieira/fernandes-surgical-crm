import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Vendedor {
  id: string;
  nome: string;
  email: string;
}

export function useVendedores() {
  const { user } = useAuth();

  const { data: vendedores, isLoading } = useQuery({
    queryKey: ["vendedores", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar perfis de usuários que são vendedores ou subordinados
      const { data, error } = await supabase
        .from("perfis_usuario")
        .select(`
          id,
          primeiro_nome,
          sobrenome,
          email,
          user_roles!inner(role)
        `)
        .or('user_roles.role.eq.sales,user_roles.role.eq.manager,user_roles.role.eq.admin');

      if (error) throw error;

      // Mapear para o formato Vendedor
      return (data || []).map((perfil: any) => ({
        id: perfil.id,
        nome: perfil.sobrenome 
          ? `${perfil.primeiro_nome} ${perfil.sobrenome}` 
          : perfil.primeiro_nome || perfil.email,
        email: perfil.email
      }));
    },
    enabled: !!user?.id,
  });

  return {
    vendedores: vendedores || [],
    isLoading,
  };
}
