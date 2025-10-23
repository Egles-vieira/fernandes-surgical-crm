import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { useFilasAtendimento } from "@/hooks/useFilasAtendimento";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvaliacaoDialog } from "@/components/tickets/AvaliacaoDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function Tickets() {
  const navigate = useNavigate();
  const [avaliacaoOpen, setAvaliacaoOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"abertos" | "resolvidos">("abertos");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("todos");
  const [filaFiltro, setFilaFiltro] = useState<string>("todos");
  const { toast } = useToast();
  const { filas } = useFilasAtendimento();
  
  const statusFiltro = abaAtiva === "abertos" ? ["aberto", "em_andamento", "aguardando_cliente"] : ["resolvido", "fechado"];
  
  const { tickets, isLoading } = useTickets();
  
  const ticketsFiltrados = tickets.filter(ticket => 
    statusFiltro.includes(ticket.status) &&
    (ticket.numero_ticket.toLowerCase().includes(busca.toLowerCase()) || 
     ticket.titulo.toLowerCase().includes(busca.toLowerCase()) || 
     ticket.cliente_nome.toLowerCase().includes(busca.toLowerCase())) &&
    (prioridadeFiltro === "todos" || ticket.prioridade === prioridadeFiltro) &&
    (filaFiltro === "todos" || ticket.fila_id === filaFiltro)
  );

  const ticketsAbertos = tickets.filter(t => ["aberto", "em_andamento", "aguardando_cliente"].includes(t.status));
  const ticketsResolvidos = tickets.filter(t => ["resolvido", "fechado"].includes(t.status));
  const handleExportar = () => {
    const csvContent = [["Número", "Título", "Status", "Prioridade", "Tipo", "Cliente", "Data Abertura", "Avaliação"].join(";"), ...ticketsFiltrados.map(ticket => [ticket.numero_ticket, ticket.titulo, formatStatus(ticket.status), formatPrioridade(ticket.prioridade), ticket.tipo, ticket.cliente_nome, format(new Date(ticket.data_abertura), "dd/MM/yyyy HH:mm"), ticket.avaliacao || "Sem avaliação"].join(";"))].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tickets_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast({
      title: "Exportação concluída!",
      description: "Os dados foram exportados com sucesso."
    });
  };
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      aberto: "border-blue-500/50 text-blue-700 dark:text-blue-400",
      em_andamento: "border-yellow-500/50 text-yellow-700 dark:text-yellow-400",
      aguardando_cliente: "border-orange-500/50 text-orange-700 dark:text-orange-400",
      resolvido: "border-green-500/50 text-green-700 dark:text-green-400",
      fechado: "border-muted-foreground/50 text-muted-foreground",
      cancelado: "border-red-500/50 text-red-700 dark:text-red-400"
    };
    return colors[status] || "border-muted-foreground/50 text-muted-foreground";
  };
  const getPrioridadeColor = (prioridade: string) => {
    const colors: Record<string, string> = {
      baixa: "bg-green-100 text-green-800",
      normal: "bg-blue-100 text-blue-800",
      alta: "bg-orange-100 text-orange-800",
      urgente: "bg-red-100 text-red-800"
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
      cancelado: "Cancelado"
    };
    return labels[status] || status;
  };
  const formatPrioridade = (prioridade: string) => {
    const labels: Record<string, string> = {
      baixa: "Baixa",
      normal: "Normal",
      alta: "Alta",
      urgente: "Urgente"
    };
    return labels[prioridade] || prioridade;
  };
  const handleVerDetalhes = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  const toggleTicketSelection = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input 
            placeholder="Buscar por razão social, CNPJ ou número..." 
            value={busca} 
            onChange={e => setBusca(e.target.value)} 
            className="pl-10" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportar}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => navigate("/tickets/novo")} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as "abertos" | "resolvidos")}>
          <TabsList>
            <TabsTrigger value="abertos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              EM ABERTO <span className="ml-2 font-bold">{ticketsAbertos.length}</span>
            </TabsTrigger>
            <TabsTrigger value="resolvidos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              RESOLVIDAS <span className="ml-2 font-bold">{ticketsResolvidos.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex gap-4">
          <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
            <SelectTrigger className="w-[200px]">
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
          <Select value={filaFiltro} onValueChange={setFilaFiltro}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Fila" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Filas</SelectItem>
              {filas.map((fila) => (
                <SelectItem key={fila.id} value={fila.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: fila.cor }}
                    />
                    {fila.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Lista de Tickets */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : ticketsFiltrados.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum ticket encontrado</p>
          <Button onClick={() => navigate("/tickets/novo")} className="mt-4">
            Criar primeiro ticket
          </Button>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {ticketsFiltrados.map(ticket => (
              <Card 
                key={ticket.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleVerDetalhes(ticket.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Radio Button */}
                    <div className="pt-1">
                      <input
                        type="radio"
                        checked={selectedTickets.has(ticket.id)}
                        onChange={(e) => toggleTicketSelection(ticket.id, e as any)}
                        onClick={(e) => toggleTicketSelection(ticket.id, e)}
                        className="w-5 h-5 cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Conteúdo Principal */}
                    <div className="flex-1 space-y-2">
                      {/* Linha 1: Número, Cliente e Prioridade */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-primary">
                            {ticket.numero_ticket}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-semibold text-foreground">
                            {ticket.cliente_nome}
                          </span>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={getPrioridadeColor(ticket.prioridade)}
                        >
                          {formatPrioridade(ticket.prioridade)}
                        </Badge>
                      </div>

                      {/* Linha 2: Título */}
                      <div className="font-medium text-foreground">
                        {ticket.titulo}
                      </div>

                      {/* Linha 3: Descrição (truncada) */}
                      {ticket.descricao && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.descricao}
                        </div>
                      )}

                      {/* Linha 4: Metadados */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {ticket.tipo}
                          </Badge>
                        </div>
                        <span>•</span>
                        <div>
                          <Badge 
                            variant="outline"
                            className={`text-xs ${getStatusColor(ticket.status)}`}
                          >
                            {formatStatus(ticket.status)}
                          </Badge>
                        </div>
                        <span>•</span>
                        <div>
                          Atualizado em {format(new Date(ticket.data_atualizacao || ticket.data_abertura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rodapé com contador */}
          <div className="pt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {ticketsFiltrados.length} solicitações
            </div>
          </div>
        </>
      )}
      {selectedTicketId && (
        <AvaliacaoDialog 
          open={avaliacaoOpen} 
          onOpenChange={setAvaliacaoOpen} 
          ticketId={selectedTicketId} 
          ticketNumero={tickets.find(t => t.id === selectedTicketId)?.numero_ticket || ""} 
        />
      )}
    </div>
  );
}