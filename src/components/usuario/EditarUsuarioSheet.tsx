import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2 } from "lucide-react";
import { AppRole } from "@/hooks/useRoles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string; color: string }[] = [
  { value: "admin", label: "Administrador", description: "Acesso total ao sistema", color: "bg-destructive" },
  { value: "lider", label: "Líder / Coordenador", description: "Gerenciar equipe de vendas", color: "bg-secondary" },
  { value: "manager", label: "Gerente", description: "Gerenciar produtos e relatórios", color: "bg-accent" },
  { value: "sales", label: "Representante Comercial", description: "Gerenciar clientes e oportunidades", color: "bg-primary" },
  { value: "backoffice", label: "Backoffice", description: "Suporte operacional", color: "bg-[hsl(var(--tertiary))]" },
  { value: "warehouse", label: "Estoque", description: "Gerenciar inventário", color: "bg-[hsl(var(--success))]" },
  { value: "support", label: "Suporte", description: "Atendimento ao cliente", color: "bg-[hsl(var(--warning))]" },
];

interface ProfileData {
  primeiro_nome: string;
  sobrenome: string;
  foto_perfil_url: string;
  numero_celular: string;
  telefone: string;
  ramal: string;
  codigo_vendedor: string;
  cargo: string;
}

interface EditarUsuarioSheetProps {
  userId: string;
  userEmail: string;
  currentRoles: AppRole[];
}

export function EditarUsuarioSheet({ userId, userEmail, currentRoles }: EditarUsuarioSheetProps) {
  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(currentRoles);
  const [profileData, setProfileData] = useState<ProfileData>({
    primeiro_nome: "",
    sobrenome: "",
    foto_perfil_url: "",
    numero_celular: "",
    telefone: "",
    ramal: "",
    codigo_vendedor: "",
    cargo: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: perfil, isLoading: loadingPerfil } = useQuery({
    queryKey: ["user-profile-edit", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_usuario")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (perfil) {
      setProfileData({
        primeiro_nome: perfil.primeiro_nome || "",
        sobrenome: perfil.sobrenome || "",
        foto_perfil_url: perfil.foto_perfil_url || "",
        numero_celular: perfil.numero_celular || "",
        telefone: perfil.telefone || "",
        ramal: perfil.ramal || "",
        codigo_vendedor: perfil.codigo_vendedor || "",
        cargo: perfil.cargo || "",
      });
    }
  }, [perfil]);

  useEffect(() => {
    if (open) {
      setSelectedRoles(currentRoles);
    }
  }, [open, currentRoles]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: { profile: ProfileData; roles: AppRole[] }) => {
      const { error: profileError } = await supabase
        .from("perfis_usuario")
        .upsert({
          id: userId,
          ...data.profile,
          atualizado_em: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      if (data.roles.length > 0) {
        const { error: rolesError } = await supabase
          .from("user_roles")
          .insert(
            data.roles.map(role => ({
              user_id: userId,
              role,
            }))
          );

        if (rolesError) throw rolesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-edit", userId] });
      toast({
        title: "Usuário atualizado",
        description: "As informações foram atualizadas com sucesso",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate({
      profile: profileData,
      roles: selectedRoles,
    });
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-3 pb-6 border-b">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <Edit className="h-6 w-6 text-primary" />
            Editar Usuário
          </SheetTitle>
          <SheetDescription className="text-base">
            Atualize as informações de <strong>{userEmail}</strong>
          </SheetDescription>
        </SheetHeader>

        {loadingPerfil ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            <div className="flex items-center gap-4 pb-5 border-b">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                <AvatarImage src={profileData.foto_perfil_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Edit className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="foto">URL da Foto de Perfil</Label>
                <Input
                  id="foto"
                  type="url"
                  value={profileData.foto_perfil_url}
                  onChange={(e) => setProfileData({...profileData, foto_perfil_url: e.target.value})}
                  placeholder="https://exemplo.com/foto.jpg"
                  disabled={updateUserMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primeiro_nome">Primeiro Nome</Label>
                <Input
                  id="primeiro_nome"
                  value={profileData.primeiro_nome}
                  onChange={(e) => setProfileData({...profileData, primeiro_nome: e.target.value})}
                  placeholder="Nome"
                  disabled={updateUserMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sobrenome">Sobrenome</Label>
                <Input
                  id="sobrenome"
                  value={profileData.sobrenome}
                  onChange={(e) => setProfileData({...profileData, sobrenome: e.target.value})}
                  placeholder="Sobrenome"
                  disabled={updateUserMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="celular">Número Celular</Label>
                <Input
                  id="celular"
                  value={profileData.numero_celular}
                  onChange={(e) => setProfileData({...profileData, numero_celular: e.target.value})}
                  placeholder="(00) 00000-0000"
                  disabled={updateUserMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={profileData.telefone}
                  onChange={(e) => setProfileData({...profileData, telefone: e.target.value})}
                  placeholder="(00) 0000-0000"
                  disabled={updateUserMutation.isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ramal">Ramal</Label>
                <Input
                  id="ramal"
                  value={profileData.ramal}
                  onChange={(e) => setProfileData({...profileData, ramal: e.target.value})}
                  placeholder="000"
                  disabled={updateUserMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código de Vendedor</Label>
                <Input
                  id="codigo"
                  value={profileData.codigo_vendedor}
                  onChange={(e) => setProfileData({...profileData, codigo_vendedor: e.target.value})}
                  placeholder="COD-000"
                  disabled={updateUserMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={profileData.cargo}
                onChange={(e) => setProfileData({...profileData, cargo: e.target.value})}
                placeholder="Ex: Gerente de Vendas"
                disabled={updateUserMutation.isPending}
              />
            </div>

            <div className="space-y-3">
              <Label>Permissões</Label>
              <div className="space-y-2 border rounded-lg p-4 max-h-64 overflow-y-auto bg-muted/20">
                {AVAILABLE_ROLES.map((role) => (
                  <div 
                    key={role.value} 
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`edit-${role.value}`}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                      disabled={updateUserMutation.isPending}
                    />
                    <div className="grid gap-1.5 flex-1">
                      <label
                        htmlFor={`edit-${role.value}`}
                        className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                      >
                        {role.label}
                        <span className={`w-2 h-2 rounded-full ${role.color}`} />
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateUserMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending && (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
