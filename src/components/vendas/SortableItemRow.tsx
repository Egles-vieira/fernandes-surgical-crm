import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  desconto: number;
  valor_total: number;
  datasul_dep_exp?: number | null;
  datasul_custo?: number | null;
  datasul_divisao?: number | null;
  datasul_vl_tot_item?: number | null;
  datasul_vl_merc_liq?: number | null;
  datasul_lote_mulven?: number | null;
  frete_rateado?: number;
}

interface SortableItemRowProps {
  item: ItemCarrinho;
  index: number;
  density: "compact" | "normal" | "comfortable";
  visibleColumns: Record<string, boolean>;
  onUpdate: (produtoId: string, campo: string, valor: any) => void;
  onEdit: (item: ItemCarrinho) => void;
  onRemove: (produtoId: string) => void;
}

export function SortableItemRow({
  item,
  index,
  density,
  visibleColumns,
  onUpdate,
  onEdit,
  onRemove,
}: SortableItemRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, columnName: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentRow = (e.target as HTMLElement).closest("tr");
      const nextRow = currentRow?.nextElementSibling as HTMLElement | null;
      if (nextRow) {
        const nextInput = nextRow.querySelector(`input[data-column="${columnName}"]`) as HTMLInputElement | null;
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    }
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.produto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const paddingClass =
    density === "compact"
      ? "py-1 px-2"
      : density === "comfortable"
      ? "py-4 px-4"
      : "py-2 px-3";

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "relative z-50" : ""}>
      <TableCell className={paddingClass}>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab active:cursor-grabbing h-6 w-6"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell className={paddingClass}>{index + 1}</TableCell>
      <TableCell className={paddingClass}>
        <div>
          <p className="font-medium">{item.produto.referencia_interna}</p>
          <p className="text-sm text-muted-foreground">{item.produto.nome}</p>
        </div>
      </TableCell>
      {visibleColumns.precoTabela && (
        <TableCell className={paddingClass}>
          {formatCurrency(item.produto.preco_venda)}
        </TableCell>
      )}
      {visibleColumns.loteMult && (
        <TableCell className={paddingClass}>{item.datasul_lote_mulven ? formatNumber(item.datasul_lote_mulven) : "-"}</TableCell>
      )}
      <TableCell className={paddingClass}>
        <Input
          type="number"
          value={item.quantidade}
          data-column="quantidade"
          onChange={(e) =>
            onUpdate(item.produto.id, "quantidade", parseFloat(e.target.value) || 0)
          }
          onKeyDown={(e) => handleKeyDown(e, "quantidade")}
          className={`w-20 text-center ${
            density === "compact" ? "h-7 text-xs" : density === "comfortable" ? "h-12" : ""
          }`}
        />
      </TableCell>
      {visibleColumns.desconto && (
        <TableCell className={paddingClass}>
          <Input
            type="number"
            value={item.desconto}
            data-column="desconto"
            onChange={(e) =>
              onUpdate(item.produto.id, "desconto", parseFloat(e.target.value) || 0)
            }
            onKeyDown={(e) => handleKeyDown(e, "desconto")}
            className={`w-20 text-center ${
              density === "compact" ? "h-7 text-xs" : density === "comfortable" ? "h-12" : ""
            }`}
          />
        </TableCell>
      )}
      {visibleColumns.precoUnit && (
        <TableCell className={paddingClass}>
          {formatCurrency(item.produto.preco_venda * (1 - item.desconto / 100))}
        </TableCell>
      )}
      {visibleColumns.total && (
        <TableCell className={`font-medium ${paddingClass}`}>
          {formatCurrency(item.valor_total + (item.frete_rateado || 0))}
        </TableCell>
      )}
      {visibleColumns.freteRateado && (
        <TableCell className={paddingClass}>
          {item.frete_rateado && item.frete_rateado > 0 
            ? formatCurrency(item.frete_rateado) 
            : "-"}
        </TableCell>
      )}
      {visibleColumns.deposito && (
        <TableCell className={paddingClass}>{item.datasul_dep_exp ? formatNumber(item.datasul_dep_exp) : "-"}</TableCell>
      )}
      {visibleColumns.custo && (
        <TableCell className={paddingClass}>
          {item.datasul_custo ? formatCurrency(item.datasul_custo) : "-"}
        </TableCell>
      )}
      {visibleColumns.divisao && (
        <TableCell className={paddingClass}>{item.datasul_divisao ? formatNumber(item.datasul_divisao) : "-"}</TableCell>
      )}
      {visibleColumns.vlTotalDS && (
        <TableCell className={paddingClass}>
          {item.datasul_vl_tot_item ? formatCurrency(item.datasul_vl_tot_item) : "-"}
        </TableCell>
      )}
      {visibleColumns.vlMercLiq && (
        <TableCell className={paddingClass}>
          {item.datasul_vl_merc_liq ? formatCurrency(item.datasul_vl_merc_liq) : "-"}
        </TableCell>
      )}
      <TableCell className={paddingClass}>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={density === "compact" ? "h-7 w-7" : ""}
            onClick={() => onEdit(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={density === "compact" ? "h-7 w-7" : ""}
            onClick={() => onRemove(item.produto.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
