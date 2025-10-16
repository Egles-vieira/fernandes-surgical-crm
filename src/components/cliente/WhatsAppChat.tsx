import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Check,
  CheckCheck
} from "lucide-react";

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sent: boolean;
  read: boolean;
}

interface WhatsAppChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactInitials: string;
  phoneNumber?: string;
}

export default function WhatsAppChat({
  open,
  onOpenChange,
  contactName,
  contactInitials,
  phoneNumber
}: WhatsAppChatProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Olá! Como posso ajudar?",
      timestamp: new Date(Date.now() - 3600000),
      sent: false,
      read: true
    },
    {
      id: "2",
      text: "Oi! Gostaria de saber mais sobre os produtos.",
      timestamp: new Date(Date.now() - 3500000),
      sent: true,
      read: true
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      timestamp: new Date(),
      sent: true,
      read: false
    };

    setMessages([...messages, newMessage]);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] lg:w-[700px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="gradient-primary p-4 space-y-0 shadow-elegant">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary-foreground text-primary">
                  {contactInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-primary-foreground text-base font-medium truncate">
                  {contactName}
                </SheetTitle>
                {phoneNumber && (
                  <p className="text-xs text-primary-foreground/80 truncate">
                    {phoneNumber}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 gradient-subtle">
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 transition-all ${
                    msg.sent
                      ? "gradient-primary text-primary-foreground shadow-elegant"
                      : "bg-card border-border shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-xs ${msg.sent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(msg.timestamp)}
                    </span>
                    {msg.sent && (
                      <span className="text-primary-foreground/70">
                        {msg.read ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4 shadow-elegant">
          <div className="flex items-end gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 hover:bg-muted"
            >
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 hover:bg-muted"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div className="flex-1">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite uma mensagem"
                className="resize-none min-h-[40px]"
              />
            </div>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="h-10 w-10 shrink-0 gradient-primary shadow-elegant hover:opacity-90 transition-opacity"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
