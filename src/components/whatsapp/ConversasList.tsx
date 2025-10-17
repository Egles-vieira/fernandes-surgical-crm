import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Circle, MessageSquarePlus, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import NovaConversaDialog from "./NovaConversaDialog";
import ClienteConsultaDialog from "./ClienteConsultaDialog";

interface ConversasListProps {
  contaId: string;
  conversaSelecionada: string | null;
  onSelectConversa: (id: string) => void;
}

const ConversasList = ({ contaId, conversaSelecionada, onSelectConversa }: ConversasListProps) => {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [dialogNovaConversa, setDialogNovaConversa] = useState(false);
  const [dialogConsultaCliente, setDialogConsultaCliente] = useState(false);

  const { data: conversas, isLoading } = useQuery({
    queryKey: ['whatsapp-conversas', contaId, filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversas')
        .select(`
          *,
          whatsapp_contatos (
            numero_whatsapp,
            nome_whatsapp,
            foto_perfil_url,
            contato_id,
            contatos (
              nome_completo,
              primeiro_nome,
              cargo,
              cliente_id,
              clientes (
                nome_abrev
              )
            )
          )
        `)
        .eq('whatsapp_conta_id', contaId)
        .order('ultima_mensagem_em', { ascending: false });

      if (filtroStatus !== 'todas') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const conversasFiltradas = conversas?.filter(conversa => {
    if (!busca) return true;
    const nomeContato = conversa.whatsapp_contatos?.contatos?.nome_completo || 
                        conversa.whatsapp_contatos?.nome_whatsapp || '';
    return nomeContato.toLowerCase().includes(busca.toLowerCase());
  });

  const getStatusColor = (status: string) => {
    const colors = {
      aberta: "bg-green-500",
      aguardando: "bg-yellow-500",
      resolvida: "bg-blue-500",
      fechada: "bg-gray-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  const getPrioridadeColor = (prioridade: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      urgente: "destructive",
      alta: "destructive",
      normal: "secondary",
      baixa: "outline",
    };
    return colors[prioridade] || "secondary";
  };

  return (
    <>
      <Card className="h-full flex flex-col bg-card/50 backdrop-blur border-muted">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-br from-muted/30 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 text-green-500 fill-green-500" />
              <span className="text-sm font-medium">Online</span>
            </div>
            <Badge variant="outline" className="font-mono">
              {conversasFiltradas?.length || 0}
            </Badge>
          </div>

          <div className="flex gap-2 mb-4">
            <Button 
              onClick={() => setDialogConsultaCliente(true)}
              className="flex-1"
              variant="outline"
            >
              <Users className="w-4 h-4 mr-2" />
              Clientes
            </Button>
            
            <Button 
              onClick={() => setDialogNovaConversa(true)}
              className="flex-1"
              variant="outline"
            >
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              Nova
            </Button>
          </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>

        <div className="flex gap-2">
          {['todas', 'aberta', 'aguardando', 'resolvida'].map((status) => (
            <Badge
              key={status}
              variant={filtroStatus === status ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setFiltroStatus(status)}
            >
              {status}
            </Badge>
          ))}
        </div>
      </div>

      {/* Lista de conversas */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando conversas...
          </div>
        ) : conversasFiltradas?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        ) : (
          conversasFiltradas?.map((conversa) => {
            const nomeContato = conversa.whatsapp_contatos?.contatos?.nome_completo || 
                              conversa.whatsapp_contatos?.nome_whatsapp ||
                              conversa.whatsapp_contatos?.numero_whatsapp;
            const cargo = conversa.whatsapp_contatos?.contatos?.cargo;
            const nomeEmpresa = conversa.whatsapp_contatos?.contatos?.clientes?.nome_abrev;
            
            // Montar display name: Nome | Cargo | Empresa
            let displayName = nomeContato;
            if (cargo) displayName += ` | ${cargo}`;
            if (nomeEmpresa) displayName += ` | ${nomeEmpresa}`;
            
            const iniciais = nomeContato?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            return (
              <div
                key={conversa.id}
                onClick={() => onSelectConversa(conversa.id)}
                className={cn(
                  "p-4 border-b border-border/30 cursor-pointer transition-all hover:bg-muted/30",
                  conversaSelecionada === conversa.id && "bg-primary/10 border-l-4 border-l-primary"
                )}
              >
                <div className="flex gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversa.whatsapp_contatos?.foto_perfil_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                        {iniciais}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                      getStatusColor(conversa.status)
                    )} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {displayName}
                      </h3>
                      {conversa.ultima_mensagem_em && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(conversa.ultima_mensagem_em), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {conversa.titulo || 'Sem título'}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {conversa.prioridade !== 'normal' && (
                        <Badge variant={getPrioridadeColor(conversa.prioridade)} className="text-xs">
                          {conversa.prioridade}
                        </Badge>
                      )}
                      {conversa.total_mensagens > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {conversa.total_mensagens} msgs
                        </Badge>
                      )}
                      {conversa.tags && conversa.tags.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {conversa.tags[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>

    <NovaConversaDialog
      open={dialogNovaConversa}
      onOpenChange={setDialogNovaConversa}
      contaId={contaId}
      onConversaCriada={onSelectConversa}
    />
    
    <ClienteConsultaDialog
      open={dialogConsultaCliente}
      onOpenChange={setDialogConsultaCliente}
      contaId={contaId}
    />
    </>
  );
};

export default ConversasList;
