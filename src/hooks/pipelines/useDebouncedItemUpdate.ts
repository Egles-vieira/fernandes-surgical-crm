import { useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

interface PendingUpdate {
  quantidade?: number;
  percentual_desconto?: number;
  preco_unitario?: number;
}

interface ItemUpdateData {
  id: string;
  quantidade?: number;
  percentual_desconto?: number;
  preco_unitario?: number;
  updated_at?: string;
}

interface BatchResult {
  success: boolean;
  atualizados: number;
  conflitos: Array<{
    id: string;
    reason: string;
    server_updated_at: string;
  }>;
}

// Hook para batch update via RPC
function useAtualizarItensBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      oportunidadeId,
      itens,
    }: {
      oportunidadeId: string;
      itens: ItemUpdateData[];
    }) => {
      const { data, error } = await supabase.rpc("atualizar_itens_oportunidade_batch", {
        p_oportunidade_id: oportunidadeId,
        p_itens: itens as unknown as Json,
      });

      if (error) throw error;
      return data as unknown as BatchResult;
    },
    onSuccess: (result, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["itens-oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidade", variables.oportunidadeId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      queryClient.invalidateQueries({ queryKey: ["kanban-oportunidades"] });

      // Notificar sobre conflitos se houver
      if (result?.conflitos && result.conflitos.length > 0) {
        toast.warning(`${result.conflitos.length} item(ns) foram modificados por outro usuário. Recarregue para ver as alterações.`);
      }
    },
    onError: (error: Error) => {
      console.error("Erro ao atualizar itens em batch:", error);
      toast.error("Erro ao salvar alterações: " + error.message);
    },
  });
}

export function useDebouncedItemUpdate(oportunidadeId: string | null) {
  const batchMutation = useAtualizarItensBatch();
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  const itemTimestamps = useRef<Map<string, string>>(new Map());
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Cleanup no unmount - evita memory leaks
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      
      // Cancelar timeout pendente
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
        batchTimeout.current = null;
      }
      
      // Flush final antes de desmontar (fire-and-forget)
      if (pendingUpdates.current.size > 0 && oportunidadeId) {
        const itens: ItemUpdateData[] = [];
        pendingUpdates.current.forEach((dados, id) => {
          itens.push({
            id,
            quantidade: dados.quantidade,
            percentual_desconto: dados.percentual_desconto,
            preco_unitario: dados.preco_unitario,
            updated_at: itemTimestamps.current.get(id),
          });
        });

        // Fire-and-forget - não aguarda resposta
        void (async () => {
          try {
            await supabase.rpc("atualizar_itens_oportunidade_batch", {
              p_oportunidade_id: oportunidadeId,
              p_itens: itens as unknown as Json,
            });
          } catch (e) {
            console.error("Erro no flush final:", e);
          }
        })();
      }
      
      pendingUpdates.current.clear();
      itemTimestamps.current.clear();
    };
  }, [oportunidadeId]);

  const debouncedUpdate = useCallback(
    (
      itemId: string,
      campo: "quantidade" | "percentual_desconto",
      valor: number,
      _precoUnitario: number,
      _currentQuantidade: number,
      _currentDesconto: number,
      itemUpdatedAt?: string
    ) => {
      if (!oportunidadeId || !isMounted.current) return;

      // Acumular update para este item
      const currentPending = pendingUpdates.current.get(itemId) || {};
      currentPending[campo] = valor;
      pendingUpdates.current.set(itemId, currentPending);

      // Guardar timestamp para optimistic locking
      if (itemUpdatedAt) {
        itemTimestamps.current.set(itemId, itemUpdatedAt);
      }

      // Cancelar timeout anterior e criar novo (batching)
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }

      // Disparar batch após 500ms de inatividade
      batchTimeout.current = setTimeout(() => {
        if (!isMounted.current || pendingUpdates.current.size === 0) return;

        const itens: ItemUpdateData[] = [];
        pendingUpdates.current.forEach((dados, id) => {
          itens.push({
            id,
            quantidade: dados.quantidade,
            percentual_desconto: dados.percentual_desconto,
            preco_unitario: dados.preco_unitario,
            updated_at: itemTimestamps.current.get(id),
          });
        });

        // Limpar antes de enviar
        pendingUpdates.current.clear();
        itemTimestamps.current.clear();
        batchTimeout.current = null;

        // Enviar batch
        batchMutation.mutate({
          oportunidadeId,
          itens,
        });
      }, 500);
    },
    [oportunidadeId, batchMutation]
  );

  const flushUpdates = useCallback(() => {
    if (!oportunidadeId || pendingUpdates.current.size === 0) return;

    // Cancelar timeout pendente
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
      batchTimeout.current = null;
    }

    const itens: ItemUpdateData[] = [];
    pendingUpdates.current.forEach((dados, id) => {
      itens.push({
        id,
        quantidade: dados.quantidade,
        percentual_desconto: dados.percentual_desconto,
        preco_unitario: dados.preco_unitario,
        updated_at: itemTimestamps.current.get(id),
      });
    });

    // Limpar
    pendingUpdates.current.clear();
    itemTimestamps.current.clear();

    // Enviar imediatamente
    batchMutation.mutate({
      oportunidadeId,
      itens,
    });
  }, [oportunidadeId, batchMutation]);

  return { 
    debouncedUpdate, 
    flushUpdates, 
    isPending: batchMutation.isPending 
  };
}
