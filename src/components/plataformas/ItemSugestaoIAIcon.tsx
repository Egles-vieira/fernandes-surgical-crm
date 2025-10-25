import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ItemSugestaoIAIconProps {
  scoreConfianca?: number;
  totalSugestoes: number;
  onClick: () => void;
  className?: string;
}

/**
 * Ícone animado que indica sugestões da IA para um item de cotação
 * 
 * Cores por nível de confiança:
 * - Verde (>=90): Alta confiança
 * - Amarelo (70-89): Média confiança  
 * - Cinza (<70): Baixa confiança
 * 
 * Animação pulsante para scores >= 70%
 */
export const ItemSugestaoIAIcon = ({
  scoreConfianca = 0,
  totalSugestoes,
  onClick,
  className
}: ItemSugestaoIAIconProps) => {
  
  // Determinar cor baseada no score
  const getColorClass = () => {
    if (scoreConfianca >= 90) return "text-success";
    if (scoreConfianca >= 70) return "text-warning";
    return "text-muted-foreground";
  };

  const getBadgeVariant = () => {
    if (scoreConfianca >= 90) return "default";
    if (scoreConfianca >= 70) return "secondary";
    return "outline";
  };

  // Animar apenas se score >= 70%
  const shouldAnimate = scoreConfianca >= 70;

  return (
    <div 
      className={cn(
        "relative cursor-pointer group flex items-center justify-center",
        className
      )}
      onClick={onClick}
      title={`${totalSugestoes} sugestões da IA (${scoreConfianca}% de confiança)`}
    >
      <Sparkles 
        className={cn(
          "h-5 w-5 transition-all duration-300",
          getColorClass(),
          shouldAnimate && "animate-pulse group-hover:scale-110 group-hover:rotate-12"
        )}
      />
      {totalSugestoes > 0 && (
        <Badge 
          variant={getBadgeVariant()}
          className={cn(
            "absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] font-semibold",
            "pointer-events-none select-none",
            shouldAnimate && "animate-pulse"
          )}
        >
          {totalSugestoes}
        </Badge>
      )}
    </div>
  );
};
