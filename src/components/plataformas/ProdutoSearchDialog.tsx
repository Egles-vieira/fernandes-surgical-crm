import { useState, useEffect } from "react";
import { Search, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProdutosPaginado } from "@/hooks/useProdutosPaginado";

interface ProdutoSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (produto: any) => void;
}

export function ProdutoSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: ProdutoSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { produtos, total, isLoading } = useProdutosPaginado({ 
    page, 
    pageSize, 
    searchTerm: debouncedSearch 
  });

  const totalPages = Math.ceil(total / pageSize);

  const handleSelect = (produto: any) => {
    onSelect(produto);
    setSearchTerm("");
    setPage(1);
    onOpenChange(false);
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Buscar Produto</DialogTitle>
          <DialogDescription>
            Busque e selecione um produto para adicionar à proposta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou referência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Info bar */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {isLoading ? "Carregando..." : `${total} produto(s) encontrado(s)`}
            </span>
            {totalPages > 1 && (
              <span>
                Página {page} de {totalPages}
              </span>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="h-[450px]">
            <div className="space-y-2 pr-4">
              {isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando produtos...
                </div>
              )}

              {!isLoading && produtos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              )}

              {produtos.map((produto) => (
                <Button
                  key={produto.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => handleSelect(produto)}
                >
                  <Package className="h-4 w-4 mr-3 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{produto.nome}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Ref: {produto.referencia_interna}</span>
                      <span>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(produto.preco_venda)}
                      </span>
                      <span>Estoque: {produto.quantidade_em_maos || 0}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} de {total}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={page === totalPages || isLoading}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
