import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePropostaActivityOportunidade(oportunidadeId: string | null) {
  const queryClient = useQueryClient();

  // Buscar token público
  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ["proposta-token-oportunidade", oportunidadeId],
    queryFn: async () => {
      if (!oportunidadeId) return null;
      
      const { data, error } = await supabase
        .from("propostas_publicas_tokens")
        .select("*")
        .eq("oportunidade_id", oportunidadeId)
        .eq("ativo", true)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!oportunidadeId,
  });

  // Buscar analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["proposta-analytics-oportunidade", oportunidadeId],
    queryFn: async () => {
      if (!oportunidadeId) return [];
      
      const { data, error } = await supabase
        .from("propostas_analytics")
        .select("*")
        .eq("oportunidade_id", oportunidadeId)
        .order("started_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!oportunidadeId,
  });

  // Buscar cliques (se houver analytics)
  const analyticsIds = analytics?.map(a => a.id) || [];
  const { data: cliques, isLoading: cliquesLoading } = useQuery({
    queryKey: ["proposta-cliques-oportunidade", analyticsIds],
    queryFn: async () => {
      if (analyticsIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("propostas_analytics_cliques")
        .select("*")
        .in("analytics_id", analyticsIds)
        .order("clicked_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: analyticsIds.length > 0,
  });

  // Buscar seções visualizadas
  const { data: secoes, isLoading: secoesLoading } = useQuery({
    queryKey: ["proposta-secoes-oportunidade", analyticsIds],
    queryFn: async () => {
      if (analyticsIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("propostas_analytics_secoes")
        .select("*")
        .in("analytics_id", analyticsIds)
        .order("first_viewed_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: analyticsIds.length > 0,
  });

  // Buscar respostas
  const { data: respostas, isLoading: respostasLoading } = useQuery({
    queryKey: ["proposta-respostas-oportunidade", oportunidadeId],
    queryFn: async () => {
      if (!oportunidadeId) return [];
      
      const { data, error } = await supabase
        .from("propostas_respostas")
        .select("*")
        .eq("oportunidade_id", oportunidadeId)
        .order("respondido_em", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!oportunidadeId,
  });

  // Gerar URL pública
  const publicUrl = tokenData?.public_token 
    ? `${window.location.origin}/proposal-oportunidade/${tokenData.public_token}`
    : null;

  return {
    data: {
      analytics: analytics || [],
      cliques: cliques || [],
      secoes: secoes || [],
      respostas: respostas || []
    },
    isLoading: tokenLoading || analyticsLoading || cliquesLoading || secoesLoading || respostasLoading,
    publicToken: tokenData?.public_token || null,
    publicUrl,
    tokenData,
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: ["proposta-token-oportunidade", oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["proposta-analytics-oportunidade", oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["proposta-respostas-oportunidade", oportunidadeId] });
    }
  };
}
