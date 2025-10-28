import { useState } from "react";
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
import { UserPlus, Loader2, Upload } from "lucide-react";
import { AppRole } from "@/hooks/useRoles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Administrador", description: "Acesso total ao sistema" },
  { value: "lider", label: "Líder de Equipe", description: "Gerenciar equipe de vendas" },
  { value: "manager", label: "Gerente", description: "Gerenciar produtos e relatórios" },
  { value: "sales", label: "Vendedor", description: "Gerenciar clientes e oportunidades" },
  { value: "backoffice", label: "Backoffice", description: "Suporte operacional" },
  { value: "warehouse", label: "Estoque", description: "Gerenciar inventário" },
  { value: "support", label: "Suporte", description: "Atendimento ao cliente" },
];

interface ProfileData {
  nome_exibicao: string;
  foto_perfil_url: string;
  numero_celular: string;
  telefone: string;
  ramal: string;
  codigo_vendedor: string;
  cargo: string;
  vendedor_vinculado_id?: string;
  equipe_id?: string;
}

export function CriarUsuarioDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [profileData, setProfileData] = useState<ProfileData>({
    nome_exibicao: "",
    foto_perfil_url: "",
    numero_celular: "",
    telefone: "",
    ramal: "",
    codigo_vendedor: "",
    cargo: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar vendedores para vincular backoffice
  const { data: vendedores } = useQuery({
    queryKey: ["vendedores-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sales");
      
      if (error) throw error;
      
      // Buscar perfis dos vendedores
      const userIds = data.map(r => r.user_id);
      const { data: perfis } = await supabase
        .from("perfis_usuario")
        .select("id, primeiro_nome, sobrenome")
        .in("id", userIds);
      
      return perfis || [];
    },
    enabled: selectedRoles.includes("backoffice"),
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
    enabled: selectedRoles.includes("lider"),
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { 
      email: string; 
      password: string; 
      roles: AppRole[];
      profile: ProfileData;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar usuário");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users-roles"] });
      toast({
        title: "Usuário criado",
        description: "Usuário criado com sucesso",
      });
      setOpen(false);
      setEmail("");
      setPassword("");
      setSelectedRoles([]);
      setProfileData({
        nome_exibicao: "",
        foto_perfil_url: "",
        numero_celular: "",
        telefone: "",
        ramal: "",
        codigo_vendedor: "",
        cargo: "",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Email e senha são obrigatórios",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha deve ter no mínimo 6 caracteres",
      });
      return;
    }

    createUserMutation.mutate({ 
      email, 
      password, 
      roles: selectedRoles,
      profile: profileData,
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
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Criar Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo usuário no sistema
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileData.foto_perfil_url} />
              <AvatarFallback>
                <UserPlus className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="foto">URL da Foto de Perfil</Label>
              <Input
                id="foto"
                type="url"
                value={profileData.foto_perfil_url}
                onChange={(e) => setProfileData({...profileData, foto_perfil_url: e.target.value})}
                placeholder="https://..."
                disabled={createUserMutation.isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                disabled={createUserMutation.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={createUserMutation.isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome de Exibição</Label>
            <Input
              id="nome"
              value={profileData.nome_exibicao}
              onChange={(e) => setProfileData({...profileData, nome_exibicao: e.target.value})}
              placeholder="Nome completo"
              disabled={createUserMutation.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="celular">Número Celular</Label>
              <Input
                id="celular"
                value={profileData.numero_celular}
                onChange={(e) => setProfileData({...profileData, numero_celular: e.target.value})}
                placeholder="(00) 00000-0000"
                disabled={createUserMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={profileData.telefone}
                onChange={(e) => setProfileData({...profileData, telefone: e.target.value})}
                placeholder="(00) 0000-0000"
                disabled={createUserMutation.isPending}
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
                disabled={createUserMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Código de Vendedor</Label>
              <Input
                id="codigo"
                value={profileData.codigo_vendedor}
                onChange={(e) => setProfileData({...profileData, codigo_vendedor: e.target.value})}
                placeholder="COD-000"
                disabled={createUserMutation.isPending}
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
              disabled={createUserMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissões</Label>
            <div className="space-y-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-start space-x-2">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                    disabled={createUserMutation.isPending}
                  />
                  <div className="grid gap-1">
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.label}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedRoles.includes("backoffice") && (
            <div className="space-y-2">
              <Label htmlFor="vendedor">Vendedor Vinculado</Label>
              <Select
                value={profileData.vendedor_vinculado_id}
                onValueChange={(value) => setProfileData({...profileData, vendedor_vinculado_id: value})}
                disabled={createUserMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendedores?.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.primeiro_nome} {vendedor.sobrenome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedRoles.includes("lider") && (
            <div className="space-y-2">
              <Label htmlFor="equipe">Equipe de Vendas</Label>
              <Select
                value={profileData.equipe_id}
                onValueChange={(value) => setProfileData({...profileData, equipe_id: value})}
                disabled={createUserMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe..." />
                </SelectTrigger>
                <SelectContent>
                  {equipes?.map((equipe) => (
                    <SelectItem key={equipe.id} value={equipe.id}>
                      {equipe.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Usuário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}