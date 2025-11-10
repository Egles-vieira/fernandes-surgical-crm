import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import type { MetaComProgresso } from "@/hooks/useMetasEquipe";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetaCardProps {
  meta: MetaComProgresso;
  onVerDetalhes: () => void;
  onAtualizarProgresso: () => void;
}

export function MetaCard({ meta, onVerDetalhes, onAtualizarProgresso }: MetaCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa':
        return 'bg-primary/10 text-primary';
      case 'concluida':
        return 'bg-primary/20 text-primary';
      case 'cancelada':
        return 'bg-muted text-muted-foreground';
      case 'pausada':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'critica':
        return 'bg-destructive/10 text-destructive';
      case 'alta':
        return 'bg-warning/10 text-warning';
      case 'media':
        return 'bg-accent/10 text-accent-foreground';
      case 'baixa':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSituacaoIcon = () => {
    switch (meta.situacao_prazo) {
      case 'concluida':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'urgente':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'atencao':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'vencida':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-primary" />;
    }
  };

  const formatValor = (valor: number) => {
    if (meta.unidade_medida === 'R$') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(valor);
    }
    return `${valor.toFixed(2)} ${meta.unidade_medida || ''}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{meta.nome}</CardTitle>
              {getSituacaoIcon()}
            </div>
            {meta.descricao && (
              <CardDescription className="line-clamp-2">{meta.descricao}</CardDescription>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={getStatusColor(meta.status)}>
              {meta.status}
            </Badge>
            <Badge className={getPrioridadeColor(meta.prioridade)}>
              {meta.prioridade}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">
              {formatValor(meta.valor_atual)} / {formatValor(meta.valor_objetivo)}
            </span>
          </div>
          <Progress value={Math.min(meta.percentual_conclusao, 100)} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{meta.percentual_conclusao.toFixed(1)}% concluído</span>
            {meta.meta_atingida && (
              <span className="text-primary font-semibold flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Meta Atingida!
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tipo</p>
            <p className="font-medium capitalize">{meta.tipo_meta.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Métrica</p>
            <p className="font-medium capitalize">{meta.metrica.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Início</p>
            <p className="font-medium">
              {format(new Date(meta.periodo_inicio), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fim</p>
            <p className="font-medium">
              {format(new Date(meta.periodo_fim), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {meta.dias_restantes > 0 
                ? `${Math.ceil(meta.dias_restantes)} dias restantes`
                : 'Prazo vencido'
              }
            </span>
          </div>
          {meta.alertas_nao_lidos > 0 && (
            <Badge variant="destructive" className="text-xs">
              {meta.alertas_nao_lidos} alerta{meta.alertas_nao_lidos > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onVerDetalhes} className="flex-1">
            Ver Detalhes
          </Button>
          {meta.status === 'ativa' && (
            <Button size="sm" onClick={onAtualizarProgresso} className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
