import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ItemOportunidade } from "@/hooks/pipelines/useItensOportunidade";
import { SortableItemOportunidadeRow } from "./SortableItemOportunidadeRow";
import { useDebouncedItemUpdate } from "@/hooks/pipelines/useDebouncedItemUpdate";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface ItensOportunidadeGridProps {
  itens: ItemOportunidade[];
  oportunidadeId: string;
  onEdit: (item: ItemOportunidade) => void;
  onRemove: (itemId: string) => void;
}

interface LocalItemState {
  quantidade: number;
  desconto: number;
}

export function ItensOportunidadeGrid({
  itens,
  oportunidadeId,
  onEdit,
  onRemove,
}: ItensOportunidadeGridProps) {
  // === TODOS OS HOOKS NO TOPO, SEM CONDICIONAL ===
  
  // Estado local para ordem dos itens (drag-and-drop)
  const [orderedItems, setOrderedItems] = useState<ItemOportunidade[]>([]);

  // Estado local para valores editáveis (quantidade e desconto)
  const [localState, setLocalState] = useState<Record<string, LocalItemState>>({});

  // Hook de debounce
  const { debouncedUpdate } = useDebouncedItemUpdate(oportunidadeId);

  // Sensors para drag-and-drop - SEPARADOS
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  
  const sensors = useSensors(pointerSensor, keyboardSensor);

  // Sincronizar com prop quando itens mudam
  useEffect(() => {
    setOrderedItems(itens);

    // Inicializar estado local com valores do banco
    const newState: Record<string, LocalItemState> = {};
    itens.forEach((item) => {
      newState[item.id] = {
        quantidade: item.quantidade,
        desconto: item.percentual_desconto || 0,
      };
    });
    setLocalState(newState);
  }, [itens]);

  // Handler de drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Atualizar ordem no banco (batch update)
        const updates = newOrder.map((item, idx) => ({
          id: item.id,
          ordem_linha: idx + 1,
        }));

        // Fire-and-forget update
        Promise.all(
          updates.map((update) =>
            supabase
              .from("itens_linha_oportunidade")
              .update({ ordem_linha: update.ordem_linha })
              .eq("id", update.id)
          )
        ).catch(console.error);

        return newOrder;
      });
    }
  }, []);

  // Handler para mudança de quantidade
  const handleQuantidadeChange = useCallback(
    (itemId: string, valor: number) => {
      setLocalState((prev) => {
        const current = prev[itemId];
        if (!current) return prev;
        
        return {
          ...prev,
          [itemId]: { ...current, quantidade: valor },
        };
      });

      // Encontrar item para pegar preço unitário
      const item = orderedItems.find((i) => i.id === itemId);
      if (item) {
        const currentDesconto = localState[itemId]?.desconto ?? item.percentual_desconto ?? 0;
        debouncedUpdate(
          itemId,
          "quantidade",
          valor,
          item.preco_unitario,
          valor,
          currentDesconto
        );
      }
    },
    [orderedItems, localState, debouncedUpdate]
  );

  // Handler para mudança de desconto
  const handleDescontoChange = useCallback(
    (itemId: string, valor: number) => {
      setLocalState((prev) => {
        const current = prev[itemId];
        if (!current) return prev;
        
        return {
          ...prev,
          [itemId]: { ...current, desconto: valor },
        };
      });

      // Encontrar item para pegar preço unitário
      const item = orderedItems.find((i) => i.id === itemId);
      if (item) {
        const currentQuantidade = localState[itemId]?.quantidade ?? item.quantidade;
        debouncedUpdate(
          itemId,
          "percentual_desconto",
          valor,
          item.preco_unitario,
          currentQuantidade,
          valor
        );
      }
    },
    [orderedItems, localState, debouncedUpdate]
  );

  // Calcular totais baseado no estado local
  const totais = useMemo(() => {
    return orderedItems.reduce(
      (acc, item) => {
        const local = localState[item.id] || {
          quantidade: item.quantidade,
          desconto: item.percentual_desconto || 0,
        };
        const precoComDesconto = item.preco_unitario * (1 - local.desconto / 100);
        const valorItem = local.quantidade * precoComDesconto;

        return {
          quantidade: acc.quantidade + local.quantidade,
          valor: acc.valor + valorItem,
        };
      },
      { quantidade: 0, valor: 0 }
    );
  }, [orderedItems, localState]);

  // === RENDER ===
  
  if (orderedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="w-24">Qtd</TableHead>
              <TableHead className="w-24 text-right">Preço Un.</TableHead>
              <TableHead className="w-24">Desc %</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={orderedItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedItems.map((item, index) => {
                const local = localState[item.id] || {
                  quantidade: item.quantidade,
                  desconto: item.percentual_desconto || 0,
                };

                return (
                  <SortableItemOportunidadeRow
                    key={item.id}
                    item={item}
                    index={index}
                    localQuantidade={local.quantidade}
                    localDesconto={local.desconto}
                    onQuantidadeChange={handleQuantidadeChange}
                    onDescontoChange={handleDescontoChange}
                    onEdit={onEdit}
                    onRemove={onRemove}
                  />
                );
              })}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>

      <div className="flex justify-end pt-2 border-t">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            Total ({totais.quantidade} {totais.quantidade === 1 ? "item" : "itens"})
          </p>
          <p className="text-lg font-bold">{formatCurrency(totais.valor)}</p>
        </div>
      </div>
    </div>
  );
}
