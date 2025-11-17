import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import aiAssistantRobot from "@/assets/ai-assistant-robot.png";

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
            className="fixed bottom-6 h-16 w-16 rounded-full shadow-lg hover:shadow-2xl transition-all hover:scale-110 z-50 bg-gradient-to-br from-primary via-primary to-primary/80 animate-pulse hover:animate-none group"
            style={{
              right: '1.5rem'
            }}
            size="icon"
            aria-label="Abrir Assistente Inteligente"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent rounded-full blur-xl group-hover:blur-2xl transition-all" />
            <img 
              src={aiAssistantRobot} 
              alt="AI Assistant" 
              className="h-14 w-14 relative z-10 group-hover:scale-110 transition-transform object-cover"
            />
            {unreadCount && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground text-xs flex items-center justify-center font-bold shadow-lg animate-bounce">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary/20">
          <p className="font-medium">Assistente Inteligente</p>
          <p className="text-xs opacity-90">Clique para começar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
