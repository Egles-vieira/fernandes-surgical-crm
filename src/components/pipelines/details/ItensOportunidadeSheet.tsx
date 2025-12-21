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
import { Search, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, HelpCircle, Package, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useInserirItensOportunidade } from "@/hooks/pipelines/useItensOportunidade";

type Produto = Tables<"produtos">;

interface ItemSelecionado {
  produto: Produto;
  quantidade: number;
  desconto: number;
}

interface ItensOportunidadeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidadeId: string;
  itensExistentes: string[];
  onItensAdicionados: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

const formatPreco = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(value);

type SortField = "nome" | "referencia_interna" | "preco_venda" | "quantidade_em_maos";
type SortDirection = "asc" | "desc";

export function ItensOportunidadeSheet({
  open,
  onOpenChange,
  oportunidadeId,
  itensExistentes,
  onItensAdicionados,
}: ItensOportunidadeSheetProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [apenasComEstoque, setApenasComEstoque] = useState(false);
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [itensSelecionados, setItensSelecionados] = useState<Map<string, ItemSelecionado>>(new Map());
  const [quantidadesTemp, setQuantidadesTemp] = useState<Map<string, number>>(new Map());
  const [descontosTemp, setDescontosTemp] = useState<Map<string, number>>(new Map());
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const inserirItensMutation = useInserirItensOportunidade();

  const idsExcluir = useMemo(() => {
    const selecionadosIds = Array.from(itensSelecionados.keys());
    return [...new Set([...itensExistentes, ...selecionadosIds])];
  }, [itensExistentes, itensSelecionados]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch produtos
  useEffect(() => {
    if (!open) return;

    const fetchProdutos = async () => {
      setIsLoading(true);
      try {
        const pageSize = 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from("produtos")
          .select("*", { count: "exact" })
          .order(sortField, { ascending: sortDirection === "asc" });

        if (debouncedSearch) {
          const words = debouncedSearch.toLowerCase().split(/\s+/).filter(w => w.length > 1);
          if (words.length === 1) {
            query = query.or(`nome.ilike.%${words[0]}%,referencia_interna.ilike.%${words[0]}%`);
          } else if (words.length > 1) {
            words.forEach(word => {
              query = query.ilike("nome", `%${word}%`);
            });
          }
        }

        if (apenasComEstoque) {
          query = query.gt("quantidade_em_maos", 0);
        }

        if (idsExcluir.length > 0) {
          query = query.not("id", "in", `(${idsExcluir.join(",")})`);
        }

        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        setProdutos(data || []);
        setTotalPages(Math.ceil((count || 0) / pageSize));
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProdutos();
  }, [open, page, debouncedSearch, apenasComEstoque, sortField, sortDirection, idsExcluir]);

  // Clear on close
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setDebouncedSearch("");
      setPage(1);
      setApenasComEstoque(false);
      setSortField("nome");
      setSortDirection("asc");
      setItensSelecionados(new Map());
      setQuantidadesTemp(new Map());
      setDescontosTemp(new Map());
    }
  }, [open]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={cn("cursor-pointer hover:bg-muted/80 select-none", className)}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  const handleAdicionarItem = useCallback((produto: Produto) => {
    const quantidade = quantidadesTemp.get(produto.id) || 1;
    const desconto = descontosTemp.get(produto.id) || 0;
    if (quantidade <= 0) return;

    setItensSelecionados(prev => {
      const newMap = new Map(prev);
      newMap.set(produto.id, { produto, quantidade, desconto });
      return newMap;
    });

    setQuantidadesTemp(prev => {
      const newMap = new Map(prev);
      newMap.delete(produto.id);
      return newMap;
    });
    setDescontosTemp(prev => {
      const newMap = new Map(prev);
      newMap.delete(produto.id);
      return newMap;
    });
  }, [quantidadesTemp, descontosTemp]);

  const handleRemoverItem = (produtoId: string) => {
    setItensSelecionados(prev => {
      const newMap = new Map(prev);
      newMap.delete(produtoId);
      return newMap;
    });
  };

  const totais = useMemo(() => {
    let quantidade = 0;
    let valor = 0;
    itensSelecionados.forEach(item => {
      quantidade += item.quantidade;
      const precoUnit = item.produto.preco_venda || 0;
      valor += item.quantidade * precoUnit * (1 - item.desconto / 100);
    });
    return { quantidade, valor, itens: itensSelecionados.size };
  }, [itensSelecionados]);

  const handleConfirmarInclusao = async () => {
    if (itensSelecionados.size === 0) {
      toast.warning("Selecione pelo menos um item");
      return;
    }

    const itensArray = Array.from(itensSelecionados.values()).map(item => ({
      produto_id: item.produto.id,
      nome_produto: item.produto.nome,
      quantidade: item.quantidade,
      preco_unitario: item.produto.preco_venda || 0,
      percentual_desconto: item.desconto,
    }));

    try {
      await inserirItensMutation.mutateAsync({
        oportunidadeId,
        itens: itensArray,
      });
      toast.success(`${itensArray.length} item(ns) adicionado(s)`);
      onItensAdicionados();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-5xl flex flex-col p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Incluir Itens na Oportunidade
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Pesquise produtos e adicione múltiplos itens de uma vez.
          </SheetDescription>
        </SheetHeader>

        {/* Filtros */}
        <div className="p-4 space-y-3 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="apenas-estoque"
                checked={apenasComEstoque}
                onCheckedChange={checked => {
                  setApenasComEstoque(!!checked);
                  setPage(1);
                }}
              />
              <label htmlFor="apenas-estoque" className="text-sm cursor-pointer">
                Apenas com estoque
              </label>
            </div>
          </div>
        </div>

        {/* Grid */}
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
                    {produtos.map(produto => {
                      const qtdTemp = quantidadesTemp.get(produto.id) || 0;
                      const descTemp = descontosTemp.get(produto.id) || 0;
                      return (
                        <TableRow key={produto.id} className="group">
                          <TableCell className="font-mono text-xs">{produto.referencia_interna}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{produto.nome}</TableCell>
                          <TableCell className="text-center text-xs">{produto.unidade_medida}</TableCell>
                          <TableCell className="text-right text-sm">{produto.quantidade_em_maos || 0}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatPreco(produto.preco_venda || 0)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={qtdTemp || ""}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setQuantidadesTemp(prev => {
                                  const newMap = new Map(prev);
                                  if (val <= 0) newMap.delete(produto.id);
                                  else newMap.set(produto.id, val);
                                  return newMap;
                                });
                              }}
                              className="h-8 w-16 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={descTemp || ""}
                              onChange={e => {
                                const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                setDescontosTemp(prev => {
                                  const newMap = new Map(prev);
                                  newMap.set(produto.id, val);
                                  return newMap;
                                });
                              }}
                              className="h-8 w-16 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
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

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
            <span className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Prévia */}
        {itensSelecionados.size > 0 && (
          <div className="p-4 space-y-3 border-t bg-background">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Itens Selecionados ({totais.itens})</h3>
              <span className="text-sm font-medium text-primary">{formatCurrency(totais.valor)}</span>
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1">
                {Array.from(itensSelecionados.values()).map(item => (
                  <div key={item.produto.id} className="flex items-center justify-between text-sm py-1">
                    <span className="truncate flex-1">{item.produto.nome}</span>
                    <span className="mx-2 text-muted-foreground">x{item.quantidade}</span>
                    <span className="w-24 text-right">
                      {formatCurrency((item.produto.preco_venda || 0) * item.quantidade * (1 - item.desconto / 100))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2"
                      onClick={() => handleRemoverItem(item.produto.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarInclusao}
            disabled={itensSelecionados.size === 0 || inserirItensMutation.isPending}
          >
            {inserirItensMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar {totais.itens} Item(ns)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
