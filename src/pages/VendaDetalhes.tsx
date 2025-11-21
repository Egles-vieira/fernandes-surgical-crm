import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { Search, Save, Trash2, Calculator, Loader2, ChevronLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useVendas } from "@/hooks/useVendas";
import { useCondicoesPagamento } from "@/hooks/useCondicoesPagamento";
import { useTiposFrete } from "@/hooks/useTiposFrete";
import { useTiposPedido } from "@/hooks/useTiposPedido";
import { useVendedores } from "@/hooks/useVendedores";
import { useDatasulCalculaPedido } from "@/hooks/useDatasulCalculaPedido";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ProdutoSearchDialog } from "@/components/ProdutoSearchDialog";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { VendasActionBar } from "@/components/VendasActionBar";
import { AprovarVendaDialog } from "@/components/vendas/AprovarVendaDialog";
import { IntegracaoDatasulLog } from "@/components/IntegracaoDatasulLog";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
type Produto = Tables<"produtos">;
type Cliente = Tables<"clientes">;
interface VendaWithItems extends Tables<"vendas"> {
  vendas_itens?: (Tables<"vendas_itens"> & {
    produtos?: Produto;
  })[];
}
interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  desconto: number;
  valor_total: number;
  datasul_dep_exp?: number | null;
  datasul_custo?: number | null;
  datasul_divisao?: number | null;
  datasul_vl_tot_item?: number | null;
  datasul_vl_merc_liq?: number | null;
  datasul_lote_mulven?: number | null;
}
export default function VendaDetalhes() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    vendas,
    isLoading,
    addItem,
    updateVenda,
    updateItem,
    removeItem,
    aprovarVenda
  } = useVendas();
  const {
    condicoes
  } = useCondicoesPagamento();
  const {
    tipos: tiposFrete
  } = useTiposFrete();
  const {
    tipos: tiposPedido
  } = useTiposPedido();
  const {
    vendedores
  } = useVendedores();
  const {
    calcularPedido,
    isCalculating
  } = useDatasulCalculaPedido();
  const {
    toast
  } = useToast();
  const {
    visibleColumns,
    toggleColumn
  } = useColumnVisibility("vendas_itens_columns", {
    precoTabela: true,
    precoUnit: true,
    desconto: true,
    total: true,
    custo: true,
    divisao: true,
    vlTotalDS: true,
    vlMercLiq: true,
    loteMult: true,
    deposito: true
  });
  const [venda, setVenda] = useState<VendaWithItems | null>(null);
  const [showProdutoSearch, setShowProdutoSearch] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [showAprovarDialog, setShowAprovarDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [numeroVenda, setNumeroVenda] = useState("");
  const [tipoFreteId, setTipoFreteId] = useState<string>("");
  const [tipoPedidoId, setTipoPedidoId] = useState<string>("");
  const [condicaoPagamentoId, setCondicaoPagamentoId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [valorEstimado, setValorEstimado] = useState<number>(0);
  const [probabilidade, setProbabilidade] = useState<number>(50);
  const [origemLead, setOrigemLead] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [validadeProposta, setValidadeProposta] = useState<string>("");
  const [faturamentoParcial, setFaturamentoParcial] = useState(false);
  const [dataFaturamentoProgramado, setDataFaturamentoProgramado] = useState<string>("");

  // Carregar venda
  useEffect(() => {
    if (id && vendas) {
      const vendaEncontrada = vendas.find(v => v.id === id);
      if (vendaEncontrada) {
        setVenda(vendaEncontrada);
        setNumeroVenda(vendaEncontrada.numero_venda || "");
        setTipoFreteId(vendaEncontrada.tipo_frete_id || "");
        setTipoPedidoId(vendaEncontrada.tipo_pedido_id || "");
        setCondicaoPagamentoId(vendaEncontrada.condicao_pagamento_id || "");
        setObservacoes(vendaEncontrada.observacoes || "");
        setValorEstimado(vendaEncontrada.valor_estimado || 0);
        setProbabilidade(vendaEncontrada.probabilidade || 50);
        setOrigemLead(vendaEncontrada.origem_lead || "");
        setResponsavelId(vendaEncontrada.responsavel_id || "");
        setValidadeProposta(vendaEncontrada.validade_proposta || "");
        setFaturamentoParcial(vendaEncontrada.faturamento_parcial === "YES");
        setDataFaturamentoProgramado((vendaEncontrada as any).data_faturamento_programado || "");

        // Carregar cliente
        if (vendaEncontrada.cliente_id) {
          supabase.from("clientes").select("*").eq("id", vendaEncontrada.cliente_id).single().then(({
            data
          }) => {
            if (data) setClienteSelecionado(data);
          });
        }

        // Carregar itens no carrinho
        if (vendaEncontrada.vendas_itens) {
          const itens = vendaEncontrada.vendas_itens.map(item => ({
            produto: item.produtos!,
            quantidade: item.quantidade,
            desconto: item.desconto,
            valor_total: item.valor_total,
            datasul_dep_exp: item.datasul_dep_exp,
            datasul_custo: item.datasul_custo,
            datasul_divisao: item.datasul_divisao,
            datasul_vl_tot_item: item.datasul_vl_tot_item,
            datasul_vl_merc_liq: item.datasul_vl_merc_liq,
            datasul_lote_mulven: item.datasul_lote_mulven
          }));
          setCarrinho(itens);
        }
      } else {
        toast({
          title: "Venda não encontrada",
          variant: "destructive"
        });
        navigate("/vendas");
      }
    }
  }, [id, vendas, navigate, toast]);
  const valorTotal = useMemo(() => {
    return carrinho.reduce((sum, item) => sum + item.valor_total, 0);
  }, [carrinho]);
  const handleAdicionarProduto = (produto: Produto) => {
    // Validar se produto tem preço
    if (!produto.preco_venda || produto.preco_venda <= 0) {
      toast({
        title: "Produto sem preço",
        description: `O produto ${produto.nome} não possui preço de tabela definido. Configure o preço antes de adicionar.`,
        variant: "destructive"
      });
      return;
    }

    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    if (itemExistente) {
      const novoCarrinho = carrinho.map(item => item.produto.id === produto.id ? {
        ...item,
        quantidade: item.quantidade + 1,
        valor_total: (item.quantidade + 1) * produto.preco_venda * (1 - item.desconto / 100)
      } : item);
      setCarrinho(novoCarrinho);
    } else {
      setCarrinho([...carrinho, {
        produto,
        quantidade: 1,
        desconto: 0,
        valor_total: produto.preco_venda
      }]);
    }
    setShowProdutoSearch(false);
  };
  const handleRemoverItem = async (produtoId: string) => {
    if (!venda) return;
    const item = venda.vendas_itens?.find(i => i.produto_id === produtoId);
    if (item) {
      await removeItem.mutateAsync(item.id);
    }
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };
  const handleAtualizarItem = async (produtoId: string, campo: string, valor: any) => {
    const novoCarrinho = carrinho.map(item => {
      if (item.produto.id === produtoId) {
        const novoItem = {
          ...item,
          [campo]: valor
        };
        if (campo === 'quantidade' || campo === 'desconto') {
          novoItem.valor_total = novoItem.quantidade * item.produto.preco_venda * (1 - novoItem.desconto / 100);
        }

        // Atualizar no banco se a venda já existe
        if (venda) {
          const itemVenda = venda.vendas_itens?.find(i => i.produto_id === produtoId);
          if (itemVenda) {
            updateItem.mutateAsync({
              id: itemVenda.id,
              quantidade: novoItem.quantidade,
              desconto: novoItem.desconto,
              valor_total: novoItem.valor_total
            });
          }
        }
        return novoItem;
      }
      return item;
    });
    setCarrinho(novoCarrinho);
  };
  const handleSelecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setShowClienteSearch(false);
  };
  const handleSalvar = async () => {
    if (!clienteSelecionado || carrinho.length === 0 || !venda) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um cliente e adicione pelo menos um produto",
        variant: "destructive"
      });
      return;
    }
    try {
      // Atualizar venda
      await updateVenda.mutateAsync({
        id: venda.id,
        cliente_id: clienteSelecionado.id,
        numero_venda: numeroVenda,
        tipo_frete_id: tipoFreteId || null,
        tipo_pedido_id: tipoPedidoId || null,
        condicao_pagamento_id: condicaoPagamentoId || null,
        observacoes,
        valor_total: valorTotal,
        valor_estimado: valorEstimado,
        probabilidade,
        origem_lead: origemLead,
        responsavel_id: responsavelId || null,
        validade_proposta: validadeProposta || null,
        faturamento_parcial: faturamentoParcial ? "YES" : "NO",
        data_faturamento_programado: dataFaturamentoProgramado || null
      } as any);

      // Adicionar novos itens
      for (const item of carrinho) {
        const itemExistente = venda.vendas_itens?.find(i => i.produto_id === item.produto.id);
        if (!itemExistente) {
          await addItem.mutateAsync({
            venda_id: venda.id,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            desconto: item.desconto,
            valor_total: item.valor_total
          });
        }
      }
      toast({
        title: "Venda atualizada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a venda",
        variant: "destructive"
      });
    }
  };
  const handleCalcularDatasul = async () => {
    if (!venda) return;
    try {
      await calcularPedido(venda.id);
      toast({
        title: "Cálculo iniciado",
        description: "O cálculo do pedido no Datasul foi iniciado. Você pode acompanhar o progresso nos logs."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao calcular",
        description: error.message || "Ocorreu um erro ao iniciar o cálculo",
        variant: "destructive"
      });
    }
  };
  if (isLoading || !venda) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="space-y-6">
      <VendasActionBar status={venda.status as "rascunho" | "aprovada" | "cancelada"} onCalcular={handleCalcularDatasul} onCancelar={() => {
      toast({
        title: "Cancelar proposta",
        description: "Funcionalidade em desenvolvimento"
      });
    }} onDiretoria={() => {
      toast({
        title: "Enviar para diretoria",
        description: "Funcionalidade em desenvolvimento"
      });
    }} onEfetivar={() => setShowAprovarDialog(true)} onSalvar={handleSalvar} isSaving={false} isCalculating={isCalculating} editandoVendaId={venda.id} />

      <div className="flex items-center gap-4 mb-4 mx-[10px]">
        <Button variant="ghost" size="icon" onClick={() => navigate("/vendas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Proposta #{numeroVenda || "Nova"}</h1>
          <div className="text-muted-foreground">
            {venda.etapa_pipeline && <Badge variant="outline">{venda.etapa_pipeline}</Badge>}
          </div>
        </div>
      </div>

      {venda.status === "aprovada" && <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowLogsDialog(!showLogsDialog)}>
            {showLogsDialog ? "Ocultar" : "Ver"} Logs Datasul
          </Button>
        </div>}

      {/* Logs */}
      {showLogsDialog && venda && <Card className="p-6">
          <IntegracaoDatasulLog vendaId={venda.id} />
        </Card>}

      <Card className="p-6 mx-[10px]">
        <div className="space-y-6">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            {clienteSelecionado ? <div className="flex items-center gap-2 p-3 border rounded-md mt-2">
                <div className="flex-1">
                  <p className="font-medium">{clienteSelecionado.nome_emit}</p>
                  <p className="text-sm text-muted-foreground">{clienteSelecionado.cgc}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowClienteSearch(true)}>
                  Trocar
                </Button>
              </div> : <Button variant="outline" className="w-full mt-2" onClick={() => setShowClienteSearch(true)}>
                <Search className="h-4 w-4 mr-2" />
                Buscar Cliente
              </Button>}
          </div>

          <Separator />

          {/* Dados da Venda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Frete</Label>
              <Select value={tipoFreteId} onValueChange={setTipoFreteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposFrete?.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Pedido</Label>
              <Select value={tipoPedidoId} onValueChange={setTipoPedidoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposPedido?.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Condição de Pagamento</Label>
              <Select value={condicaoPagamentoId} onValueChange={setCondicaoPagamentoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {condicoes?.map(cond => <SelectItem key={cond.id} value={cond.id}>
                      {cond.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Validade da Proposta</Label>
              <Input type="date" value={validadeProposta} onChange={e => setValidadeProposta(e.target.value)} />
            </div>

            <div>
              <Label>Faturamento Programado</Label>
              <Input type="date" value={dataFaturamentoProgramado} onChange={e => setDataFaturamentoProgramado(e.target.value)} />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="faturamento-parcial" checked={faturamentoParcial} onCheckedChange={setFaturamentoParcial} />
              <Label htmlFor="faturamento-parcial">Faturamento Parcial</Label>
            </div>
          </div>

          <Separator />

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Itens da Venda *</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      Colunas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      {Object.entries(visibleColumns).map(([key, visible]) => <div key={key} className="flex items-center space-x-2">
                          <Checkbox checked={visible} onCheckedChange={() => toggleColumn(key)} />
                          <label className="text-sm">{key}</label>
                        </div>)}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={() => setShowProdutoSearch(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Produto</TableHead>
                    {visibleColumns.precoTabela && <TableHead>Preço Tabela</TableHead>}
                    <TableHead>Qtd</TableHead>
                    {visibleColumns.desconto && <TableHead>Desc %</TableHead>}
                    {visibleColumns.precoUnit && <TableHead>Preço Unit</TableHead>}
                    {visibleColumns.total && <TableHead>Total</TableHead>}
                    {visibleColumns.deposito && <TableHead>Depósito</TableHead>}
                    {visibleColumns.custo && <TableHead>Custo DS</TableHead>}
                    {visibleColumns.divisao && <TableHead>Divisão DS</TableHead>}
                    {visibleColumns.vlTotalDS && <TableHead>Vlr Tot DS</TableHead>}
                    {visibleColumns.vlMercLiq && <TableHead>Vlr Merc Liq</TableHead>}
                    {visibleColumns.loteMult && <TableHead>Lote Mult</TableHead>}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carrinho.map((item, idx) => <TableRow key={item.produto.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.produto.referencia_interna}</p>
                          <p className="text-sm text-muted-foreground">{item.produto.nome}</p>
                        </div>
                      </TableCell>
                      {visibleColumns.precoTabela && <TableCell>R$ {item.produto.preco_venda.toFixed(2)}</TableCell>}
                      <TableCell>
                        <Input type="number" value={item.quantidade} onChange={e => handleAtualizarItem(item.produto.id, 'quantidade', parseFloat(e.target.value) || 0)} className="w-20" />
                      </TableCell>
                      {visibleColumns.desconto && <TableCell>
                          <Input type="number" value={item.desconto} onChange={e => handleAtualizarItem(item.produto.id, 'desconto', parseFloat(e.target.value) || 0)} className="w-20" />
                        </TableCell>}
                      {visibleColumns.precoUnit && <TableCell>
                          R$ {(item.produto.preco_venda * (1 - item.desconto / 100)).toFixed(2)}
                        </TableCell>}
                      {visibleColumns.total && <TableCell className="font-medium">
                          R$ {item.valor_total.toFixed(2)}
                        </TableCell>}
                      {visibleColumns.deposito && <TableCell>{item.datasul_dep_exp || "-"}</TableCell>}
                      {visibleColumns.custo && <TableCell>
                          {item.datasul_custo ? `R$ ${item.datasul_custo.toFixed(2)}` : "-"}
                        </TableCell>}
                      {visibleColumns.divisao && <TableCell>{item.datasul_divisao || "-"}</TableCell>}
                      {visibleColumns.vlTotalDS && <TableCell>
                          {item.datasul_vl_tot_item ? `R$ ${item.datasul_vl_tot_item.toFixed(2)}` : "-"}
                        </TableCell>}
                      {visibleColumns.vlMercLiq && <TableCell>
                          {item.datasul_vl_merc_liq ? `R$ ${item.datasul_vl_merc_liq.toFixed(2)}` : "-"}
                        </TableCell>}
                      {visibleColumns.loteMult && <TableCell>{item.datasul_lote_mulven || "-"}</TableCell>}
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoverItem(item.produto.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>)}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {valorTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações adicionais..." />
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <ProdutoSearchDialog open={showProdutoSearch} onOpenChange={setShowProdutoSearch} onSelectProduto={handleAdicionarProduto} />

      <ClienteSearchDialog open={showClienteSearch} onOpenChange={setShowClienteSearch} onSelectCliente={handleSelecionarCliente} />

      {showAprovarDialog && venda && <AprovarVendaDialog open={showAprovarDialog} onOpenChange={setShowAprovarDialog} onConfirm={async () => {
      await aprovarVenda.mutateAsync(venda.id);
      setShowAprovarDialog(false);
    }} vendaNumero={numeroVenda} vendaValor={valorTotal} />}
    </div>;
}