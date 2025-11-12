import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2 } from "lucide-react";
import { AppRole } from "@/hooks/useRoles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string; color: string }[] = [
  { value: "admin", label: "Administrador", description: "Acesso total ao sistema", color: "bg-destructive" },
  { value: "lider", label: "Líder de Equipe", description: "Gerenciar equipe de vendas", color: "bg-secondary" },
  { value: "manager", label: "Gerente", description: "Gerenciar produtos e relatórios", color: "bg-accent" },
  { value: "sales", label: "Vendedor", description: "Gerenciar clientes e oportunidades", color: "bg-primary" },
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

interface EditarUsuarioDialogProps {
  userId: string;
  userEmail: string;
  currentRoles: AppRole[];
}

export function EditarUsuarioDialog({ userId, userEmail, currentRoles }: EditarUsuarioDialogProps) {
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

  // Buscar perfil do usuário
  const { data: perfil, isLoading: loadingPerfil } = useQuery({
    queryKey: ["user-profile-edit", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_usuario")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data;
    },
    enabled: open,
  });

  // Buscar vendedores para vincular backoffice
  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sales");
      
      if (error) throw error;
      
      const userIds = data.map(r => r.user_id);
      const { data: perfis } = await supabase
        .from("perfis_usuario")
        .select("id, primeiro_nome, sobrenome")
        .in("id", userIds);
      
      return perfis || [];
    },
    enabled: open && selectedRoles.includes("backoffice"),
  });

  // Buscar equipes para vincular líderes
  const { data: equipes } = useQuery({
    queryKey: ["equipes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("*")
        .eq("esta_ativa", true)
        .order("nome");
      
      if (error) throw error;
      return data;
    },
    enabled: open && selectedRoles.includes("lider"),
  });

  // Carregar dados do perfil quando o diálogo abrir
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

  // Resetar roles quando o diálogo abrir
  useEffect(() => {
    if (open) {
      setSelectedRoles(currentRoles);
    }
  }, [open, currentRoles]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: { profile: ProfileData; roles: AppRole[] }) => {
      // Atualizar perfil
      const { error: profileError } = await supabase
        .from("perfis_usuario")
        .upsert({
          id: userId,
          ...data.profile,
          atualizado_em: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // Atualizar roles - remover roles antigas e adicionar novas
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] border-0 shadow-elegant">
        <DialogHeader className="gradient-subtle pb-4 -mt-6 -mx-6 px-6 pt-6 rounded-t-xl">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Edit className="h-6 w-6 text-primary" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription className="text-base">
            Atualize as informações de <strong>{userEmail}</strong>
          </DialogDescription>
        </DialogHeader>

        {loadingPerfil ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-4 pb-5 border-b border-border/50">
              <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-md">
                <AvatarImage src={profileData.foto_perfil_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white">
                  <Edit className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="foto" className="text-sm font-semibold">URL da Foto de Perfil</Label>
                <Input
                  id="foto"
                  type="url"
                  value={profileData.foto_perfil_url}
                  onChange={(e) => setProfileData({...profileData, foto_perfil_url: e.target.value})}
                  placeholder="https://exemplo.com/foto.jpg"
                  disabled={updateUserMutation.isPending}
                  className="mt-1.5 border-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primeiro_nome" className="text-sm font-semibold">Primeiro Nome</Label>
                <Input
                  id="primeiro_nome"
                  value={profileData.primeiro_nome}
                  onChange={(e) => setProfileData({...profileData, primeiro_nome: e.target.value})}
                  placeholder="Nome"
                  disabled={updateUserMutation.isPending}
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sobrenome" className="text-sm font-semibold">Sobrenome</Label>
                <Input
                  id="sobrenome"
                  value={profileData.sobrenome}
                  onChange={(e) => setProfileData({...profileData, sobrenome: e.target.value})}
                  placeholder="Sobrenome"
                  disabled={updateUserMutation.isPending}
                  className="border-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="celular" className="text-sm font-semibold">Número Celular</Label>
                <Input
                  id="celular"
                  value={profileData.numero_celular}
                  onChange={(e) => setProfileData({...profileData, numero_celular: e.target.value})}
                  placeholder="(00) 00000-0000"
                  disabled={updateUserMutation.isPending}
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-sm font-semibold">Telefone</Label>
                <Input
                  id="telefone"
                  value={profileData.telefone}
                  onChange={(e) => setProfileData({...profileData, telefone: e.target.value})}
                  placeholder="(00) 0000-0000"
                  disabled={updateUserMutation.isPending}
                  className="border-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ramal" className="text-sm font-semibold">Ramal</Label>
                <Input
                  id="ramal"
                  value={profileData.ramal}
                  onChange={(e) => setProfileData({...profileData, ramal: e.target.value})}
                  placeholder="000"
                  disabled={updateUserMutation.isPending}
                  className="border-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo" className="text-sm font-semibold">Código de Vendedor</Label>
                <Input
                  id="codigo"
                  value={profileData.codigo_vendedor}
                  onChange={(e) => setProfileData({...profileData, codigo_vendedor: e.target.value})}
                  placeholder="COD-000"
                  disabled={updateUserMutation.isPending}
                  className="border-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo" className="text-sm font-semibold">Cargo</Label>
              <Input
                id="cargo"
                value={profileData.cargo}
                onChange={(e) => setProfileData({...profileData, cargo: e.target.value})}
                placeholder="Ex: Gerente de Vendas"
                disabled={updateUserMutation.isPending}
                className="border-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Permissões</Label>
              <div className="space-y-2 border border-primary/20 rounded-lg p-4 max-h-64 overflow-y-auto custom-scrollbar bg-muted/20">
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
                      className="mt-1 border-primary/40 data-[state=checked]:bg-primary"
                    />
                    <div className="grid gap-1.5 flex-1">
                      <label
                        htmlFor={`edit-${role.value}`}
                        className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                      >
                        {role.label}
                        <span className={`w-2 h-2 rounded-full ${role.color}`} />
                      </label>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateUserMutation.isPending}
                className="px-6"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateUserMutation.isPending}
                className="px-6 bg-primary hover:bg-primary/90 shadow-md"
              >
                {updateUserMutation.isPending && (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
