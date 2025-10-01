import { useState, useEffect } from "react";
import { Search, Plus, Eye, Trash2, ShoppingCart, Save, Users, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendas } from "@/hooks/useVendas";
import { ProdutoSearchDialog } from "@/components/ProdutoSearchDialog";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Produto = Tables<"produtos">;
type Cliente = Tables<"clientes">;

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  desconto: number;
  valor_total: number;
}

export default function Vendas() {
  const { vendas, isLoading, createVenda, addItem, updateVenda, updateItem, removeItem } = useVendas();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"list" | "nova">("list");
  const [showProdutoSearch, setShowProdutoSearch] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [editandoVendaId, setEditandoVendaId] = useState<string | null>(null);
  
  // Nova venda state
  const [numeroVenda, setNumeroVenda] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [status, setStatus] = useState<"rascunho" | "aprovada" | "cancelada">("rascunho");
  const [observacoes, setObservacoes] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  useEffect(() => {
    if (view === "nova" && !numeroVenda) {
      const nextNumber = `V${Date.now().toString().slice(-8)}`;
      setNumeroVenda(nextNumber);
    }
  }, [view]);

  const filteredVendas = vendas.filter(
    (v) =>
      v.numero_venda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.cliente_cnpj && v.cliente_cnpj.includes(searchTerm)) ||
      v.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "rascunho":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "aprovada":
        return "bg-success/10 text-success border-success/20";
      case "cancelada":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted";
    }
  };

  const handleAddProduto = (produto: Produto) => {
    const existingItem = carrinho.find(item => item.produto.id === produto.id);
    
    if (existingItem) {
      setCarrinho(carrinho.map(item => 
        item.produto.id === produto.id
          ? { 
              ...item, 
              quantidade: item.quantidade + 1,
              valor_total: (item.quantidade + 1) * item.produto.preco_venda * (1 - item.desconto / 100)
            }
          : item
      ));
    } else {
      setCarrinho([...carrinho, {
        produto,
        quantidade: 1,
        desconto: 0,
        valor_total: produto.preco_venda
      }]);
    }

    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} foi adicionado ao carrinho.`,
    });
  };

  const handleUpdateQuantidade = (index: number, quantidade: number) => {
    if (quantidade <= 0) return;
    
    setCarrinho(carrinho.map((item, i) => 
      i === index
        ? { 
            ...item, 
            quantidade,
            valor_total: quantidade * item.produto.preco_venda * (1 - item.desconto / 100)
          }
        : item
    ));
  };

  const handleUpdateDesconto = (index: number, desconto: number) => {
    if (desconto < 0 || desconto > 100) return;
    
    setCarrinho(carrinho.map((item, i) => 
      i === index
        ? { 
            ...item, 
            desconto,
            valor_total: item.quantidade * item.produto.preco_venda * (1 - desconto / 100)
          }
        : item
    ));
  };

  const handleRemoveItem = (index: number) => {
    setCarrinho(carrinho.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return carrinho.reduce((sum, item) => sum + item.valor_total, 0);
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setClienteNome(cliente.nome_emit);
    setClienteCnpj(cliente.cgc);
  };

  const handleEditarVenda = (venda: any) => {
    setEditandoVendaId(venda.id);
    setNumeroVenda(venda.numero_venda);
    setClienteNome(venda.cliente_nome);
    setClienteCnpj(venda.cliente_cnpj || "");
    setStatus(venda.status);
    setObservacoes(venda.observacoes || "");
    
    // Carregar itens da venda
    const itensCarrinho: ItemCarrinho[] = (venda.vendas_itens || []).map((item: any) => ({
      produto: item.produtos,
      quantidade: item.quantidade,
      desconto: item.desconto,
      valor_total: item.valor_total,
    }));
    setCarrinho(itensCarrinho);
    
    setView("nova");
  };

  const limparFormulario = () => {
    setEditandoVendaId(null);
    setNumeroVenda("");
    setClienteSelecionado(null);
    setClienteNome("");
    setClienteCnpj("");
    setStatus("rascunho");
    setObservacoes("");
    setCarrinho([]);
  };

  const handleSalvarVenda = async () => {
    if (!clienteNome.trim()) {
      toast({
        title: "Erro",
        description: "Selecione ou informe o cliente",
        variant: "destructive",
      });
      return;
    }

    if (carrinho.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda",
        variant: "destructive",
      });
      return;
    }

    try {
      const valorTotal = calcularTotal();
      
      if (editandoVendaId) {
        // Atualizar venda existente
        await updateVenda.mutateAsync({
          id: editandoVendaId,
          numero_venda: numeroVenda,
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpj || null,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status,
          observacoes: observacoes || null,
        });

        // Remover itens antigos e adicionar novos
        const vendaAtual = vendas.find(v => v.id === editandoVendaId);
        if (vendaAtual?.vendas_itens) {
          for (const item of vendaAtual.vendas_itens) {
            await removeItem.mutateAsync(item.id);
          }
        }

        for (const item of carrinho) {
          await addItem.mutateAsync({
            venda_id: editandoVendaId,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            desconto: item.desconto,
            valor_total: item.valor_total,
          });
        }

        toast({
          title: "Venda atualizada!",
          description: "A venda foi atualizada com sucesso.",
        });
      } else {
        // Criar nova venda
        const venda = await createVenda.mutateAsync({
          numero_venda: numeroVenda,
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpj || null,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status,
          observacoes: observacoes || null,
        });

        for (const item of carrinho) {
          await addItem.mutateAsync({
            venda_id: venda.id,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            desconto: item.desconto,
            valor_total: item.valor_total,
          });
        }

        toast({
          title: "Venda salva!",
          description: "A venda foi criada com sucesso.",
        });
      }

      limparFormulario();
      setView("list");
    } catch (error: any) {
      console.error("Erro ao salvar venda:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando vendas...</p>
        </div>
      </div>
    );
  }

  if (view === "nova") {
    return (
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {editandoVendaId ? "Editar Venda" : "Nova Venda"}
            </h1>
            <p className="text-muted-foreground">
              {editandoVendaId ? "Altere os dados da proposta" : "Crie uma nova proposta de venda"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              limparFormulario();
              setView("list");
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarVenda} disabled={createVenda.isPending || updateVenda.isPending}>
              <Save size={16} className="mr-2" />
              {editandoVendaId ? "Atualizar Venda" : "Salvar Venda"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <Card className="lg:col-span-2 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Informações da Venda</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero">Número da Venda</Label>
                  <Input
                    id="numero"
                    value={numeroVenda}
                    onChange={(e) => setNumeroVenda(e.target.value)}
                    placeholder="V12345"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Cliente *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowClienteSearch(true)}
                    >
                      <Users size={16} className="mr-2" />
                      {clienteSelecionado ? clienteSelecionado.nome_emit : "Selecionar Cliente"}
                    </Button>
                  </div>
                  {clienteSelecionado && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{clienteSelecionado.nome_emit}</p>
                          <p className="text-sm text-muted-foreground">
                            CNPJ/CPF: {clienteSelecionado.cgc}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Código: {clienteSelecionado.cod_emitente}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setClienteSelecionado(null);
                            setClienteNome("");
                            setClienteCnpj("");
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="obs">Observações</Label>
                  <Input
                    id="obs"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observações sobre a venda"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Produtos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Produtos</h3>
                <Button onClick={() => setShowProdutoSearch(true)}>
                  <ShoppingCart size={16} className="mr-2" />
                  Adicionar Produto
                </Button>
              </div>

              {carrinho.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto adicionado ainda
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-center">Desc. %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrinho.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.produto.referencia_interna}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.produto.nome}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateQuantidade(index, Number(e.target.value))}
                            className="w-20 text-center"
                            min="1"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.produto.preco_venda)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.desconto}
                            onChange={(e) => handleUpdateDesconto(index, Number(e.target.value))}
                            className="w-20 text-center"
                            min="0"
                            max="100"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-success">
                          {formatCurrency(item.valor_total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>

          {/* Resumo */}
          <Card className="p-6 h-fit">
            <h3 className="text-lg font-semibold mb-4">Resumo da Venda</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Itens:</span>
                <span className="font-medium">{carrinho.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qtd Total:</span>
                <span className="font-medium">
                  {carrinho.reduce((sum, item) => sum + item.quantidade, 0)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-lg font-semibold">Valor Total:</span>
                <span className="text-2xl font-bold text-success">
                  {formatCurrency(calcularTotal())}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <ProdutoSearchDialog
          open={showProdutoSearch}
          onOpenChange={setShowProdutoSearch}
          onSelectProduto={handleAddProduto}
        />
        
        <ClienteSearchDialog
          open={showClienteSearch}
          onOpenChange={setShowClienteSearch}
          onSelectCliente={handleSelectCliente}
        />
      </div>
    );
  }

  // List View
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Vendas</h1>
          <p className="text-muted-foreground">Gerencie suas propostas e vendas</p>
        </div>
        <Button onClick={() => setView("nova")}>
          <Plus size={16} className="mr-2" />
          Nova Venda
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
          {filteredVendas.length} {filteredVendas.length === 1 ? "venda" : "vendas"}
        </span>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Itens</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma venda encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredVendas.map((venda) => (
                <TableRow key={venda.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-success font-semibold">
                    {venda.numero_venda}
                  </TableCell>
                  <TableCell>{venda.cliente_nome}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {venda.cliente_cnpj || "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(venda.data_venda).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(venda.valor_final)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusColor(venda.status)}>
                      {venda.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {venda.vendas_itens?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditarVenda(venda)}
                    >
                      <Edit size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}