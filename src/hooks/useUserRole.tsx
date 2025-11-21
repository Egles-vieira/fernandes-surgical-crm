import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  return useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { roles: [], isAdmin: false };

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao buscar roles:", error);
        return { roles: [], isAdmin: false };
      }

      const userRoles = roles?.map(r => r.role) || [];
      const isAdmin = userRoles.includes("admin");

      return { roles: userRoles, isAdmin };
    },
  });
}
