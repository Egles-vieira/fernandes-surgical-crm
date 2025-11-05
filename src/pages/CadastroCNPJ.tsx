import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCNPJA } from "@/hooks/useCNPJA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, XCircle, UserPlus, Pencil, Trash2, Mail, Phone, Briefcase, Building2, User, MessageSquare, Target, Share2, FileText, Save, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProgressoCNPJA } from "@/components/cnpja/ProgressoCNPJA";
import { DadosColetadosPreview } from "@/components/cnpja/DadosColetadosPreview";
import { CadastroActionBar } from "@/components/cnpja/CadastroActionBar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contatoSchema, type ContatoInput } from "@/lib/validations/contato";
import { useSolicitacoesCadastro } from "@/hooks/useSolicitacoesCadastro";
import { supabase } from "@/integrations/supabase/client";

interface ContatoLocal extends ContatoInput {
  id: string;
}
export default function CadastroCNPJ() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("solicitacao");
  const { toast } = useToast();
  const [cnpj, setCnpj] = useState("");
  const [contatos, setContatos] = useState<ContatoLocal[]>([]);
  const [novoContatoOpen, setNovoContatoOpen] = useState(false);
  const [editarContatoOpen, setEditarContatoOpen] = useState(false);
  const [contatoParaEditar, setContatoParaEditar] = useState<ContatoLocal | null>(null);
  const [contatoParaExcluir, setContatoParaExcluir] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentSolicitacaoId, setCurrentSolicitacaoId] = useState<string | null>(solicitacaoId);
  
  const { createSolicitacao, updateSolicitacao, useSolicitacao } = useSolicitacoesCadastro();
  const { data: solicitacaoExistente, isLoading: loadingSolicitacao } = useSolicitacao(currentSolicitacaoId || undefined);
  
  const {
    consultarCNPJ,
    resetar,
    status,
    progresso,
    decisoes,
    dadosColetados,
    erro
  } = useCNPJA();

  // Carregar dados da solicitação existente
  useEffect(() => {
    if (solicitacaoExistente) {
      setCnpj(solicitacaoExistente.cnpj);
      if (solicitacaoExistente.contatos && Array.isArray(solicitacaoExistente.contatos)) {
        setContatos(solicitacaoExistente.contatos as unknown as ContatoLocal[]);
      }
    }
  }, [solicitacaoExistente]);

  const handleSalvar = async () => {
    console.log("=== DEBUG SALVAR ===");
    console.log("CNPJ:", cnpj);
    console.log("Status:", status);
    console.log("dadosColetados:", dadosColetados);
    console.log("contatos:", contatos);

    if (!cnpj || status !== 'concluido') {
      toast({
        title: "Atenção",
        description: "Complete a consulta CNPJ antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (!dadosColetados || !dadosColetados.office) {
      toast({
        title: "Erro",
        description: "Dados da consulta CNPJ não encontrados.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive",
        });
        return;
      }

      // Estruturar dados corretamente com razao_social no primeiro nível para busca
      const dadosCompletos = {
        ...dadosColetados,
        razao_social: dadosColetados.office?.name || "",
        nome_fantania: dadosColetados.office?.alias || "",
        decisoes: decisoes,
      };

      const dadosParaSalvar = {
        cnpj,
        dados_coletados: dadosCompletos as any,
        contatos: contatos as any,
        criado_por: user.id,
      };

      console.log("dadosParaSalvar:", dadosParaSalvar);

      if (currentSolicitacaoId) {
        await updateSolicitacao.mutateAsync({
          id: currentSolicitacaoId,
          data: dadosParaSalvar,
        });
      } else {
        const novaSolicitacao = await createSolicitacao.mutateAsync(dadosParaSalvar as any);
        setCurrentSolicitacaoId(novaSolicitacao.id);
        window.history.replaceState(null, "", `/clientes/cadastro-cnpj?solicitacao=${novaSolicitacao.id}`);
      }
    } catch (error) {
      console.error("❌ Erro ao salvar:", error);
      toast({
        title: "❌ Erro ao salvar",
        description: error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSalvarRascunho = async () => {
    await handleSalvar();
    navigate("/clientes/solicitacoes");
  };

  const handleEnviarAnalise = async () => {
    if (contatos.length === 0) {
      toast({
        title: "Atenção",
        description: "Adicione pelo menos um contato antes de enviar para análise.",
        variant: "destructive",
      });
      return;
    }

    try {
      await handleSalvar();
      
      if (currentSolicitacaoId) {
        await updateSolicitacao.mutateAsync({
          id: currentSolicitacaoId,
          data: { status: "em_analise" },
        });
        
        toast({
          title: "Enviado para análise",
          description: "A solicitação foi enviada para análise.",
        });
        navigate("/clientes/solicitacoes");
      }
    } catch (error) {
      console.error("Erro ao enviar para análise:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar para análise.",
        variant: "destructive",
      });
    }
  };
  
  const handleConsultar = async () => {
    if (!cnpj.trim()) return;
    await consultarCNPJ(cnpj, {
      tipoCliente: 'comum',
      emiteNF: true,
      trabalhaComICMS: true,
      operacoesInterestaduais: true,
      sempreValidarCEP: true
    });
  };
  const handleNovaConsulta = () => {
    // Confirmar antes de resetar se houver dados
    if (dadosColetados && currentSolicitacaoId) {
      const confirmar = window.confirm(
        "Você tem dados não salvos. Deseja realmente iniciar nova consulta?"
      );
      if (!confirmar) return;
    }
    
    setCnpj("");
    setContatos([]);
    setCurrentSolicitacaoId(null);
    window.history.replaceState(null, "", "/clientes/cadastro-cnpj");
    resetar();
  };

  const adicionarContato = (contato: ContatoInput) => {
    const novoContato: ContatoLocal = {
      ...contato,
      id: crypto.randomUUID(),
    };
    setContatos([...contatos, novoContato]);
    toast({
      title: "Contato adicionado!",
      description: "O contato foi incluído na lista.",
    });
  };

  const editarContato = (id: string, contatoAtualizado: ContatoInput) => {
    setContatos(contatos.map(c => c.id === id ? { ...contatoAtualizado, id } : c));
    toast({
      title: "Contato atualizado!",
      description: "As alterações foram salvas.",
    });
  };

  const handleConfirmarExclusao = () => {
    if (!contatoParaExcluir) return;
    
    setContatos(contatos.filter(c => c.id !== contatoParaExcluir));
    toast({
      title: "Contato excluído!",
      description: "O contato foi removido da lista.",
    });
    setDeleteDialogOpen(false);
    setContatoParaExcluir(null);
  };
  const handleCriarCliente = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Em breve você poderá criar clientes a partir dos dados coletados"
    });
  };

  const handleCalcular = () => {
    toast({
      title: "Calcular",
      description: "Função de cálculo em desenvolvimento"
    });
  };

  const handleEditar = () => {
    toast({
      title: "Editar",
      description: "Função de edição em desenvolvimento"
    });
  };

  const handleDiretoria = () => {
    toast({
      title: "Diretoria",
      description: "Visualizando quadro societário"
    });
  };

  const handleEfetivar = () => {
    toast({
      title: "Efetivar Cadastro",
      description: "Cadastro será efetivado e cliente criado"
    });
  };

  return <div className="min-h-screen bg-background">
      {/* Loading Indicator para Solicitação Existente */}
      {loadingSolicitacao && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-6 shadow-elegant">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="font-medium">Carregando solicitação...</p>
            </div>
          </Card>
        </div>
      )}

      {/* Barra de Ações Fixa */}
      <CadastroActionBar
        status={status}
        onCalcular={handleCalcular}
        onCancelar={handleNovaConsulta}
        onEditar={handleEditar}
        onDiretoria={handleDiretoria}
        onEfetivar={handleEfetivar}
      />

      <div className="py-6 px-4 space-y-0">
        {/* Botões de Ação para Solicitação */}
        {status === 'concluido' && dadosColetados && (
          <div className="fixed bottom-6 right-6 flex gap-3 z-40">
            <Button variant="outline" size="lg" onClick={handleSalvarRascunho}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button size="lg" onClick={handleEnviarAnalise}>
              Enviar para Análise
            </Button>
          </div>
        )}

        {/* Barra de Status e Ações - Removida pois agora está fixa no topo */}

        {/* Formulário de consulta */}
        {(status === 'idle' || status === 'erro') && <Card className="border-2 mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Consultar CNPJ
              </CardTitle>
              <CardDescription>
                Digite o CNPJ para consultar dados da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input placeholder="00.000.000/0000-00" value={cnpj} onChange={e => setCnpj(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConsultar()} className="flex-1" />
                <Button onClick={handleConsultar} disabled={!cnpj.trim()} size="lg" className="min-w-[120px]">
                  <Search className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
              </div>
              {erro && <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{erro}</p>
                </div>}
            </CardContent>
          </Card>}

        {/* Progresso */}
        {status !== 'idle' && status !== 'concluido' && status !== 'erro' && <Card className="mt-4">
            <CardContent className="pt-6">
              <ProgressoCNPJA status={status} progresso={progresso} />
            </CardContent>
          </Card>}

        {/* Dados Coletados com Tabs */}
        {status === 'concluido' && dadosColetados && (
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Dados Cadastrais
              </TabsTrigger>
              <TabsTrigger value="contatos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Contatos
              </TabsTrigger>
              <TabsTrigger value="anotacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Anotações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <DadosColetadosPreview dados={dadosColetados} />
            </TabsContent>

            <TabsContent value="contatos" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-lg">Contatos ({contatos.length + (dadosColetados.office?.emails?.length || 0) + (dadosColetados.office?.phones?.length || 0)})</CardTitle>
                    <CardDescription>Contatos da API e adicionados manualmente</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setNovoContatoOpen(true)}
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Contato
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Tipo</TableHead>
                          <TableHead>Nome/Contato</TableHead>
                          <TableHead>Cargo/Depto</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Celular</TableHead>
                          <TableHead className="w-[100px]">Origem</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Contatos da API - Emails */}
                        {dadosColetados.office?.emails?.map((email, idx) => (
                          <TableRow key={`email-${idx}`}>
                            <TableCell>
                              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{email.address}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>{email.address}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-0">
                                API
                              </Badge>
                            </TableCell>
                            <TableCell>-</TableCell>
                          </TableRow>
                        ))}

                        {/* Contatos da API - Telefones */}
                        {dadosColetados.office?.phones?.map((phone, idx) => (
                          <TableRow key={`phone-${idx}`}>
                            <TableCell>
                              <div className="w-9 h-9 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center border border-green-100 dark:border-green-900">
                                <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium font-mono">({phone.area}) {phone.number}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell className="font-mono">({phone.area}) {phone.number}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border-0">
                                API
                              </Badge>
                            </TableCell>
                            <TableCell>-</TableCell>
                          </TableRow>
                        ))}

                        {/* Contatos Adicionados Manualmente */}
                        {contatos.map((contato) => (
                          <TableRow key={contato.id}>
                            <TableCell>
                              <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground text-xs font-semibold">
                                  {contato.primeiro_nome?.charAt(0).toUpperCase()}{contato.sobrenome?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">
                              {contato.primeiro_nome} {contato.sobrenome}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {contato.cargo && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{contato.cargo}</span>
                                  </div>
                                )}
                                {contato.departamento && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Building2 className="w-3 h-3" />
                                    <span>{contato.departamento}</span>
                                  </div>
                                )}
                                {!contato.cargo && !contato.departamento && "-"}
                              </div>
                            </TableCell>
                            <TableCell>{contato.email || "-"}</TableCell>
                            <TableCell>{contato.telefone || "-"}</TableCell>
                            <TableCell>{contato.celular || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">Manual</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-accent"
                                  onClick={() => {
                                    setContatoParaEditar(contato);
                                    setEditarContatoOpen(true);
                                  }}
                                  title="Editar contato"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setContatoParaExcluir(contato.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                  title="Excluir contato"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Mensagem quando não há contatos */}
                        {contatos.length === 0 && !dadosColetados.office?.emails?.length && !dadosColetados.office?.phones?.length && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12">
                              <div className="flex flex-col items-center text-muted-foreground">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/50 mb-3">
                                  <UserPlus className="h-7 w-7 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium">Nenhum contato disponível</p>
                                <p className="text-xs mt-1">Clique em "Novo Contato" para adicionar</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anotacoes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Observações Internas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Notas de qualificação, histórico de SAC, combinações comerciais, SLAs de entrega, etc.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium mb-2">Etiquetas</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge>Hospitalar</Badge>
                        <Badge>Distribuidor</Badge>
                        <Badge>Manaus-AM</Badge>
                        <Badge>EPP</Badge>
                        <Badge>SUFRAMA</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-2">Checklist Rápido</p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Conferir cadastro fiscal</li>
                        <li>Validar condições comerciais</li>
                        <li>Mapear responsáveis de compras</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialogs */}
      <ContatoDialog
        open={novoContatoOpen}
        onOpenChange={setNovoContatoOpen}
        onSave={(contato) => {
          adicionarContato(contato);
          setNovoContatoOpen(false);
        }}
        titulo="Novo Contato"
      />

      {contatoParaEditar && (
        <ContatoDialog
          open={editarContatoOpen}
          onOpenChange={setEditarContatoOpen}
          onSave={(contato) => {
            editarContato(contatoParaEditar.id, contato);
            setEditarContatoOpen(false);
            setContatoParaEditar(null);
          }}
          titulo="Editar Contato"
          contatoInicial={contatoParaEditar}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContatoParaExcluir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}

// Componente de Dialog Reutilizável com Abas
function ContatoDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  titulo, 
  contatoInicial 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contato: ContatoInput) => void;
  titulo: string;
  contatoInicial?: ContatoInput;
}) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ContatoInput>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      primeiro_nome: "",
      sobrenome: "",
      email: "",
      telefone: "",
      celular: "",
      cargo: "",
      departamento: "",
      data_nascimento: "",
      preferencia_contato: undefined,
      melhor_horario_contato: "",
      frequencia_contato_preferida: undefined,
      idioma_preferido: "Português",
      timezone: "America/Sao_Paulo",
      consentimento_lgpd: false,
      aceita_marketing: false,
      nivel_autoridade: undefined,
      status_lead: "novo",
      estagio_ciclo_vida: "lead",
      origem_lead: "",
      campanha_origem: "",
      linkedin_url: "",
      twitter_url: "",
      facebook_url: "",
      instagram_url: "",
      skype_id: "",
      dores_identificadas: "",
      objetivos_profissionais: "",
      observacoes: "",
      esta_ativo: true,
      ...contatoInicial,
    },
  });
  
  const { toast } = useToast();
  useEffect(() => {
    if (open) {
      reset({
        primeiro_nome: "",
        sobrenome: "",
        email: "",
        telefone: "",
        celular: "",
        cargo: "",
        departamento: "",
        data_nascimento: "",
        preferencia_contato: undefined,
        melhor_horario_contato: "",
        frequencia_contato_preferida: undefined,
        idioma_preferido: "Português",
        timezone: "America/Sao_Paulo",
        consentimento_lgpd: false,
        aceita_marketing: false,
        nivel_autoridade: undefined,
        status_lead: "novo",
        estagio_ciclo_vida: "lead",
        origem_lead: "",
        campanha_origem: "",
        linkedin_url: "",
        twitter_url: "",
        facebook_url: "",
        instagram_url: "",
        skype_id: "",
        dores_identificadas: "",
        objetivos_profissionais: "",
        observacoes: "",
        esta_ativo: true,
        ...contatoInicial,
      });
    }
  }, [open, contatoInicial, reset]);

  const onSubmit = (data: ContatoInput) => {
    console.log("Contato submit:", data);
    onSave(data);
    reset();
    toast({ title: "Contato salvo", description: "O contato foi adicionado à lista." });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[700px] lg:w-[800px] sm:max-w-none">
        <SheetHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 -mx-6 -mt-6 px-6 py-4 mb-6 rounded-t-lg border-b shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <UserPlus className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">{titulo}</SheetTitle>
              <SheetDescription className="text-sm">
                Preencha as informações do contato
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <form onSubmit={handleSubmit(onSubmit, (errors) => { console.log('Form inválido', errors); toast({ title: 'Verifique os campos', description: 'Preencha os campos obrigatórios destacados.' }); })} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
              <TabsTrigger value="basico" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Básico</span>
              </TabsTrigger>
              <TabsTrigger value="contato" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Contato</span>
              </TabsTrigger>
              <TabsTrigger value="qualificacao" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Qualificação</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Social</span>
              </TabsTrigger>
              <TabsTrigger value="observacoes" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Notas</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba: Informações Básicas */}
            <TabsContent value="basico" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Identificação
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tratamento" className="text-sm font-medium">Tratamento</Label>
                  <Select value={watch("tratamento") || ""} onValueChange={(value) => setValue("tratamento", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sr.">Sr.</SelectItem>
                      <SelectItem value="Sra.">Sra.</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                      <SelectItem value="Dra.">Dra.</SelectItem>
                      <SelectItem value="Prof.">Prof.</SelectItem>
                      <SelectItem value="Eng.">Eng.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="primeiro_nome" className="text-sm font-medium">
                      Nome <span className="text-destructive">*</span>
                    </Label>
                    <Input id="primeiro_nome" {...register("primeiro_nome")} placeholder="João" className="border-2" />
                    {errors.primeiro_nome && <p className="text-sm text-destructive font-medium">{errors.primeiro_nome.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sobrenome" className="text-sm font-medium">
                      Sobrenome <span className="text-destructive">*</span>
                    </Label>
                    <Input id="sobrenome" {...register("sobrenome")} placeholder="Silva" className="border-2" />
                    {errors.sobrenome && <p className="text-sm text-destructive font-medium">{errors.sobrenome.message}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Informações Profissionais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cargo" className="text-sm font-medium">Cargo</Label>
                    <Input id="cargo" {...register("cargo")} placeholder="Ex: Gerente de Compras" className="border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departamento" className="text-sm font-medium">Departamento</Label>
                    <Input id="departamento" {...register("departamento")} placeholder="Ex: Compras" className="border-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_nascimento" className="text-sm font-medium">Data de Nascimento</Label>
                  <Input id="data_nascimento" type="date" {...register("data_nascimento")} className="border-2" />
                </div>
              </div>
            </TabsContent>

            {/* Aba: Contato & Preferências */}
            <TabsContent value="contato" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Informações de Contato
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="email@exemplo.com" className="border-2" />
                    {errors.email && <p className="text-sm text-destructive font-medium">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-sm font-medium">Telefone</Label>
                    <Input id="telefone" {...register("telefone")} placeholder="(11) 3333-4444" className="border-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="celular" className="text-sm font-medium">Celular</Label>
                    <Input id="celular" {...register("celular")} placeholder="(11) 99999-8888" className="border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_numero" className="text-sm font-medium">WhatsApp</Label>
                    <Input id="whatsapp_numero" {...register("whatsapp_numero")} placeholder="(11) 99999-8888" className="border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Preferências</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferencia_contato" className="text-sm font-medium">Preferência de Contato</Label>
                    <Select value={watch("preferencia_contato") || ""} onValueChange={(value) => setValue("preferencia_contato", value as any)}>
                      <SelectTrigger className="border-2">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="melhor_horario_contato" className="text-sm font-medium">Melhor Horário</Label>
                    <Input id="melhor_horario_contato" {...register("melhor_horario_contato")} placeholder="Ex: 14h às 17h" className="border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">LGPD & Consentimentos</h3>
                <div className="bg-muted/30 p-4 rounded-lg space-y-3 border-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="consentimento_lgpd" className="text-sm font-medium">Consentimento LGPD</Label>
                    <Switch id="consentimento_lgpd" checked={watch("consentimento_lgpd")} onCheckedChange={(checked) => setValue("consentimento_lgpd", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="aceita_marketing" className="text-sm font-medium">Aceita Marketing</Label>
                    <Switch id="aceita_marketing" checked={watch("aceita_marketing")} onCheckedChange={(checked) => setValue("aceita_marketing", checked)} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba: Qualificação & Vendas */}
            <TabsContent value="qualificacao" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Qualificação BANT
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nivel_autoridade" className="text-sm font-medium">Nível de Autoridade</Label>
                    <Select value={watch("nivel_autoridade") || ""} onValueChange={(value) => setValue("nivel_autoridade", value as any)}>
                      <SelectTrigger className="border-2">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="decisor">Decisor</SelectItem>
                        <SelectItem value="influenciador">Influenciador</SelectItem>
                        <SelectItem value="usuario_final">Usuário Final</SelectItem>
                        <SelectItem value="bloqueador">Bloqueador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score_qualificacao" className="text-sm font-medium">Score (0-100)</Label>
                    <Input id="score_qualificacao" type="number" min="0" max="100" {...register("score_qualificacao", { valueAsNumber: true })} className="border-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_estimado" className="text-sm font-medium">Budget Estimado (R$)</Label>
                    <Input id="budget_estimado" type="number" step="0.01" {...register("budget_estimado", { valueAsNumber: true })} className="border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeline_decisao" className="text-sm font-medium">Timeline de Decisão</Label>
                    <Input id="timeline_decisao" {...register("timeline_decisao")} placeholder="Ex: 3 meses" className="border-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="necessidade_identificada" className="text-sm font-medium">Necessidade Identificada</Label>
                  <Textarea id="necessidade_identificada" {...register("necessidade_identificada")} rows={3} className="border-2" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Origem & Campanha</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origem_lead" className="text-sm font-medium">Origem do Lead</Label>
                    <Input id="origem_lead" {...register("origem_lead")} placeholder="Ex: Website, Indicação" className="border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campanha_origem" className="text-sm font-medium">Campanha</Label>
                    <Input id="campanha_origem" {...register("campanha_origem")} placeholder="Nome da campanha" className="border-2" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba: Redes Sociais */}
            <TabsContent value="social" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Redes Sociais & Contatos Online
                </h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url" className="text-sm font-medium">LinkedIn</Label>
                    <Input id="linkedin_url" {...register("linkedin_url")} placeholder="https://linkedin.com/in/..." className="border-2" />
                    {errors.linkedin_url && <p className="text-sm text-destructive font-medium">{errors.linkedin_url.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter_url" className="text-sm font-medium">Twitter / X</Label>
                    <Input id="twitter_url" {...register("twitter_url")} placeholder="https://twitter.com/..." className="border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebook_url" className="text-sm font-medium">Facebook</Label>
                    <Input id="facebook_url" {...register("facebook_url")} placeholder="https://facebook.com/..." className="border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram_url" className="text-sm font-medium">Instagram</Label>
                    <Input id="instagram_url" {...register("instagram_url")} placeholder="https://instagram.com/..." className="border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skype_id" className="text-sm font-medium">Skype</Label>
                    <Input id="skype_id" {...register("skype_id")} placeholder="usuario.skype" className="border-2" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Aba: Observações */}
            <TabsContent value="observacoes" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notas & Observações
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dores_identificadas" className="text-sm font-medium">Dores Identificadas</Label>
                    <Textarea id="dores_identificadas" {...register("dores_identificadas")} rows={4} placeholder="Quais problemas o contato enfrenta?" className="border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objetivos_profissionais" className="text-sm font-medium">Objetivos Profissionais</Label>
                    <Textarea id="objetivos_profissionais" {...register("objetivos_profissionais")} rows={4} placeholder="Metas e objetivos do contato" className="border-2" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes" className="text-sm font-medium">Observações Gerais</Label>
                    <Textarea id="observacoes" {...register("observacoes")} rows={4} placeholder="Informações adicionais" className="border-2" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-6 flex gap-3 sticky bottom-0 bg-background pb-4 -mx-6 px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" />
              Salvar Contato
            </Button>
          </div>
        </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}