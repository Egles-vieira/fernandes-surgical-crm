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
      <div className="flex flex-col min-h-[500px]">
        <div className={`h-1 rounded-t-lg ${color}`} />
        <Card className="flex-1 rounded-t-none border-t-0 p-4 bg-background/95 backdrop-blur">
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wide text-foreground">{title}</h3>
              <Badge variant="secondary" className="rounded-full">{count}</Badge>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalValue)}
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
}
