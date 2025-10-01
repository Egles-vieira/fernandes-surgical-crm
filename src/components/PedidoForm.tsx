import { useState } from "react";
import { ChevronLeft, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ItemPedido {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  desconto: number;
  valorTotal: number;
  estoque?: number;
}

interface PedidoData {
  numero: string;
  cliente: string;
  cnpj: string;
  tipoPedido: string;
  contrato: boolean;
  enderecoEntrega: string;
  dataFaturamento: string;
  validadeProposta: string;
  codigoCliente: string;
  condicaoPagamento: string;
  dataUltimaVenda: string;
  atendimentoParcial: boolean;
  tipoFrete: string;
  statusCredito: string;
  creditoDisponivel: number;
  nomeTransportadora: string;
  divisaoMedia: string;
  prazoEntrega: string;
  atividade: string;
  empresaME: boolean;
  itens: ItemPedido[];
}

interface ProdutoCatalogo {
  codigo: string;
  nome: string;
  fabricante: string;
  unidade: string;
  precoVenda: number;
  estoque: number;
}

interface ClienteInfo {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeAbreviado: string;
  cnpj: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  limiteCredito: number;
  creditoDisponivel: number;
  condicaoPagamento: string;
  endereco: string;
}

const clientesMock: ClienteInfo[] = [
  {
    id: "1",
    codigo: "32292",
    razaoSocial: "H PREMIUM REPRESENTACOES LTDA",
    nomeAbreviado: "H PREMIUM",
    cnpj: "11.316.220/0001-45",
    cidade: "Goiânia",
    estado: "GO",
    telefone: "(62) 3241-5500",
    email: "contato@hpremium.com.br",
    limiteCredito: 50000,
    creditoDisponivel: 48254.24,
    condicaoPagamento: "ESPECIAL",
    endereco: "H PREMIUM. Padrão AVENIDA T-4 1445 QUADRA 168 LOTE 14 S",
  },
  {
    id: "2",
    codigo: "32293",
    razaoSocial: "MEDICAL CENTER DISTRIBUIDORA LTDA",
    nomeAbreviado: "MEDICAL CENTER",
    cnpj: "12.345.678/0001-90",
    cidade: "Goiânia",
    estado: "GO",
    telefone: "(62) 3333-4444",
    email: "contato@medicalcenter.com.br",
    limiteCredito: 30000,
    creditoDisponivel: 15000,
    condicaoPagamento: "30 DIAS",
    endereco: "Rua das Flores, 500, Centro, Goiânia - GO",
  },
  {
    id: "3",
    codigo: "32294",
    razaoSocial: "AYA REPRESENTACOES LTDA",
    nomeAbreviado: "AYA REPRESENTACOES",
    cnpj: "98.765.432/0001-10",
    cidade: "Goiânia",
    estado: "GO",
    telefone: "(62) 3555-6666",
    email: "contato@aya.com.br",
    limiteCredito: 75000,
    creditoDisponivel: 60000,
    condicaoPagamento: "45 DIAS",
    endereco: "Avenida Principal, 1000, Setor Sul, Goiânia - GO",
  },
];

const produtosCatalogo: ProdutoCatalogo[] = [
  { codigo: "ABA001", nome: "ABAIXA LINGUA MADEIRA C/100 UNIDADES", fabricante: "MED PLUS", unidade: "CX", precoVenda: 8.50, estoque: 150 },
  { codigo: "LUV001", nome: "LUVA PROCEDIMENTO LATEX TAM M C/100", fabricante: "SUPERMAX", unidade: "CX", precoVenda: 35.90, estoque: 15 },
  { codigo: "BIS001", nome: "BISTURI DESCARTAVEL N°15 ESTERIL", fabricante: "SOLIDOR", unidade: "UN", precoVenda: 2.80, estoque: 300 },
  { codigo: "SER001", nome: "SERINGA DESCARTAVEL 10ML S/AGULHA", fabricante: "BD", unidade: "UN", precoVenda: 0.95, estoque: 5000 },
  { codigo: "CAT001", nome: "CATETER IV PERISEG/AG 22GX25MM", fabricante: "BD", unidade: "PC", precoVenda: 7.30, estoque: 200 },
  { codigo: "MAS001", nome: "MASCARA CIRURGICA TRIPLA C/ELASTICO", fabricante: "CREMER", unidade: "CX", precoVenda: 42.00, estoque: 80 },
  { codigo: "SON001", nome: "SONDA URETRAL N°12 ESTERIL", fabricante: "MARK MED", unidade: "UN", precoVenda: 3.80, estoque: 120 },
  { codigo: "GAZ001", nome: "GAZE ESTERIL 11 FIOS 7,5X7,5CM", fabricante: "CREMER", unidade: "PCT", precoVenda: 1.20, estoque: 800 },
  { codigo: "PIN001", nome: "PINCA KELLY CURVA 14CM INOX", fabricante: "ABC INSTRUMENTS", unidade: "UN", precoVenda: 85.00, estoque: 25 },
  { codigo: "EQU001", nome: "EQUIPO MACROGOTAS ESTERIL", fabricante: "SANOBIOL", unidade: "UN", precoVenda: 4.50, estoque: 450 },
  { codigo: "NG035", nome: "CAMPO CIRURGICO 60X50 CM PHARMAPLUS", fabricante: "PHARMAPLUS", unidade: "PC", precoVenda: 14.50, estoque: 100 },
];

interface PedidoFormProps {
  selectedPedido: any | null;
  onBack: () => void;
}

export default function PedidoForm({ selectedPedido, onBack }: PedidoFormProps) {
  const [formData, setFormData] = useState<PedidoData>({
    numero: selectedPedido?.numero || "S" + Math.floor(Math.random() * 1000000),
    cliente: selectedPedido?.cliente || "",
    cnpj: selectedPedido?.clienteCnpj || "",
    tipoPedido: "Normal",
    contrato: false,
    enderecoEntrega: "H PREMIUM. Padrão AVENIDA T-4 1445 QUADRA 168 LOTE 14 S",
    dataFaturamento: "",
    validadeProposta: "31/10/2025",
    codigoCliente: "32292",
    condicaoPagamento: "ESPECIAL",
    dataUltimaVenda: "30/09/2025",
    atendimentoParcial: false,
    tipoFrete: "FRETE CIF",
    statusCredito: "Normal",
    creditoDisponivel: 48254.24,
    nomeTransportadora: "FEDEXJINT",
    divisaoMedia: "0.63613",
    prazoEntrega: "3",
    atividade: "CONS_FINAL",
    empresaME: false,
    itens: selectedPedido?.itens || [],
  });

  const [showProdutoModal, setShowProdutoModal] = useState(false);
  const [searchProduto, setSearchProduto] = useState("");
  const [faseCotacao, setFaseCotacao] = useState<string>("COTACAO");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [searchCliente, setSearchCliente] = useState("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calcularTotal = () => {
    return formData.itens.reduce((sum, item) => sum + item.valorTotal, 0);
  };

  const adicionarProduto = (produto: ProdutoCatalogo) => {
    const novoItem: ItemPedido = {
      codigo: produto.codigo,
      descricao: produto.nome,
      quantidade: 1,
      unidade: produto.unidade,
      precoUnitario: produto.precoVenda,
      desconto: 0,
      valorTotal: produto.precoVenda,
      estoque: produto.estoque,
    };

    setFormData({
      ...formData,
      itens: [...formData.itens, novoItem],
    });
    setShowProdutoModal(false);
    setSearchProduto("");
  };

  const removerItem = (index: number) => {
    const novosItens = formData.itens.filter((_, i) => i !== index);
    setFormData({ ...formData, itens: novosItens });
  };

  const atualizarItem = (index: number, campo: string, valor: any) => {
    const novosItens = [...formData.itens];
    novosItens[index] = {
      ...novosItens[index],
      [campo]: valor,
    };

    // Recalcular valor total do item
    if (campo === "quantidade" || campo === "precoUnitario" || campo === "desconto") {
      const item = novosItens[index];
      const subtotal = item.quantidade * item.precoUnitario;
      const descontoValor = (subtotal * item.desconto) / 100;
      novosItens[index].valorTotal = subtotal - descontoValor;
    }

    setFormData({ ...formData, itens: novosItens });
  };

  const clientesFiltrados = clientesMock.filter(
    (c) =>
      c.nomeAbreviado.toLowerCase().includes(searchCliente.toLowerCase()) ||
      c.razaoSocial.toLowerCase().includes(searchCliente.toLowerCase()) ||
      c.cnpj.includes(searchCliente) ||
      c.codigo.includes(searchCliente)
  );

  const produtosFiltrados = produtosCatalogo.filter(
    (p) =>
      p.codigo.toLowerCase().includes(searchProduto.toLowerCase()) ||
      p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
      p.fabricante.toLowerCase().includes(searchProduto.toLowerCase())
  );

  const selecionarCliente = (cliente: ClienteInfo) => {
    setFormData({
      ...formData,
      cliente: cliente.nomeAbreviado,
      cnpj: cliente.cnpj,
      codigoCliente: cliente.codigo,
      enderecoEntrega: cliente.endereco,
      condicaoPagamento: cliente.condicaoPagamento,
      creditoDisponivel: cliente.creditoDisponivel,
      statusCredito: cliente.creditoDisponivel > cliente.limiteCredito * 0.5 ? "Normal" : "Atenção",
    });
    setShowClienteModal(false);
    setSearchCliente("");
    
    toast({
      title: "Cliente selecionado",
      description: `${cliente.nomeAbreviado} carregado com sucesso.`,
    });
  };

  const handleSalvar = () => {
    if (!formData.cliente || !formData.cnpj) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha Cliente e CNPJ antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    if (formData.itens.length === 0) {
      toast({
        title: "Pedido vazio",
        description: "Adicione pelo menos um produto ao pedido.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pedido salvo!",
      description: `Pedido #${formData.numero} salvo com sucesso.`,
    });

    console.log("Pedido salvo:", formData);
  };

  const handleEfetivar = () => {
    handleSalvar();
    setFaseCotacao("EFETIVADO");
    toast({
      title: "Pedido efetivado!",
      description: `Pedido #${formData.numero} foi efetivado.`,
    });
  };

  const handleDiretoria = () => {
    handleSalvar();
    setFaseCotacao("DIRETORIA");
    toast({
      title: "Enviado para diretoria",
      description: `Pedido #${formData.numero} enviado para aprovação da diretoria.`,
    });
  };

  const getFaseColor = () => {
    switch (faseCotacao) {
      case "COTACAO":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "EFETIVADO":
        return "bg-success/10 text-success border-success/20";
      case "DIRETORIA":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="flex flex-col">
      {/* Barra de Ações Fixa */}
      <div className="sticky top-0 z-30 bg-background border-b shadow-sm">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onBack} size="sm">
                <ChevronLeft size={16} className="mr-1" />
                Voltar
              </Button>
              <div>
                <h2 className="text-lg font-bold text-primary">
                  {selectedPedido ? `Editar Pedido #${formData.numero}` : `Novo Pedido #${formData.numero}`}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className={getFaseColor()}>
                {faseCotacao}
              </Badge>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBack}
                size="sm"
              >
                CANCELAR
              </Button>
              <Button 
                type="button" 
                onClick={handleSalvar}
                className="bg-success hover:bg-success/90 text-white"
                size="sm"
              >
                SALVAR
              </Button>
              <Button 
                type="button"
                onClick={handleEfetivar}
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                EFETIVAR
              </Button>
              <Button 
                type="button"
                onClick={handleDiretoria}
                className="bg-accent hover:bg-accent/90"
                size="sm"
              >
                DIRETORIA
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo do Formulário */}
      <div className="p-8">

      <Card className="p-6">
        <form className="space-y-6">
          {/* Linha 1: Duas colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Esquerda */}
            <div className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    placeholder="Nome do cliente"
                    readOnly
                    className="bg-muted cursor-pointer"
                    onClick={() => setShowClienteModal(true)}
                  />
                  <Button
                    type="button"
                    onClick={() => setShowClienteModal(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Search size={16} />
                  </Button>
                </div>
              </div>

              <div>
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <Label>Tipo do Pedido</Label>
                <Select value={formData.tipoPedido} onValueChange={(v) => setFormData({ ...formData, tipoPedido: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                    <SelectItem value="Especial">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contrato"
                  checked={formData.contrato}
                  onCheckedChange={(checked) => setFormData({ ...formData, contrato: checked as boolean })}
                />
                <Label htmlFor="contrato" className="font-normal cursor-pointer">
                  Contrato
                </Label>
              </div>

              <div>
                <Label>Endereço de Entrega</Label>
                <Input
                  value={formData.enderecoEntrega}
                  onChange={(e) => setFormData({ ...formData, enderecoEntrega: e.target.value })}
                />
              </div>

              <div>
                <Label>Data de Faturamento</Label>
                <Input
                  type="date"
                  value={formData.dataFaturamento}
                  onChange={(e) => setFormData({ ...formData, dataFaturamento: e.target.value })}
                />
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              <div>
                <Label>Validade da Proposta</Label>
                <Input
                  value={formData.validadeProposta}
                  onChange={(e) => setFormData({ ...formData, validadeProposta: e.target.value })}
                />
              </div>

              <div>
                <Label>Código Cliente</Label>
                <Input
                  value={formData.codigoCliente}
                  onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })}
                />
              </div>

              <div>
                <Label>Condições de Pagamento</Label>
                <Input
                  value={formData.condicaoPagamento}
                  onChange={(e) => setFormData({ ...formData, condicaoPagamento: e.target.value })}
                />
              </div>

              <div>
                <Label>Data da Última Venda</Label>
                <Input
                  value={formData.dataUltimaVenda}
                  onChange={(e) => setFormData({ ...formData, dataUltimaVenda: e.target.value })}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="atendimentoParcial"
                  checked={formData.atendimentoParcial}
                  onCheckedChange={(checked) => setFormData({ ...formData, atendimentoParcial: checked as boolean })}
                />
                <Label htmlFor="atendimentoParcial" className="font-normal cursor-pointer">
                  Atendimento Parcial
                </Label>
              </div>

              <div>
                <Label>Tipo de Frete</Label>
                <Select value={formData.tipoFrete} onValueChange={(v) => setFormData({ ...formData, tipoFrete: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FRETE CIF">FRETE CIF</SelectItem>
                    <SelectItem value="FRETE FOB">FRETE FOB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Linha 2: Três colunas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <Label>Status Crédito Cliente</Label>
              <Input value={formData.statusCredito} readOnly className="bg-muted" />
            </div>

            <div>
              <Label>Crédito Disponível</Label>
              <Input value={formatCurrency(formData.creditoDisponivel)} readOnly className="bg-muted" />
            </div>

            <div>
              <Label>Nome Transportadora</Label>
              <Input
                value={formData.nomeTransportadora}
                onChange={(e) => setFormData({ ...formData, nomeTransportadora: e.target.value })}
              />
            </div>

            <div>
              <Label>Divisão Média</Label>
              <Input value={formData.divisaoMedia} readOnly className="bg-muted" />
            </div>

            <div>
              <Label>Prazo de Entrega (dias)</Label>
              <Input
                type="number"
                value={formData.prazoEntrega}
                onChange={(e) => setFormData({ ...formData, prazoEntrega: e.target.value })}
              />
            </div>

            <div>
              <Label>Atividade</Label>
              <Input
                value={formData.atividade}
                onChange={(e) => setFormData({ ...formData, atividade: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="empresaME"
                checked={formData.empresaME}
                onCheckedChange={(checked) => setFormData({ ...formData, empresaME: checked as boolean })}
              />
              <Label htmlFor="empresaME" className="font-normal cursor-pointer">
                É Empresa ME
              </Label>
            </div>
          </div>

          {/* Seção de Itens */}
          <div className="pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Itens do Pedido</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setShowProdutoModal(true)}
                  className="bg-success hover:bg-success/90"
                >
                  <Plus size={16} className="mr-2" />
                  ADICIONAR PRODUTOS
                </Button>
              </div>
            </div>

            {/* Tabela de Itens */}
            {formData.itens.length > 0 ? (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-semibold">Cód</th>
                      <th className="text-left p-2 font-semibold">Descrição</th>
                      <th className="text-right p-2 font-semibold">Qtd</th>
                      <th className="text-left p-2 font-semibold">Un</th>
                      <th className="text-right p-2 font-semibold">Preço</th>
                      <th className="text-right p-2 font-semibold">Desc%</th>
                      <th className="text-right p-2 font-semibold">Total</th>
                      <th className="text-center p-2 font-semibold w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.itens.map((item, index) => (
                      <tr key={index} className="border-t hover:bg-muted/30">
                        <td className="p-2">
                          <span className="font-semibold text-success">{item.codigo}</span>
                        </td>
                        <td className="p-2 max-w-xs truncate">{item.descricao}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(index, "quantidade", Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="p-2">{item.unidade}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.precoUnitario}
                            onChange={(e) => atualizarItem(index, "precoUnitario", Number(e.target.value))}
                            className="w-24 text-right"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.desconto}
                            onChange={(e) => atualizarItem(index, "desconto", Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(item.valorTotal)}</td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                Nenhum item adicionado. Clique em "ADICIONAR PRODUTOS" para começar.
              </div>
            )}
          </div>

          {/* Rodapé com Total */}
          <div className="flex items-center justify-end pt-6 border-t">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Valor Total do Pedido</p>
              <p className="text-3xl font-bold text-success">{formatCurrency(calcularTotal())}</p>
            </div>
          </div>
        </form>
      </Card>

      {/* Modal de Pesquisa de Clientes */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Buscar por nome, razão social, CNPJ ou código..."
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">Código</th>
                    <th className="text-left p-3 font-semibold">Cliente</th>
                    <th className="text-left p-3 font-semibold">CNPJ</th>
                    <th className="text-left p-3 font-semibold">Cidade</th>
                    <th className="text-right p-3 font-semibold">Crédito Disp.</th>
                    <th className="text-center p-3 font-semibold w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-semibold text-success">{cliente.codigo}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-semibold">{cliente.nomeAbreviado}</p>
                          <p className="text-xs text-muted-foreground">{cliente.razaoSocial}</p>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs">{cliente.cnpj}</td>
                      <td className="p-3">{cliente.cidade}/{cliente.estado}</td>
                      <td className="p-3 text-right">
                        <span className={cliente.creditoDisponivel < cliente.limiteCredito * 0.3 ? "text-destructive font-semibold" : "text-success font-semibold"}>
                          {formatCurrency(cliente.creditoDisponivel)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => selecionarCliente(cliente)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Selecionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {clientesFiltrados.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pesquisa de Produtos */}
      <Dialog open={showProdutoModal} onOpenChange={setShowProdutoModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Adicionar Produtos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Buscar por código, nome ou fabricante..."
                value={searchProduto}
                onChange={(e) => setSearchProduto(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">Código</th>
                    <th className="text-left p-3 font-semibold">Produto</th>
                    <th className="text-left p-3 font-semibold">Fabricante</th>
                    <th className="text-right p-3 font-semibold">Estoque</th>
                    <th className="text-right p-3 font-semibold">Preço</th>
                    <th className="text-center p-3 font-semibold w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map((produto) => (
                    <tr key={produto.codigo} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-semibold text-success">{produto.codigo}</td>
                      <td className="p-3">{produto.nome}</td>
                      <td className="p-3">{produto.fabricante}</td>
                      <td className="p-3 text-right">
                        <span className={produto.estoque < 50 ? "text-destructive font-semibold" : ""}>
                          {produto.estoque} {produto.unidade}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(produto.precoVenda)}</td>
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => adicionarProduto(produto)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Adicionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
