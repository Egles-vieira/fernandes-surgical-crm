import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  X, 
  Package, 
  Trash2, 
  Minus, 
  Plus, 
  Edit2, 
  Check,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CartPanelProps {
  conversaId: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface ProdutoCarrinho {
  id: string;
  nome: string;
  referencia_interna: string;
  preco_venda: number;
  quantidade_em_maos: number;
  quantidade: number;
}

interface CarrinhoItem {
  id: string;
  quantidade: number;
  preco?: number;
}

export function CartPanel({ conversaId, collapsed = false, onToggle }: CartPanelProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(1);

  // Buscar dados da conversa incluindo carrinho
  const { data: conversa, isLoading: isLoadingConversa } = useQuery({
    queryKey: ['whatsapp-conversa-carrinho-realtime', conversaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .select('produtos_carrinho')
        .eq('id', conversaId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!conversaId,
    refetchInterval: 3000, // Polling a cada 3 segundos para manter atualizado
  });

  // Realtime subscription para atualizações do carrinho
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`carrinho-${conversaId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_conversas',
        filter: `id=eq.${conversaId}`
      }, () => {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-conversa-carrinho-realtime', conversaId]
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, queryClient]);

  // Extrair itens do carrinho
  const carrinhoItems: CarrinhoItem[] = (() => {
    const carrinho = conversa?.produtos_carrinho;
    if (!Array.isArray(carrinho)) return [];
    
    return carrinho.map((item: any) => {
      if (typeof item === 'string') {
        return { id: item, quantidade: 1 };
      }
      return {
        id: item?.id || item?.produto_id,
        quantidade: item?.quantidade || 1,
        preco: item?.preco
      };
    }).filter((item: CarrinhoItem) => item.id);
  })();

  const produtoIds = carrinhoItems.map(item => item.id);

  // Buscar detalhes dos produtos
  const { data: produtosData, isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['produtos-carrinho-details', produtoIds],
    queryFn: async () => {
      if (produtoIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, referencia_interna, preco_venda, quantidade_em_maos')
        .in('id', produtoIds);

      if (error) throw error;
      return data || [];
    },
    enabled: produtoIds.length > 0
  });

  // Combinar produtos com quantidades do carrinho
  const produtos: ProdutoCarrinho[] = (produtosData || []).map(produto => {
    const carrinhoItem = carrinhoItems.find(item => item.id === produto.id);
    return {
      ...produto,
      quantidade: carrinhoItem?.quantidade || 1,
      preco_venda: carrinhoItem?.preco || produto.preco_venda
    };
  });

  // Mutation para alterar quantidade
  const alterarQuantidadeMutation = useMutation({
    mutationFn: async ({ produtoId, novaQuantidade }: { produtoId: string; novaQuantidade: number }) => {
      const { data, error } = await supabase.rpc('alterar_quantidade_item_carrinho', {
        p_conversa_id: conversaId,
        p_produto_id: produtoId,
        p_nova_quantidade: novaQuantidade
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversa-carrinho-realtime', conversaId] });
      setEditingId(null);
      toast.success('Quantidade atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar quantidade: ' + error.message);
    }
  });

  // Mutation para remover item
  const removerItemMutation = useMutation({
    mutationFn: async (produtoId: string) => {
      const { data, error } = await supabase.rpc('remover_item_carrinho', {
        p_conversa_id: conversaId,
        p_produto_id: produtoId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversa-carrinho-realtime', conversaId] });
      toast.success('Item removido do carrinho');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover item: ' + error.message);
    }
  });

  const handleStartEdit = (produto: ProdutoCarrinho) => {
    setEditingId(produto.id);
    setEditQty(produto.quantidade);
  };

  const handleConfirmEdit = (produtoId: string) => {
    if (editQty > 0) {
      alterarQuantidadeMutation.mutate({ produtoId, novaQuantidade: editQty });
    }
  };

  const handleQuickChange = (produtoId: string, delta: number, currentQty: number) => {
    const novaQuantidade = currentQty + delta;
    if (novaQuantidade > 0) {
      alterarQuantidadeMutation.mutate({ produtoId, novaQuantidade });
    } else {
      removerItemMutation.mutate(produtoId);
    }
  };

  const calcularTotal = () => {
    return produtos.reduce((total, produto) => {
      return total + (produto.preco_venda * produto.quantidade);
    }, 0);
  };

  const totalItens = produtos.reduce((sum, p) => sum + p.quantidade, 0);
  const isLoading = isLoadingConversa || isLoadingProdutos;

  // Versão colapsada - apenas badge com contador
  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="relative h-8 px-2"
      >
        <ShoppingCart className="h-4 w-4" />
        {totalItens > 0 && (
          <Badge 
            variant="default" 
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary"
          >
            {totalItens}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div className="bg-card border rounded-lg shadow-lg w-80 max-h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Carrinho</span>
          {totalItens > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 max-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Package className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Carrinho vazio</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              A IA adicionará itens aqui durante a conversa
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {produtos.map((produto, index) => (
              <div
                key={produto.id}
                className="bg-background rounded-lg p-2 border text-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs leading-tight truncate" title={produto.nome}>
                      {index + 1}. {produto.nome}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {produto.referencia_interna}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:text-destructive shrink-0"
                    onClick={() => removerItemMutation.mutate(produto.id)}
                    disabled={removerItemMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  {/* Controles de quantidade */}
                  {editingId === produto.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                        className="h-6 w-14 text-xs text-center"
                        min={1}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-green-600"
                        onClick={() => handleConfirmEdit(produto.id)}
                        disabled={alterarQuantidadeMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleQuickChange(produto.id, -1, produto.quantidade)}
                        disabled={alterarQuantidadeMutation.isPending}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <button
                        className="px-2 py-0.5 text-xs font-medium hover:bg-muted rounded"
                        onClick={() => handleStartEdit(produto)}
                      >
                        {produto.quantidade}
                      </button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => handleQuickChange(produto.id, 1, produto.quantidade)}
                        disabled={alterarQuantidadeMutation.isPending}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}

                  {/* Preço e subtotal */}
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      R$ {produto.preco_venda.toFixed(2)} × {produto.quantidade}
                    </p>
                    <p className="text-xs font-semibold text-primary">
                      R$ {(produto.preco_venda * produto.quantidade).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer com total */}
      {produtos.length > 0 && (
        <div className="border-t px-3 py-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total estimado:</span>
            <span className="text-base font-bold text-primary">
              R$ {calcularTotal().toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            * Valores finais calculados após criar proposta
          </p>
        </div>
      )}
    </div>
  );
}
