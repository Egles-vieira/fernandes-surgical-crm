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
import { Search, Package, Settings2, Calculator, Loader2 } from "lucide-react";
import { useDatasulCalculaOportunidade } from "@/hooks/pipelines/useDatasulCalculaOportunidade";
import { DatasulErrorDialog } from "@/components/vendas/DatasulErrorDialog";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemOportunidade } from "@/hooks/pipelines/useItensOportunidade";
import { SortableItemOportunidadeRow } from "./SortableItemOportunidadeRow";
import { useDebouncedItemUpdate } from "@/hooks/pipelines/useDebouncedItemUpdate";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Labels das colunas para o popover de configuração
const COLUMN_LABELS: Record<string, string> = {
  precoTabela: "Preço Tabela",
  quantidade: "Quantidade",
  desconto: "Desc %",
  precoUnit: "Preço Unit",
  total: "Total",
};

// Colunas padrão visíveis
const DEFAULT_COLUMNS = {
  precoTabela: true,
  quantidade: true,
  desconto: true,
  precoUnit: true,
  total: true,
};

interface ItensOportunidadeGridProps {
  itens: ItemOportunidade[];
  oportunidadeId: string;
  clienteCodEmitente?: number | null;
  tipoPedidoId?: string | null;
  condicaoPagamentoId?: string | null;
  onEdit: (item: ItemOportunidade) => void;
  onRemove: (itemId: string) => void;
  onAddItems: () => void;
}

interface LocalItemState {
  quantidade: number;
  desconto: number;
}

export type DensityType = "compact" | "normal" | "comfortable";

export function ItensOportunidadeGrid({
  itens,
  oportunidadeId,
  clienteCodEmitente,
  tipoPedidoId,
  condicaoPagamentoId,
  onEdit,
  onRemove,
  onAddItems,
}: ItensOportunidadeGridProps) {
  // === TODOS OS HOOKS NO TOPO, SEM CONDICIONAL ===
  
  // Hook para calcular no Datasul
  const { 
    calcularOportunidade, 
    isCalculating, 
    errorData, 
    showErrorDialog, 
    closeErrorDialog 
  } = useDatasulCalculaOportunidade();
  
  // Estado local para ordem dos itens (drag-and-drop)
  const [orderedItems, setOrderedItems] = useState<ItemOportunidade[]>([]);

  // Estado local para valores editáveis (quantidade e desconto)
  const [localState, setLocalState] = useState<Record<string, LocalItemState>>({});

  // Estados para controles do grid
  const [searchTerm, setSearchTerm] = useState("");
  const [density, setDensity] = useState<DensityType>("normal");

  // Hook de visibilidade de colunas com persistência
  const { visibleColumns, toggleColumn } = useColumnVisibility(
    "oportunidade_itens_columns",
    DEFAULT_COLUMNS
  );

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

    // Sincronizar estado local, mas PRESERVAR valores que já existem
    // Isso evita sobrescrever valores que o usuário acabou de digitar
    setLocalState((prevState) => {
      const newState: Record<string, LocalItemState> = {};
      
      itens.forEach((item) => {
        const existing = prevState[item.id];
        
        // Se já existe um estado local, manter os valores locais
        if (existing) {
          newState[item.id] = existing;
        } else {
          // Novo item - inicializar com valores do banco
          newState[item.id] = {
            quantidade: item.quantidade,
            desconto: item.percentual_desconto || 0,
          };
        }
      });
      
      return newState;
    });
  }, [itens]);

  // Filtrar itens pela busca
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return orderedItems;
    const term = searchTerm.toLowerCase();
    return orderedItems.filter(item => 
      item.nome_produto?.toLowerCase().includes(term)
    );
  }, [orderedItems, searchTerm]);

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
          currentDesconto,
          item.atualizado_em ?? undefined
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
          valor,
          item.atualizado_em ?? undefined
        );
      }
    },
    [orderedItems, localState, debouncedUpdate]
  );

  // Calcular totais baseado no estado local (usando filteredItems para consistência visual)
  const totais = useMemo(() => {
    return filteredItems.reduce(
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
  }, [filteredItems, localState]);

  // === RENDER ===
  
  return (
    <div className="space-y-4">
      {/* Barra de controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          {/* Campo de busca */}
          <div className="relative max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Seletor de densidade */}
          <Select value={density} onValueChange={(v) => setDensity(v as DensityType)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compacta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="comfortable">Confortável</SelectItem>
            </SelectContent>
          </Select>

          {/* Popover de colunas */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Settings2 className="h-4 w-4 mr-2" />
                Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="start">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Colunas visíveis</p>
                {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${key}`}
                      checked={visibleColumns[key] ?? true}
                      onCheckedChange={() => toggleColumn(key)}
                    />
                    <label
                      htmlFor={`col-${key}`}
                      className="text-sm cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Botões de ação */}
        <div className="flex items-center gap-2">
          {/* Botão Calcular Datasul */}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => calcularOportunidade(oportunidadeId)}
            disabled={isCalculating || !clienteCodEmitente || !tipoPedidoId || !condicaoPagamentoId || itens.length === 0}
            className="h-9"
            title={
              !clienteCodEmitente ? "Cliente sem código emitente" :
              !tipoPedidoId ? "Selecione o tipo de pedido" :
              !condicaoPagamentoId ? "Selecione a condição de pagamento" :
              itens.length === 0 ? "Adicione itens primeiro" :
              "Calcular no Datasul"
            }
          >
            {isCalculating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            {isCalculating ? "Calculando..." : "Calcular Datasul"}
          </Button>

          {/* Botão adicionar */}
          <Button size="sm" onClick={onAddItems} className="h-9">
            <Package className="h-4 w-4 mr-2" />
            Adicionar Produtos
          </Button>
        </div>
      </div>

      {/* Container com scroll e altura fixa */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-md">
          <Package className="h-12 w-12 mb-4 opacity-50" />
          <p>{searchTerm ? "Nenhum item encontrado" : "Nenhum item adicionado"}</p>
          {!searchTerm && (
            <Button variant="link" className="mt-2" onClick={onAddItems}>
              Adicionar itens
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-md overflow-auto h-[400px] relative">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background border-b shadow-sm">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Produto</TableHead>
                  {visibleColumns.precoTabela && (
                    <TableHead className="w-28 text-right">Preço Tab.</TableHead>
                  )}
                  {visibleColumns.quantidade && (
                    <TableHead className="w-24">Qtd</TableHead>
                  )}
                  {visibleColumns.desconto && (
                    <TableHead className="w-24">Desc %</TableHead>
                  )}
                  {visibleColumns.precoUnit && (
                    <TableHead className="w-28 text-right">Preço Un.</TableHead>
                  )}
                  {visibleColumns.total && (
                    <TableHead className="w-28 text-right">Total</TableHead>
                  )}
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={filteredItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredItems.map((item, index) => {
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
                        density={density}
                        visibleColumns={visibleColumns}
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
        </div>
      )}

      {/* Totalizadores */}
      {filteredItems.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Total ({totais.quantidade} {totais.quantidade === 1 ? "item" : "itens"})
            </p>
            <p className="text-lg font-bold">{formatCurrency(totais.valor)}</p>
          </div>
        </div>
      )}

      {/* Dialog de erro Datasul */}
      <DatasulErrorDialog
        open={showErrorDialog}
        onOpenChange={closeErrorDialog}
        error={errorData}
      />
    </div>
  );
}
