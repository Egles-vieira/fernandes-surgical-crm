import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePropostaActivity(vendaId: string) {
  // Buscar token público
  const { data: tokenData } = useQuery({
    queryKey: ['proposta-token', vendaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propostas_publicas_tokens')
        .select('*')
        .eq('venda_id', vendaId)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!vendaId,
    staleTime: 60000 // 1 minuto
  });

  // Buscar analytics
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['proposta-analytics', vendaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propostas_analytics')
        .select('*')
        .eq('venda_id', vendaId)
        .order('iniciado_em', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!vendaId,
    staleTime: 30000 // 30 segundos
  });

  // Buscar cliques
  const { data: cliques, isLoading: loadingCliques } = useQuery({
    queryKey: ['proposta-cliques', vendaId],
    queryFn: async () => {
      if (!analytics || analytics.length === 0) return [];
      
      const analyticsIds = analytics.map(a => a.id);
      
      const { data, error } = await supabase
        .from('propostas_analytics_cliques')
        .select('*')
        .in('analytics_id', analyticsIds)
        .order('clicado_em', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!analytics && analytics.length > 0,
    staleTime: 30000
  });

  // Buscar seções
  const { data: secoes, isLoading: loadingSecoes } = useQuery({
    queryKey: ['proposta-secoes', vendaId],
    queryFn: async () => {
      if (!analytics || analytics.length === 0) return [];
      
      const analyticsIds = analytics.map(a => a.id);
      
      const { data, error } = await supabase
        .from('propostas_analytics_secoes')
        .select('*')
        .in('analytics_id', analyticsIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!analytics && analytics.length > 0,
    staleTime: 30000
  });

  // Buscar respostas
  const { data: respostas, isLoading: loadingRespostas } = useQuery({
    queryKey: ['proposta-respostas', vendaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propostas_respostas')
        .select('*')
        .eq('venda_id', vendaId)
        .order('respondido_em', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!vendaId,
    staleTime: 30000
  });

  // Gerar URL pública
  const publicUrl = tokenData 
    ? `${window.location.origin}/proposal/${tokenData.public_token}`
    : null;

  return {
    data: {
      analytics,
      cliques,
      secoes,
      respostas
    },
    isLoading: loadingAnalytics || loadingCliques || loadingSecoes || loadingRespostas,
    publicToken: tokenData?.public_token,
    publicUrl,
    tokenData
  };
}
