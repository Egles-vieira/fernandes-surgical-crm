import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Calendar, TrendingUp, Package, Eye, Copy, User } from "lucide-react";
import { useVendaDetalhes } from "@/hooks/useVendaDetalhes";
import type { VendaPipelineCard } from "@/hooks/useVendasPipeline";

interface PropostaQuickViewSheetProps {
  venda: VendaPipelineCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicar?: (venda: VendaPipelineCard) => void;
}

const ETAPAS_LABELS: Record<string, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  followup_cliente: "Follow-up Cliente",
  fechamento: "Fechamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function PropostaQuickViewSheet({ 
  venda, 
  open, 
  onOpenChange,
  onDuplicar 
}: PropostaQuickViewSheetProps) {
  const navigate = useNavigate();
  
  const { venda: vendaCompleta, isLoading } = useVendaDetalhes({
    vendaId: venda?.id || null,
    enabled: open && !!venda?.id
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleViewDetails = () => {
    if (venda) {
      navigate(`/vendas/${venda.id}`);
      onOpenChange(false);
    }
  };

  const handleDuplicar = () => {
    if (venda && onDuplicar) {
      onDuplicar(venda);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader className="space-y-3 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              #{venda?.numero_venda?.slice(-10) || "..."}
            </SheetTitle>
            {venda?.etapa_pipeline && (
              <Badge variant="outline" className="text-xs">
                {ETAPAS_LABELS[venda.etapa_pipeline] || venda.etapa_pipeline}
              </Badge>
            )}
          </div>
          
          {venda?.cliente_nome && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="font-medium text-foreground">{venda.cliente_nome}</span>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-4">
          <div className="space-y-6 pr-4">
            {/* Métricas principais */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Valor
                </div>
                <p className="font-semibold text-sm">
                  {formatCurrency(venda?.valor_estimado || 0)}
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-xs text-muted-foreground mb-1">
                  Probabilidade
                </div>
                <p className="font-semibold text-sm">
                  {venda?.probabilidade || 0}%
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" />
                  Previsão
                </div>
                <p className="font-semibold text-sm">
                  {formatDate(venda?.data_fechamento_prevista || null)}
                </p>
              </div>
            </div>

            {/* Vendedor */}
            {vendaCompleta?.vendedor_id && (
              <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/30">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vendedor:</span>
                <span className="font-medium">-</span>
              </div>
            )}

            {/* Itens da proposta */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">
                  Itens ({isLoading ? "..." : vendaCompleta?.vendas_itens?.length || 0})
                </h4>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : vendaCompleta?.vendas_itens && vendaCompleta.vendas_itens.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs h-9">Código</TableHead>
                        <TableHead className="text-xs h-9">Descrição</TableHead>
                        <TableHead className="text-xs h-9 text-right">Qtd</TableHead>
                        <TableHead className="text-xs h-9 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendaCompleta.vendas_itens.slice(0, 10).map((item: any) => (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="py-2 font-mono text-[10px]">
                            {item.produtos?.referencia_interna?.slice(0, 10) || "-"}
                          </TableCell>
                          <TableCell className="py-2 max-w-[150px] truncate" title={item.produtos?.nome}>
                            {item.produtos?.nome?.slice(0, 25) || "-"}
                            {(item.produtos?.nome?.length || 0) > 25 && "..."}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {item.quantidade}
                          </TableCell>
                          <TableCell className="py-2 text-right font-medium">
                            {formatCurrency(item.valor_total || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {vendaCompleta.vendas_itens.length > 10 && (
                    <div className="text-center py-2 text-xs text-muted-foreground bg-muted/20 border-t">
                      +{vendaCompleta.vendas_itens.length - 10} itens adicionais
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg bg-muted/20">
                  Nenhum item na proposta
                </div>
              )}
            </div>

            {/* Total */}
            {vendaCompleta && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium">Total da Proposta</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(vendaCompleta.valor_total || venda?.valor_estimado || 0)}
                </span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer com ações */}
        <div className="flex gap-2 pt-4 border-t mt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleDuplicar}
            disabled={!onDuplicar}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
          <Button 
            className="flex-1"
            onClick={handleViewDetails}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
