import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package } from "lucide-react";
import { useProdutos } from "@/hooks/useProdutos";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [busca, setBusca] = useState("");
  const { produtos, isLoading } = useProdutos();

  const produtosFiltrados = produtos?.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.referencia_interna.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou referência..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando produtos...
                </div>
              )}

              {!isLoading && produtosFiltrados && produtosFiltrados.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              )}

              {produtosFiltrados?.map((produto) => (
                <Button
                  key={produto.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => onSelect(produto)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
