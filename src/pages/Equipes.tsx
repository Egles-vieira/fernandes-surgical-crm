import { useState } from "react";
import Layout from "@/components/Layout";
import { useEquipes } from "@/hooks/useEquipes";
import { useRoles } from "@/hooks/useRoles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, UserPlus, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NovaEquipeForm {
  nome: string;
  descricao: string;
  lider_equipe_id: string;
  tipo_equipe: string;
}

export default function Equipes() {
  const { equipes, isLoading, criarEquipe, adicionarMembro, removerMembro, useMembrosEquipe } = useEquipes();
  const { allUsers, isAdmin, isLider } = useRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEquipe, setSelectedEquipe] = useState<string | null>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NovaEquipeForm>();

  const { data: membros } = useMembrosEquipe(selectedEquipe || undefined);

  if (!isAdmin && !isLider) {
    return (
      <Layout>
        <Alert>
          <AlertDescription>
            Você não tem permissão para acessar esta página.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const onSubmit = async (data: NovaEquipeForm) => {
    await criarEquipe.mutateAsync({
      ...data,
      esta_ativa: true,
    });
    setDialogOpen(false);
    reset();
  };

  const handleAdicionarMembro = async () => {
    if (!selectedEquipe || !selectedUsuario) return;
    
    await adicionarMembro.mutateAsync({
      equipeId: selectedEquipe,
      usuarioId: selectedUsuario,
    });
    setSelectedUsuario("");
  };

  const handleRemoverMembro = async (usuarioId: string) => {
    if (!selectedEquipe) return;
    
    if (confirm("Tem certeza que deseja remover este membro da equipe?")) {
      await removerMembro.mutateAsync({
        equipeId: selectedEquipe,
        usuarioId,
      });
    }
  };

  // Filtrar apenas usuários com role de lider para seleção de líder
  const lideres = allUsers?.filter(user => user.roles?.includes('lider')) || [];

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Gestão de Equipes
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie equipes e seus membros
            </p>
          </div>

          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Equipe
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Equipe</DialogTitle>
                    <DialogDescription>
                      Preencha os dados da nova equipe
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Equipe*</Label>
                      <Input
                        id="nome"
                        {...register("nome", { required: "Nome é obrigatório" })}
                        placeholder="Ex: Vendas Sul"
                      />
                      {errors.nome && (
                        <p className="text-sm text-destructive">{errors.nome.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        {...register("descricao")}
                        placeholder="Descreva os objetivos e responsabilidades da equipe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lider">Líder da Equipe*</Label>
                      <Select
                        onValueChange={(value) => register("lider_equipe_id").onChange({ target: { value } })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um líder" />
                        </SelectTrigger>
                        <SelectContent>
                          {lideres.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.lider_equipe_id && (
                        <p className="text-sm text-destructive">{errors.lider_equipe_id.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Equipe</Label>
                      <Select
                        onValueChange={(value) => register("tipo_equipe").onChange({ target: { value } })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vendas">Vendas</SelectItem>
                          <SelectItem value="suporte">Suporte</SelectItem>
                          <SelectItem value="operacional">Operacional</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={criarEquipe.isPending}>
                      {criarEquipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Equipe
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipes?.map((equipe) => (
              <Card key={equipe.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedEquipe(equipe.id)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {equipe.nome}
                    {equipe.tipo_equipe && (
                      <Badge variant="outline">{equipe.tipo_equipe}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {equipe.descricao || "Sem descrição"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {selectedEquipe === equipe.id ? membros?.length || 0 : "..."} membros
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Membros da Equipe */}
        {selectedEquipe && (
          <Dialog open={!!selectedEquipe} onOpenChange={() => setSelectedEquipe(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Membros da Equipe: {equipes?.find(e => e.id === selectedEquipe)?.nome}
                </DialogTitle>
                <DialogDescription>
                  Gerencie os membros desta equipe
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Adicionar Membro */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Adicionar Membro</Label>
                    <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers?.filter(user => 
                          !membros?.some(m => m.usuario_id === user.user_id)
                        ).map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAdicionarMembro} disabled={!selectedUsuario}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Lista de Membros */}
                <div className="space-y-2">
                  <Label>Membros Atuais</Label>
                  {membros && membros.length > 0 ? (
                    <div className="border rounded-lg divide-y">
                      {membros.map((membro: any) => (
                        <div key={membro.usuario_id} className="flex items-center justify-between p-3">
                          <span>{membro.usuario?.email || membro.usuario_id}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverMembro(membro.usuario_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum membro nesta equipe
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setSelectedEquipe(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
