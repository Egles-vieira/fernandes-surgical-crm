import { Bell, MoreVertical } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo } from "react";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationsSheet() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { 
    notificacoes, 
    isLoading, 
    naoLidas, 
    marcarComoLida, 
    marcarTodasComoLidas 
  } = useNotificacoes();

  const filteredNotifications = useMemo(() => {
    if (showUnreadOnly) {
      return notificacoes.filter((n) => !n.lida);
    }
    return notificacoes;
  }, [notificacoes, showUnreadOnly]);

  const handleMarkAllAsRead = () => {
    marcarTodasComoLidas.mutate();
  };

  const handleNotificationClick = (notificacaoId: string, lida: boolean) => {
    if (!lida) {
      marcarComoLida.mutate(notificacaoId);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Notificações</SheetTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Apenas não lido</span>
              <Switch
                checked={showUnreadOnly}
                onCheckedChange={setShowUnreadOnly}
              />
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Mais recentes</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              onClick={handleMarkAllAsRead}
            >
              Marcar tudo como lido
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Carregando notificações...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {showUnreadOnly ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.lida)}
                  className={`px-6 py-4 flex gap-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.lida ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex-shrink-0 pt-1">
                    <div className="relative">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      {!notification.lida && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm mb-1 ${!notification.lida ? 'font-semibold' : 'font-medium'}`}>
                      {notification.titulo}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {notification.descricao}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(notification.criada_em)}
                    </span>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="flex-shrink-0 h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Aqui pode adicionar menu de opções no futuro
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
