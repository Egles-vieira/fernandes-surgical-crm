import { useState } from "react";
import { useRoles, AppRole } from "@/hooks/useRoles";
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
import { Shield, UserPlus, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string; color: string }[] = [
  {
    value: "admin",
    label: "Administrador",
    description: "Acesso total ao sistema",
    color: "bg-red-500",
  },
  {
    value: "lider",
    label: "Líder de Equipe",
    description: "Gerenciar equipe de vendas, aprovar descontos",
    color: "bg-indigo-500",
  },
  {
    value: "manager",
    label: "Gerente",
    description: "Gerenciar produtos, relatórios e equipe",
    color: "bg-purple-500",
  },
  {
    value: "sales",
    label: "Vendedor",
    description: "Gerenciar clientes e oportunidades",
    color: "bg-blue-500",
  },
  {
    value: "backoffice",
    label: "Backoffice",
    description: "Suporte operacional ao vendedor",
    color: "bg-cyan-500",
  },
  {
    value: "warehouse",
    label: "Estoque",
    description: "Gerenciar inventário",
    color: "bg-green-500",
  },
  {
    value: "support",
    label: "Suporte",
    description: "Atendimento ao cliente",
    color: "bg-orange-500",
  },
];

export default function Usuarios() {
  const { allUsers, isLoadingAllUsers, addRole, removeRole, isAdmin } = useRoles();
  const [selectedRole, setSelectedRole] = useState<{ [key: string]: AppRole }>({}); 

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

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestão de Usuários e Permissões
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie roles e permissões dos usuários do sistema
          </p>
        </div>

        {/* Legenda de Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Roles Disponíveis</CardTitle>
            <CardDescription>
              Cada usuário pode ter múltiplos roles com diferentes permissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${role.color} mt-1.5`} />
                  <div>
                    <p className="font-semibold">{role.label}</p>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>
              {allUsers?.length || 0} usuários cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAllUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Adicionar Permissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers?.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => {
                              const roleInfo = getRoleInfo(role);
                              return (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  <div className={`w-2 h-2 rounded-full ${roleInfo?.color}`} />
                                  {roleInfo?.label}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                                    onClick={() => handleRemoveRole(user.user_id, role)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Nenhuma permissão
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedRole[user.user_id] || ""}
                            onValueChange={(value) =>
                              setSelectedRole({ ...selectedRole, [user.user_id]: value as AppRole })
                            }
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_ROLES.filter(
                                (role) => !user.roles?.includes(role.value)
                              ).map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${role.color}`} />
                                    {role.label}
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
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Avisos de Segurança */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Alterações de permissões têm efeito imediato. Usuários precisarão
            fazer logout e login novamente para que as novas permissões sejam aplicadas completamente.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
}
