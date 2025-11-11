import { useState, useEffect } from "react";
import { useRoles, AppRole } from "@/hooks/useRoles";
import { useHierarquia } from "@/hooks/useHierarquia";
import { useMetasVendedor } from "@/hooks/useMetasVendedor";
import Layout, { useLayout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, X, Loader2, UserCheck, Target, Plus, ChevronDown, ChevronUp, MoreVertical, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CriarUsuarioSheet } from "@/components/usuario/CriarUsuarioSheet";
import { EditarUsuarioSheet } from "@/components/usuario/EditarUsuarioSheet";
import { NovaMetaVendedorDialog } from "@/components/equipes/NovaMetaVendedorDialog";
import { EditarMetaVendedorDialog } from "@/components/equipes/EditarMetaVendedorDialog";
import { useToast } from "@/hooks/use-toast";
import type { MetaVendedor } from "@/hooks/useMetasVendedor";
import { UsuariosFilters } from "@/components/usuario/UsuariosFilters";
import { AcoesMassaBar } from "@/components/usuario/AcoesMassaBar";
const AVAILABLE_ROLES: {
  value: AppRole;
  label: string;
  description: string;
  color: string;
}[] = [{
  value: "admin",
  label: "Administrador",
  description: "Acesso total ao sistema",
  color: "bg-destructive"
}, {
  value: "lider",
  label: "Líder de Equipe",
  description: "Gerenciar equipe de vendas, aprovar descontos",
  color: "bg-secondary"
}, {
  value: "manager",
  label: "Gerente",
  description: "Gerenciar produtos, relatórios e equipe",
  color: "bg-accent"
}, {
  value: "sales",
  label: "Vendedor",
  description: "Gerenciar clientes e oportunidades",
  color: "bg-primary"
}, {
  value: "backoffice",
  label: "Backoffice",
  description: "Suporte operacional ao vendedor",
  color: "bg-[hsl(var(--tertiary))]"
}, {
  value: "warehouse",
  label: "Estoque",
  description: "Gerenciar inventário",
  color: "bg-[hsl(var(--success))]"
}, {
  value: "support",
  label: "Suporte",
  description: "Atendimento ao cliente",
  color: "bg-[hsl(var(--warning))]"
}];
export default function Usuarios() {
  const {
    collapsed
  } = useLayout();
  const {
    allUsers,
    isLoadingAllUsers,
    addRole,
    removeRole,
    isAdmin
  } = useRoles();
  const {
    toast
  } = useToast();
  const {
    subordinados
  } = useHierarquia();
  const [selectedRole, setSelectedRole] = useState<{
    [key: string]: AppRole;
  }>({});
  const [metaDialogOpen, setMetaDialogOpen] = useState<{
    [key: string]: boolean;
  }>({});
  const [editarMetaDialogOpen, setEditarMetaDialogOpen] = useState<{
    [key: string]: boolean;
  }>({});
  const [metaSelecionada, setMetaSelecionada] = useState<MetaVendedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "todos">("todos");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };
  const toggleSelection = (userId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedRows(newSelected);
  };
  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedUsers?.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedUsers?.map(u => u.user_id) || []));
    }
  };
  const useVendedorMetas = (vendedorId: string) => {
    return useMetasVendedor(vendedorId);
  };
  const {
    criarMeta,
    editarMeta,
    excluirMeta
  } = useMetasVendedor();
  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter]);
  if (!isAdmin) {
    return <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert className="max-w-md">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários e permissões.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>;
  }
  const handleAddRole = async (userId: string) => {
    const role = selectedRole[userId];
    if (!role) return;
    await addRole.mutateAsync({
      userId,
      role
    });
    setSelectedRole({
      ...selectedRole,
      [userId]: "" as AppRole
    });
  };
  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (confirm(`Tem certeza que deseja remover a permissão "${AVAILABLE_ROLES.find(r => r.value === role)?.label}"?`)) {
      await removeRole.mutateAsync({
        userId,
        role
      });
    }
  };
  const handleAdicionarPermissaoMassa = async (role: AppRole) => {
    const selectedUserIds = Array.from(selectedRows);
    if (selectedUserIds.length === 0) return;
    const roleInfo = AVAILABLE_ROLES.find(r => r.value === role);
    if (!confirm(`Deseja adicionar a permissão "${roleInfo?.label}" para ${selectedUserIds.length} usuário(s)?`)) {
      return;
    }
    try {
      await Promise.all(selectedUserIds.map(userId => addRole.mutateAsync({
        userId,
        role
      })));
      toast({
        title: "Permissões adicionadas",
        description: `Permissão "${roleInfo?.label}" adicionada para ${selectedUserIds.length} usuário(s)`
      });
      setSelectedRows(new Set());
    } catch (error) {
      console.error("Erro ao adicionar permissões em massa:", error);
      toast({
        title: "Erro ao adicionar permissões",
        description: "Ocorreu um erro ao adicionar permissões. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const handleRemoverPermissaoMassa = async (role: AppRole) => {
    const selectedUserIds = Array.from(selectedRows);
    if (selectedUserIds.length === 0) return;
    const roleInfo = AVAILABLE_ROLES.find(r => r.value === role);
    if (!confirm(`Deseja remover a permissão "${roleInfo?.label}" de ${selectedUserIds.length} usuário(s)?`)) {
      return;
    }
    try {
      await Promise.all(selectedUserIds.map(userId => removeRole.mutateAsync({
        userId,
        role
      })));
      toast({
        title: "Permissões removidas",
        description: `Permissão "${roleInfo?.label}" removida de ${selectedUserIds.length} usuário(s)`
      });
      setSelectedRows(new Set());
    } catch (error) {
      console.error("Erro ao remover permissões em massa:", error);
      toast({
        title: "Erro ao remover permissões",
        description: "Ocorreu um erro ao remover permissões. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const getRoleInfo = (role: AppRole) => {
    return AVAILABLE_ROLES.find(r => r.value === role);
  };
  const handleOpenMetaDialog = (userId: string) => {
    setMetaDialogOpen({
      ...metaDialogOpen,
      [userId]: true
    });
  };
  const handleCloseMetaDialog = (userId: string) => {
    setMetaDialogOpen({
      ...metaDialogOpen,
      [userId]: false
    });
  };
  const handleOpenEditarMetaDialog = (userId: string, meta: MetaVendedor) => {
    setMetaSelecionada(meta);
    setEditarMetaDialogOpen({
      ...editarMetaDialogOpen,
      [userId]: true
    });
  };
  const handleCloseEditarMetaDialog = (userId: string) => {
    setEditarMetaDialogOpen({
      ...editarMetaDialogOpen,
      [userId]: false
    });
    setMetaSelecionada(null);
  };
  const handleCriarMeta = async (meta: any) => {
    await criarMeta.mutateAsync(meta);
  };
  const handleEditarMeta = async (metaId: string, dados: any) => {
    await editarMeta.mutateAsync({
      metaId,
      dados
    });
  };
  const handleExcluirMeta = async (metaId: string) => {
    await excluirMeta.mutateAsync({
      metaId
    });
  };
  const MetasVendedorCell = ({
    userId,
    roles
  }: {
    userId: string;
    roles: AppRole[];
  }) => {
    const isSales = roles?.includes("sales");
    const {
      metas,
      isLoading
    } = useVendedorMetas(userId);
    if (!isSales) {
      return <span className="text-xs text-muted-foreground italic">Não é vendedor</span>;
    }
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    const metasAtivas = metas?.filter(m => m.status === "ativa") || [];
    return <div className="space-y-2">
        {metasAtivas.length > 0 ? <div className="space-y-1">
            {metasAtivas.map(meta => {
          const percentual = meta.meta_valor > 0 ? (meta.valor_atual || 0) / meta.meta_valor * 100 : 0;
          return <div key={meta.id} className="text-xs cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors" onClick={() => handleOpenEditarMetaDialog(userId, meta)}>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  notation: "compact"
                }).format(meta.meta_valor)}
                    </span>
                    <Badge variant={percentual >= 100 ? "default" : percentual >= 80 ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                      {percentual.toFixed(0)}%
                    </Badge>
                  </div>
                </div>;
        })}
          </div> : <span className="text-xs text-muted-foreground italic">Sem metas ativas</span>}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 mt-1" onClick={() => handleOpenMetaDialog(userId)}>
          <Plus className="h-3 w-3" />
          {metasAtivas.length > 0 ? "Adicionar Meta" : "Criar Meta"}
        </Button>
      </div>;
  };
  const filteredUsers = allUsers?.filter(user => {
    const matchesSearch = searchTerm === "" || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "todos" || user.roles?.includes(roleFilter);
    return matchesSearch && matchesRole;
  });
  const total = filteredUsers?.length || 0;
  const totalPages = Math.ceil(total / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers?.slice(startIndex, endIndex);
  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;
  const stats = {
    total: allUsers?.length || 0,
    admin: allUsers?.filter(u => u.roles?.includes("admin")).length || 0,
    sales: allUsers?.filter(u => u.roles?.includes("sales")).length || 0,
    manager: allUsers?.filter(u => u.roles?.includes("manager")).length || 0,
    support: allUsers?.filter(u => u.roles?.includes("support")).length || 0
  };
  return <Layout>
      {/* Barra de Filtros Fixa */}
      <div className="fixed top-16 right-0 z-20 bg-background border-b transition-all duration-300" style={{
      left: collapsed ? '4rem' : '14rem'
    }}>
        <div className="px-6 py-3">
          <UsuariosFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} roleFilter={roleFilter} onRoleChange={setRoleFilter} totalUsuarios={filteredUsers?.length || 0} />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="pt-[88px] px-6 pb-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid gap-4 grid-cols-5 w-full">
          <Card className="border-border/40 shadow-sm rounded-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm rounded-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-semibold">{stats.admin}</div>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm rounded-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Vendedores</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-semibold">{stats.sales}</div>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm rounded-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Gerentes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-semibold">{stats.manager}</div>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm rounded-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Suporte</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-semibold">{stats.support}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="shadow-elegant w-full">
          <CardContent className="p-0">
            {isLoadingAllUsers ? <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div> : filteredUsers && filteredUsers.length === 0 ? <div className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div> : <>
                <div className="overflow-x-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-[40px_minmax(200px,1fr)_minmax(250px,1fr)_minmax(180px,200px)_minmax(250px,1fr)_80px] gap-4 p-4 border-b bg-muted/50 font-medium text-sm text-muted-foreground min-w-[1000px]">
                    <div className="flex items-center justify-center">
                      <Checkbox checked={selectedRows.size === paginatedUsers?.length && paginatedUsers.length > 0} onCheckedChange={toggleSelectAll} />
                    </div>
                    <div>Email</div>
                    <div>Permissões</div>
                    <div>Metas</div>
                    <div>Adicionar Permissão</div>
                    <div></div>
                  </div>

                  {/* Table Rows */}
                  <div className="min-w-[1000px]">
                    {paginatedUsers?.map(user => {
                  const isExpanded = expandedRows.has(user.user_id);
                  const isSelected = selectedRows.has(user.user_id);
                  return <div key={user.user_id} className={`border-b border-border transition-colors ${isSelected ? "bg-muted/70" : "hover:bg-muted/50"}`}>
                          {/* Main Row */}
                          <div className="grid grid-cols-[40px_minmax(200px,1fr)_minmax(250px,1fr)_minmax(180px,200px)_minmax(250px,1fr)_80px] gap-4 p-4 items-start relative">
                            {/* Left Border Indicator */}
                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}

                            {/* Checkbox */}
                            <div className="flex items-center justify-center pt-1">
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(user.user_id)} />
                            </div>

                            {/* Email */}
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{user.email}</div>
                              {subordinados?.some(s => s.subordinado_id === user.user_id) && <Badge variant="outline" className="text-xs mt-1">
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Subordinado
                                </Badge>}
                            </div>

                            {/* Permissões */}
                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-2">
                                {user.roles && user.roles.length > 0 ? user.roles.map(role => {
                            const roleInfo = getRoleInfo(role);
                            return <Badge key={role} className={`${roleInfo?.color} text-white text-xs`}>
                                        {roleInfo?.label}
                                        <X className="ml-1 h-3 w-3 cursor-pointer hover:bg-white/20 rounded-full transition-colors" onClick={() => handleRemoveRole(user.user_id, role)} />
                                      </Badge>;
                          }) : <span className="text-xs text-muted-foreground italic">Sem permissões</span>}
                              </div>
                            </div>

                            {/* Metas */}
                            <div className="min-w-0">
                              <MetasVendedorCell userId={user.user_id} roles={user.roles || []} />
                            </div>

                            {/* Adicionar Permissão */}
                            <div className="flex gap-2 items-start min-w-0">
                              <Select value={selectedRole[user.user_id] || ""} onValueChange={value => setSelectedRole({
                          ...selectedRole,
                          [user.user_id]: value as AppRole
                        })}>
                                <SelectTrigger className="h-8 text-xs flex-1">
                                  <SelectValue placeholder="Selecionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {AVAILABLE_ROLES.filter(role => !user.roles?.includes(role.value)).map(role => <SelectItem key={role.value} value={role.value} className="text-xs">
                                      {role.label}
                                    </SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-8 px-3 text-xs" onClick={() => handleAddRole(user.user_id)} disabled={!selectedRole[user.user_id]}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>;
                })}
                  </div>
                </div>

                {/* Paginação */}
                {totalPages > 1 && <div className="flex items-center justify-between px-6 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, total)} de {total} usuários
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={!canPreviousPage}>
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <div className="text-sm font-medium">
                        Página {page} de {totalPages}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!canNextPage}>
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>}
              </>}
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações em Massa */}
      {selectedRows.size > 0 && <AcoesMassaBar selectedCount={selectedRows.size} onAdicionarPermissao={handleAdicionarPermissaoMassa} onRemoverPermissao={handleRemoverPermissaoMassa} onClearSelection={() => setSelectedRows(new Set())} />}

      {/* Dialogs */}
      {paginatedUsers?.map(user => <div key={user.user_id}>
          <NovaMetaVendedorDialog open={metaDialogOpen[user.user_id] || false} onOpenChange={open => !open && handleCloseMetaDialog(user.user_id)} vendedorId={user.user_id} onCriar={handleCriarMeta} />
          {metaSelecionada && <EditarMetaVendedorDialog open={editarMetaDialogOpen[user.user_id] || false} onOpenChange={open => !open && handleCloseEditarMetaDialog(user.user_id)} meta={metaSelecionada} onEditar={handleEditarMeta} onExcluir={handleExcluirMeta} />}
        </div>)}
    </Layout>;
}