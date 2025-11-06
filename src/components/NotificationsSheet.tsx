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
import { useState } from "react";

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  unread: boolean;
}

// Dados de exemplo
const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Pedido 624990402.4 Confirmado",
    description: "Irmandade Da Santa Casa Da Misericordia De São Bernardo Do Campo confirmou um pedido.",
    timestamp: "6 de novembro às 09:16",
    unread: true,
  },
  {
    id: "2",
    title: "Pedido 625752059.1 Confirmado",
    description: "Instituto de Saude e Gestao Hospitalar - ISGH confirmou um pedido.",
    timestamp: "6 de novembro às 09:11",
    unread: true,
  },
  {
    id: "3",
    title: "Pedido 515143657.3 Confirmado",
    description: "Maternidade Humberto Coutinho confirmou um pedido.",
    timestamp: "6 de novembro às 09:10",
    unread: false,
  },
  {
    id: "4",
    title: "Pedido via acordo comercial",
    description: "O UNIMED NACIONAL COOP CENTRAL - Espaço Saúde SP realizou um pedido a partir do acordo 200133 - CIRURGICA FERNANDES",
    timestamp: "6 de novembro às 09:10",
    unread: false,
  },
  {
    id: "5",
    title: "Pedido 626374512.1 Confirmado",
    description: "ATHENA Saúde - Hospital Bom Samaritano de Maringá S/A confirmou um pedido.",
    timestamp: "6 de novembro às 09:09",
    unread: false,
  },
  {
    id: "6",
    title: "A cotação foi reaberta com novo vencimento para 06/11/2025 10:09",
    description: "Instituto de Medicina Vascular e Intervencionista - IMEVI abriu novamente a cotação.",
    timestamp: "6 de novembro às 09:08",
    unread: false,
  },
];

export function NotificationsSheet() {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => n.unread)
    : notifications;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.some((n) => n.unread) && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
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
          <div className="divide-y">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-6 py-4 flex gap-3 hover:bg-muted/50 transition-colors ${
                  notification.unread ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex-shrink-0 pt-1">
                  <div className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {notification.unread && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium mb-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {notification.description}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {notification.timestamp}
                  </span>
                </div>

                <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
