import { Circle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWhatsAppStatus, STATUS_CONFIGS, StatusAtendimento } from "@/hooks/useWhatsAppStatus";
import { cn } from "@/lib/utils";

export const StatusAtendimentoSelector = () => {
  const { statusAtual, statusConfig, isChanging, changeStatus } = useWhatsAppStatus();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 gap-2 hover:bg-muted/50"
          disabled={isChanging}
        >
          <Circle className={cn("w-3 h-3", statusConfig.color, statusConfig.bgColor)} />
          <span className="text-sm font-medium">{statusConfig.label}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Status de Atendimento
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(STATUS_CONFIGS).map((config) => (
          <DropdownMenuItem
            key={config.value}
            onClick={() => changeStatus(config.value)}
            disabled={isChanging || statusAtual === config.value}
            className="gap-2 cursor-pointer"
          >
            <Circle
              className={cn(
                "w-3 h-3",
                config.color,
                statusAtual === config.value && config.bgColor
              )}
            />
            <span>{config.label}</span>
            {statusAtual === config.value && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
