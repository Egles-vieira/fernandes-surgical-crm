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
import { Shield, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CriarUsuarioDialog } from "@/components/usuario/CriarUsuarioDialog";

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
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header com gradiente */}
        <div className="gradient-primary rounded-xl p-8 shadow-elegant text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                <Shield className="h-10 w-10" />
                Gestão de Usuários
              </h1>
              <p className="text-white/90 text-lg">
                Gerencie usuários, permissões e equipes do sistema
              </p>
            </div>
            <CriarUsuarioDialog />
          </div>
        </div>

        {/* Legenda de Roles */}
        <Card className="border-0 shadow-elegant animate-slide-in-left">
          <CardHeader className="gradient-subtle border-b">
            <CardTitle className="text-xl">Roles Disponíveis</CardTitle>
            <CardDescription>
              Cada usuário pode ter múltiplos roles com diferentes permissões
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AVAILABLE_ROLES.map((role) => (
                <div 
                  key={role.value} 
                  className="flex items-start gap-3 p-4 border rounded-lg hover:shadow-md transition-all hover:scale-105 bg-gradient-to-br from-card to-muted/20"
                >
                  <div className={`w-4 h-4 rounded-full ${role.color} mt-1 shadow-sm`} />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{role.label}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{role.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="border-0 shadow-elegant animate-fade-in">
          <CardHeader className="gradient-subtle border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Usuários Cadastrados</CardTitle>
                <CardDescription className="mt-1">
                  {allUsers?.length || 0} usuários no sistema
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {allUsers?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoadingAllUsers ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Carregando usuários...</p>
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
                    <TableRow key={user.user_id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-foreground">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => {
                              const roleInfo = getRoleInfo(role);
                              return (
                                <Badge
                                  key={role}
                                  variant="secondary"
                                  className="flex items-center gap-2 px-3 py-1.5 hover:shadow-md transition-all"
                                >
                                  <div className={`w-2.5 h-2.5 rounded-full ${roleInfo?.color} shadow-sm`} />
                                  <span className="font-medium">{roleInfo?.label}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full"
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
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedRole[user.user_id] || ""}
                            onValueChange={(value) =>
                              setSelectedRole({ ...selectedRole, [user.user_id]: value as AppRole })
                            }
                          >
                            <SelectTrigger className="w-[220px] border-primary/20 focus:border-primary">
                              <SelectValue placeholder="Selecione uma role..." />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {AVAILABLE_ROLES.filter(
                                (role) => !user.roles?.includes(role.value)
                              ).map((role) => (
                                <SelectItem key={role.value} value={role.value} className="hover:bg-muted">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-3 h-3 rounded-full ${role.color} shadow-sm`} />
                                    <span className="font-medium">{role.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => handleAddRole(user.user_id)}
                            disabled={!selectedRole[user.user_id]}
                            className="bg-primary hover:bg-primary/90 shadow-sm"
                          >
                            Adicionar
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
