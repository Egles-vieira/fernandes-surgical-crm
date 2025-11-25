import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, X, Package, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

interface CarrinhoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversaId: string;
}

interface ProdutoCarrinho {
  id: string;
  nome: string;
  referencia_interna: string;
  preco_venda: number;
  quantidade_em_maos: number;
  quantidade: number;
}

export const CarrinhoDialog = ({ open, onOpenChange, conversaId }: CarrinhoDialogProps) => {
  // Buscar dados da conversa incluindo carrinho
  const { data: conversa, isLoading } = useQuery({
    queryKey: ['whatsapp-conversa-carrinho', conversaId],
    queryFn: async () => {
      console.log('🛒 Buscando carrinho para conversaId:', conversaId);
      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .select('produtos_carrinho')
        .eq('id', conversaId)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar carrinho:', error);
        throw error;
      }
      console.log('✅ Dados do carrinho:', data);
      console.log('📦 produtos_carrinho:', data?.produtos_carrinho);
      console.log('📦 tipo:', typeof data?.produtos_carrinho);
      console.log('📦 isArray:', Array.isArray(data?.produtos_carrinho));
      return data;
    },
    enabled: open && !!conversaId
  });

  // Buscar detalhes dos produtos no carrinho
  const { data: produtosDetalhes } = useQuery<ProdutoCarrinho[]>({
    queryKey: ['produtos-carrinho', conversa?.produtos_carrinho],
    queryFn: async (): Promise<ProdutoCarrinho[]> => {
      const carrinho = conversa?.produtos_carrinho || [];
      console.log('🔍 Processando carrinho:', carrinho);
      
      // Carrinho formato: [{ id: uuid, quantidade: number }]
      if (!Array.isArray(carrinho) || carrinho.length === 0) {
        console.log('⚠️ Carrinho vazio ou não é array');
        return [];
      }

      const produtoIds: string[] = carrinho
        .map((item: any) => item?.id)
        .filter((id: any): id is string => typeof id === 'string' && id !== null && id !== undefined);

      console.log('🆔 IDs dos produtos:', produtoIds);

      if (produtoIds.length === 0) {
        console.log('⚠️ Nenhum ID válido encontrado');
        return [];
      }

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, referencia_interna, preco_venda, quantidade_em_maos')
        .in('id', produtoIds);

      console.log('📊 Produtos encontrados:', data);
      if (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        throw error;
      }
      if (!data) return [];

      // Mapear produtos com quantidades do carrinho
      const produtosComQuantidade: ProdutoCarrinho[] = data.map(produto => {
        const carrinhoItem: any = carrinho.find((item: any) => 
          item?.id === produto.id
        );
        
        const quantidade = carrinhoItem?.quantidade || 1;
        
        return {
          id: produto.id,
          nome: produto.nome,
          referencia_interna: produto.referencia_interna,
          preco_venda: produto.preco_venda,
          quantidade_em_maos: produto.quantidade_em_maos,
          quantidade
        };
      });
      
      console.log('✅ Produtos com quantidade:', produtosComQuantidade);
      return produtosComQuantidade;
    },
    enabled: !!conversa?.produtos_carrinho && Array.isArray(conversa.produtos_carrinho) && conversa.produtos_carrinho.length > 0
  });

  const calcularTotal = () => {
    if (!produtosDetalhes) return 0;
    return produtosDetalhes.reduce((total, produto) => {
      return total + (produto.preco_venda * (produto.quantidade || 1));
    }, 0);
  };

  const quantidadeTotal = produtosDetalhes?.reduce((sum, p) => sum + (p.quantidade || 1), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Carrinho da Conversa
          </DialogTitle>
          <DialogDescription>
            Produtos que estão sendo discutidos nesta conversa
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Carregando carrinho...</p>
            </div>
          ) : !produtosDetalhes || produtosDetalhes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Carrinho vazio</p>
              <p className="text-sm text-muted-foreground">
                Nenhum produto foi adicionado ainda
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {produtosDetalhes.map((produto, index) => (
                <Card key={produto.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-base leading-tight">
                            {produto.nome}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Cód: {produto.referencia_interna}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {produto.quantidade}x
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              R$ {produto.preco_venda.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">/ un</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Estoque: {produto.quantidade_em_maos}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Subtotal</p>
                          <p className="text-lg font-bold text-primary">
                            R$ {(produto.preco_venda * (produto.quantidade || 1)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              <Separator className="my-4" />

              {/* Resumo do Carrinho */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de itens:</span>
                    <span className="font-medium">{quantidadeTotal} unidade(s)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Produtos diferentes:</span>
                    <span className="font-medium">{produtosDetalhes.length}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Valor Total:</span>
                    <span className="text-2xl font-bold text-primary">
                      R$ {calcularTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  💡 <strong>Dica:</strong> Estes produtos estão sendo discutidos no chat. 
                  O agente pode usá-los para gerar uma proposta comercial.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
