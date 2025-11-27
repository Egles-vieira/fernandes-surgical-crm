import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContatoCliente {
  id: string;
  primeiro_nome: string;
  sobrenome: string;
  nome_completo: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
}

export function useContatosCliente(clienteId: string | null | undefined) {
  const { data: contatos, isLoading, refetch } = useQuery({
    queryKey: ["contatos-cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];

      const { data, error } = await supabase
        .from("contatos")
        .select("id, primeiro_nome, sobrenome, cargo, email, telefone, celular")
        .eq("cliente_id", clienteId)
        .eq("esta_ativo", true)
        .order("primeiro_nome");

      if (error) throw error;

      return (data || []).map((contato) => ({
        ...contato,
        nome_completo: `${contato.primeiro_nome} ${contato.sobrenome}`.trim(),
      })) as ContatoCliente[];
    },
    enabled: !!clienteId,
  });

  return {
    contatos: contatos || [],
    isLoading,
    refetch,
  };
}
