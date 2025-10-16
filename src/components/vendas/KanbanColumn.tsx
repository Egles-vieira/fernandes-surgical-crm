import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  totalValue: number;
  color: string;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, count, totalValue, color, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 ${isOver ? "opacity-50" : ""}`}
    >
      <Card className={`p-4 border-2 ${color} min-h-[500px] flex flex-col`}>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{title}</h3>
            <Badge variant="secondary">{count}</Badge>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalValue)}
          </p>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto">
          {children}
        </div>
      </Card>
    </div>
  );
}
