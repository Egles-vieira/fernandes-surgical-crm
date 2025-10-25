import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Package, DollarSign, Hash, Box } from "lucide-react";
import { useState } from "react";

interface Sugestao {
  produto_id: string;
  nome: string;
  referencia_interna: string;
  preco_venda: number;
  unidade_medida: string;
  quantidade_em_maos: number;
  score: number;
  motivo: string;
  metodo?: string;
}

interface SugestoesIADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sugestoes: Sugestao[];
  onSelecionar: (produto: Sugestao) => void;
  onBuscarManual: () => void;
  itemCliente?: {
    descricao: string;
    quantidade: number;
    unidade_medida: string;
    marca?: string;
  };
}

export function SugestoesIADialog({
  open,
  onOpenChange,
  sugestoes,
  onSelecionar,
  onBuscarManual,
  itemCliente,
}: SugestoesIADialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões da IA
          </DialogTitle>
          <DialogDescription>
            Selecione o produto que melhor corresponde à solicitação ou busque manualmente.
          </DialogDescription>
        </DialogHeader>

        {itemCliente && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="pt-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Solicitação do Cliente
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Descrição: </span>
                  <span className="font-medium">{itemCliente.descricao}</span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="text-muted-foreground">Quantidade: </span>
                    <span className="font-medium">{itemCliente.quantidade} {itemCliente.unidade_medida}</span>
                  </div>
                  {itemCliente.marca && (
                    <div>
                      <span className="text-muted-foreground">Marca: </span>
                      <span className="font-medium">{itemCliente.marca}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {sugestoes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">Nenhuma sugestão encontrada no catálogo.</p>
            <Button onClick={onBuscarManual}>
              Buscar Manualmente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sugestoes.map((sugestao, index) => (
              <Card
                key={sugestao.produto_id}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${
                  selected === sugestao.produto_id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setSelected(sugestao.produto_id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{sugestao.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          Ref: {sugestao.referencia_interna}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>R$ {sugestao.preco_venda.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Box className="h-3 w-3" />
                        <span>{sugestao.quantidade_em_maos} {sugestao.unidade_medida}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground italic">
                      {sugestao.motivo}
                    </p>

                    {sugestao.metodo && (
                      <Badge variant="outline" className="text-xs">
                        {sugestao.metodo === 'embedding_semantico' ? 'Análise Semântica' : 
                         sugestao.metodo === 'vinculo_existente' ? 'Vínculo Aprovado' : 
                         'Análise de Termos'}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getScoreBadgeVariant(sugestao.score)}>
                      <span className={getScoreColor(sugestao.score)}>
                        {sugestao.score}%
                      </span>
                    </Badge>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelecionar(sugestao);
                        onOpenChange(false);
                      }}
                      disabled={selected !== sugestao.produto_id && selected !== null}
                    >
                      Selecionar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onBuscarManual} className="flex-1">
                Buscar Manualmente
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
