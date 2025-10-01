import { useState } from "react";
import { Search, Plus, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useProdutos } from "@/hooks/useProdutos";
import { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

export default function Produtos() {
  const { produtos, isLoading } = useProdutos();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(12);

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referencia_interna.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.narrativa && p.narrativa.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayedProdutos = filteredProdutos.slice(0, itemsToShow);
  const hasMore = filteredProdutos.length > itemsToShow;

  const loadMore = () => {
    setItemsToShow((prev) => prev + 12);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Produtos</h1>
          <p className="text-muted-foreground">
            Exibindo {displayedProdutos.length} de {filteredProdutos.length} produtos
            {searchTerm && ` (${produtos.length} total)`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Buscar por nome, código ou descrição..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setItemsToShow(12); // Reset pagination on search
          }}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {filteredProdutos.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="text-muted-foreground" size={40} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground mb-6">
            {produtos.length === 0
              ? "Importe seus produtos para começar"
              : "Tente ajustar os filtros de busca"}
          </p>
          {produtos.length === 0 && (
            <Button onClick={() => window.location.href = '/importar-produtos'}>
              <Plus size={16} className="mr-2" />
              Importar Produtos
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedProdutos.map((produto) => (
              <Card key={produto.id} className="p-6 shadow-elegant hover:shadow-lg transition-all">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm leading-tight pr-2">{produto.nome}</h3>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 flex-shrink-0">
                        {produto.referencia_interna}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {produto.marcadores_produto && produto.marcadores_produto.map((marcador, idx) => (
                        <Badge key={idx} className="text-xs bg-secondary/10 text-secondary border-secondary/20">
                          {marcador}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NCM:</span>
                      <span className="font-mono text-xs">{produto.ncm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unidade:</span>
                      <span className="font-medium">{produto.unidade_medida}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço Venda:</span>
                      <span className="font-bold text-success">{formatCurrency(produto.preco_venda)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço Custo:</span>
                      <span className="font-medium">{formatCurrency(produto.custo)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estoque:</span>
                      <span
                        className={`font-semibold ${
                          produto.quantidade_em_maos <= produto.dtr
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {produto.quantidade_em_maos} {produto.unidade_medida}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedProduto(produto);
                        setShowDetails(true);
                      }}
                    >
                      <Eye size={14} className="mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button 
                onClick={loadMore} 
                variant="outline" 
                size="lg"
                className="group hover-scale"
              >
                <ChevronDown size={20} className="mr-2 group-hover:animate-bounce" />
                Carregar mais produtos ({filteredProdutos.length - itemsToShow} restantes)
              </Button>
            </div>
          )}
        </>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {selectedProduto && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2">{selectedProduto.nome}</h3>
                <Badge className="bg-success/10 text-success border-success/20">
                  {selectedProduto.referencia_interna}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">NCM</p>
                  <p className="font-mono text-sm">{selectedProduto.ncm}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p className="font-medium">{selectedProduto.unidade_medida}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preço Venda</p>
                  <p className="font-bold text-success">{formatCurrency(selectedProduto.preco_venda)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo</p>
                  <p className="font-medium">{formatCurrency(selectedProduto.custo)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estoque Atual</p>
                  <p className="font-semibold">{selectedProduto.quantidade_em_maos} {selectedProduto.unidade_medida}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DTR (Dias de Reposição)</p>
                  <p className="font-medium">{selectedProduto.dtr}</p>
                </div>
              </div>

              {selectedProduto.marcadores_produto && selectedProduto.marcadores_produto.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Marcadores</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduto.marcadores_produto.map((marcador, idx) => (
                      <Badge key={idx} variant="outline">{marcador}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduto.narrativa && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Descrição</p>
                  <p className="text-sm">{selectedProduto.narrativa}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
