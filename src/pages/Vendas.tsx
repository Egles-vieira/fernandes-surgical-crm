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
import { useCondicoesPagamento } from "@/hooks/useCondicoesPagamento";
import { useTiposFrete } from "@/hooks/useTiposFrete";
import { useTiposPedido } from "@/hooks/useTiposPedido";
import { ProdutoSearchDialog } from "@/components/ProdutoSearchDialog";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { VendasActionBar } from "@/components/VendasActionBar";
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
  const { condicoes, isLoading: isLoadingCondicoes } = useCondicoesPagamento();
  const { tipos: tiposFrete, isLoading: isLoadingTiposFrete } = useTiposFrete();
  const { tipos: tiposPedido, isLoading: isLoadingTiposPedido } = useTiposPedido();
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
  const [condicaoPagamentoId, setCondicaoPagamentoId] = useState<string>("");
  const [tipoFreteId, setTipoFreteId] = useState<string>("");
  const [tipoPedidoId, setTipoPedidoId] = useState<string>("");
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
    setCondicaoPagamentoId(venda.condicao_pagamento_id || "");
    setTipoFreteId(venda.tipo_frete_id || "");
    setTipoPedidoId(venda.tipo_pedido_id || "");
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
    setCondicaoPagamentoId("");
    setTipoFreteId("");
    setTipoPedidoId("");
    setObservacoes("");
    setCarrinho([]);
  };

  const handleCalcular = () => {
    toast({
      title: "Calculando proposta",
      description: "Valores atualizados com sucesso.",
    });
  };

  const handleCancelarProposta = () => {
    limparFormulario();
    setView("list");
  };

  const handleDiretoria = () => {
    toast({
      title: "Enviar para Diretoria",
      description: "Proposta enviada para aprovação da diretoria.",
    });
  };

  const handleEfetivar = async () => {
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

    setStatus("aprovada");
    await handleSalvarVenda();
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
          condicao_pagamento_id: condicaoPagamentoId || null,
          tipo_frete_id: tipoFreteId || null,
          tipo_pedido_id: tipoPedidoId || null,
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
          condicao_pagamento_id: condicaoPagamentoId || null,
          tipo_frete_id: tipoFreteId || null,
          tipo_pedido_id: tipoPedidoId || null,
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
      <>
        <VendasActionBar
          status={status}
          onCalcular={handleCalcular}
          onCancelar={handleCancelarProposta}
          onDiretoria={handleDiretoria}
          onEfetivar={handleEfetivar}
        />
        
        <div className="pt-20 p-8 space-y-6">
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
...
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
      </>
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