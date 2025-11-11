import { useState } from "react";
import { useRoles, AppRole } from "@/hooks/useRoles";
import { useHierarquia } from "@/hooks/useHierarquia";
import { useMetasVendedor } from "@/hooks/useMetasVendedor";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Shield, X, Loader2, Users, TrendingUp, Briefcase, UserCheck, Target, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CriarUsuarioSheet } from "@/components/usuario/CriarUsuarioSheet";
import { EditarUsuarioSheet } from "@/components/usuario/EditarUsuarioSheet";
import { NovaMetaVendedorDialog } from "@/components/equipes/NovaMetaVendedorDialog";
import { EditarMetaVendedorDialog } from "@/components/equipes/EditarMetaVendedorDialog";
import { useToast } from "@/hooks/use-toast";
import type { MetaVendedor } from "@/hooks/useMetasVendedor";
import { UsuariosFilters } from "@/components/usuario/UsuariosFilters";

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string; color: string }[] = [
  {
    value: "admin",
    label: "Administrador",
    description: "Acesso total ao sistema",
    color: "bg-destructive",
  },
  {
    value: "lider",
    label: "Líder de Equipe",
    description: "Gerenciar equipe de vendas, aprovar descontos",
    color: "bg-secondary",
  },
  {
    value: "manager",
    label: "Gerente",
    description: "Gerenciar produtos, relatórios e equipe",
    color: "bg-accent",
  },
  {
    value: "sales",
    label: "Vendedor",
    description: "Gerenciar clientes e oportunidades",
    color: "bg-primary",
  },
  {
    value: "backoffice",
    label: "Backoffice",
    description: "Suporte operacional ao vendedor",
    color: "bg-[hsl(var(--tertiary))]",
  },
  {
    value: "warehouse",
    label: "Estoque",
    description: "Gerenciar inventário",
    color: "bg-[hsl(var(--success))]",
  },
  {
    value: "support",
    label: "Suporte",
    description: "Atendimento ao cliente",
    color: "bg-[hsl(var(--warning))]",
  },
];

