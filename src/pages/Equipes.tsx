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
import { Users, Plus, UserPlus, X, Loader2, Crown, Network, ArrowRightLeft } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrganigramaEquipes } from "@/components/equipes/OrganigramaEquipes";
import { TransferirLiderancaDialog } from "@/components/equipes/TransferirLiderancaDialog";

interface NovaEquipeForm {
  nome: string;
  descricao: string;
  lider_equipe_id: string;
  tipo_equipe: string;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Equipes() {
  const { equipes, isLoading, criarEquipe, adicionarMembro, removerMembro, transferirLideranca, useMembrosEquipe } = useEquipes();
  const { allUsers, isAdmin, isLider } = useRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferirLiderancaOpen, setTransferirLiderancaOpen] = useState(false);
  const [selectedEquipe, setSelectedEquipe] = useState<string | null>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const { register, handleSubmit, reset, formState: { errors }, control } = useForm<NovaEquipeForm>();

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

  const handleTransferirLideranca = async (novoLiderId: string, motivo: string) => {
    if (!selectedEquipe) return;
    
    await transferirLideranca.mutateAsync({
      equipeId: selectedEquipe,
      novoLiderId,
      motivo,
    });
    setTransferirLiderancaOpen(false);
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
                      <Controller
                        name="lider_equipe_id"
                        control={control}
                        rules={{ required: "Líder é obrigatório" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
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
                        )}
                      />
                      {errors.lider_equipe_id && (
                        <p className="text-sm text-destructive">{errors.lider_equipe_id.message as string}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Equipe</Label>
                      <Controller
                        name="tipo_equipe"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
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
                        )}
                      />
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

        <Tabs defaultValue="lista" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="lista" className="gap-2">
              <Users className="h-4 w-4" />
              Lista de Equipes
            </TabsTrigger>
            <TabsTrigger value="organograma" className="gap-2">
              <Network className="h-4 w-4" />
              Organograma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="organograma">
            <OrganigramaEquipes />
          </TabsContent>
        </Tabs>

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
                {/* Botão Transferir Liderança */}
                {isAdmin && (
                  <Button
                    onClick={() => setTransferirLiderancaOpen(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Transferir Liderança
                  </Button>
                )}
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
                      {membros.map((membro: any) => {
                        const user = allUsers?.find(u => u.user_id === membro.usuario_id);
                        const equipe = equipes?.find(e => e.id === selectedEquipe);
                        const isLider = equipe?.lider_equipe_id === membro.usuario_id;
                        const display = user?.email || membro.usuario_id;
                        
                        return (
                          <div key={membro.usuario_id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{display}</span>
                                  {isLider && (
                                    <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 px-2 py-0.5">
                                      <Crown className="h-3 w-3" />
                                      Líder
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!isLider && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoverMembro(membro.usuario_id)}
                                className="hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
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

        {/* Dialog de Transferir Liderança */}
        {selectedEquipe && membros && (
          <TransferirLiderancaDialog
            open={transferirLiderancaOpen}
            onOpenChange={setTransferirLiderancaOpen}
            equipeId={selectedEquipe}
            equipeNome={equipes?.find(e => e.id === selectedEquipe)?.nome || ''}
            liderAtualId={equipes?.find(e => e.id === selectedEquipe)?.lider_equipe_id || null}
            membros={membros as any}
            allUsers={allUsers || []}
            onTransferir={handleTransferirLideranca}
            isLoading={transferirLideranca.isPending}
          />
        )}
      </div>
    </Layout>
  );
}
