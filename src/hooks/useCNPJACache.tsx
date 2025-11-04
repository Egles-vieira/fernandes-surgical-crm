import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CacheEntry {
  cnpj: string;
  dados: any;
  timestamp: string;
  tipo: string;
}

export function useCNPJACache(cnpj?: string) {
  // Buscar últimas consultas do cliente específico ou todas
  const { data: cacheEntries, isLoading } = useQuery({
    queryKey: ["cnpja-cache", cnpj],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("cliente_api_logs")
        .select("*")
        .eq("sucesso", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cnpj) {
        query = query.eq("cnpj", cnpj.replace(/\D/g, ''));
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });

  // Verificar se existe cache válido para um CNPJ específico
  const verificarCache = (cnpjConsulta: string, tipoConsulta: string, diasValidade: number = 30) => {
    if (!cacheEntries) return null;

    const cnpjLimpo = cnpjConsulta.replace(/\D/g, '');
    
    const entrada = cacheEntries.find(
      (e: any) => e.cnpj === cnpjLimpo && e.tipo_consulta === tipoConsulta
    );

    if (!entrada) return null;

    // Verificar validade do cache
    const dataConsulta = new Date(entrada.created_at);
    const dataExpiracao = new Date(dataConsulta.getTime() + diasValidade * 24 * 60 * 60 * 1000);
    const agora = new Date();

    if (agora > dataExpiracao) {
      return null; // Cache expirado
    }

    return {
      dados: entrada.dados_resposta,
      timestamp: entrada.created_at,
      diasRestantes: Math.ceil((dataExpiracao.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000)),
    };
  };

  // Estatísticas do cache
  const estatisticas = {
    totalEntradas: cacheEntries?.length || 0,
    tiposConsulta: [...new Set(cacheEntries?.map((e: any) => e.tipo_consulta) || [])],
    cnpjsUnicos: [...new Set(cacheEntries?.map((e: any) => e.cnpj) || [])].length,
  };

  return {
    cacheEntries,
    isLoading,
    verificarCache,
    estatisticas,
  };
}
