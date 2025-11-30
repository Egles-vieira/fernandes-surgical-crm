import { useState, useEffect, useMemo, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, HelpCircle, Package, ArrowUpDown, ArrowUp, ArrowDown, Info, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProdutosBuscaAvancada, SortField, SortDirection } from "@/hooks/useProdutosBuscaAvancada";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Produto = Tables<"produtos">;

interface ItemSelecionado {
  produto: Produto & {
    ja_vendido: boolean;
    ultima_venda: string | null;
    valor_ultima_proposta: number | null;
  };
  quantidade: number;
  desconto: number;
}

interface ItensPropostaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
  clienteId: string | null;
  itensExistentes: string[];
  onItensAdicionados: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

export function ItensPropostaSheet({
  open,
  onOpenChange,
  vendaId,
  clienteId,
  itensExistentes,
  onItensAdicionados,
}: ItensPropostaSheetProps) {
  // Estados de busca
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [apenasComEstoque, setApenasComEstoque] = useState(false);
  const [jaVendi, setJaVendi] = useState(false);
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Estado de itens selecionados (Map para acesso rápido)
  const [itensSelecionados, setItensSelecionados] = useState<Map<string, ItemSelecionado>>(new Map());

  // Estado de inserção
  const [isInserting, setIsInserting] = useState(false);

  // IDs a excluir = itens já na proposta + itens selecionados
  const idsExcluir = useMemo(() => {
    const selecionadosIds = Array.from(itensSelecionados.keys());
    return [...new Set([...itensExistentes, ...selecionadosIds])];
  }, [itensExistentes, itensSelecionados]);

  // Debounce de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Hook de busca
  const { produtos, total, totalPages, isLoading, isFetching } = useProdutosBuscaAvancada({
    page,
    pageSize: 20,
    searchTerm: debouncedSearch,
    apenasComEstoque,
    jaVendi,
    clienteId,
    idsExcluir,
    sortField,
    sortDirection,
    enabled: open,
  });

  // Handler de ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  // Componente de cabeçalho ordenável
  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={cn("cursor-pointer hover:bg-muted/80 select-none", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // Quantidades e descontos temporários no grid de busca
  const [quantidadesTemp, setQuantidadesTemp] = useState<Map<string, number>>(new Map());
  const [descontosTemp, setDescontosTemp] = useState<Map<string, number>>(new Map());

  // Limpar estados ao fechar
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setDebouncedSearch("");
      setPage(1);
      setApenasComEstoque(false);
      setJaVendi(false);
      setSortField("nome");
      setSortDirection("asc");
      setItensSelecionados(new Map());
      setQuantidadesTemp(new Map());
      setDescontosTemp(new Map());
    }
  }, [open]);

  // Atualizar quantidade temporária
  const handleQuantidadeChange = (produtoId: string, quantidade: number) => {
    setQuantidadesTemp((prev) => {
      const newMap = new Map(prev);
      if (quantidade <= 0) {
        newMap.delete(produtoId);
      } else {
        newMap.set(produtoId, quantidade);
      }
      return newMap;
    });
  };

  // Atualizar desconto temporário
  const handleDescontoTempChange = (produtoId: string, desconto: number) => {
    setDescontosTemp((prev) => {
      const newMap = new Map(prev);
      newMap.set(produtoId, Math.min(100, Math.max(0, desconto)));
      return newMap;
    });
  };

  // Adicionar item à prévia
  const handleAdicionarItem = useCallback(
    (produto: Produto & { ja_vendido: boolean; ultima_venda: string | null; valor_ultima_proposta: number | null }) => {
      const quantidade = quantidadesTemp.get(produto.id) || 1;
      const desconto = descontosTemp.get(produto.id) || 0;
      if (quantidade <= 0) return;

      setItensSelecionados((prev) => {
        const newMap = new Map(prev);
        newMap.set(produto.id, {
          produto,
          quantidade,
          desconto,
        });
        return newMap;
      });

      // Limpar quantidade e desconto temporários
      setQuantidadesTemp((prev) => {
        const newMap = new Map(prev);
        newMap.delete(produto.id);
        return newMap;
      });
      setDescontosTemp((prev) => {
        const newMap = new Map(prev);
        newMap.delete(produto.id);
        return newMap;
      });
    },
    [quantidadesTemp, descontosTemp]
  );

  // Adicionar todos os itens com quantidade > 0
  const handleAdicionarTodosSelecionados = useCallback(() => {
    const produtosParaAdicionar = produtos.filter((p) => {
      const qtd = quantidadesTemp.get(p.id);
      return qtd && qtd > 0;
    });

    if (produtosParaAdicionar.length === 0) {
      toast.warning("Informe a quantidade em pelo menos um item");
      return;
    }

    setItensSelecionados((prev) => {
      const newMap = new Map(prev);
      produtosParaAdicionar.forEach((produto) => {
        const quantidade = quantidadesTemp.get(produto.id) || 1;
        const desconto = descontosTemp.get(produto.id) || 0;
        newMap.set(produto.id, {
          produto,
          quantidade,
          desconto,
        });
      });
      return newMap;
    });

    // Limpar quantidades e descontos temporários
    setQuantidadesTemp(new Map());
    setDescontosTemp(new Map());

    toast.success(`${produtosParaAdicionar.length} item(ns) adicionado(s) à prévia`);
  }, [produtos, quantidadesTemp, descontosTemp]);

  // Remover item da prévia
  const handleRemoverItem = (produtoId: string) => {
    setItensSelecionados((prev) => {
      const newMap = new Map(prev);
      newMap.delete(produtoId);
      return newMap;
    });
  };

  // Atualizar quantidade na prévia
  const handleAtualizarQuantidadePrevia = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      handleRemoverItem(produtoId);
      return;
    }
    setItensSelecionados((prev) => {
      const newMap = new Map(prev);
      const item = newMap.get(produtoId);
      if (item) {
        newMap.set(produtoId, { ...item, quantidade });
      }
      return newMap;
    });
  };

  // Atualizar desconto na prévia
  const handleAtualizarDescontoPrevia = (produtoId: string, desconto: number) => {
    setItensSelecionados((prev) => {
      const newMap = new Map(prev);
      const item = newMap.get(produtoId);
      if (item) {
        newMap.set(produtoId, { ...item, desconto: Math.min(100, Math.max(0, desconto)) });
      }
      return newMap;
    });
  };

  // Calcular totais
  const totais = useMemo(() => {
    let quantidade = 0;
    let valor = 0;
    itensSelecionados.forEach((item) => {
      quantidade += item.quantidade;
      const precoUnit = item.produto.preco_venda || 0;
      valor += item.quantidade * precoUnit * (1 - item.desconto / 100);
    });
    return { quantidade, valor, itens: itensSelecionados.size };
  }, [itensSelecionados]);

  // Confirmar inclusão (bulk insert)
  const handleConfirmarInclusao = async () => {
    if (itensSelecionados.size === 0) {
      toast.warning("Selecione pelo menos um item");
      return;
    }

    setIsInserting(true);
    try {
      const itensArray = Array.from(itensSelecionados.values()).map((item) => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco_venda || 0,
        desconto: item.desconto,
      }));

      const { error } = await supabase.rpc("inserir_itens_venda_bulk", {
        p_venda_id: vendaId,
        p_itens: itensArray,
      });

      if (error) throw error;

      toast.success(`${itensArray.length} item(ns) adicionado(s) à proposta`);
      onItensAdicionados();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao inserir itens:", error);
      toast.error("Erro ao adicionar itens: " + error.message);
    } finally {
      setIsInserting(false);
    }
  };

  // Quantidade de itens com quantidade informada no grid de busca
  const itensComQuantidade = produtos.filter((p) => (quantidadesTemp.get(p.id) || 0) > 0).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-7xl flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Incluir Itens na Proposta
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Pesquise produtos, informe quantidades e adicione múltiplos itens de uma vez.
          </SheetDescription>
        </SheetHeader>

        {/* Área de Busca e Filtros */}
        <div className="p-4 space-y-3 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descrição ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apenas-estoque"
                checked={apenasComEstoque}
                onCheckedChange={(checked) => {
                  setApenasComEstoque(!!checked);
                  setPage(1);
                }}
              />
              <label htmlFor="apenas-estoque" className="text-sm cursor-pointer">
                Apenas com estoque
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ja-vendi"
                checked={jaVendi}
                onCheckedChange={(checked) => {
                  setJaVendi(!!checked);
                  setPage(1);
                }}
                disabled={!clienteId}
              />
              <label
                htmlFor="ja-vendi"
                className={cn("text-sm cursor-pointer", !clienteId && "text-muted-foreground")}
              >
                Já vendi para este cliente
              </label>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p>• Informe a quantidade para selecionar o item</p>
                  <p>• Itens já na proposta não aparecem na busca</p>
                  <p>• Use "Adicionar Selecionados" para mover para a prévia</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Grid de Resultados */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : produtos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Package className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <SortableHeader field="referencia_interna" className="w-24">Código</SortableHeader>
                      <SortableHeader field="nome">Descrição</SortableHeader>
                      <TableHead className="w-16 text-center">UN</TableHead>
                      <SortableHeader field="quantidade_em_maos" className="w-20 text-right">Estoque</SortableHeader>
                      <SortableHeader field="preco_venda" className="w-24 text-right">Preço</SortableHeader>
                      <TableHead className="w-20 text-center">Qtd</TableHead>
                      <TableHead className="w-20 text-center">% Desc</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto) => {
                      const qtdTemp = quantidadesTemp.get(produto.id) || 0;
                      const descTemp = descontosTemp.get(produto.id) || 0;
                      const temEstoque = (produto.quantidade_em_maos || 0) > 0;
                      return (
                        <TableRow key={produto.id} className="group">
                          <TableCell className="font-mono text-xs">
                            {produto.referencia_interna}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{produto.nome}</span>
                              {produto.narrativa && (
                                <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="inline-flex">
                                        <Info className="h-4 w-4 text-primary hover:text-primary/80 cursor-help flex-shrink-0" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-sm z-[9999]">
                                      <div className="flex flex-col gap-2">
                                        <p className="text-sm whitespace-pre-wrap">{produto.narrativa}</p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-full text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(produto.narrativa || '');
                                            toast.success("Descrição copiada!");
                                          }}
                                        >
                                          <Copy className="h-3 w-3 mr-1" />
                                          Copiar descrição
                                        </Button>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {produto.ja_vendido && (
                                <Badge variant="secondary" className="text-[10px] px-1">
                                  Já vendido
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {produto.unidade_medida}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={temEstoque ? "default" : "destructive"}
                              className={cn(
                                "text-[10px] px-1.5",
                                temEstoque && "bg-success/20 text-success hover:bg-success/30"
                              )}
                            >
                              {Number(produto.quantidade_em_maos || 0).toLocaleString("pt-BR")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatCurrency(produto.preco_venda || 0)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={qtdTemp || ""}
                              onChange={(e) =>
                                handleQuantidadeChange(produto.id, parseInt(e.target.value) || 0)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const inputs = document.querySelectorAll<HTMLInputElement>(
                                    '[data-qty-input="search"]'
                                  );
                                  const currentIndex = Array.from(inputs).findIndex(
                                    (input) => input === e.currentTarget
                                  );
                                  if (currentIndex < inputs.length - 1) {
                                    inputs[currentIndex + 1]?.focus();
                                    inputs[currentIndex + 1]?.select();
                                  }
                                }
                              }}
                              data-qty-input="search"
                              className="h-7 w-16 text-center text-sm"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={descTemp || ""}
                              onChange={(e) =>
                                handleDescontoTempChange(produto.id, parseFloat(e.target.value) || 0)
                              }
                              className="h-7 w-16 text-center text-sm"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => handleAdicionarItem(produto)}
                              disabled={qtdTemp <= 0}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>

          {/* Paginação e botão adicionar */}
          <div className="p-2 border-t bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>
                {total} produto(s) • Página {page} de {totalPages || 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {itensComQuantidade > 0 && (
                <Button size="sm" variant="secondary" onClick={handleAdicionarTodosSelecionados}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar {itensComQuantidade} selecionado(s)
                </Button>
              )}
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Grid de Itens Selecionados (Prévia) */}
        <div className="h-[280px] flex flex-col">
          <div className="px-4 py-2 bg-primary/5 border-b flex items-center justify-between">
            <span className="text-sm font-medium">
              Itens Selecionados para Inclusão ({itensSelecionados.size})
            </span>
            {itensSelecionados.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {totais.quantidade} un • {formatCurrency(totais.valor)}
              </span>
            )}
          </div>
          <ScrollArea className="flex-1">
            {itensSelecionados.size === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <Package className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhum item selecionado</p>
                <p className="text-xs">Informe quantidades acima para selecionar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-20 text-center">Qtd</TableHead>
                    <TableHead className="w-20 text-center">% Desc</TableHead>
                    <TableHead className="w-24 text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(itensSelecionados.values()).map((item) => {
                    const total =
                      item.quantidade * (item.produto.preco_venda || 0) * (1 - item.desconto / 100);
                    return (
                      <TableRow key={item.produto.id}>
                        <TableCell className="font-mono text-xs">
                          {item.produto.referencia_interna}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm">
                          {item.produto.nome}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantidade}
                            onChange={(e) =>
                              handleAtualizarQuantidadePrevia(
                                item.produto.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-7 w-16 text-center text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.desconto}
                            onChange={(e) =>
                              handleAtualizarDescontoPrevia(
                                item.produto.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 w-16 text-center text-sm"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoverItem(item.produto.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {/* Footer com ações */}
        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <div className="text-sm">
            {itensSelecionados.size > 0 && (
              <span className="font-medium">
                {totais.itens} item(ns) • Total: {formatCurrency(totais.valor)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarInclusao}
              disabled={itensSelecionados.size === 0 || isInserting}
            >
              {isInserting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Incluindo...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Incluir {itensSelecionados.size} Item(ns)
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
