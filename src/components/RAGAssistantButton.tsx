import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RAGAssistantButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export const RAGAssistantButton = ({
  onClick,
  unreadCount,
}: RAGAssistantButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50 bg-gradient-to-r from-primary to-primary/80"
            size="icon"
            aria-label="Abrir Assistente Inteligente"
          >
            <Sparkles className="h-6 w-6" />
            {unreadCount && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Assistente Inteligente</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
