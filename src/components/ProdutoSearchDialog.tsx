import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProdutos } from "@/hooks/useProdutos";
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
  const { produtos, isLoading } = useProdutos();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referencia_interna.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.narrativa && p.narrativa.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSelect = (produto: Produto) => {
    onSelectProduto(produto);
    setSearchTerm("");
    onOpenChange(false);
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
          <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando produtos...
              </div>
            ) : filteredProdutos.length === 0 ? (
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
                  {filteredProdutos.map((produto) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}