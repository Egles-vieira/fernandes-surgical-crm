import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Package, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import type { SugestaoProduto, AnaliseIAItem } from "@/types/ia-analysis";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { FeedbackIADialog } from "./FeedbackIADialog";

interface SugestoesIACardProps {
  analise: AnaliseIAItem;
  onSelecionarProduto: (itemId: string, produtoId: string) => void;
  produtoSelecionadoId?: string;
}

export function SugestoesIACard({ analise, onSelecionarProduto, produtoSelecionadoId }: SugestoesIACardProps) {
  const [expandido, setExpandido] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [sugestaoParaFeedback, setSugestaoParaFeedback] = useState<SugestaoProduto | null>(null);

  const getConfiancaBadge = (confianca: 'alta' | 'media' | 'baixa') => {
    const variants = {
      alta: { variant: 'default' as const, icon: CheckCircle2, text: 'Alta Confiança' },
      media: { variant: 'secondary' as const, icon: TrendingUp, text: 'Média Confiança' },
      baixa: { variant: 'outline' as const, icon: AlertCircle, text: 'Baixa Confiança' },
    };
    const config = variants[confianca];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const handleAbrirFeedback = (sugestao: SugestaoProduto) => {
    setSugestaoParaFeedback(sugestao);
    setFeedbackDialogOpen(true);
  };

  if (analise.status === 'erro') {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            Erro na Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{analise.erro}</p>
        </CardContent>
      </Card>
    );
  }

  if (analise.sugestoes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma sugestão encontrada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const principal = analise.sugestao_principal || analise.sugestoes[0];
  const alternativas = analise.sugestoes.slice(1, 3);

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Sugestão Principal
              </CardTitle>
              <CardDescription className="text-xs">
                {analise.metodo === 'hibrido_deepseek' ? 'Análise híbrida (DeepSeek + Tokens)' : 'Análise por tokens'}
              </CardDescription>
            </div>
            {getConfiancaBadge(principal.confianca)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Produto Principal */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-sm">{principal.descricao}</h4>
                <p className="text-xs text-muted-foreground">Código: {principal.codigo}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Score: {principal.score_final}%</span>
                  {principal.unidade_medida && <span>Un: {principal.unidade_medida}</span>}
                  {principal.estoque_disponivel !== undefined && (
                    <span className={principal.estoque_disponivel > 0 ? 'text-green-600' : 'text-destructive'}>
                      Estoque: {principal.estoque_disponivel}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right space-y-2">
                {principal.preco_venda && (
                  <p className="font-semibold text-sm">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(principal.preco_venda)}
                  </p>
                )}
              </div>
            </div>

            {/* Justificativa */}
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <p className="text-xs text-muted-foreground">{principal.justificativa}</p>
              {principal.razoes_match.length > 0 && (
                <ul className="text-xs space-y-1 mt-2">
                  {principal.razoes_match.map((razao, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{razao}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onSelecionarProduto(analise.item_id, principal.produto_id)}
                disabled={produtoSelecionadoId === principal.produto_id}
                className="flex-1"
              >
                {produtoSelecionadoId === principal.produto_id ? 'Selecionado' : 'Selecionar Produto'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAbrirFeedback(principal)}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAbrirFeedback(principal)}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Alternativas */}
          {alternativas.length > 0 && (
            <Collapsible open={expandido} onOpenChange={setExpandido}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs">Ver {alternativas.length} alternativas</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {alternativas.map((alt, idx) => (
                  <div
                    key={idx}
                    className="border rounded-md p-3 space-y-2 bg-background"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <h5 className="font-medium text-sm">{alt.descricao}</h5>
                        <p className="text-xs text-muted-foreground">Código: {alt.codigo}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Score: {alt.score_final}%
                          </Badge>
                          {getConfiancaBadge(alt.confianca)}
                        </div>
                      </div>
                      {alt.preco_venda && (
                        <p className="font-medium text-sm">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(alt.preco_venda)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{alt.justificativa}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelecionarProduto(analise.item_id, alt.produto_id)}
                      disabled={produtoSelecionadoId === alt.produto_id}
                      className="w-full"
                    >
                      {produtoSelecionadoId === alt.produto_id ? 'Selecionado' : 'Selecionar'}
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {sugestaoParaFeedback && (
        <FeedbackIADialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          itemId={analise.item_id}
          sugestao={sugestaoParaFeedback}
        />
      )}
    </>
  );
}
