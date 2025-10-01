import { useState } from "react";
import { Search, Plus, Eye, Edit, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PedidoForm from "@/components/PedidoForm";

interface ItemPedido {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  desconto: number;
  valorTotal: number;
}

interface Pedido {
  id: string;
  numero: string;
  cliente: string;
  clienteCnpj: string;
  dataCriacao: string;
  valorTotal: number;
  status: "Em Aberto" | "Aprovado" | "Faturado";
  itens: ItemPedido[];
}

const pedidosMock: Pedido[] = [
  {
    id: "1",
    numero: "S209210",
    cliente: "H PREMIUM",
    clienteCnpj: "11.316.220/0001-45",
    dataCriacao: "31/10/2025",
    valorTotal: 6783.00,
    status: "Em Aberto",
    itens: [
      {
        codigo: "NG035",
        descricao: "CAMPO CIRURGICO 60X50 CM PHARMAPLUS",
        quantidade: 40,
        unidade: "PC",
        precoUnitario: 41.68500,
        desconto: 0,
        valorTotal: 6783.00,
      },
    ],
  },
  {
    id: "2",
    numero: "S209209",
    cliente: "MEDICAL CENTER",
    clienteCnpj: "12.345.678/0001-90",
    dataCriacao: "30/10/2025",
    valorTotal: 25480.50,
    status: "Aprovado",
    itens: [
      {
        codigo: "LUV001",
        descricao: "LUVA PROCEDIMENTO LATEX TAM M C/100",
        quantidade: 50,
        unidade: "CX",
        precoUnitario: 35.90,
        desconto: 0,
        valorTotal: 1795.00,
      },
      {
        codigo: "MAS001",
        descricao: "MASCARA CIRURGICA TRIPLA C/ELASTICO",
        quantidade: 100,
        unidade: "CX",
        precoUnitario: 42.00,
        desconto: 5,
        valorTotal: 3990.00,
      },
    ],
  },
  {
    id: "3",
    numero: "S209208",
    cliente: "AYA REPRESENTACOES",
    clienteCnpj: "98.765.432/0001-10",
    dataCriacao: "29/10/2025",
    valorTotal: 45280.00,
    status: "Faturado",
    itens: [
      {
        codigo: "SER001",
        descricao: "SERINGA DESCARTAVEL 10ML S/AGULHA",
        quantidade: 5000,
        unidade: "UN",
        precoUnitario: 0.95,
        desconto: 0,
        valorTotal: 4750.00,
      },
      {
        codigo: "CAT001",
        descricao: "CATETER IV PERISEG/AG 22GX25MM",
        quantidade: 200,
        unidade: "PC",
        precoUnitario: 7.30,
        desconto: 0,
        valorTotal: 1460.00,
      },
    ],
  },
];

export default function Vendas() {
  const [pedidos] = useState<Pedido[]>(pedidosMock);
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "view" | "edit">("list");
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const filteredPedidos = pedidos.filter(
    (p) =>
      p.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clienteCnpj.includes(searchTerm) ||
      p.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Em Aberto":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "Aprovado":
        return "bg-success/10 text-success border-success/20";
      case "Faturado":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted";
    }
  };

  const viewPedido = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setView("view");
  };

  const editPedido = (pedido?: Pedido) => {
    if (pedido) {
      setSelectedPedido(pedido);
    } else {
      setSelectedPedido(null);
    }
    setView("edit");
  };

  if (view === "view" && selectedPedido) {
    return (
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setView("list")}>
              <ChevronLeft size={16} className="mr-1" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-primary">Proposta #{selectedPedido.numero}</h1>
              <Badge className={getStatusColor(selectedPedido.status)}>{selectedPedido.status}</Badge>
            </div>
          </div>
          <Button onClick={() => editPedido(selectedPedido)} className="bg-primary hover:bg-primary/90">
            <Edit size={16} className="mr-2" />
            Editar Pedido
          </Button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-primary mb-4">Dados do Cliente</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{selectedPedido.cliente}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CNPJ:</span>
                <p className="font-medium">{selectedPedido.clienteCnpj}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-primary mb-4">Dados do Pedido</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Número:</span>
                <p className="font-medium">{selectedPedido.numero}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data:</span>
                <p className="font-medium">{selectedPedido.dataCriacao}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-primary mb-4">Dados de Entrega</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium">{selectedPedido.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Total:</span>
                <p className="font-bold text-success text-lg">{formatCurrency(selectedPedido.valorTotal)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Itens do Pedido</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold">Código</th>
                  <th className="text-left p-3 text-sm font-semibold">Descrição</th>
                  <th className="text-right p-3 text-sm font-semibold">Qtd</th>
                  <th className="text-left p-3 text-sm font-semibold">Un</th>
                  <th className="text-right p-3 text-sm font-semibold">Preço Unit.</th>
                  <th className="text-right p-3 text-sm font-semibold">Desconto %</th>
                  <th className="text-right p-3 text-sm font-semibold">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedPedido.itens.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm font-mono text-success font-semibold">{item.codigo}</td>
                    <td className="p-3 text-sm">{item.descricao}</td>
                    <td className="p-3 text-sm text-right">{item.quantidade.toFixed(2)}</td>
                    <td className="p-3 text-sm">{item.unidade}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(item.precoUnitario)}</td>
                    <td className="p-3 text-sm text-right">{item.desconto.toFixed(2)}%</td>
                    <td className="p-3 text-sm text-right font-semibold">
                      {formatCurrency(item.valorTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Valor Total do Pedido</p>
              <p className="text-3xl font-bold text-success">{formatCurrency(selectedPedido.valorTotal)}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (view === "edit") {
    return <PedidoForm selectedPedido={selectedPedido} onBack={() => setView("list")} />;
  }

  // List View
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Vendas</h1>
          <p className="text-muted-foreground">Gerencie suas propostas e pedidos</p>
        </div>
        <Button onClick={() => editPedido()} className="bg-primary hover:bg-primary/90">
          <Plus size={16} className="mr-2" />
          Nova Proposta
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar por número, cliente, CNPJ ou status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredPedidos.length} {filteredPedidos.length === 1 ? "pedido encontrado" : "pedidos encontrados"}
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold">Número</th>
                <th className="text-left p-4 font-semibold">Cliente</th>
                <th className="text-left p-4 font-semibold">CNPJ</th>
                <th className="text-left p-4 font-semibold">Data Criação</th>
                <th className="text-right p-4 font-semibold">Valor Total</th>
                <th className="text-center p-4 font-semibold">Status</th>
                <th className="text-center p-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((pedido) => (
                <tr key={pedido.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-mono text-success font-semibold">{pedido.numero}</td>
                  <td className="p-4">{pedido.cliente}</td>
                  <td className="p-4 font-mono text-sm">{pedido.clienteCnpj}</td>
                  <td className="p-4">{pedido.dataCriacao}</td>
                  <td className="p-4 text-right font-semibold">{formatCurrency(pedido.valorTotal)}</td>
                  <td className="p-4 text-center">
                    <Badge className={getStatusColor(pedido.status)}>{pedido.status}</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewPedido(pedido)}
                      >
                        <Eye size={14} className="mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editPedido(pedido)}
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
