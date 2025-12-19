import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProdutoSearchDialog } from "@/components/ProdutoSearchDialog";
import { Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { ItemOportunidade } from "@/hooks/pipelines/useItensOportunidade";

type Produto = Tables<"produtos">;

interface EditarItemOportunidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemOportunidade | null;
  onSave: (itemId: string, dados: {
    quantidade: number;
    percentual_desconto: number;
    preco_unitario: number;
    preco_total: number;
    produto_id?: string;
    nome_produto?: string;
  }) => void;
}

export function EditarItemOportunidadeDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: EditarItemOportunidadeDialogProps) {
  const [showProdutoSearch, setShowProdutoSearch] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<{ id: string; nome: string; preco: number } | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    if (item) {
      setProdutoSelecionado({
        id: item.produto_id || "",
        nome: item.nome_produto || "",
        preco: item.preco_unitario,
      });
      setQuantidade(item.quantidade);
      setDesconto(item.percentual_desconto || 0);
    }
  }, [item]);

  const handleSave = () => {
    if (!item || !produtoSelecionado) return;

    const precoUnitario = produtoSelecionado.preco;
    const precoTotal = quantidade * precoUnitario * (1 - desconto / 100);

    const dados: any = {
      quantidade,
      percentual_desconto: desconto,
      preco_unitario: precoUnitario,
      preco_total: precoTotal,
    };

    // Se mudou o produto
    if (produtoSelecionado.id !== item.produto_id) {
      dados.produto_id = produtoSelecionado.id;
      dados.nome_produto = produtoSelecionado.nome;
    }

    onSave(item.id, dados);
    onOpenChange(false);
  };

  const handleSelectProduto = (produto: Produto) => {
    setProdutoSelecionado({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco_venda,
    });
    setShowProdutoSearch(false);
  };

  const valorTotal = produtoSelecionado
    ? quantidade * produtoSelecionado.preco * (1 - desconto / 100)
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Produto */}
            <div>
              <Label>Produto *</Label>
              {produtoSelecionado ? (
                <div className="flex items-center gap-2 p-3 border rounded-md mt-2">
                  <div className="flex-1">
                    <p className="font-medium">{produtoSelecionado.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {produtoSelecionado.preco.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProdutoSearch(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setShowProdutoSearch(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Produto
                </Button>
              )}
            </div>

            {/* Quantidade e Desconto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>

              <div>
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Valor Total */}
            <div>
              <Label>Valor Total</Label>
              <div className="text-2xl font-bold text-primary">
                R$ {valorTotal.toFixed(2)}
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!produtoSelecionado}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProdutoSearchDialog
        open={showProdutoSearch}
        onOpenChange={setShowProdutoSearch}
        onSelectProduto={handleSelectProduto}
      />
    </>
  );
}
