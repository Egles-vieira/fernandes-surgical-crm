import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Mail, Phone, Briefcase, Camera, Loader2, Save } from "lucide-react";

interface ProfileData {
  primeiro_nome: string;
  sobrenome: string;
  telefone?: string;
  celular?: string;
  cargo?: string;
  foto_perfil_url?: string;
}

export default function MeuPerfil() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    primeiro_nome: "",
    sobrenome: "",
    telefone: "",
    celular: "",
    cargo: "",
    foto_perfil_url: "",
  });

  // Buscar perfil do usuário
  const { data: perfil, isLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("perfis_usuario")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar roles do usuário
  const { data: rolesData } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const roles = rolesData?.map((item: any) => item.role) || [];

  // Preencher dados quando perfil carregar
  useEffect(() => {
    if (perfil) {
      setProfileData({
        primeiro_nome: perfil.primeiro_nome || "",
        sobrenome: perfil.sobrenome || "",
        telefone: perfil.telefone || "",
        celular: perfil.celular || "",
        cargo: perfil.cargo || "",
        foto_perfil_url: perfil.foto_perfil_url || "",
      });
    }
  }, [perfil]);

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("perfis_usuario")
        .upsert({
          id: user.id,
          ...data,
          atualizado_em: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar perfil", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="gradient-primary rounded-xl p-8 shadow-elegant text-white">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-white/30 shadow-lg">
              {profileData.foto_perfil_url ? (
                <AvatarImage src={profileData.foto_perfil_url} alt="Foto do perfil" />
              ) : null}
              <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                {profileData.primeiro_nome?.substring(0, 1).toUpperCase() || ""}
                {profileData.sobrenome?.substring(0, 1).toUpperCase() || ""}
                {!profileData.primeiro_nome && (user?.email?.substring(0, 2).toUpperCase() || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {profileData.primeiro_nome} {profileData.sobrenome || ""}
              </h1>
              <p className="text-white/90 text-lg mb-3">{user?.email}</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="bg-white/20 text-white border-0">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de Perfil */}
        <Card className="border-0 shadow-elegant">
          <CardHeader className="gradient-subtle border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Informações do Perfil
                </CardTitle>
                <CardDescription className="mt-1">
                  {isEditing ? "Edite seus dados pessoais" : "Visualize e edite suas informações"}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Editar Perfil
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primeiro_nome">Primeiro Nome *</Label>
                  <Input
                    id="primeiro_nome"
                    value={profileData.primeiro_nome}
                    onChange={(e) => setProfileData({ ...profileData, primeiro_nome: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome *</Label>
                  <Input
                    id="sobrenome"
                    value={profileData.sobrenome}
                    onChange={(e) => setProfileData({ ...profileData, sobrenome: e.target.value })}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>

              <Separator />

              {/* Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    value={profileData.telefone}
                    onChange={(e) => setProfileData({ ...profileData, telefone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Celular
                  </Label>
                  <Input
                    id="celular"
                    value={profileData.celular}
                    onChange={(e) => setProfileData({ ...profileData, celular: e.target.value })}
                    disabled={!isEditing}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <Label htmlFor="cargo" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Cargo
                </Label>
                <Input
                  id="cargo"
                  value={profileData.cargo}
                  onChange={(e) => setProfileData({ ...profileData, cargo: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Seu cargo na empresa"
                />
              </div>

              <Separator />

              {/* Foto do Perfil */}
              <div className="space-y-2">
                <Label htmlFor="foto_perfil_url" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  URL da Foto de Perfil
                </Label>
                <Input
                  id="foto_perfil_url"
                  value={profileData.foto_perfil_url}
                  onChange={(e) => setProfileData({ ...profileData, foto_perfil_url: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>

              {/* Botões de Ação */}
              {isEditing && (
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      if (perfil) {
                        setProfileData({
                          primeiro_nome: perfil.primeiro_nome || "",
                          sobrenome: perfil.sobrenome || "",
                          telefone: perfil.telefone || "",
                          celular: perfil.celular || "",
                          cargo: perfil.cargo || "",
                          foto_perfil_url: perfil.foto_perfil_url || "",
                        });
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        <Card className="border-0 shadow-elegant">
          <CardHeader className="gradient-subtle border-b">
            <CardTitle className="text-xl">Informações da Conta</CardTitle>
            <CardDescription>Dados de autenticação e acesso</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Email de Login</Label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ID do Usuário</Label>
                <p className="font-mono text-sm">{user?.id}</p>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">Permissões</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma permissão atribuída</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
