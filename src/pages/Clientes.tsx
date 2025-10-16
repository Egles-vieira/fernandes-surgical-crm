import { useState } from "react";
import { Search, Plus, Edit, Eye, MapPin, Phone, CreditCard, X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { clienteSchema, type ClienteInput } from "@/lib/validations/cliente";
import { toast } from "@/hooks/use-toast";

interface Cliente {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeAbreviado: string;
  cnpj: string;
  inscricaoEstadual: string;
  natureza: string;
  rua: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  limiteCredito: number;
  creditoDisponivel: number;
  condicaoPagamento: string;
}

const clientesMock: Cliente[] = [
  {
    id: "1",
    codigo: "32292",
    razaoSocial: "H PREMIUM REPRESENTACOES LTDA",
    nomeAbreviado: "H PREMIUM",
    cnpj: "11.316.220/0001-45",
    inscricaoEstadual: "123456789",
    natureza: "Jurídica",
    rua: "Padrão AVENIDA T-4 1445 QUADRA 168 LOTE 14 S",
    bairro: "Setor Bueno",
    cep: "74230-030",
    cidade: "Goiânia",
    estado: "GO",
    telefone: "(62) 3241-5500",
    email: "contato@hpremium.com.br",
    limiteCredito: 50000,
    creditoDisponivel: 48254.24,
    condicaoPagamento: "ESPECIAL",
  },
  {
    id: "2",
    codigo: "32293",
    razaoSocial: "MEDICAL CENTER DISTRIBUIDORA LTDA",
    nomeAbreviado: "MEDICAL CENTER",
    cnpj: "12.345.678/0001-90",
    inscricaoEstadual: "987654321",
    natureza: "Jurídica",
    rua: "Rua das Flores, 500",
    bairro: "Centro",
    cep: "74000-000",
    cidade: "Goiânia",
    estado: "GO",
    telefone: "(62) 3333-4444",
    email: "contato@medicalcenter.com.br",
    limiteCredito: 30000,
    creditoDisponivel: 15000,
    condicaoPagamento: "30 DIAS",
  },
  {
    id: "3",
    codigo: "32294",
    razaoSocial: "AYA REPRESENTACOES LTDA",
    nomeAbreviado: "AYA REPRESENTACOES",
    cnpj: "98.765.432/0001-10",
    inscricaoEstadual: "456789123",
    natureza: "Jurídica",
    rua: "Avenida Principal, 1000",
    bairro: "Setor Sul",
    cep: "74000-100",
    cidade: "Goiânia",
    estado: "GO",
    telefone: "(62) 3555-6666",
    email: "contato@aya.com.br",
    limiteCredito: 75000,
    creditoDisponivel: 60000,
    condicaoPagamento: "45 DIAS",
  },
];

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes] = useState<Cliente[]>(clientesMock);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      observacoes: "",
    },
  });

  const filteredClientes = clientes.filter(
    (c) =>
      c.nomeAbreviado.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm) ||
      c.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const openForm = (cliente?: Cliente) => {
    if (cliente) {
      form.reset({
        nome_abrev: cliente.nomeAbreviado,
        cgc: cliente.cnpj,
        email: cliente.email,
        lim_credito: cliente.limiteCredito,
        observacoes: "",
      });
      setIsEditing(true);
    } else {
      form.reset({
        nome_abrev: "",
        cgc: "",
        email: "",
        email_financeiro: "",
        email_xml: "",
        telefone1: "",
        lim_credito: 0,
        observacoes: "",
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

  const onSubmit = (data: ClienteInput) => {
    console.log("Cliente validado:", data);
    
    toast({
      title: isEditing ? "Cliente atualizado!" : "Cliente cadastrado!",
      description: `${data.nome_abrev} foi ${isEditing ? "atualizado" : "cadastrado"} com sucesso.`,
    });
    
    closeForm();
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/importar-clientes')} variant="outline">
            <Upload size={16} className="mr-2" />
            Importar CSV
          </Button>
          <Button onClick={() => openForm()} className="bg-primary hover:bg-primary/90">
            <Plus size={16} className="mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Buscar por nome, CNPJ ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClientes.map((cliente) => (
          <Card key={cliente.id} className="p-6 shadow-elegant hover:shadow-lg transition-all">
            <div className="space-y-4">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{cliente.nomeAbreviado}</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {cliente.codigo}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{cliente.cnpj}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} />
                  <span>{cliente.cidade}/{cliente.estado}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={14} />
                  <span>{cliente.telefone}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Limite:</span>
                  <span className="font-semibold">{formatCurrency(cliente.limiteCredito)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Disponível:</span>
                  <span className="font-semibold text-success">
                    {formatCurrency(cliente.creditoDisponivel)}
                  </span>
                </div>
                <div className="text-xs text-center py-1 bg-muted rounded">
                  {cliente.condicaoPagamento}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedCliente(cliente);
                    setShowDetails(true);
                  }}
                >
                  <Eye size={14} className="mr-1" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openForm(cliente)}
                >
                  <Edit size={14} className="mr-1" />
                  Editar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCliente && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Razão Social</Label>
                  <p className="font-medium">{selectedCliente.razaoSocial}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nome Abreviado</Label>
                  <p className="font-medium">{selectedCliente.nomeAbreviado}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CNPJ</Label>
                  <p className="font-medium">{selectedCliente.cnpj}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Inscrição Estadual</Label>
                  <p className="font-medium">{selectedCliente.inscricaoEstadual}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Endereço Completo</Label>
                <p className="font-medium">
                  {selectedCliente.rua}, {selectedCliente.bairro}
                  <br />
                  CEP: {selectedCliente.cep} - {selectedCliente.cidade}/{selectedCliente.estado}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{selectedCliente.telefone}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <p className="font-medium">{selectedCliente.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <Card className="p-4 bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Limite de Crédito</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(selectedCliente.limiteCredito)}
                  </p>
                </Card>
                <Card className="p-4 bg-success/5">
                  <p className="text-xs text-muted-foreground mb-1">Crédito Disponível</p>
                  <p className="text-lg font-bold text-success">
                    {formatCurrency(selectedCliente.creditoDisponivel)}
                  </p>
                </Card>
                <Card className="p-4 bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Condição Pagamento</p>
                  <p className="text-sm font-bold">{selectedCliente.condicaoPagamento}</p>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog com Validação */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome_abrev"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nome do Cliente *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: H PREMIUM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cgc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ/CPF</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(00) 0000-0000" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Principal</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contato@exemplo.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_financeiro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail Financeiro</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="financeiro@exemplo.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_xml"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail XML</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="nfe@exemplo.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lim_credito"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Crédito (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Input placeholder="Informações adicionais" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting 
                    ? "Salvando..." 
                    : isEditing ? "Salvar Alterações" : "Cadastrar Cliente"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
