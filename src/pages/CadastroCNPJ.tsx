import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCNPJA } from "@/hooks/useCNPJA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, XCircle, UserPlus, Pencil, Trash2, Mail, Phone, Briefcase, Building2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProgressoCNPJA } from "@/components/cnpja/ProgressoCNPJA";
import { DadosColetadosPreview } from "@/components/cnpja/DadosColetadosPreview";
import { CadastroActionBar } from "@/components/cnpja/CadastroActionBar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contatoSchema = z.object({
  primeiro_nome: z.string().min(1, "Nome obrigatório"),
  sobrenome: z.string().min(1, "Sobrenome obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cargo: z.string().optional(),
  departamento: z.string().optional(),
  descricao: z.string().optional(),
});

type ContatoInput = z.infer<typeof contatoSchema>;

interface ContatoLocal extends ContatoInput {
  id: string;
}
export default function CadastroCNPJ() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cnpj, setCnpj] = useState("");
  const [contatos, setContatos] = useState<ContatoLocal[]>([]);
  const [novoContatoOpen, setNovoContatoOpen] = useState(false);
  const [editarContatoOpen, setEditarContatoOpen] = useState(false);
  const [contatoParaEditar, setContatoParaEditar] = useState<ContatoLocal | null>(null);
  const [contatoParaExcluir, setContatoParaExcluir] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const {
    consultarCNPJ,
    resetar,
    status,
    progresso,
    decisoes,
    dadosColetados,
    erro
  } = useCNPJA();
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
    setCnpj("");
    setContatos([]);
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

// Componente de Dialog Reutilizável
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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContatoInput>({
    resolver: zodResolver(contatoSchema),
    defaultValues: contatoInicial || {
      primeiro_nome: "",
      sobrenome: "",
      email: "",
      telefone: "",
      celular: "",
      cargo: "",
      departamento: "",
      descricao: "",
    },
  });

  const onSubmit = (data: ContatoInput) => {
    onSave(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primeiro_nome">Nome *</Label>
              <Input
                id="primeiro_nome"
                {...register("primeiro_nome")}
                placeholder="João"
              />
              {errors.primeiro_nome && (
                <p className="text-sm text-destructive mt-1">{errors.primeiro_nome.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sobrenome">Sobrenome *</Label>
              <Input
                id="sobrenome"
                {...register("sobrenome")}
                placeholder="Silva"
              />
              {errors.sobrenome && (
                <p className="text-sm text-destructive mt-1">{errors.sobrenome.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="joao.silva@exemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register("telefone")}
                placeholder="(11) 3456-7890"
              />
            </div>

            <div>
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                {...register("celular")}
                placeholder="(11) 98765-4321"
              />
            </div>

            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                {...register("cargo")}
                placeholder="Gerente Comercial"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                {...register("departamento")}
                placeholder="Comercial"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="descricao">Observações</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Informações adicionais sobre o contato..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Contato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}