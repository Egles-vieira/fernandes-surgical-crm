import { useState, useEffect } from "react";
import { Plus, Edit, Phone, Upload, Trash2, Mail, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clienteSchema, type ClienteInput } from "@/lib/validations/cliente";
import { useClientes } from "@/hooks/useClientes";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ClientesFilters } from "@/components/cliente/ClientesFilters";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserPreferences } from "@/hooks/useUserPreferences";
export default function Clientes() {
  const navigate = useNavigate();
  const {
    preferences,
    updatePreference,
    isLoading: loadingPreferences
  } = useUserPreferences();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [view, setView] = useState<"card" | "grid">(preferences.clientesView || "card");
  const pageSize = 50;
  const {
    clientes,
    total,
    isLoading,
    createCliente,
    updateCliente,
    deleteCliente
  } = useClientes({
    page: currentPage,
    pageSize,
    searchTerm: debouncedSearch
  });
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<string | null>(null);

  // Sincronizar view com preferências do usuário
  useEffect(() => {
    if (preferences.clientesView) {
      setView(preferences.clientesView);
    }
  }, [preferences.clientesView]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Função para atualizar view e salvar preferência
  const handleViewChange = (newView: "card" | "grid") => {
    setView(newView);
    updatePreference("clientesView", newView);
  };
  const totalPages = Math.ceil(total / pageSize);
  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome_abrev: "",
      cgc: "",
      email: "",
      email_financeiro: "",
      email_xml: "",
      telefone1: "",
      lim_credito: 0,
      observacoes: ""
    }
  });
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const openForm = (cliente?: any) => {
    if (cliente) {
      setSelectedCliente(cliente);
      form.reset({
        nome_abrev: cliente.nome_abrev || "",
        cgc: cliente.cgc || "",
        email: cliente.e_mail || "",
        email_financeiro: cliente.email_financeiro || "",
        email_xml: cliente.email_xml || "",
        telefone1: cliente.telefone1 || "",
        lim_credito: cliente.lim_credito || 0,
        observacoes: cliente.observacoes || "",
        ins_estadual: cliente.ins_estadual || "",
        atividade: cliente.atividade || "",
        coligada: cliente.coligada || ""
      });
      setIsEditing(true);
    } else {
      setSelectedCliente(null);
      form.reset({
        nome_abrev: "",
        cgc: "",
        email: "",
        email_financeiro: "",
        email_xml: "",
        telefone1: "",
        lim_credito: 0,
        observacoes: "",
        ins_estadual: "",
        atividade: "",
        coligada: ""
      });
      setIsEditing(false);
    }
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    form.reset();
    setIsEditing(false);
  };
  const onSubmit = async (data: ClienteInput) => {
    try {
      if (isEditing && selectedCliente) {
        await updateCliente.mutateAsync({
          id: selectedCliente.id,
          ...data
        });
      } else {
        await createCliente.mutateAsync(data);
      }
      closeForm();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };
  const handleDelete = async () => {
    if (clienteToDelete) {
      try {
        await deleteCliente.mutateAsync(clienteToDelete);
        setDeleteDialogOpen(false);
        setClienteToDelete(null);
      } catch (error) {
        console.error("Erro ao excluir cliente:", error);
      }
    }
  };
  return <div className="p-8">
      {/* Filters Bar */}
      <ClientesFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} view={view} onViewChange={handleViewChange} onNovoCliente={() => openForm()} onImportarCSV={() => navigate('/importar-clientes')} onFilterChange={filters => {
      console.log("Filtros aplicados:", filters);
      // Aqui você pode implementar a lógica de filtros quando necessário
    }} />

      {/* Grid */}
      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>)}
        </div> : clientes.length === 0 ? <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
          <Button onClick={() => openForm()} className="mt-4">
            Cadastrar primeiro cliente
          </Button>
        </Card> : <>
          {view === "card" ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clientes.map(cliente => <Card key={cliente.id} className="p-6 shadow-elegant hover:shadow-lg transition-all">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{cliente.nome_abrev}</h3>
                      {cliente.cod_emitente && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {cliente.cod_emitente}
                        </span>}
                    </div>
                    {cliente.nome_emit && <p className="text-sm text-muted-foreground mb-1">{cliente.nome_emit}</p>}
                    {cliente.cgc && <p className="text-sm text-muted-foreground">{cliente.cgc}</p>}
                  </div>

                  <div className="space-y-2 text-sm">
                    {cliente.telefone1 && <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone size={14} />
                        <span>{cliente.telefone1}</span>
                      </div>}
                    {cliente.e_mail && <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <span className="truncate">{cliente.e_mail}</span>
                      </div>}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Limite:</span>
                      <span className="font-semibold">{formatCurrency(cliente.lim_credito || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Disponível:</span>
                      <span className="font-semibold text-success">
                        {formatCurrency(cliente.limite_disponivel || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                      Detalhes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/vendas/contratos?cliente=${cliente.id}`)}>
                      <FileText size={14} className="mr-1" />
                      Contratos
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openForm(cliente)}>
                      <Edit size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                setClienteToDelete(cliente.id);
                setDeleteDialogOpen(true);
              }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>)}
            </div> : <Card className="rounded">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead>Cliente</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Limite de Crédito</TableHead>
                    <TableHead className="text-right">Disponível</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map(cliente => <TableRow key={cliente.id} className="hover:bg-muted/50 border-b border-border/30">
                      <TableCell>
                        <div>
                          <p className="font-medium">{cliente.nome_abrev}</p>
                          {cliente.nome_emit && <p className="text-sm text-muted-foreground">{cliente.nome_emit}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{cliente.cgc || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {cliente.telefone1 && <div className="flex items-center gap-1 text-sm">
                              <Phone size={12} className="text-muted-foreground" />
                              <span>{cliente.telefone1}</span>
                            </div>}
                          {cliente.e_mail && <div className="flex items-center gap-1 text-sm">
                              <Mail size={12} className="text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{cliente.e_mail}</span>
                            </div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cliente.lim_credito || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(cliente.limite_disponivel || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                            Detalhes
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/vendas/contratos?cliente=${cliente.id}`)}>
                            <FileText size={14} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openForm(cliente)}>
                            <Edit size={14} />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                    setClienteToDelete(cliente.id);
                    setDeleteDialogOpen(true);
                  }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </Card>}

        {/* Pagination */}
        {totalPages > 1 && <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, total)} de {total} clientes
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
                
                {Array.from({
              length: Math.min(5, totalPages)
            }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return <PaginationItem key={pageNum}>
                      <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum} className="cursor-pointer">
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>;
            })}
                
                <PaginationItem>
                  <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>}
        </>}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCliente && <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome Abreviado</Label>
                  <p className="font-medium">{selectedCliente.nome_abrev}</p>
                </div>
                {selectedCliente.nome_emit && <div>
                    <Label className="text-xs text-muted-foreground">Razão Social</Label>
                    <p className="font-medium">{selectedCliente.nome_emit}</p>
                  </div>}
                {selectedCliente.cgc && <div>
                    <Label className="text-xs text-muted-foreground">CNPJ/CPF</Label>
                    <p className="font-medium">{selectedCliente.cgc}</p>
                  </div>}
                {selectedCliente.ins_estadual && <div>
                    <Label className="text-xs text-muted-foreground">Inscrição Estadual</Label>
                    <p className="font-medium">{selectedCliente.ins_estadual}</p>
                  </div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedCliente.telefone1 && <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedCliente.telefone1}</p>
                  </div>}
                {selectedCliente.e_mail && <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <p className="font-medium">{selectedCliente.e_mail}</p>
                  </div>}
                {selectedCliente.email_financeiro && <div>
                    <Label className="text-xs text-muted-foreground">E-mail Financeiro</Label>
                    <p className="font-medium">{selectedCliente.email_financeiro}</p>
                  </div>}
                {selectedCliente.email_xml && <div>
                    <Label className="text-xs text-muted-foreground">E-mail XML</Label>
                    <p className="font-medium">{selectedCliente.email_xml}</p>
                  </div>}
              </div>

              {selectedCliente.observacoes && <div>
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <p className="font-medium">{selectedCliente.observacoes}</p>
                </div>}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <Card className="p-4 bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Limite de Crédito</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(selectedCliente.lim_credito || 0)}
                  </p>
                </Card>
                <Card className="p-4 bg-success/5">
                  <p className="text-xs text-muted-foreground mb-1">Crédito Disponível</p>
                  <p className="text-lg font-bold text-success">
                    {formatCurrency(selectedCliente.limite_disponivel || 0)}
                  </p>
                </Card>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog com Validação */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {form.formState.errors.root && <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nome_abrev" render={({
                field
              }) => <FormItem className="col-span-2">
                      <FormLabel>Nome do Cliente *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: H PREMIUM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="cgc" render={({
                field
              }) => <FormItem>
                      <FormLabel>CNPJ/CPF</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="telefone1" render={({
                field
              }) => <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 0000-0000" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="email" render={({
                field
              }) => <FormItem>
                      <FormLabel>E-mail Principal</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contato@exemplo.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="email_financeiro" render={({
                field
              }) => <FormItem>
                      <FormLabel>E-mail Financeiro</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="financeiro@exemplo.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="email_xml" render={({
                field
              }) => <FormItem>
                      <FormLabel>E-mail XML</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="nfe@exemplo.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="lim_credito" render={({
                field
              }) => <FormItem>
                      <FormLabel>Limite de Crédito (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="ins_estadual" render={({
                field
              }) => <FormItem>
                      <FormLabel>Inscrição Estadual</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000.000" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="atividade" render={({
                field
              }) => <FormItem>
                      <FormLabel>Atividade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Comércio, Indústria" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="coligada" render={({
                field
              }) => <FormItem>
                      <FormLabel>Coligada</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da coligada" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="observacoes" render={({
                field
              }) => <FormItem className="col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Input placeholder="Informações adicionais" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>;
}