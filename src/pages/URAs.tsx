import { useState } from "react";
import Layout from "@/components/Layout";
import { useURAs, URA } from "@/hooks/useURAs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { URAFormDialog } from "@/components/ura/URAFormDialog";
import { LogDetalhesDialog } from "@/components/ura/LogDetalhesDialog";
import { TestarURADialog } from "@/components/ura/TestarURADialog";
import {
  Plus,
  FolderOpen,
  Phone,
  Clock,
  TrendingUp,
  Users,
  Search,
  Edit,
  GitBranch,
  BarChart3,
  MoreVertical,
  Copy,
  FileText,
  TestTube,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function URAs() {
  const {
    uras,
    isLoadingURAs,
    stats,
    isLoadingStats,
    useOpcoes,
    criarURA,
    atualizarURA,
    excluirURA,
    toggleAtivo,
  } = useURAs();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<string>("recentes");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedURA, setSelectedURA] = useState<URA | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uraToDelete, setUraToDelete] = useState<string | null>(null);
  const [logDetalhesOpen, setLogDetalhesOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [testarURAOpen, setTestarURAOpen] = useState(false);
  const [uraParaTestar, setUraParaTestar] = useState<URA | null>(null);

  // Filtrar e ordenar URAs
  const filteredURAs = uras
    ?.filter((ura) => {
      const matchesSearch =
        ura.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ura.numero_telefone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "ativas" && ura.ativo) ||
        (statusFilter === "inativas" && !ura.ativo);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "recentes") {
        return new Date(b.criado_em!).getTime() - new Date(a.criado_em!).getTime();
      }
      if (sortBy === "nome") {
        return a.nome.localeCompare(b.nome);
      }
      return 0;
    });

  const handleCreateURA = () => {
    setSelectedURA(null);
    setDialogOpen(true);
  };

  const handleEditURA = (ura: URA) => {
    setSelectedURA(ura);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (selectedURA) {
      await atualizarURA.mutateAsync({ id: selectedURA.id, ...data });
    } else {
      await criarURA.mutateAsync(data);
    }
  };

  const handleDeleteURA = async () => {
    if (uraToDelete) {
      await excluirURA.mutateAsync(uraToDelete);
      setDeleteDialogOpen(false);
      setUraToDelete(null);
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    await toggleAtivo.mutateAsync({ id, ativo: !ativo });
  };

  const handleTestarURA = (ura: URA) => {
    setUraParaTestar(ura);
    setTestarURAOpen(true);
  };

  // Hook para buscar opções da URA sendo testada
  const { data: opcoesParaTestar } = useOpcoes(uraParaTestar?.id);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de URAs</h1>
            <p className="text-muted-foreground">
              Configure e gerencie seus sistemas de atendimento automático
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FolderOpen className="w-4 h-4 mr-2" />
              Biblioteca de Áudios
            </Button>
            <Button onClick={handleCreateURA}>
              <Plus className="w-4 h-4 mr-2" />
              Nova URA
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">URAs Ativas</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : stats?.urasAtivas || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chamadas Hoje</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : stats?.chamadasHoje || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : `${stats?.duracaoMedia || 0}s`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Transferência</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? "..." : `${stats?.taxaTransferencia || 0}%`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="ativas">Ativas</SelectItem>
                    <SelectItem value="inativas">Inativas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">Mais recentes</SelectItem>
                    <SelectItem value="nome">Nome A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingURAs ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando URAs...
              </div>
            ) : filteredURAs && filteredURAs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead className="text-center">Opções</TableHead>
                    <TableHead className="text-center">Chamadas Hoje</TableHead>
                    <TableHead>Última Chamada</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredURAs.map((ura) => (
                    <TableRow key={ura.id}>
                      <TableCell>
                        <Badge variant={ura.ativo ? "default" : "secondary"}>
                          {ura.ativo ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{ura.nome}</TableCell>
                      <TableCell>{ura.numero_telefone || "-"}</TableCell>
                      <TableCell className="text-center">0</TableCell>
                      <TableCell className="text-center">0</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ura.criado_em
                          ? formatDistanceToNow(new Date(ura.criado_em), {
                              addSuffix: true,
                              locale: ptBR,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditURA(ura)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = `/uras/${ura.id}/editor`}
                          >
                            <GitBranch className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={ura.ativo ?? false}
                            onCheckedChange={() =>
                              handleToggleAtivo(ura.id, ura.ativo ?? false)
                            }
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar URA
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  // Placeholder: na implementação real, você criaria uma página de logs
                                  // Por enquanto, abre o modal vazio como exemplo
                                  setSelectedLogId("exemplo");
                                  setLogDetalhesOpen(true);
                                }}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Logs
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleTestarURA(ura)}>
                                <TestTube className="w-4 h-4 mr-2" />
                                Testar URA
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setUraToDelete(ura.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma URA encontrada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criar/Editar */}
        <URAFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          initialData={selectedURA}
          mode={selectedURA ? "edit" : "create"}
        />

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta URA? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteURA}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Detalhes do Log */}
        <LogDetalhesDialog
          open={logDetalhesOpen}
          onOpenChange={setLogDetalhesOpen}
          logId={selectedLogId}
        />

        {/* Modal de Testar URA */}
        <TestarURADialog
          open={testarURAOpen}
          onOpenChange={setTestarURAOpen}
          ura={uraParaTestar}
          opcoes={opcoesParaTestar || []}
        />
      </div>
    </Layout>
  );
}
