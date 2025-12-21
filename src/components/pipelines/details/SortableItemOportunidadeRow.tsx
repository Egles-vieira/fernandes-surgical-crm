import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemOportunidade } from "@/hooks/pipelines/useItensOportunidade";
import { cn } from "@/lib/utils";
import type { DensityType } from "./ItensOportunidadeGrid";

// Formata preços com 5 casas decimais (sem arredondar)
const formatPreco = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(value);
};

// Formata desconto com 7 casas decimais
const formatDesconto = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 7,
    maximumFractionDigits: 7,
  }).format(value);
};

const formatNumber = (value: number | null | undefined, decimals = 4) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

interface SortableItemOportunidadeRowProps {
  item: ItemOportunidade;
  index: number;
  localQuantidade: number;
  localDesconto: number;
  density: DensityType;
  visibleColumns: Record<string, boolean>;
  onQuantidadeChange: (itemId: string, valor: number) => void;
  onDescontoChange: (itemId: string, valor: number) => void;
  onEdit: (item: ItemOportunidade) => void;
  onRemove: (itemId: string) => void;
}

export function SortableItemOportunidadeRow({
  item,
  index,
  localQuantidade,
  localDesconto,
  density,
  visibleColumns,
  onQuantidadeChange,
  onDescontoChange,
  onEdit,
  onRemove,
}: SortableItemOportunidadeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Classes de padding baseadas na densidade
  const paddingClass = density === "compact" 
    ? "py-1 px-2" 
    : density === "comfortable" 
      ? "py-4 px-3" 
      : "py-2 px-2";

  const inputHeight = density === "compact" ? "h-7" : density === "comfortable" ? "h-9" : "h-8";
  const buttonSize = density === "compact" ? "h-6 w-6" : density === "comfortable" ? "h-8 w-8" : "h-7 w-7";
  const iconSize = density === "compact" ? "h-3 w-3" : "h-4 w-4";
  const textSize = density === "compact" ? "text-xs" : "text-sm";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, columnName: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentRow = (e.target as HTMLElement).closest("tr");
      const tbody = currentRow?.closest("tbody");
      let nextRow = currentRow?.nextElementSibling as HTMLElement | null;

      // Se não houver próxima linha, volta para a primeira
      if (!nextRow && tbody) {
        nextRow = tbody.querySelector("tr") as HTMLElement | null;
      }

      if (nextRow) {
        const nextInput = nextRow.querySelector(
          `input[data-column="${columnName}"]`
        ) as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };

  // Calcular preço unitário com desconto e total
  const precoComDesconto = item.preco_unitario * (1 - localDesconto / 100);
  const valorTotal = localQuantidade * precoComDesconto;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "relative z-50 bg-muted")}
    >
      {/* Grip para arrastar */}
      <TableCell className={cn(paddingClass, "w-8")}>
        <Button
          variant="ghost"
          size="icon"
          className={cn("cursor-grab active:cursor-grabbing", buttonSize)}
          {...attributes}
          {...listeners}
        >
          <GripVertical className={iconSize} />
        </Button>
      </TableCell>

      {/* Índice */}
      <TableCell className={cn(paddingClass, "w-10 text-center text-muted-foreground", textSize)}>
        {index + 1}
      </TableCell>

      {/* Nome do produto */}
      <TableCell className={cn(paddingClass, "font-medium", textSize)}>
        {item.nome_produto || "—"}
      </TableCell>

      {/* Preço Tabela (original) - 5 casas decimais */}
      {visibleColumns.precoTabela && (
        <TableCell className={cn(paddingClass, "text-right w-32 text-muted-foreground", textSize)}>
          {formatPreco(item.preco_unitario)}
        </TableCell>
      )}

      {/* Quantidade */}
      {visibleColumns.quantidade && (
        <TableCell className={cn(paddingClass, "w-24")}>
          <Input
            type="number"
            value={localQuantidade}
            data-column="quantidade"
            onChange={(e) => onQuantidadeChange(item.id, parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => handleKeyDown(e, "quantidade")}
            className={cn("w-20 text-center", inputHeight, textSize)}
            min={0}
          />
        </TableCell>
      )}

      {/* Desconto */}
      {visibleColumns.desconto && (
        <TableCell className={cn(paddingClass, "w-24")}>
          <Input
            type="number"
            value={localDesconto}
            data-column="desconto"
            onChange={(e) => onDescontoChange(item.id, parseFloat(e.target.value) || 0)}
            onKeyDown={(e) => handleKeyDown(e, "desconto")}
            className={cn(
              "w-20 text-center",
              inputHeight,
              textSize,
              localDesconto > 59.9999 && "border-destructive bg-destructive/10 text-destructive"
            )}
            min={0}
            max={100}
          />
        </TableCell>
      )}

      {/* Preço Unitário com desconto - 5 casas decimais */}
      {visibleColumns.precoUnit && (
        <TableCell className={cn(paddingClass, "text-right w-32", textSize)}>
          {formatPreco(precoComDesconto)}
        </TableCell>
      )}

      {/* Total - 5 casas decimais */}
      {visibleColumns.total && (
        <TableCell className={cn(paddingClass, "text-right font-medium w-32", textSize)}>
          {formatPreco(valorTotal)}
        </TableCell>
      )}

      {/* Custo (Datasul) */}
      {visibleColumns.custo && (
        <TableCell className={cn(paddingClass, "text-right w-24 text-muted-foreground", textSize)}>
          {formatNumber(item.datasul_custo)}
        </TableCell>
      )}

      {/* Divisão (Datasul) */}
      {visibleColumns.divisao && (
        <TableCell className={cn(paddingClass, "text-right w-24 text-muted-foreground", textSize)}>
          {formatNumber(item.datasul_divisao)}
        </TableCell>
      )}

      {/* Lote Múltiplo (Datasul) */}
      {visibleColumns.loteMultiplo && (
        <TableCell className={cn(paddingClass, "text-center w-20 text-muted-foreground", textSize)}>
          {item.datasul_lote_mulven ?? "—"}
        </TableCell>
      )}

      {/* Ações */}
      <TableCell className={cn(paddingClass, "w-20")}>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={buttonSize}
            onClick={() => onEdit(item)}
          >
            <Edit className={iconSize} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={buttonSize}
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className={cn(iconSize, "text-destructive")} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
