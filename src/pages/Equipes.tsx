import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useEquipes } from "@/hooks/useEquipes";
import { useRoles } from "@/hooks/useRoles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, UserPlus, X, Loader2, Crown, Network, ArrowRightLeft, Eye, Edit, Power, PowerOff, History, Settings2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrganigramaEquipes } from "@/components/equipes/OrganigramaEquipes";
import { TransferirLiderancaDialog } from "@/components/equipes/TransferirLiderancaDialog";
import { EditarEquipeDialog } from "@/components/equipes/EditarEquipeDialog";
import { DetalhesEquipeDialog } from "@/components/equipes/DetalhesEquipeDialog";
import { DesativarEquipeDialog } from "@/components/equipes/DesativarEquipeDialog";
import { EditarMembroDialog } from "@/components/equipes/EditarMembroDialog";
import { TransferirMembroDialog as TransferirMembroEntreEquipesDialog } from "@/components/equipes/TransferirMembroDialog";
import { HistoricoMembroDialog } from "@/components/equipes/HistoricoMembroDialog";
import { RemoverMembroDialog } from "@/components/equipes/RemoverMembroDialog";
import { NovaMetaSheet } from "@/components/equipes/NovaMetaSheet";
import { MetasEquipeContent } from "@/components/equipes/MetasEquipeContent";
import { useMetasEquipe } from "@/hooks/useMetasEquipe";
import { Target, BarChart3, Users as UsersIcon } from "lucide-react";
import { DashboardVisaoGeral } from "@/components/equipes/DashboardVisaoGeral";
import { AnaliseVendedores } from "@/components/equipes/AnaliseVendedores";
import { EquipesFiltrosBar } from "@/components/equipes/EquipesFiltrosBar";
import { EquipesFiltrosProvider, useEquipesFiltros } from "@/contexts/EquipesFiltrosContext";
import { AcoesRapidasBar } from "@/components/equipes/AcoesRapidasBar";
import { useExportarDados } from "@/hooks/useExportarDados";
import { useDashboardMetas } from "@/hooks/useDashboardMetas";
import { usePerformanceVendedores } from "@/hooks/usePerformanceVendedores";

