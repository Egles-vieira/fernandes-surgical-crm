import { useState, useEffect } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProdutosPaginado } from "@/hooks/useProdutosPaginado";
import { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

interface ProdutoSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduto: (produto: Produto) => void;
}

export function ProdutoSearchDialog({
  open,
  onOpenChange,
  onSelectProduto,
}: ProdutoSearchDialogProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageSize = 20;

  const { produtos, total, isLoading } = useProdutosPaginado({
    page,
    pageSize,
    searchTerm: debouncedSearch,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSelect = (produto: Produto) => {
    onSelectProduto(produto);
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
    onOpenChange(false);
  };

  const goToNextPage = () => {
    if (hasNextPage) setPage((prev) => prev + 1);
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage) setPage((prev) => prev - 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Pesquisar Produtos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Carregando produtos...
                </div>
              ) : produtos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead className="w-[300px]">Nome</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-center">Unidade</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((produto) => (
                      <TableRow key={produto.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-mono">
                            {produto.referencia_interna}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{produto.nome}</TableCell>
                        <TableCell className="text-right font-bold text-success">
                          {formatCurrency(produto.preco_venda)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold ${
                              produto.quantidade_em_maos <= produto.dtr
                                ? "text-destructive"
                                : "text-foreground"
                            }`}
                          >
                            {produto.quantidade_em_maos}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{produto.unidade_medida}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => handleSelect(produto)}
                          >
                            <Plus size={16} className="mr-1" />
                            Adicionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && produtos.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  Exibindo <span className="font-medium">{(page - 1) * pageSize + 1}</span> a{" "}
                  <span className="font-medium">{Math.min(page * pageSize, total)}</span> de{" "}
                  <span className="font-medium">{total}</span> produtos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={!hasPreviousPage}
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={!hasNextPage}
                  >
                    Próxima
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}