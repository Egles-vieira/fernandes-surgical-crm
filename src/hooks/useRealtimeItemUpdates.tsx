import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeItemUpdatesProps {
  cotacaoId: string;
  onItemUpdate?: (itemId: string, updates: any) => void;
}

export function useRealtimeItemUpdates({ 
  cotacaoId, 
  onItemUpdate 
}: UseRealtimeItemUpdatesProps) {
  useEffect(() => {
    if (!cotacaoId) return;

    console.log('🔌 Conectando ao canal de updates de itens:', `cotacao-items-${cotacaoId}`);

    const channel = supabase
      .channel(`cotacao-items-${cotacaoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'edi_cotacoes_itens',
          filter: `cotacao_id=eq.${cotacaoId}`,
        },
        (payload) => {
          console.log('📦 Item atualizado:', payload);
          const item = payload.new;
          const itemLabel = item?.numero_item ?? item?.sequencia ?? item?.codigo_produto_cliente ?? item?.id?.toString()?.slice(0, 8) ?? '?';

          // Notifica sobre produtos vinculados
          if (item.produto_id && payload.old?.produto_id !== item.produto_id) {
            toast.success('Produto vinculado', {
              description: `Item ${itemLabel} vinculado com sucesso`,
            });
          }

          // Notifica sobre análise IA concluída no item
          if (item.analisado_por_ia && !payload.old?.analisado_por_ia) {
            const sugestoes = Array.isArray(item.produtos_sugeridos_ia) ? item.produtos_sugeridos_ia.length : 0;
            toast.info(`Item ${itemLabel} analisado`, {
              description: sugestoes > 0 ? `${sugestoes} sugestão(ões) disponível(is)` : 'Nenhuma sugestão gerada',
            });
          }

          // Callback para atualizar estado do componente
          onItemUpdate?.(item.id, item);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status do canal de itens:', status);
      });

    return () => {
      console.log('🔌 Desconectando do canal de itens');
      supabase.removeChannel(channel);
    };
  }, [cotacaoId, onItemUpdate]);
}
