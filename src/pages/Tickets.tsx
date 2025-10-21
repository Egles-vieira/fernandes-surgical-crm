import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Search, Download, Star } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NovoTicketDialog } from "@/components/tickets/NovoTicketDialog";
import { TicketDetalhesDialog } from "@/components/tickets/TicketDetalhesDialog";
import { AvaliacaoDialog } from "@/components/tickets/AvaliacaoDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function Tickets() {
  const [novoTicketOpen, setNovoTicketOpen] = useState(false);
  const [ticketDetalhesOpen, setTicketDetalhesOpen] = useState(false);
  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const { toast } = useToast();

  const filtros = {
    ...(statusFiltro !== "todos" && { status: statusFiltro as any }),
    ...(prioridadeFiltro !== "todos" && { prioridade: prioridadeFiltro as any }),
  };

  const { tickets, isLoading } = useTickets(filtros);

  const ticketsFiltrados = tickets.filter(
    (ticket) =>
      (ticket.numero_ticket.toLowerCase().includes(busca.toLowerCase()) ||
      ticket.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      ticket.cliente_nome.toLowerCase().includes(busca.toLowerCase())) &&
      (tipoFiltro === "todos" || ticket.tipo === tipoFiltro)
  );

  const handleExportar = () => {
    const csvContent = [
      ["Número", "Título", "Status", "Prioridade", "Tipo", "Cliente", "Data Abertura", "Avaliação"].join(";"),
      ...ticketsFiltrados.map(ticket => [
        ticket.numero_ticket,
        ticket.titulo,
        formatStatus(ticket.status),
        formatPrioridade(ticket.prioridade),
        ticket.tipo,
        ticket.cliente_nome,
        format(new Date(ticket.data_abertura), "dd/MM/yyyy HH:mm"),
        ticket.avaliacao || "Sem avaliação"
      ].join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tickets_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: "Exportação concluída!",
      description: "Os dados foram exportados com sucesso.",
    });
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

  const getPrioridadeColor = (prioridade: string) => {
    const colors: Record<string, string> = {
      baixa: "bg-green-100 text-green-800",
      normal: "bg-blue-100 text-blue-800",
      alta: "bg-orange-100 text-orange-800",
      urgente: "bg-red-100 text-red-800",
    };
    return colors[prioridade] || "bg-gray-100 text-gray-800";
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

  const formatPrioridade = (prioridade: string) => {
    const labels: Record<string, string> = {
      baixa: "Baixa",
      normal: "Normal",
      alta: "Alta",
      urgente: "Urgente",
    };
    return labels[prioridade] || prioridade;
  };

  const handleVerDetalhes = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setTicketDetalhesOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">SAC - Tickets</h1>
            <p className="text-muted-foreground">
              Gerencie reclamações e solicitações de clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportar}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setNovoTicketOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Ticket
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Refine sua busca de tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, título ou cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  <SelectItem value="reclamacao">Reclamação</SelectItem>
                  <SelectItem value="duvida">Dúvida</SelectItem>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                  <SelectItem value="elogio">Elogio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-8">Carregando tickets...</div>
        ) : ticketsFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum ticket encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {ticketsFiltrados.map((ticket) => (
              <Card
                key={ticket.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleVerDetalhes(ticket.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-lg">
                          {ticket.numero_ticket}
                        </span>
                        <Badge className={getPrioridadeColor(ticket.prioridade)}>
                          {formatPrioridade(ticket.prioridade)}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)}>
                          {formatStatus(ticket.status)}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{ticket.titulo}</h3>
                      <p className="text-muted-foreground line-clamp-2 mb-3">
                        {ticket.descricao}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Cliente: {ticket.cliente_nome}</span>
                        <span>•</span>
                        <span>
                          Aberto em:{" "}
                          {format(new Date(ticket.data_abertura), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        {ticket.total_interacoes > 0 && (
                          <>
                            <span>•</span>
                            <span>{ticket.total_interacoes} interações</span>
                          </>
                        )}
                        {ticket.avaliacao && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{ticket.avaliacao}/5</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NovoTicketDialog open={novoTicketOpen} onOpenChange={setNovoTicketOpen} />
      
      {selectedTicketId && (
        <>
          <TicketDetalhesDialog
            open={ticketDetalhesOpen}
            onOpenChange={setTicketDetalhesOpen}
            ticketId={selectedTicketId}
          />
          <AvaliacaoDialog
            open={avaliacaoOpen}
            onOpenChange={setAvaliacaoOpen}
            ticketId={selectedTicketId}
            ticketNumero={tickets.find(t => t.id === selectedTicketId)?.numero_ticket || ""}
          />
        </>
      )}
    </Layout>
  );
}
