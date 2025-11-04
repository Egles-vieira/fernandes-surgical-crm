import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSolicitacoesCadastro, type StatusSolicitacao } from "@/hooks/useSolicitacoesCadastro";
import { StatusBadgeSolicitacao } from "@/components/solicitacoes/StatusBadgeSolicitacao";
import { RejeitarSolicitacaoDialog } from "@/components/solicitacoes/RejeitarSolicitacaoDialog";
import { format } from "date-fns";

export default function SolicitacoesCadastro() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusSolicitacao | "todos">("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejeitarDialog, setRejeitarDialog] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [aprovarDialog, setAprovarDialog] = useState<string | null>(null);

  const {
    solicitacoes,
    total,
    isLoading,
    aprovarSolicitacao,
    rejeitarSolicitacao,
    deleteSolicitacao,
  } = useSolicitacoesCadastro({
    status: statusFilter,
    page,
    search,
  });

  const stats = {
    total: solicitacoes.length,
    rascunho: solicitacoes.filter((s) => s.status === "rascunho").length,
    em_analise: solicitacoes.filter((s) => s.status === "em_analise").length,
    aprovado: solicitacoes.filter((s) => s.status === "aprovado").length,
    rejeitado: solicitacoes.filter((s) => s.status === "rejeitado").length,
  };

  const handleAprovar = (id: string) => {
    aprovarSolicitacao.mutate(id, {
      onSuccess: () => setAprovarDialog(null),
    });
  };

  const handleRejeitar = (id: string, motivo: string) => {
    rejeitarSolicitacao.mutate(
      { id, motivo },
      {
        onSuccess: () => setRejeitarDialog(null),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteSolicitacao.mutate(id, {
      onSuccess: () => setDeleteDialog(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitações de Cadastro</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de cadastro de clientes
          </p>
        </div>
        <Button onClick={() => navigate("/clientes/cadastro-cnpj")}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

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

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por CNPJ ou razão social..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusSolicitacao | "todos")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Não há solicitações com os filtros selecionados.
              </p>
              <Button onClick={() => navigate("/clientes/cadastro-cnpj")}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Nova Solicitação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Nome/Razão Social</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Contatos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.map((solicitacao) => {
                  const dadosColetados = solicitacao.dados_coletados as any;
                  const contatos = (solicitacao.contatos as any[]) || [];
                  
                  return (
                    <TableRow key={solicitacao.id}>
                      <TableCell className="font-mono">{solicitacao.cnpj}</TableCell>
                      <TableCell>
                        {dadosColetados?.razao_social || dadosColetados?.nome || "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadgeSolicitacao status={solicitacao.status} />
                      </TableCell>
                      <TableCell className="text-center">{contatos.length}</TableCell>
                      <TableCell>
                        {format(new Date(solicitacao.criado_em), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate(`/clientes/cadastro-cnpj?solicitacao=${solicitacao.id}`)
                            }
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {solicitacao.status === "em_analise" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setAprovarDialog(solicitacao.id)}
                                title="Aprovar"
                              >
                                <CheckCircle className="h-4 w-4 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRejeitarDialog(solicitacao.id)}
                                title="Rejeitar"
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDialog(solicitacao.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <RejeitarSolicitacaoDialog
        open={!!rejeitarDialog}
        onOpenChange={(open) => !open && setRejeitarDialog(null)}
        onConfirm={(motivo) => rejeitarDialog && handleRejeitar(rejeitarDialog, motivo)}
        isLoading={rejeitarSolicitacao.isPending}
      />

      <AlertDialog open={!!aprovarDialog} onOpenChange={(open) => !open && setAprovarDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar esta solicitação? O cliente será criado no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => aprovarDialog && handleAprovar(aprovarDialog)}
              className="bg-success hover:bg-success/90"
            >
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
