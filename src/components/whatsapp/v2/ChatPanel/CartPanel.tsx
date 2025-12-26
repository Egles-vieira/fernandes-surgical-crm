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
        className={cn(
          "relative h-9 px-3 gap-2 transition-all duration-200",
          totalItens > 0 && "bg-primary/10 hover:bg-primary/20 text-primary"
        )}
      >
        <ShoppingCart className="h-4 w-4" />
        {totalItens > 0 && (
          <Badge 
            variant="default" 
            className="h-5 min-w-5 px-1.5 flex items-center justify-center text-[11px] font-bold bg-primary animate-in zoom-in-50 duration-200"
          >
            {totalItens}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 w-80 max-h-[calc(100vh-200px)] flex flex-col overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Carrinho</h3>
            {totalItens > 0 && (
              <p className="text-[11px] text-slate-500">
                {totalItens} {totalItens === 1 ? 'item' : 'itens'} • R$ {calcularTotal().toFixed(2)}
              </p>
            )}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" 
          onClick={onToggle}
        >
          <X className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 max-h-[350px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            </div>
            <p className="text-sm text-slate-500">Carregando...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Carrinho vazio</p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-[200px]">
              Os produtos serão adicionados automaticamente durante a conversa com o cliente
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {produtos.map((produto, index) => (
              <div
                key={produto.id}
                className="group bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl p-3 transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                {/* Product header */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-tight line-clamp-2" title={produto.nome}>
                      {produto.nome}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {produto.referencia_interna}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full shrink-0"
                    onClick={() => removerItemMutation.mutate(produto.id)}
                    disabled={removerItemMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Quantity and price row */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  {/* Controles de quantidade */}
                  {editingId === produto.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                        className="h-7 w-16 text-xs text-center rounded-lg"
                        min={1}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700"
                        onClick={() => handleConfirmEdit(produto.id)}
                        disabled={alterarQuantidadeMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-slate-200"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600"
                        onClick={() => handleQuickChange(produto.id, -1, produto.quantidade)}
                        disabled={alterarQuantidadeMutation.isPending}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <button
                        className="px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors min-w-[32px]"
                        onClick={() => handleStartEdit(produto)}
                      >
                        {produto.quantidade}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600"
                        onClick={() => handleQuickChange(produto.id, 1, produto.quantidade)}
                        disabled={alterarQuantidadeMutation.isPending}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Preço e subtotal */}
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 tabular-nums">
                      {produto.quantidade} × R$ {produto.preco_venda.toFixed(2)}
                    </p>
                    <p className="text-sm font-bold text-primary tabular-nums">
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
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-gradient-to-t from-slate-50/80 to-transparent dark:from-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total estimado</span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Valores finais na proposta
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-primary tabular-nums">
                R$ {calcularTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
