import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemOportunidade } from "@/hooks/pipelines/useItensOportunidade";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface SortableItemOportunidadeRowProps {
  item: ItemOportunidade;
  index: number;
  localQuantidade: number;
  localDesconto: number;
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
      <TableCell className="py-2 px-2 w-8">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab active:cursor-grabbing h-7 w-7"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell className="py-2 px-2 w-10 text-center text-muted-foreground">
        {index + 1}
      </TableCell>
      <TableCell className="py-2 font-medium">{item.nome_produto || "—"}</TableCell>
      <TableCell className="py-2 w-24">
        <Input
          type="number"
          value={localQuantidade}
          data-column="quantidade"
          onChange={(e) => onQuantidadeChange(item.id, parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => handleKeyDown(e, "quantidade")}
          className="w-20 h-8 text-center text-sm"
          min={0}
        />
      </TableCell>
      <TableCell className="py-2 text-right w-24">
        {formatCurrency(item.preco_unitario)}
      </TableCell>
      <TableCell className="py-2 w-24">
        <Input
          type="number"
          value={localDesconto}
          data-column="desconto"
          onChange={(e) => onDescontoChange(item.id, parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => handleKeyDown(e, "desconto")}
          className={cn(
            "w-20 h-8 text-center text-sm",
            localDesconto > 59.9999 && "border-destructive bg-destructive/10 text-destructive"
          )}
          min={0}
          max={100}
        />
      </TableCell>
      <TableCell className="py-2 text-right font-medium w-28">
        {formatCurrency(valorTotal)}
      </TableCell>
      <TableCell className="py-2 w-20">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
