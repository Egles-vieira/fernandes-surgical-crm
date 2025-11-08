import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UsuarioSubordinado {
  subordinado_id: string;
  nivel_distancia: number;
}

export interface ClienteAcessivel {
  cliente_id: string;
}

export interface VendaAcessivel {
  venda_id: string;
}

export interface EquipeGerenciada {
  equipe_id: string;
}

export function useHierarquia() {
  const { user } = useAuth();

  // Buscar subordinados do usuário atual
  const { 
    data: subordinados, 
    isLoading: isLoadingSubordinados,
    refetch: refetchSubordinados 
  } = useQuery({
    queryKey: ["subordinados", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc("get_usuarios_subordinados", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Buscar clientes acessíveis
  const { 
    data: clientesAcessiveis, 
    isLoading: isLoadingClientes,
    refetch: refetchClientes 
  } = useQuery({
    queryKey: ["clientes-acessiveis", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc("get_clientes_acessiveis", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Buscar vendas acessíveis
  const { 
    data: vendasAcessiveis, 
    isLoading: isLoadingVendas,
    refetch: refetchVendas 
  } = useQuery({
    queryKey: ["vendas-acessiveis", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc("get_vendas_acessiveis", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Buscar equipes gerenciadas
  const { 
    data: equipesGerenciadas, 
    isLoading: isLoadingEquipes,
    refetch: refetchEquipes 
  } = useQuery({
    queryKey: ["equipes-gerenciadas", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc("get_equipes_gerenciadas", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Buscar nível hierárquico do usuário
  const { data: nivelHierarquico, isLoading: isLoadingNivel } = useQuery({
    queryKey: ["nivel-hierarquico", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { data, error } = await supabase.rpc("get_nivel_hierarquico", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!user?.id,
  });

  // Verificar se pode acessar cliente específico
  const podeAcessarCliente = async (clienteId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc("pode_acessar_cliente", {
        _user_id: user.id,
        _cliente_id: clienteId,
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error("Erro ao verificar acesso ao cliente:", error);
      return false;
    }
  };

  // Verificar se pode acessar venda específica
  const podeAcessarVenda = async (vendaId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc("pode_acessar_venda", {
        _user_id: user.id,
        _venda_id: vendaId,
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error("Erro ao verificar acesso à venda:", error);
      return false;
    }
  };

  // Flags de controle
  const temSubordinados = (subordinados?.length || 0) > 0;
  const ehGestor = temSubordinados || (equipesGerenciadas?.length || 0) > 0;
  const isLoading = isLoadingSubordinados || isLoadingClientes || isLoadingVendas || isLoadingEquipes || isLoadingNivel;

  // Controle de menu técnico (Admin ou Manager com subordinados)
  const podeVerMenuTecnico = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Verifica se é Admin
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (isAdmin) return true;

      // Verifica se é Manager com subordinados
      const { data: isManager } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "manager",
      });

      return isManager && temSubordinados;
    } catch (error) {
      console.error("Erro ao verificar acesso ao menu técnico:", error);
      return false;
    }
  };

  return {
    // Dados
    subordinados,
    clientesAcessiveis,
    vendasAcessiveis,
    equipesGerenciadas,
    nivelHierarquico,

    // Estados de carregamento
    isLoadingSubordinados,
    isLoadingClientes,
    isLoadingVendas,
    isLoadingEquipes,
    isLoadingNivel,
    isLoading,

    // Funções de verificação
    podeAcessarCliente,
    podeAcessarVenda,
    podeVerMenuTecnico,

    // Flags
    temSubordinados,
    ehGestor,

    // Funções de atualização
    refetchSubordinados,
    refetchClientes,
    refetchVendas,
    refetchEquipes,
  };
}
