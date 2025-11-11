import { useState, useEffect } from "react";
import { useRoles, AppRole } from "@/hooks/useRoles";
import { useHierarquia } from "@/hooks/useHierarquia";
import { useMetasVendedor } from "@/hooks/useMetasVendedor";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
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
    subordinados,
    equipesGerenciadas,
    clientesAcessiveis,
    vendasAcessiveis,
    nivelHierarquico,
    isLoading: isLoadingHierarquia,
    temSubordinados,
    ehGestor
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

  // Hook para carregar metas de um vendedor específico quando necessário
  const useVendedorMetas = (vendedorId: string) => {
    return useMetasVendedor(vendedorId);
  };

  // Hook global para criar, editar e excluir metas
  const {
    criarMeta,
    editarMeta,
    excluirMeta
  } = useMetasVendedor();

  // Resetar página quando filtros mudarem
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

  // Ações em massa
  const handleAdicionarPermissaoMassa = async (role: AppRole) => {
    const selectedUserIds = Array.from(selectedRows);
    if (selectedUserIds.length === 0) return;
    const roleInfo = AVAILABLE_ROLES.find(r => r.value === role);
    if (!confirm(`Deseja adicionar a permissão "${roleInfo?.label}" para ${selectedUserIds.length} usuário(s)?`)) {
      return;
    }
    try {
      // Adicionar permissão para todos os usuários selecionados
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
      // Remover permissão de todos os usuários selecionados
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

  // Componente para exibir metas do vendedor
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
      return <span className="text-xs text-muted-foreground italic">
          Não é vendedor
        </span>;
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
          </div> : <span className="text-xs text-muted-foreground italic">
            Sem metas ativas
          </span>}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 mt-1" onClick={() => handleOpenMetaDialog(userId)}>
          <Plus className="h-3 w-3" />
          {metasAtivas.length > 0 ? "Adicionar Meta" : "Criar Meta"}
        </Button>
      </div>;
  };

  // Filtrar usuários
  const filteredUsers = allUsers?.filter(user => {
    const matchesSearch = searchTerm === "" || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "todos" || user.roles?.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  // Paginação
  const total = filteredUsers?.length || 0;
  const totalPages = Math.ceil(total / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers?.slice(startIndex, endIndex);
  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;
  return <Layout>
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        {/* Filtros fixos */}
        <UsuariosFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} roleFilter={roleFilter} onRoleChange={setRoleFilter} totalUsuarios={filteredUsers?.length || 0} />

        {/* Tabela de Usuários com padding para compensar filtro fixo e enquadrar nas laterais */}
        <div className="flex-1 overflow-hidden px-4 md:px-6 py-6 pt-24 flex flex-col mx-auto w-full max-w-7xl">
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <CardContent className="pt-6 flex-1 flex flex-col min-h-0 overflow-hidden p-0">
              {isLoadingAllUsers ? <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Carregando usuários...</p>
                </div> : filteredUsers && filteredUsers.length === 0 ? <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </div> : <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                    {/* Table Header */}
                    <div className="sticky top-0 z-10 flex items-center gap-4 p-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 font-medium text-sm text-muted-foreground">
                      <Checkbox checked={selectedRows.size === paginatedUsers?.length && paginatedUsers.length > 0} onCheckedChange={toggleSelectAll} className="ml-2" />
                      <div className="flex-1 min-w-0">Email</div>
                      <div className="w-64">Permissões</div>
                      <div className="w-48">Metas</div>
                      <div className="w-64">Adicionar Permissão</div>
                      <div className="w-24"></div> {/* Actions space */}
                    </div>

                    {/* Table Rows */}
                    {paginatedUsers?.map(user => {
                  const isExpanded = expandedRows.has(user.user_id);
                  const isSelected = selectedRows.has(user.user_id);
                  return <div key={user.user_id} className={`border-b border-border transition-colors ${isSelected ? "bg-accent/5" : "hover:bg-muted/30"}`}>
                          {/* Main Row */}
                          <div className="flex items-center gap-4 p-4 relative">
                            {/* Left Border Indicator */}
                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                            
                            {/* Checkbox */}
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(user.user_id)} className="ml-2" />

                            {/* Email */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-primary">{user.email}</div>
                              {subordinados?.some(s => s.subordinado_id === user.user_id) && <Badge variant="outline" className="text-xs mt-1">
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Subordinado
                                </Badge>}
                            </div>

                            {/* Permissões */}
                            <div className="w-64">
                              <div className="flex flex-wrap gap-2">
                                {user.roles && user.roles.length > 0 ? user.roles.slice(0, 2).map(role => {
                            const roleInfo = getRoleInfo(role);
                            return <Badge key={role} variant="secondary" className="flex items-center gap-1.5 px-2 py-1">
                                        <div className={`w-2 h-2 rounded-full ${roleInfo?.color}`} />
                                        <span className="text-xs">{roleInfo?.label}</span>
                                      </Badge>;
                          }) : <span className="text-sm text-muted-foreground italic">
                                    Nenhuma permissão
                                  </span>}
                                {user.roles && user.roles.length > 2 && <Badge variant="outline" className="text-xs">
                                    +{user.roles.length - 2}
                                  </Badge>}
                              </div>
                            </div>

                            {/* Metas */}
                            <div className="w-48">
                              <MetasVendedorCell userId={user.user_id} roles={user.roles || []} />
                            </div>

                            {/* Adicionar Permissão */}
                            <div className="w-64">
                              <div className="flex items-center gap-2">
                                <Select value={selectedRole[user.user_id] || ""} onValueChange={value => setSelectedRole({
                            ...selectedRole,
                            [user.user_id]: value as AppRole
                          })}>
                                  <SelectTrigger className="w-[160px] h-8 text-xs">
                                    <SelectValue placeholder="Selecionar..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {AVAILABLE_ROLES.filter(role => !user.roles?.includes(role.value)).map(role => <SelectItem key={role.value} value={role.value}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${role.color}`} />
                                          <span className="text-xs">{role.label}</span>
                                        </div>
                                      </SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" className="h-8 text-xs" onClick={() => handleAddRole(user.user_id)} disabled={!selectedRole[user.user_id]}>
                                  Adicionar
                                </Button>
                              </div>
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
                                  <DropdownMenuItem onClick={() => {}}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar Usuário
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button variant="ghost" size="icon" onClick={() => toggleRow(user.user_id)}>
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && <div className="px-4 pb-4 pt-2 bg-muted/20 border-t">
                              <div className="space-y-4">
                                {/* Todas as Permissões */}
                                <div>
                                  <div className="text-sm text-muted-foreground mb-2">Todas as Permissões</div>
                                  <div className="flex flex-wrap gap-2">
                                    {user.roles && user.roles.length > 0 ? user.roles.map(role => {
                              const roleInfo = getRoleInfo(role);
                              return <Badge key={role} variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ${roleInfo?.color}`} />
                                            <span>{roleInfo?.label}</span>
                                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full" onClick={() => handleRemoveRole(user.user_id, role)}>
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </Badge>;
                            }) : <span className="text-sm text-muted-foreground italic">
                                        Nenhuma permissão atribuída
                                      </span>}
                                  </div>
                                </div>

                                {/* Informações do Subordinado */}
                                {subordinados?.some(s => s.subordinado_id === user.user_id) && <div>
                                    <div className="text-sm text-muted-foreground mb-2">Hierarquia</div>
                                    <div className="text-sm">
                                      Este usuário é seu subordinado na hierarquia
                                    </div>
                                  </div>}
                              </div>
                            </div>}
                        </div>;
                })}
                  </div>

                  {/* Paginação */}
                  <div className="border-t bg-card p-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {total === 0 ? 0 : startIndex + 1} a {Math.min(endIndex, total)} de {total} usuários
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!canPreviousPage}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({
                      length: Math.min(5, totalPages)
                    }, (_, i) => {
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
                      return <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" onClick={() => setPage(pageNum)} className="w-9">
                              {pageNum}
                            </Button>;
                    })}
                      </div>
                      
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={!canNextPage}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>
        </div>

        {/* Dialogs de Metas por Vendedor */}
        {allUsers?.map(user => user.roles?.includes("sales") && <NovaMetaVendedorDialog key={user.user_id} open={metaDialogOpen[user.user_id] || false} onOpenChange={open => !open && handleCloseMetaDialog(user.user_id)} vendedorId={user.user_id} onCriar={async meta => {
        try {
          // Buscar equipe do vendedor se necessário
          let equipeId = meta.equipe_id;
          if (!equipeId) {
            const {
              data: membroEquipe
            } = await supabase.from("membros_equipe").select("equipe_id").eq("usuario_id", user.user_id).eq("esta_ativo", true).single();
            equipeId = membroEquipe?.equipe_id || undefined;
          }
          await criarMeta.mutateAsync({
            ...meta,
            equipe_id: equipeId
          });
          toast.success("Meta criada com sucesso", {
            description: `Meta de ${new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL"
            }).format(meta.meta_valor)} criada para ${user.email}`
          });
          handleCloseMetaDialog(user.user_id);
        } catch (error) {
          console.error("Erro ao criar meta:", error);
          toast.error("Erro ao criar meta", {
            description: "Não foi possível salvar a meta. Tente novamente."
          });
        }
      }} />)}

        {/* Dialogs de Editar Metas por Vendedor */}
        {allUsers?.map(user => user.roles?.includes("sales") && <EditarMetaVendedorDialog key={`editar-${user.user_id}`} open={editarMetaDialogOpen[user.user_id] || false} onOpenChange={open => !open && handleCloseEditarMetaDialog(user.user_id)} meta={metaSelecionada} onEditar={async (metaId, dados) => {
        try {
          await editarMeta.mutateAsync({
            metaId,
            dados,
            vendedorId: user.user_id
          });
          toast.success("Meta atualizada com sucesso", {
            description: `Meta de ${user.email} foi atualizada`
          });
          handleCloseEditarMetaDialog(user.user_id);
        } catch (error) {
          console.error("Erro ao editar meta:", error);
          toast.error("Erro ao atualizar meta", {
            description: "Não foi possível atualizar a meta. Tente novamente."
          });
        }
      }} onExcluir={async metaId => {
        try {
          await excluirMeta.mutateAsync({
            metaId,
            vendedorId: user.user_id
          });
          toast.success("Meta excluída com sucesso", {
            description: `Meta de ${user.email} foi removida`
          });
          handleCloseEditarMetaDialog(user.user_id);
        } catch (error) {
          console.error("Erro ao excluir meta:", error);
          toast.error("Erro ao excluir meta", {
            description: "Não foi possível excluir a meta. Tente novamente."
          });
        }
      }} />)}

        {/* Barra de Ações em Massa */}
        {selectedRows.size > 0 && <AcoesMassaBar selectedCount={selectedRows.size} onClearSelection={() => setSelectedRows(new Set())} onAdicionarPermissao={handleAdicionarPermissaoMassa} onRemoverPermissao={handleRemoverPermissaoMassa} />}

        {/* Avisos de Segurança */}
        
      </div>
    </Layout>;
}