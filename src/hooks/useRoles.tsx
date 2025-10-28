import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "manager" | "sales" | "warehouse" | "support" | "lider" | "backoffice";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  vendedor_vinculado_id: string | null;
}

interface UserWithRoles {
  user_id: string;
  email: string;
  roles: AppRole[] | null;
}

export function useRoles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Buscar roles do usuário atual
  const { data: currentUserRoles, isLoading: isLoadingCurrentRoles } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!user,
  });

  // Verificar se usuário tem role específico
  const hasRole = (role: AppRole) => {
    return currentUserRoles?.some((r) => r.role === role) ?? false;
  };

  // Verificar se é admin
  const isAdmin = hasRole("admin");
  const isManager = hasRole("manager");
  const isSales = hasRole("sales");
  const isWarehouse = hasRole("warehouse");
  const isSupport = hasRole("support");
  const isLider = hasRole("lider");
  const isBackoffice = hasRole("backoffice");

  // Listar todos os usuários com roles (apenas para admins)
  const { data: allUsers, isLoading: isLoadingAllUsers } = useQuery({
    queryKey: ["all-users-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_users_with_roles");

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
      
      return data as UserWithRoles[];
    },
    enabled: isAdmin,
  });

  // Adicionar role a um usuário
  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({
        title: "Role adicionado",
        description: "Permissão adicionada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar role",
        description: error.message,
      });
    },
  });

  // Remover role de um usuário
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast({
        title: "Role removido",
        description: "Permissão removida com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover role",
        description: error.message,
      });
    },
  });

  return {
    // Current user roles
    currentUserRoles,
    isLoadingCurrentRoles,
    hasRole,
    isAdmin,
    isManager,
    isSales,
    isWarehouse,
    isSupport,
    isLider,
    isBackoffice,
    
    // All users (admin only)
    allUsers,
    isLoadingAllUsers,
    
    // Mutations
    addRole,
    removeRole,
  };
}
