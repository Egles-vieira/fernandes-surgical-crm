import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTickets } from "@/hooks/useTickets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MessageSquare, User, AlertCircle, CheckCircle, Package, FileText } from "lucide-react";

interface TicketDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
}

export function TicketDetalhesDialog({ open, onOpenChange, ticketId }: TicketDetalhesDialogProps) {
  const { updateTicket, addInteracao } = useTickets();
  const [novaInteracao, setNovaInteracao] = useState("");
  const [novoStatus, setNovoStatus] = useState<"aberto" | "em_andamento" | "aguardando_cliente" | "resolvido" | "fechado" | "cancelado" | "">("");
  const [novaPrioridade, setNovaPrioridade] = useState<"baixa" | "normal" | "alta" | "urgente" | "">("");

  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, produtos(nome), vendas(numero_venda)")
        .eq("id", ticketId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ["ticket_interacoes", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets_interacoes")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  const handleAdicionarInteracao = async () => {
    if (!novaInteracao.trim()) return;

    await addInteracao.mutateAsync({
      ticket_id: ticketId,
      mensagem: novaInteracao,
      mensagem_interna: false,
    });

    setNovaInteracao("");
  };

  const handleAtualizarStatus = async () => {
    if (!novoStatus) return;

    await updateTicket.mutateAsync({
      id: ticketId,
      status: novoStatus,
    });
  };

  const handleAtualizarPrioridade = async () => {
    if (!novaPrioridade) return;

    await updateTicket.mutateAsync({
      id: ticketId,
      prioridade: novaPrioridade,
    });
  };

  if (!ticket) return null;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aberto: "bg-blue-500",
      em_andamento: "bg-yellow-500",
      aguardando_cliente: "bg-orange-500",
      resolvido: "bg-green-500",
      fechado: "bg-gray-500",
      cancelado: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      aberto: "Aberto",
      em_andamento: "Em Andamento",
      aguardando_cliente: "Aguardando Cliente",
      resolvido: "Resolvido",
      fechado: "Fechado",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  const getTipoInteracaoIcon = (tipo: string) => {
    const icons: Record<string, any> = {
      comentario: MessageSquare,
      status_mudou: AlertCircle,
      prioridade_mudou: AlertCircle,
      atribuicao_mudou: User,
      criacao: CheckCircle,
    };
    const Icon = icons[tipo] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl">{ticket.numero_ticket}</DialogTitle>
              <Badge className={getStatusColor(ticket.status)}>
                {formatStatus(ticket.status)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Principais */}
          <div>
            <h3 className="text-xl font-semibold mb-2">{ticket.titulo}</h3>
            <p className="text-muted-foreground">{ticket.descricao}</p>
          </div>

          <Separator />

          {/* Detalhes do Ticket */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Cliente</h4>
                <p className="font-medium">{ticket.cliente_nome}</p>
                {ticket.cliente_email && (
                  <p className="text-sm text-muted-foreground">{ticket.cliente_email}</p>
                )}
                {ticket.cliente_telefone && (
                  <p className="text-sm text-muted-foreground">{ticket.cliente_telefone}</p>
                )}
              </div>

              {ticket.produtos && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Produto</p>
                    <p className="text-sm text-muted-foreground">{ticket.produtos.nome}</p>
                  </div>
                </div>
              )}

              {ticket.vendas && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Venda</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.vendas.numero_venda}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
                <div className="flex gap-2">
                  <Select value={novoStatus} onValueChange={(value) => setNovoStatus(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder={formatStatus(ticket.status)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                      <SelectItem value="resolvido">Resolvido</SelectItem>
                      <SelectItem value="fechado">Fechado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAtualizarStatus} size="sm" disabled={!novoStatus}>
                    Atualizar
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Prioridade</h4>
                <div className="flex gap-2">
                  <Select value={novaPrioridade} onValueChange={(value) => setNovaPrioridade(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder={ticket.prioridade} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAtualizarPrioridade} size="sm" disabled={!novaPrioridade}>
                    Atualizar
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Aberto em{" "}
                  {format(new Date(ticket.data_abertura), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Histórico de Interações */}
          <div>
            <h4 className="font-semibold mb-4">Histórico ({interacoes.length} interações)</h4>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {interacoes.map((interacao) => (
                <div
                  key={interacao.id}
                  className={`p-4 rounded-lg ${
                    interacao.mensagem_interna ? "bg-muted" : "bg-card border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getTipoInteracaoIcon(interacao.tipo_interacao)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{interacao.nome_autor || "Sistema"}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(interacao.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {interacao.mensagem && (
                        <p className="text-sm">{interacao.mensagem}</p>
                      )}
                      {interacao.tipo_interacao !== "comentario" && (
                        <p className="text-sm text-muted-foreground">
                          {interacao.valor_anterior} → {interacao.valor_novo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Nova Interação */}
          <div className="space-y-2">
            <h4 className="font-semibold">Adicionar Comentário</h4>
            <Textarea
              value={novaInteracao}
              onChange={(e) => setNovaInteracao(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={4}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAdicionarInteracao}
                disabled={!novaInteracao.trim() || addInteracao.isPending}
              >
                {addInteracao.isPending ? "Enviando..." : "Adicionar Comentário"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
