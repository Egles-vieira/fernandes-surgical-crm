import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useTickets } from "@/hooks/useTickets";
import { useTicketActions } from "@/hooks/useTicketActions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MessageSquare, User, AlertCircle, CheckCircle, Package, FileText, Pause, Play, UserPlus, ArrowLeft } from "lucide-react";
import { TempoTicket } from "@/components/tickets/TempoTicket";
import { PausarTicketDialog } from "@/components/tickets/PausarTicketDialog";
import { TransferirTicketDialog } from "@/components/tickets/TransferirTicketDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function TicketDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateTicket, addInteracao } = useTickets();
  const { retomarTicket } = useTicketActions();
  const [novaInteracao, setNovaInteracao] = useState("");
  const [novoStatus, setNovoStatus] = useState<"aberto" | "em_andamento" | "aguardando_cliente" | "resolvido" | "fechado" | "cancelado" | "">("");
  const [novaPrioridade, setNovaPrioridade] = useState<"baixa" | "normal" | "alta" | "urgente" | "">("");
  const [pausarDialogOpen, setPausarDialogOpen] = useState(false);
  const [transferirDialogOpen, setTransferirDialogOpen] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *, 
          produtos(nome), 
          vendas(numero_venda),
          fila:filas_atendimento(id, nome, cor)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: interacoes = [] } = useQuery({
    queryKey: ["ticket_interacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets_interacoes")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleAdicionarInteracao = async () => {
    if (!novaInteracao.trim() || !id) return;

    await addInteracao.mutateAsync({
      ticket_id: id,
      mensagem: novaInteracao,
      mensagem_interna: false,
    });

    setNovaInteracao("");
  };

  const handleAtualizarStatus = async () => {
    if (!novoStatus || !id) return;

    await updateTicket.mutateAsync({
      id,
      status: novoStatus,
    });
  };

  const handleAtualizarPrioridade = async () => {
    if (!novaPrioridade || !id) return;

    await updateTicket.mutateAsync({
      id,
      prioridade: novaPrioridade,
    });
  };

  const handleRetomar = async () => {
    if (!id) return;
    await retomarTicket.mutateAsync(id);
  };

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

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Ticket não encontrado</p>
          <Button onClick={() => navigate("/tickets")} className="mt-4">
            Voltar para tickets
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">{ticket.numero_ticket}</h1>
            {ticket.fila && (
              <Badge className="text-white" style={{ backgroundColor: ticket.fila.cor }}>
                {ticket.fila.nome}
              </Badge>
            )}
            <Badge className={getStatusColor(ticket.status)}>
              {formatStatus(ticket.status)}
            </Badge>
            {ticket.esta_pausado && (
              <Badge variant="secondary">
                <Pause className="h-3 w-3 mr-1" />
                Pausado
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {ticket.esta_pausado ? (
            <Button size="sm" variant="outline" onClick={handleRetomar}>
              <Play className="h-4 w-4 mr-2" />
              Retomar
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setPausarDialogOpen(true)}>
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setTransferirDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Transferir
          </Button>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="grid grid-cols-3 gap-6">
        {/* Conteúdo Principal - 2/3 */}
        <div className="col-span-2 space-y-6">
          {/* Informações Principais */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">{ticket.titulo}</h2>
            <p className="text-muted-foreground">{ticket.descricao}</p>
          </Card>

          {/* Detalhes do Ticket */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Detalhes</h3>
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

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Aberto em{" "}
                      {format(new Date(ticket.data_abertura), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <TempoTicket ticketId={id!} estaPausado={ticket.esta_pausado} />
                </div>
              </div>
            </div>
          </Card>

          {/* Nova Interação */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Adicionar Comentário</h3>
            <Textarea
              value={novaInteracao}
              onChange={(e) => setNovaInteracao(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={4}
              className="mb-4"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAdicionarInteracao}
                disabled={!novaInteracao.trim() || addInteracao.isPending}
              >
                {addInteracao.isPending ? "Enviando..." : "Adicionar Comentário"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Histórico de Atividades - 1/3 */}
        <div>
          <Card className="p-6 sticky top-6">
            <h3 className="font-semibold mb-4">Histórico de Atividades ({interacoes.length})</h3>
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {interacoes.map((interacao) => (
                <div
                  key={interacao.id}
                  className={`p-3 rounded-lg ${
                    interacao.mensagem_interna ? "bg-muted" : "bg-card border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getTipoInteracaoIcon(interacao.tipo_interacao)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate">{interacao.nome_autor || "Sistema"}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {format(new Date(interacao.created_at), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {interacao.mensagem && (
                        <p className="text-sm break-words">{interacao.mensagem}</p>
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
          </Card>
        </div>
      </div>

      <PausarTicketDialog
        open={pausarDialogOpen}
        onOpenChange={setPausarDialogOpen}
        ticketId={id!}
        ticketNumero={ticket.numero_ticket}
      />

      <TransferirTicketDialog
        open={transferirDialogOpen}
        onOpenChange={setTransferirDialogOpen}
        ticketId={id!}
        ticketNumero={ticket.numero_ticket}
      />
    </div>
  );
}
