import { useRef, useCallback } from "react";
import { useAtualizarItemOportunidade } from "./useItensOportunidade";

interface PendingUpdate {
  quantidade?: number;
  percentual_desconto?: number;
  preco_unitario?: number;
}

export function useDebouncedItemUpdate(oportunidadeId: string | null) {
  const atualizarMutation = useAtualizarItemOportunidade();
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  const timeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const itemPrecos = useRef<Map<string, { preco: number; qtd: number; desc: number }>>(new Map());

  const debouncedUpdate = useCallback(
    (
      itemId: string,
      campo: "quantidade" | "percentual_desconto",
      valor: number,
      precoUnitario: number,
      currentQuantidade: number,
      currentDesconto: number
    ) => {
      if (!oportunidadeId) return;

      // Clear existing timeout for this item
      const existingTimeout = timeouts.current.get(itemId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Get or create pending update for this item
      const currentPending = pendingUpdates.current.get(itemId) || {};
      currentPending[campo] = valor;

      // Store current values for calculation
      itemPrecos.current.set(itemId, {
        preco: precoUnitario,
        qtd: campo === "quantidade" ? valor : currentQuantidade,
        desc: campo === "percentual_desconto" ? valor : currentDesconto,
      });

      pendingUpdates.current.set(itemId, currentPending);

      // Set new timeout
      const timeout = setTimeout(() => {
        const updateData = pendingUpdates.current.get(itemId);

        if (updateData && oportunidadeId) {
          // preco_total é calculado automaticamente pelo banco
          atualizarMutation.mutate({
            itemId,
            oportunidadeId,
            dados: updateData,
          });
          pendingUpdates.current.delete(itemId);
          itemPrecos.current.delete(itemId);
        }
        timeouts.current.delete(itemId);
      }, 500);

      timeouts.current.set(itemId, timeout);
    },
    [oportunidadeId, atualizarMutation]
  );

  const flushUpdates = useCallback(() => {
    // Clear all timeouts and flush pending updates immediately
    timeouts.current.forEach((timeout, itemId) => {
      clearTimeout(timeout);
      const updateData = pendingUpdates.current.get(itemId);

      if (updateData && oportunidadeId) {
        // preco_total é calculado automaticamente pelo banco
        atualizarMutation.mutate({
          itemId,
          oportunidadeId,
          dados: updateData,
        });
      }
    });
    pendingUpdates.current.clear();
    timeouts.current.clear();
    itemPrecos.current.clear();
  }, [oportunidadeId, atualizarMutation]);

  return { debouncedUpdate, flushUpdates, isPending: atualizarMutation.isPending };
}