export default function Usuarios() {
  const { allUsers, isLoadingAllUsers, addRole, removeRole, isAdmin } = useRoles();
  const { toast } = useToast();
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
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: AppRole }>({});
  const [metaDialogOpen, setMetaDialogOpen] = useState<{ [key: string]: boolean }>({});
  const [editarMetaDialogOpen, setEditarMetaDialogOpen] = useState<{ [key: string]: boolean }>({});
  const [metaSelecionada, setMetaSelecionada] = useState<MetaVendedor | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "todos">("todos");

  // Hook para carregar metas de um vendedor específico quando necessário
  const useVendedorMetas = (vendedorId: string) => {
    return useMetasVendedor(vendedorId);
  };

  // Hook global para criar, editar e excluir metas
  const { criarMeta, editarMeta, excluirMeta } = useMetasVendedor();

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Alert className="max-w-md">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários e permissões.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const handleAddRole = async (userId: string) => {
    const role = selectedRole[userId];
    if (!role) return;

    await addRole.mutateAsync({ userId, role });
    setSelectedRole({ ...selectedRole, [userId]: "" as AppRole });
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (confirm(`Tem certeza que deseja remover a permissão "${AVAILABLE_ROLES.find(r => r.value === role)?.label}"?`)) {
      await removeRole.mutateAsync({ userId, role });
    }
  };

  const getRoleInfo = (role: AppRole) => {
    return AVAILABLE_ROLES.find((r) => r.value === role);
  };

  const handleOpenMetaDialog = (userId: string) => {
    setMetaDialogOpen({ ...metaDialogOpen, [userId]: true });
  };

  const handleCloseMetaDialog = (userId: string) => {
    setMetaDialogOpen({ ...metaDialogOpen, [userId]: false });
  };

  const handleOpenEditarMetaDialog = (userId: string, meta: MetaVendedor) => {
    setMetaSelecionada(meta);
    setEditarMetaDialogOpen({ ...editarMetaDialogOpen, [userId]: true });
  };

  const handleCloseEditarMetaDialog = (userId: string) => {
    setEditarMetaDialogOpen({ ...editarMetaDialogOpen, [userId]: false });
    setMetaSelecionada(null);
  };

  // Componente para exibir metas do vendedor
  const MetasVendedorCell = ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
    const isSales = roles?.includes("sales");
    const { metas, isLoading } = useVendedorMetas(userId);

    if (!isSales) {
      return (
        <span className="text-xs text-muted-foreground italic">
          Não é vendedor
        </span>
      );
    }

    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    const metasAtivas = metas?.filter(m => m.status === "ativa") || [];

    return (
      <div className="space-y-2">
        {metasAtivas.length > 0 ? (
          <div className="space-y-1">
            {metasAtivas.map((meta) => {
              const percentual = meta.meta_valor > 0 
                ? ((meta.valor_atual || 0) / meta.meta_valor) * 100 
                : 0;
              
              return (
                <div 
                  key={meta.id} 
                  className="text-xs cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
                  onClick={() => handleOpenEditarMetaDialog(userId, meta)}
                >
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-primary" />
                    <span className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                      }).format(meta.meta_valor)}
                    </span>
                    <Badge 
                      variant={percentual >= 100 ? "default" : percentual >= 80 ? "secondary" : "destructive"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {percentual.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Sem metas ativas
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 mt-1"
          onClick={() => handleOpenMetaDialog(userId)}
        >
          <Plus className="h-3 w-3" />
          {metasAtivas.length > 0 ? "Adicionar Meta" : "Criar Meta"}
        </Button>
      </div>
    );
  };

  // Filtrar usuários
  const filteredUsers = allUsers?.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "todos" || 
      user.roles?.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  return (
    <Layout>
      <div className="h-full overflow-hidden flex flex-col">
        {/* Filtros fixos */}
        <UsuariosFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          roleFilter={roleFilter}
          onRoleChange={setRoleFilter}
          totalUsuarios={filteredUsers?.length || 0}
        />

        {/* Tabela de Usuários com padding-top para compensar filtro fixo */}
        <div className="flex-1 overflow-auto p-6" style={{ paddingTop: '84px' }}>
          <Card className="flex flex-col">
            <CardContent className="flex-1 flex flex-col p-0">
            {isLoadingAllUsers ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : filteredUsers && filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Metas</TableHead>
                      <TableHead>Adicionar Permissão</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow key={user.user_id} className="hover:bg-muted/30 transition-colors">
                         <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{user.email}</div>
                            {subordinados?.some(s => s.subordinado_id === user.user_id) && (
                              <Badge variant="outline" className="text-xs">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Subordinado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => {
                                const roleInfo = getRoleInfo(role);
                                return (
                                  <Badge
                                    key={role}
                                    variant="secondary"
                                    className="flex items-center gap-2 px-3 py-1.5"
                                  >
                                    <div className={`w-2.5 h-2.5 rounded-full ${roleInfo?.color}`} />
                                    <span>{roleInfo?.label}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 ml-1 hover:bg-destructive/10 hover:text-destructive rounded-full"
                                      onClick={() => handleRemoveRole(user.user_id, role)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-sm text-muted-foreground italic">
                                Nenhuma permissão atribuída
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <MetasVendedorCell userId={user.user_id} roles={user.roles || []} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedRole[user.user_id] || ""}
                              onValueChange={(value) =>
                                setSelectedRole({ ...selectedRole, [user.user_id]: value as AppRole })
                              }
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Selecione uma role..." />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_ROLES.filter(
                                  (role) => !user.roles?.includes(role.value)
                                ).map((role) => (
                                  <SelectItem key={role.value} value={role.value}>
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-3 h-3 rounded-full ${role.color}`} />
                                      <span>{role.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => handleAddRole(user.user_id)}
                              disabled={!selectedRole[user.user_id]}
                            >
                              Adicionar
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EditarUsuarioSheet
                            userId={user.user_id}
                            userEmail={user.email}
                            currentRoles={user.roles || []}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Dialogs de Metas por Vendedor */}
        {allUsers?.map((user) => (
          user.roles?.includes("sales") && (
            <NovaMetaVendedorDialog
              key={user.user_id}
              open={metaDialogOpen[user.user_id] || false}
              onOpenChange={(open) => !open && handleCloseMetaDialog(user.user_id)}
              vendedorId={user.user_id}
              onCriar={async (meta) => {
                try {
                  // Buscar equipe do vendedor se necessário
                  let equipeId = meta.equipe_id;
                  
                  if (!equipeId) {
                    const { data: membroEquipe } = await supabase
                      .from("membros_equipe")
                      .select("equipe_id")
                      .eq("usuario_id", user.user_id)
                      .eq("esta_ativo", true)
                      .single();
                    
                    equipeId = membroEquipe?.equipe_id || undefined;
                  }
                  
                  await criarMeta.mutateAsync({
                    ...meta,
                    equipe_id: equipeId,
                  });
                  
                  toast.success("Meta criada com sucesso", {
                    description: `Meta de ${new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(meta.meta_valor)} criada para ${user.email}`,
                  });
                  handleCloseMetaDialog(user.user_id);
                } catch (error) {
                  console.error("Erro ao criar meta:", error);
                  toast.error("Erro ao criar meta", {
                    description: "Não foi possível salvar a meta. Tente novamente.",
                  });
                }
              }}
            />
          )
        ))}

        {/* Dialogs de Editar Metas por Vendedor */}
        {allUsers?.map((user) => (
          user.roles?.includes("sales") && (
            <EditarMetaVendedorDialog
              key={`editar-${user.user_id}`}
              open={editarMetaDialogOpen[user.user_id] || false}
              onOpenChange={(open) => !open && handleCloseEditarMetaDialog(user.user_id)}
              meta={metaSelecionada}
              onEditar={async (metaId, dados) => {
                try {
                  await editarMeta.mutateAsync({ metaId, dados, vendedorId: user.user_id });
                  toast.success("Meta atualizada com sucesso", {
                    description: `Meta de ${user.email} foi atualizada`,
                  });
                  handleCloseEditarMetaDialog(user.user_id);
                } catch (error) {
                  console.error("Erro ao editar meta:", error);
                  toast.error("Erro ao atualizar meta", {
                    description: "Não foi possível atualizar a meta. Tente novamente.",
                  });
                }
              }}
              onExcluir={async (metaId) => {
                try {
                  await excluirMeta.mutateAsync({ metaId, vendedorId: user.user_id });
                  toast.success("Meta excluída com sucesso", {
                    description: `Meta de ${user.email} foi removida`,
                  });
                  handleCloseEditarMetaDialog(user.user_id);
                } catch (error) {
                  console.error("Erro ao excluir meta:", error);
                  toast.error("Erro ao excluir meta", {
                    description: "Não foi possível excluir a meta. Tente novamente.",
                  });
                }
              }}
            />
          )
        ))}

        {/* Avisos de Segurança */}
        <Alert className="border-primary/20 bg-primary/5 shadow-sm">
          <Shield className="h-5 w-5 text-primary" />
          <AlertDescription className="text-foreground">
            <strong className="text-primary">Importante:</strong> Alterações de permissões têm efeito imediato. 
            Usuários precisarão fazer logout e login novamente para que as novas permissões sejam aplicadas completamente.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
}