interface NovaEquipeForm {
  nome: string;
  descricao: string;
  lider_equipe_id: string;
  tipo_equipe: string;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Equipes() {
  const { 
    equipes, 
    isLoading, 
    criarEquipe, 
    editarEquipe,
    desativarEquipe,
    reativarEquipe,
    adicionarMembro, 
    removerMembro,
    editarMembro,
    transferirMembro,
    transferirLideranca, 
    useMembrosEquipe 
  } = useEquipes();
  const { allUsers, isAdmin, isLider } = useRoles();
  
  const [filtroAtivas, setFiltroAtivas] = useState<"ativas" | "inativas" | "todas">("ativas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [membrosDialogOpen, setMembrosDialogOpen] = useState(false);
  const [transferirLiderancaOpen, setTransferirLiderancaOpen] = useState(false);
  const [editarEquipeOpen, setEditarEquipeOpen] = useState(false);
  const [detalhesEquipeOpen, setDetalhesEquipeOpen] = useState(false);
  const [desativarEquipeOpen, setDesativarEquipeOpen] = useState(false);
  const [editarMembroOpen, setEditarMembroOpen] = useState(false);
  const [transferirMembroOpen, setTransferirMembroOpen] = useState(false);
  const [historicoMembroOpen, setHistoricoMembroOpen] = useState(false);
  const [removerMembroOpen, setRemoverMembroOpen] = useState(false);
  const [acaoDesativacao, setAcaoDesativacao] = useState<"desativar" | "reativar">("desativar");
  const [selectedEquipe, setSelectedEquipe] = useState<string | null>(null);
  const [selectedMembro, setSelectedMembro] = useState<any>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const { register, handleSubmit, reset, formState: { errors }, control } = useForm<NovaEquipeForm>();

  // Estados para metas
  const [equipeMetasId, setEquipeMetasId] = useState<string | null>(null);
  const [novaMetaOpen, setNovaMetaOpen] = useState(false);
  const [metaSelecionada, setMetaSelecionada] = useState<any>(null);
  const [metaDetalhesOpen, setMetaDetalhesOpen] = useState(false);
  const [atualizarProgressoOpen, setAtualizarProgressoOpen] = useState(false);
  const { criarMeta, atualizarProgresso } = useMetasEquipe();

  // Exportação de dados
  const { exportarExcel, exportarPDF } = useExportarDados();

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

  const handleRemoverMembro = async (motivo: string) => {
    if (!selectedEquipe || !selectedMembro) return;
    
    await removerMembro.mutateAsync({
      equipeId: selectedEquipe,
      usuarioId: selectedMembro.usuario_id,
      motivo,
    });
  };

  const handleEditarMembro = async (dados: any) => {
    if (!selectedEquipe || !selectedMembro) return;
    
    await editarMembro.mutateAsync({
      equipeId: selectedEquipe,
      usuarioId: selectedMembro.usuario_id,
      dados,
    });
  };

  const handleTransferirMembro = async (dados: any) => {
    if (!selectedEquipe || !selectedMembro) return;
    
    await transferirMembro.mutateAsync({
      usuarioId: selectedMembro.usuario_id,
      equipeOrigemId: selectedEquipe,
      equipeDestinoId: dados.equipe_destino_id,
      manterPapel: dados.manter_papel,
      novoPapel: dados.novo_papel,
      motivo: dados.motivo,
    });
  };

  const handleTransferirLideranca = async (novoLiderId: string, motivo?: string) => {
    if (!selectedEquipe) return;
    await transferirLideranca.mutateAsync({
      equipeId: selectedEquipe,
      novoLiderId,
      motivo,
    });
  };

  const handleEditarEquipe = async (dados: any) => {
    if (!selectedEquipe) return;
    await editarEquipe.mutateAsync({
      equipeId: selectedEquipe,
      dados,
    });
  };

  const handleDesativarReativar = async (motivo?: string) => {
    if (!selectedEquipe) return;
    
    const equipe = equipes?.find(e => e.id === selectedEquipe);
    if (!equipe) return;

    if (equipe.esta_ativa) {
      await desativarEquipe.mutateAsync({ equipeId: selectedEquipe, motivo });
    } else {
      await reativarEquipe.mutateAsync(selectedEquipe);
    }
  };

  const equipesFiltradas = equipes?.filter((equipe) => {
    if (filtroAtivas === "ativas") return equipe.esta_ativa;
    if (filtroAtivas === "inativas") return !equipe.esta_ativa;
    return true;
  });

  // Filtrar apenas usuários com role de lider para seleção de líder
  const lideres = allUsers?.filter(user => user.roles?.includes('lider')) || [];

  return (
    <EquipesFiltrosProvider>
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

        {/* Barra de Ações Rápidas */}
        <DashboardAcoesRapidas 
          onNovaMeta={() => setNovaMetaOpen(true)}
          onAtualizar={() => window.location.reload()}
          isLoading={isLoading}
        />

        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-3xl grid-cols-4">
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="vendedores" className="gap-2">
                <UsersIcon className="h-4 w-4" />
                Vendedores
              </TabsTrigger>
              <TabsTrigger value="lista" className="gap-2">
                <Users className="h-4 w-4" />
                Equipes
              </TabsTrigger>
              <TabsTrigger value="organograma" className="gap-2">
                <Network className="h-4 w-4" />
                Organograma
              </TabsTrigger>
            </TabsList>

            <TabsList className="grid grid-cols-3">
              <TabsTrigger
                value="ativas"
                onClick={() => setFiltroAtivas("ativas")}
              >
                Ativas
              </TabsTrigger>
              <TabsTrigger
                value="inativas"
                onClick={() => setFiltroAtivas("inativas")}
              >
                Inativas
              </TabsTrigger>
              <TabsTrigger
                value="todas"
                onClick={() => setFiltroAtivas("todas")}
              >
                Todas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <EquipesFiltrosBar />
            <DashboardVisaoGeral />
          </TabsContent>

          <TabsContent value="vendedores" className="space-y-6 mt-6">
            <EquipesFiltrosBar />
            <AnaliseVendedores />
          </TabsContent>

          <TabsContent value="lista" className="space-y-6 mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipesFiltradas?.map((equipe) => {
                  const totalMembros = selectedEquipe === equipe.id ? membros?.length || 0 : 0;
                  
                  return (
                    <Card key={equipe.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-2">
                          <span className="truncate">{equipe.nome}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={equipe.esta_ativa ? "default" : "secondary"}>
                              {equipe.esta_ativa ? "Ativa" : "Inativa"}
                            </Badge>
                            {equipe.tipo_equipe && (
                              <Badge variant="outline">{equipe.tipo_equipe}</Badge>
                            )}
                          </div>
                        </CardTitle>
                        <CardDescription>
                          {equipe.descricao || "Sem descrição"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{totalMembros} membros</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEquipe(equipe.id);
                            setDetalhesEquipeOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEquipe(equipe.id);
                            setMembrosDialogOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Membros
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEquipeMetasId(equipe.id);
                          }}
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Metas
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEquipe(equipe.id);
                            setEditarEquipeOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEquipe(equipe.id);
                            setAcaoDesativacao(equipe.esta_ativa ? "desativar" : "reativar");
                            setDesativarEquipeOpen(true);
                          }}
                        >
                          {equipe.esta_ativa ? (
                            <PowerOff className="h-4 w-4 text-destructive" />
                          ) : (
                            <Power className="h-4 w-4 text-success" />
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="organograma">
            <OrganigramaEquipes />
          </TabsContent>
        </Tabs>

        {/* Dialog de Membros da Equipe */}
        <Dialog open={membrosDialogOpen} onOpenChange={setMembrosDialogOpen}>
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
                              <div className="flex flex-col flex-1 gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{display}</span>
                                  {isLider && (
                                    <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 px-2 py-0.5">
                                      <Crown className="h-3 w-3" />
                                      Líder
                                    </Badge>
                                  )}
                                  {membro.papel && (
                                    <Badge variant="outline" className="text-xs">
                                      {membro.papel.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                                {membro.carga_trabalho && (
                                  <span className="text-xs text-muted-foreground">
                                    Carga: {membro.carga_trabalho}%
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMembro(membro);
                                  setEditarMembroOpen(true);
                                }}
                                title="Editar perfil"
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMembro(membro);
                                  setHistoricoMembroOpen(true);
                                }}
                                title="Ver histórico"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              
                              {!isLider && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedMembro(membro);
                                      setTransferirMembroOpen(true);
                                    }}
                                    title="Transferir para outra equipe"
                                  >
                                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedMembro(membro);
                                      setRemoverMembroOpen(true);
                                    }}
                                    className="hover:bg-destructive/10 hover:text-destructive"
                                    title="Remover da equipe"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
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
                <Button onClick={() => setMembrosDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

        <EditarEquipeDialog
          equipe={equipes?.find(e => e.id === selectedEquipe)}
          usuarios={allUsers || []}
          open={editarEquipeOpen}
          onOpenChange={setEditarEquipeOpen}
          onSubmit={handleEditarEquipe}
        />

        <DetalhesEquipeDialog
          equipe={equipes?.find(e => e.id === selectedEquipe)}
          membros={membros || []}
          usuarios={allUsers || []}
          open={detalhesEquipeOpen}
          onOpenChange={setDetalhesEquipeOpen}
        />

        <EditarMembroDialog
          membro={selectedMembro}
          open={editarMembroOpen}
          onOpenChange={setEditarMembroOpen}
          onSubmit={handleEditarMembro}
        />

        <TransferirMembroEntreEquipesDialog
          membro={selectedMembro}
          equipeAtual={equipes?.find(e => e.id === selectedEquipe)}
          equipesDisponiveis={equipes || []}
          open={transferirMembroOpen}
          onOpenChange={setTransferirMembroOpen}
          onSubmit={handleTransferirMembro}
        />

        <HistoricoMembroDialog
          usuarioId={selectedMembro?.usuario_id || ""}
          usuarioEmail={allUsers?.find(u => u.user_id === selectedMembro?.usuario_id)?.email || ""}
          open={historicoMembroOpen}
          onOpenChange={setHistoricoMembroOpen}
        />

        <RemoverMembroDialog
          membro={selectedMembro}
          equipe={equipes?.find(e => e.id === selectedEquipe)}
          open={removerMembroOpen}
          onOpenChange={setRemoverMembroOpen}
          onConfirm={handleRemoverMembro}
        />

        {/* Dialogs de Metas */}
        <Dialog open={!!equipeMetasId} onOpenChange={(open) => !open && setEquipeMetasId(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Metas da Equipe</DialogTitle>
                  <DialogDescription>
                    {equipes?.find(e => e.id === equipeMetasId)?.nome}
                  </DialogDescription>
                </div>
                <Button onClick={() => setNovaMetaOpen(true)}>
                  <Target className="h-4 w-4 mr-2" />
                  Nova Meta
                </Button>
              </div>
            </DialogHeader>
            <MetasEquipeContent equipeId={equipeMetasId} />
          </DialogContent>
        </Dialog>

        <NovaMetaSheet
          open={novaMetaOpen}
          onOpenChange={setNovaMetaOpen}
          equipeId={equipeMetasId || ""}
          onCriar={(meta) => criarMeta.mutate(meta)}
        />
      </div>
    </Layout>
    </EquipesFiltrosProvider>
  );
}

// Componente auxiliar para ações rápidas com dados de exportação
function DashboardAcoesRapidas({ onNovaMeta, onAtualizar, isLoading }: any) {
  const { filtros } = useEquipesFiltros();
  const { exportarExcel, exportarPDF } = useExportarDados();
  
  const { kpis, pacing, funil, distribuicao } = useDashboardMetas(filtros);
  const { vendedores } = usePerformanceVendedores({
    equipeId: filtros.equipeId,
    vendedorId: filtros.vendedorId,
  });

  const handleExportarExcel = () => {
    exportarExcel({
      kpis,
      vendedores,
      distribuicao,
      pacing,
      funil,
    }, filtros);
  };

  const handleExportarPDF = () => {
    exportarPDF({
      kpis,
      vendedores,
      distribuicao,
      pacing,
      funil,
    }, filtros);
  };

  return (
    <AcoesRapidasBar
      onNovaMeta={onNovaMeta}
      onExportarExcel={handleExportarExcel}
      onExportarPDF={handleExportarPDF}
      onAtualizar={onAtualizar}
      isLoading={isLoading}
    />
  );
}
