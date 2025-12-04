import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface GEDVisualizacao {
  id: string;
  documento_id: string;
  usuario_id: string;
  acao: 'visualizou' | 'baixou' | 'imprimiu';
  tempo_visualizacao_segundos: number;
  dispositivo: string | null;
  navegador: string | null;
  ip_origem: string | null;
  criado_em: string;
  usuario?: {
    id: string;
    primeiro_nome: string;
    sobrenome: string;
  };
}

export function useGEDVisualizacoes(documentoId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: visualizacoes, isLoading, error } = useQuery({
    queryKey: ['ged-visualizacoes', documentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ged_visualizacoes')
        .select('*')
        .eq('documento_id', documentoId!)
        .order('criado_em', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as GEDVisualizacao[];
    },
    enabled: !!user && !!documentoId,
  });

  const registrarVisualizacao = useMutation({
    mutationFn: async ({ documentoId, acao, tempoSegundos = 0 }: { 
      documentoId: string; 
      acao: 'visualizou' | 'baixou' | 'imprimiu';
      tempoSegundos?: number;
    }) => {
      const { data, error } = await supabase
        .from('ged_visualizacoes')
        .insert({
          documento_id: documentoId,
          usuario_id: user!.id,
          acao,
          tempo_visualizacao_segundos: tempoSegundos,
          dispositivo: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          navegador: getBrowserName()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-visualizacoes', documentoId] });
    }
  });

  return {
    visualizacoes: visualizacoes || [],
    isLoading,
    error,
    registrarVisualizacao
  };
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Outro';
}
