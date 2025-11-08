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

      // Buscar todos os perfis de usuários
      const { data: perfis, error: perfilError } = await supabase
        .from("perfis_usuario")
        .select(`
          id,
          primeiro_nome,
          sobrenome
        `);

      if (perfilError) throw perfilError;

      // Buscar roles dos usuários
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["sales", "manager", "admin"]);

      if (rolesError) throw rolesError;

      // Filtrar perfis que têm um dos roles
      const userIdsComRole = new Set(roles?.map(r => r.user_id) || []);
      const perfisComRole = perfis?.filter(p => userIdsComRole.has(p.id)) || [];

      // Mapear para o formato Vendedor
      return perfisComRole.map((perfil: any) => ({
        id: perfil.id,
        nome: perfil.sobrenome 
          ? `${perfil.primeiro_nome} ${perfil.sobrenome}` 
          : perfil.primeiro_nome || 'Usuário',
        email: '' // Email não está na tabela perfis_usuario
      }));
    },
    enabled: !!user?.id,
  });

  return {
    vendedores: vendedores || [],
    isLoading,
  };
}
