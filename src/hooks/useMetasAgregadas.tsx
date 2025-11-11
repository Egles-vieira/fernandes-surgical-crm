import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MetaAgregada {
  equipe_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_vendedores: number;
  total_meta_valor: number;
  total_realizado_valor: number;
  total_meta_unidades: number | null;
  total_realizado_unidades: number | null;
  meta_margem_media: number | null;
  margem_atual_media: number | null;
  meta_conversao_media: number | null;
  conversao_atual_media: number | null;
  percentual_atingimento: number;
  status_geral: string;
}

interface UseMetasAgregadasProps {
  equipeId?: string;
  periodoInicio?: string;
  periodoFim?: string;
}

export function useMetasAgregadas({ equipeId, periodoInicio, periodoFim }: UseMetasAgregadasProps = {}) {
  // Buscar metas agregadas da view
  const { data: metasAgregadas, isLoading } = useQuery({
    queryKey: ["metas-agregadas", equipeId, periodoInicio, periodoFim],
    queryFn: async () => {
      let query = supabase
        .from("vw_soma_metas_vendedores_equipe")
        .select("*")
        .order("periodo_inicio", { ascending: false });

      if (equipeId) {
        query = query.eq("equipe_id", equipeId);
      }

      if (periodoInicio) {
        query = query.gte("periodo_inicio", periodoInicio);
      }

      if (periodoFim) {
        query = query.lte("periodo_fim", periodoFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MetaAgregada[];
    },
    enabled: true,
  });

  // Buscar meta manual da equipe para comparação
  const { data: metaManual } = useQuery({
    queryKey: ["meta-manual-equipe", equipeId, periodoInicio, periodoFim],
    queryFn: async () => {
      if (!equipeId) return null;

      let query = supabase
        .from("metas_equipe")
        .select("*")
        .eq("equipe_id", equipeId)
        .eq("status", "ativa")
        .neq("tipo_meta", "agregada")
        .order("periodo_inicio", { ascending: false })
        .limit(1);

      if (periodoInicio) {
        query = query.gte("periodo_inicio", periodoInicio);
      }

      if (periodoFim) {
        query = query.lte("periodo_fim", periodoFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!equipeId,
  });

  // Calcular divergências entre meta manual e agregada
  const calcularDivergencia = () => {
    if (!metaManual || !metasAgregadas || metasAgregadas.length === 0) {
      return null;
    }

    const metaAgregada = metasAgregadas[0];
    const divergenciaValor = metaManual.valor_objetivo - metaAgregada.total_meta_valor;
    const percentualDivergencia = metaManual.valor_objetivo > 0 
      ? (divergenciaValor / metaManual.valor_objetivo) * 100 
      : 0;

    return {
      tem_divergencia: Math.abs(divergenciaValor) > 0.01, // Tolerância de 1 centavo
      valor_meta_manual: metaManual.valor_objetivo,
      valor_meta_agregada: metaAgregada.total_meta_valor,
      diferenca_valor: divergenciaValor,
      percentual_divergencia: percentualDivergencia,
      alerta: Math.abs(percentualDivergencia) > 10 ? "alta" : Math.abs(percentualDivergencia) > 5 ? "media" : "baixa",
    };
  };

  return {
    metasAgregadas,
    metaManual,
    divergencia: calcularDivergencia(),
    isLoading,
  };
}
