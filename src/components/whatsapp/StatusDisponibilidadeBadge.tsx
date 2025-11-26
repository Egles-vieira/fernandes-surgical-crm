import { Badge } from "@/components/ui/badge";
import { useDisponibilidadeVendedor } from "@/hooks/useDisponibilidadeVendedor";
import { Circle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function StatusDisponibilidadeBadge() {
  const { config, isLoading, toggleDisponibilidade, isAtualizando } = useDisponibilidadeVendedor();

  if (isLoading) return null;

  const statusColor = config?.esta_disponivel ? "bg-green-500" : "bg-gray-400";
  const statusText = config?.esta_disponivel ? "Disponível" : "Indisponível";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Circle className={`w-2 h-2 ${statusColor} animate-pulse`} fill="currentColor" />
          <span className="text-sm">{statusText}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Status de Atendimento</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={toggleDisponibilidade}
          disabled={isAtualizando}
        >
          <Circle className={`w-3 h-3 mr-2 ${config?.esta_disponivel ? 'bg-gray-400' : 'bg-green-500'}`} fill="currentColor" />
          Trocar para {config?.esta_disponivel ? "Indisponível" : "Disponível"}
        </DropdownMenuItem>
        {config && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Horário: {config.horario_trabalho_inicio.slice(0, 5)} - {config.horario_trabalho_fim.slice(0, 5)}
            </div>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Máx. conversas: {config.max_conversas_simultaneas}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
