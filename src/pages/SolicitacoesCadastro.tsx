import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, Eye, Edit, CheckCircle, XCircle, Trash2, Plus, ChevronDown, ChevronUp, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSolicitacoesCadastro, type StatusSolicitacao } from "@/hooks/useSolicitacoesCadastro";
import { StatusBadgeSolicitacao } from "@/components/solicitacoes/StatusBadgeSolicitacao";
import { RejeitarSolicitacaoDialog } from "@/components/solicitacoes/RejeitarSolicitacaoDialog";
import { SolicitacoesFilters } from "@/components/solicitacoes/SolicitacoesFilters";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
export default function SolicitacoesCadastro() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusSolicitacao | "todos">("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [rejeitarDialog, setRejeitarDialog] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [aprovarDialog, setAprovarDialog] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const toggleSelection = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const {
    solicitacoes,
    total,
    isLoading,
    error,
    aprovarSolicitacao,
    rejeitarSolicitacao,
    deleteSolicitacao
  } = useSolicitacoesCadastro({
    status: statusFilter,
    page,
    search
  });
  const stats = {
    total: solicitacoes.length,
    rascunho: solicitacoes.filter(s => s.status === "rascunho").length,
    em_analise: solicitacoes.filter(s => s.status === "em_analise").length,
    aprovado: solicitacoes.filter(s => s.status === "aprovado").length,
    rejeitado: solicitacoes.filter(s => s.status === "rejeitado").length
  };
  const handleAprovar = (id: string) => {
    aprovarSolicitacao.mutate(id, {
      onSuccess: () => setAprovarDialog(null)
    });
  };
  const handleRejeitar = (id: string, motivo: string) => {
    rejeitarSolicitacao.mutate({
      id,
      motivo
    }, {
      onSuccess: () => setRejeitarDialog(null)
    });
  };
  const handleDelete = (id: string) => {
    deleteSolicitacao.mutate(id, {
      onSuccess: () => setDeleteDialog(null)
    });
  };

  const totalPages = Math.ceil((total || 0) / itemsPerPage);
  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;
  return <div className="p-6 space-y-6 h-full overflow-hidden flex flex-col">
      {/* Filtros */}
      <SolicitacoesFilters 
        searchTerm={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={(value) => setStatusFilter(value as StatusSolicitacao | "todos")}
        onNovaSolicitacao={() => navigate("/clientes/cadastro-cnpj")}
      />

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rascunho}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.em_analise}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aprovado}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejeitado}</div>
          </CardContent>
        </Card>
      </div>


      {/* Tabela */}
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardContent className="pt-6 flex-1 flex flex-col min-h-0 overflow-hidden">
          {isLoading ? <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">Carregando solicitações...</p>
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div> : error ? <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : "Não foi possível carregar as solicitações."}
              </p>
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div> : solicitacoes.length === 0 ? <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Não há solicitações com os filtros selecionados.
              </p>
              <Button onClick={() => navigate("/clientes/cadastro-cnpj")}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Nova Solicitação
              </Button>
            </div> : <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
              {/* Table Header */}
              <div className="sticky top-0 z-10 flex items-center gap-4 p-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 font-medium text-sm text-muted-foreground">
                <div className="w-10"></div> {/* Checkbox space */}
                <div className="flex-1 min-w-0">Razão Social / CNPJ</div>
                <div className="w-32">Status</div>
                <div className="w-24 text-center">Contatos</div>
                <div className="w-40">Data</div>
                <div className="w-48">Email</div>
                <div className="w-48">Endereço</div>
                <div className="w-24"></div> {/* Actions space */}
              </div>

              {solicitacoes.map(solicitacao => {
            const dadosColetados = solicitacao.dados_coletados as any;
            const contatos = solicitacao.contatos as any[] || [];
            const isExpanded = expandedRows.has(solicitacao.id);
            const isSelected = selectedRows.has(solicitacao.id);
            return <div key={solicitacao.id} className={`border-b border-border transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-muted/30"}`}>
                    {/* Main Row */}
                    <div className="flex items-center gap-4 p-4 relative">
                      {/* Left Border Indicator */}
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                      
                      {/* Checkbox */}
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(solicitacao.id)} className="ml-2" />

                      {/* Nome/Razão Social */}
                      <div className="flex-1 min-w-0">
                        <div className="text-primary font-medium">
                          {dadosColetados?.razao_social || dadosColetados?.nome_fantasia || dadosColetados?.office?.name || dadosColetados?.office?.alias || "-"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {solicitacao.cnpj}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="w-32">
                        <StatusBadgeSolicitacao status={solicitacao.status} />
                      </div>

                      {/* Contatos */}
                      <div className="w-24 text-center text-sm text-muted-foreground">
                        {contatos.length}
                      </div>

                      {/* Data */}
                      <div className="w-40 text-sm text-muted-foreground">
                        {format(new Date(solicitacao.criado_em), "dd MMM yyyy")}
                      </div>

                      {/* Email */}
                      <div className="w-48 text-sm text-primary truncate">
                        {contatos[0]?.email || "-"}
                      </div>

                      {/* Address */}
                      <div className="w-48 text-sm text-muted-foreground truncate">
                        {dadosColetados?.endereco?.logradouro || "-"}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/clientes/cadastro-cnpj?solicitacao=${solicitacao.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {solicitacao.status === "em_analise" && <>
                                <DropdownMenuItem onClick={() => setAprovarDialog(solicitacao.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-success" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRejeitarDialog(solicitacao.id)}>
                                  <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                  Rejeitar
                                </DropdownMenuItem>
                              </>}
                            <DropdownMenuItem onClick={() => setDeleteDialog(solicitacao.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" onClick={() => toggleRow(solicitacao.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && <div className="px-4 pb-4 pt-2 bg-muted/20 border-t">
                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground mb-1">Status</div>
                            <StatusBadgeSolicitacao status={solicitacao.status} />
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">Contatos</div>
                            <div className="font-medium">{contatos.length}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">Criado em</div>
                            <div className="font-medium">
                              {format(new Date(solicitacao.criado_em), "dd/MM/yyyy HH:mm")}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">Email</div>
                            <div className="font-medium text-primary">
                              {contatos[0]?.email || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">Telefone</div>
                            <div className="font-medium">
                              {contatos[0]?.telefone || "-"}
                            </div>
                          </div>
                        </div>
                        
                        {dadosColetados?.endereco && <div className="mt-3 pt-3 border-t">
                            <div className="text-muted-foreground mb-1">Endereço Completo</div>
                            <div className="font-medium">
                              {dadosColetados.endereco.logradouro}, {dadosColetados.endereco.numero || "S/N"}
                              {dadosColetados.endereco.complemento && `, ${dadosColetados.endereco.complemento}`}
                              {` - ${dadosColetados.endereco.bairro}, ${dadosColetados.endereco.cidade} - ${dadosColetados.endereco.estado}, CEP: ${dadosColetados.endereco.cep}`}
                            </div>
                          </div>}
                      </div>}
                  </div>;
          })}
              </div>

              {/* Paginação */}
              <div className="border-t bg-card p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {solicitacoes.length === 0 ? 0 : (page - 1) * itemsPerPage + 1} a {Math.min(page * itemsPerPage, total || 0)} de {total || 0} solicitações
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!canPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={!canNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RejeitarSolicitacaoDialog open={!!rejeitarDialog} onOpenChange={open => !open && setRejeitarDialog(null)} onConfirm={motivo => rejeitarDialog && handleRejeitar(rejeitarDialog, motivo)} isLoading={rejeitarSolicitacao.isPending} />

      <AlertDialog open={!!aprovarDialog} onOpenChange={open => !open && setAprovarDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar esta solicitação? O cliente será criado no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => aprovarDialog && handleAprovar(aprovarDialog)} className="bg-success hover:bg-success/90">
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={open => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}