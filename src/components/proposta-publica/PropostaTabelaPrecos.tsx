import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package } from "lucide-react";

interface Item {
  id: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual?: number | null;
  valor_total: number;
  produtos?: {
    nome?: string;
    referencia_interna?: string;
    unidade_medida?: string;
  } | null;
}

interface PropostaTabelaPrecosProps {
  itens: Item[];
  mostrarDescontos?: boolean;
  valorFrete?: number | null;
  valorTotal?: number | null;
}

export function PropostaTabelaPrecos({ 
  itens, 
  mostrarDescontos = true,
  valorFrete,
  valorTotal 
}: PropostaTabelaPrecosProps) {
  const subtotal = itens.reduce((sum, item) => sum + (item.valor_total || 0), 0);
  const totalDesconto = itens.reduce((sum, item) => {
    if (!item.desconto_percentual) return sum;
    const valorSemDesconto = item.preco_unitario * item.quantidade;
    return sum + (valorSemDesconto - item.valor_total);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Itens da Proposta
          <Badge variant="secondary" className="ml-auto">
            {itens.length} {itens.length === 1 ? 'item' : 'itens'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        {/* Mobile View */}
        <div className="sm:hidden space-y-3 p-4">
          {itens.map((item, index) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.produtos?.nome || 'Produto'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cód: {item.produtos?.referencia_interna || '-'}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {index + 1}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Qtd:</span>{' '}
                  <span className="font-medium">{item.quantidade}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">UN:</span>{' '}
                  <span>{item.produtos?.unidade_medida || 'UN'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Unit:</span>{' '}
                  <span>{formatCurrency(item.preco_unitario)}</span>
                </div>
                {mostrarDescontos && item.desconto_percentual && item.desconto_percentual > 0 && (
                  <div>
                    <span className="text-muted-foreground">Desc:</span>{' '}
                    <span className="text-green-600">{item.desconto_percentual}%</span>
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(item.valor_total)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-center">UN</TableHead>
                <TableHead className="text-right">Unitário</TableHead>
                {mostrarDescontos && <TableHead className="text-center">Desc.</TableHead>}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[300px]">
                          {item.produtos?.nome || 'Produto'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.produtos?.referencia_interna || '-'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {item.quantidade}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {item.produtos?.unidade_medida || 'UN'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.preco_unitario)}
                  </TableCell>
                  {mostrarDescontos && (
                    <TableCell className="text-center">
                      {item.desconto_percentual && item.desconto_percentual > 0 ? (
                        <Badge variant="secondary" className="text-green-600">
                          {item.desconto_percentual}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.valor_total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totais */}
        <div className="border-t bg-muted/30 p-4 sm:p-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          
          {mostrarDescontos && totalDesconto > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Descontos:</span>
              <span className="text-green-600">-{formatCurrency(totalDesconto)}</span>
            </div>
          )}
          
          {valorFrete && valorFrete > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete:</span>
              <span>{formatCurrency(valorFrete)}</span>
            </div>
          )}
          
          <div className="flex justify-between pt-2 border-t">
            <span className="font-semibold">Total:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(valorTotal || subtotal + (valorFrete || 0))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
