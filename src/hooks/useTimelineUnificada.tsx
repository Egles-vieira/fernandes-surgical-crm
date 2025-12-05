import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ItemTimeline {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  data: string;
  icone: string;
  cor: string;
  status?: string;
  autor?: string;
}

export function useTimelineUnificada(options: { cliente_id?: string; venda_id?: string; limite?: number }) {
  const { cliente_id, venda_id, limite = 50 } = options;

  return useQuery({
    queryKey: ['timeline-unificada', cliente_id, venda_id],
    queryFn: async () => {
      const timeline: ItemTimeline[] = [];

      if (cliente_id || venda_id) {
        let query = supabase
          .from('atividades')
          .select(`id, titulo, descricao, tipo, status, criado_em, data_conclusao`)
          .is('excluido_em', null)
          .order('criado_em', { ascending: false })
          .limit(limite);

        if (cliente_id) query = query.eq('cliente_id', cliente_id);
        if (venda_id) query = query.eq('venda_id', venda_id);

        const { data: atividades } = await query;
        atividades?.forEach(a => {
          timeline.push({
            id: a.id,
            tipo: 'atividade',
            titulo: a.titulo,
            descricao: a.descricao,
            data: a.data_conclusao || a.criado_em,
            icone: 'CheckSquare',
            cor: '#6B7280',
            status: a.status
          });
        });
      }

      timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      return timeline.slice(0, limite);
    },
    enabled: !!(cliente_id || venda_id)
  });
}
