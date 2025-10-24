import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Sparkles, Package, Link as LinkIcon, Save } from "lucide-react";
import { ProdutoSearchDialog } from "./ProdutoSearchDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ItemCotacaoCardProps {
  item: {
    id: string;
    numero_item: number;
    codigo_produto_cliente: string;
    descricao_produto_cliente: string;
    quantidade_solicitada: number;
    quantidade_respondida: number | null;
    preco_unitario_respondido: number | null;
    preco_total: number | null;
    unidade_medida: string;
    status: string;
    percentual_desconto?: number | null;
    produto_id?: string | null;
  };
  cotacao: {
    cnpj_cliente: string;
    plataforma_id: string;
  };
  onUpdate: () => void;
}

export function ItemCotacaoCard({ item, cotacao, onUpdate }: ItemCotacaoCardProps) {
  const { toast } = useToast();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [produtoVinculado, setProdutoVinculado] = useState<any>(null);
  const [quantidade, setQuantidade] = useState(item.quantidade_respondida || item.quantidade_solicitada);
  const [precoUnitario, setPrecoUnitario] = useState(item.preco_unitario_respondido || 0);
  const [desconto, setDesconto] = useState(item.percentual_desconto || 0);
  const [isLoading, setIsLoading] = useState(false);

  const valorTotal = quantidade * precoUnitario * (1 - desconto / 100);

  const handleVincularProduto = (produto: any) => {
    setProdutoVinculado(produto);
    setPrecoUnitario(produto.preco_venda || 0);
    setDialogAberto(false);
  };

  const handleSalvar = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("edi_cotacoes_itens")
        .update({
          produto_id: produtoVinculado?.id,
          quantidade_respondida: quantidade,
          preco_unitario_respondido: precoUnitario,
          percentual_desconto: desconto,
          valor_desconto: (quantidade * precoUnitario * desconto) / 100,
          preco_total: valorTotal,
          status: "respondido",
          respondido_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Item atualizado",
        description: "As informações do item foram salvas com sucesso.",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalisarIA = async () => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("edi-sugerir-produtos", {
        body: {
          descricao_cliente: item.descricao_produto_cliente,
          cnpj_cliente: cotacao.cnpj_cliente,
          plataforma_id: cotacao.plataforma_id,
          limite: 5,
        },
      });

      if (response.error) throw response.error;

      const sugestoes = response.data?.sugestoes || [];
      
      if (sugestoes.length > 0) {
        const melhorSugestao = sugestoes[0];
        
        // Criar objeto compatível com o formato esperado
        const produtoSugerido = {
          id: melhorSugestao.produto_id,
          nome: melhorSugestao.nome,
          referencia_interna: melhorSugestao.referencia,
          preco_venda: melhorSugestao.preco,
          quantidade_em_maos: melhorSugestao.estoque,
          unidade_medida: melhorSugestao.unidade
        };
        
        setProdutoVinculado(produtoSugerido);
        setPrecoUnitario(melhorSugestao.preco || 0);
        
        toast({
          title: "Análise concluída",
          description: `IA sugeriu: ${melhorSugestao.nome} (Score: ${Math.round(melhorSugestao.score)}%)`,
        });
      } else {
        toast({
          title: "Nenhuma sugestão encontrada",
          description: "A IA não encontrou produtos compatíveis no catálogo.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-2">
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Item {item.numero_item}</Badge>
                  <Badge variant={item.status === "respondido" ? "default" : "secondary"}>
                    {item.status === "respondido" ? "Respondido" : "Pendente"}
                  </Badge>
                </div>
                <h4 className="font-semibold mb-1">{item.descricao_produto_cliente}</h4>
                {item.codigo_produto_cliente && (
                  <p className="text-sm text-muted-foreground">
                    Código Cliente: {item.codigo_produto_cliente}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalisarIA}
                disabled={isLoading}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Analisar IA
              </Button>
            </div>

            {/* Produto Vinculado */}
            <div className="space-y-2">
              <Label>Produto Vinculado</Label>
              <div className="flex gap-2">
                {produtoVinculado ? (
                  <div className="flex-1 p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{produtoVinculado.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Ref: {produtoVinculado.referencia_interna}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 p-3 border rounded-md border-dashed">
                    <p className="text-sm text-muted-foreground">Nenhum produto vinculado</p>
                  </div>
                )}
                <Button variant="outline" onClick={() => setDialogAberto(true)}>
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Vincular
                </Button>
              </div>
            </div>

            {/* Grid de Valores */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor={`qtd-${item.id}`}>Quantidade</Label>
                <Input
                  id={`qtd-${item.id}`}
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  min={0}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Solicitado: {item.quantidade_solicitada} {item.unidade_medida}
                </p>
              </div>

              <div>
                <Label htmlFor={`preco-${item.id}`}>Preço Unitário</Label>
                <Input
                  id={`preco-${item.id}`}
                  type="number"
                  value={precoUnitario}
                  onChange={(e) => setPrecoUnitario(Number(e.target.value))}
                  min={0}
                  step={0.01}
                />
              </div>

              <div>
                <Label htmlFor={`desconto-${item.id}`}>Desconto (%)</Label>
                <Input
                  id={`desconto-${item.id}`}
                  type="number"
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>

              <div>
                <Label>Total</Label>
                <div className="h-10 px-3 border rounded-md bg-muted flex items-center font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(valorTotal)}
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <Button onClick={handleSalvar} disabled={isLoading || !produtoVinculado}>
                <Save className="h-4 w-4 mr-1" />
                Salvar Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProdutoSearchDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSelect={handleVincularProduto}
      />
    </>
  );
}
