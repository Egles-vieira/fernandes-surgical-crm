import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoProdutosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteCnpj: string;
  clienteNome: string;
}

interface ProdutoHistorico {
  produto_id: string;
  nome_produto: string;
  ultimo_preco: number;
  ultima_data: string;
  quantidade_total: number;
  numero_vendas: number;
  preco_medio: number;
}

export default function HistoricoProdutos({
  open,
  onOpenChange,
  clienteCnpj,
  clienteNome,
}: HistoricoProdutosProps) {
  const { data: historico, isLoading } = useQuery({
    queryKey: ["historico-produtos", clienteCnpj],
    queryFn: async () => {
      // Buscar todas as vendas do cliente
      const { data: vendas, error: vendasError } = await supabase
        .from("vendas")
        .select(`
          id,
          data_venda,
          vendas_itens (
            produto_id,
            nome_produto,
            preco_unitario,
            quantidade
          )
        `)
        .eq("cliente_cnpj", clienteCnpj)
        .order("data_venda", { ascending: false });

      if (vendasError) throw vendasError;

      // Agrupar produtos
      const produtosMap = new Map<string, ProdutoHistorico>();

      vendas?.forEach((venda) => {
        venda.vendas_itens?.forEach((item: any) => {
          const key = item.produto_id || item.nome_produto;
          if (!key) return;

          const existing = produtosMap.get(key);
          
          if (existing) {
            produtosMap.set(key, {
              ...existing,
              quantidade_total: existing.quantidade_total + (item.quantidade || 0),
              numero_vendas: existing.numero_vendas + 1,
              preco_medio: ((existing.preco_medio * existing.numero_vendas) + (item.preco_unitario || 0)) / (existing.numero_vendas + 1),
              // Atualizar último preço e data se esta venda for mais recente
              ultimo_preco: new Date(venda.data_venda) > new Date(existing.ultima_data) 
                ? (item.preco_unitario || existing.ultimo_preco)
                : existing.ultimo_preco,
              ultima_data: new Date(venda.data_venda) > new Date(existing.ultima_data)
                ? venda.data_venda
                : existing.ultima_data,
            });
          } else {
            produtosMap.set(key, {
              produto_id: item.produto_id || '',
              nome_produto: item.nome_produto || 'Produto sem nome',
              ultimo_preco: item.preco_unitario || 0,
              ultima_data: venda.data_venda,
              quantidade_total: item.quantidade || 0,
              numero_vendas: 1,
              preco_medio: item.preco_unitario || 0,
            });
          }
        });
      });

      // Converter para array e ordenar por data mais recente
      return Array.from(produtosMap.values()).sort(
        (a, b) => new Date(b.ultima_data).getTime() - new Date(a.ultima_data).getTime()
      );
    },
    enabled: open && !!clienteCnpj,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:w-[600px] lg:w-[700px] sm:max-w-none">
        <SheetHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 -mx-6 -mt-6 px-6 py-4 mb-6 rounded-t-lg border-b shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">Histórico de Produtos</SheetTitle>
              <SheetDescription className="text-sm">
                {clienteNome}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-3 p-4 border rounded-lg">
                  <Skeleton className="h-5 w-3/4" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !historico || historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Este cliente ainda não realizou compras
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historico.map((produto, index) => (
                <div
                  key={`${produto.produto_id}-${index}`}
                  className="p-4 border rounded-lg hover:border-primary/50 transition-colors bg-card shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base leading-tight mb-1">
                        {produto.nome_produto}
                      </h4>
                      {produto.produto_id && (
                        <p className="text-xs text-muted-foreground">
                          Código: {produto.produto_id}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20">
                      {produto.numero_vendas}x comprado
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Último Preço</p>
                          <p className="font-bold text-sm text-primary">
                            R$ {produto.ultimo_preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-secondary/10 to-secondary/5 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Preço Médio</p>
                          <p className="font-medium text-sm">
                            R$ {produto.preco_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-tertiary/10 to-tertiary/5 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-tertiary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Última Compra</p>
                          <p className="font-medium text-sm">
                            {format(new Date(produto.ultima_data), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center">
                          <Package className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Qtd. Total</p>
                          <p className="font-medium text-sm">
                            {produto.quantidade_total.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
