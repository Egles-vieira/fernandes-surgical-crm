import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import type { ProgressoAnaliseIA as ProgressoType } from "@/types/ia-analysis";

interface ProgressoAnaliseIAProps {
  progresso: ProgressoType | null;
  isAnalyzing: boolean;
}

export function ProgressoAnaliseIA({ progresso, isAnalyzing }: ProgressoAnaliseIAProps) {
  if (!isAnalyzing && !progresso) return null;

  const getStatusIcon = () => {
    if (!progresso) return <Loader2 className="h-4 w-4 animate-spin" />;
    
    switch (progresso.status) {
      case 'iniciando':
      case 'em_progresso':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'concluido':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    if (!progresso) return 'Iniciando análise...';
    
    switch (progresso.status) {
      case 'iniciando':
        return 'Iniciando análise de IA...';
      case 'em_progresso':
        return 'Analisando produtos com IA...';
      case 'concluido':
        return 'Análise concluída!';
      case 'erro':
        return 'Erro na análise';
      default:
        return 'Processando...';
    }
  };

  const getStatusVariant = () => {
    if (!progresso) return 'secondary';
    
    switch (progresso.status) {
      case 'concluido':
        return 'default';
      case 'erro':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Análise de IA</CardTitle>
          </div>
          <Badge variant={getStatusVariant()}>
            {getStatusText()}
          </Badge>
        </div>
        {progresso && (
          <CardDescription>
            {progresso.itens_analisados} de {progresso.total_itens} itens analisados
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progresso</span>
            <span>{progresso?.percentual.toFixed(0) || 0}%</span>
          </div>
          <Progress value={progresso?.percentual || 0} className="h-2" />
        </div>

        {progresso?.erro && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {progresso.erro}
          </div>
        )}

        {progresso?.status === 'concluido' && (
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Itens com sugestões:</span>
              <span className="font-medium text-foreground">
                {progresso.itens_detalhes.filter(i => i.sugestoes.length > 0).length}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Sugestões de alta confiança:</span>
              <span className="font-medium text-green-600">
                {progresso.itens_detalhes
                  .flatMap(i => i.sugestoes)
                  .filter(s => s.confianca === 'alta').length}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
