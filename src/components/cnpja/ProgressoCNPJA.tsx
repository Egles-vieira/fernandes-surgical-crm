import { StatusConsulta } from "@/types/cnpja";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { formatarTempoDecorrido } from "@/lib/cnpja-utils";
import { useEffect, useState } from "react";

interface ProgressoCNPJAProps {
  status: StatusConsulta;
  progresso: number;
  custoAcumulado?: number;
}

export function ProgressoCNPJA({ status, progresso, custoAcumulado = 0 }: ProgressoCNPJAProps) {
  const [tempoDecorrido, setTempoDecorrido] = useState(0);

  useEffect(() => {
    if (status === 'idle' || status === 'concluido' || status === 'erro') {
      setTempoDecorrido(0);
      return;
    }

    const interval = setInterval(() => {
      setTempoDecorrido((prev) => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [status]);

  const etapas = [
    { id: 'validando', label: 'Validando CNPJ' },
    { id: 'consultando', label: 'Consultando dados base' },
    { id: 'decidindo', label: 'Analisando decisões' },
    { id: 'executando', label: 'Executando consultas' },
    { id: 'consolidando', label: 'Consolidando dados' },
    { id: 'concluido', label: 'Concluído' },
  ];

  const etapaIndex = etapas.findIndex((e) => e.id === status);

  return (
    <div className="space-y-4">
      {/* Barra de progresso principal */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            {status === 'erro' ? 'Erro na consulta' : etapas[etapaIndex]?.label || 'Aguardando...'}
          </span>
          <span className="text-muted-foreground">{progresso}%</span>
        </div>
        <Progress value={progresso} className="h-2" />
      </div>

      {/* Lista de etapas */}
      <div className="space-y-2">
        {etapas.slice(0, -1).map((etapa, index) => {
          const isConcluida = index < etapaIndex;
          const isAtual = index === etapaIndex;
          const isErro = status === 'erro' && isAtual;

          return (
            <div
              key={etapa.id}
              className="flex items-center gap-3 text-sm"
            >
              {/* Ícone de status */}
              <div className="flex-shrink-0">
                {isConcluida && (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                {isAtual && !isErro && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                {isErro && (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                {!isConcluida && !isAtual && (
                  <div className="w-5 h-5 rounded-full border-2 border-border" />
                )}
              </div>

              {/* Label da etapa */}
              <span
                className={
                  isConcluida || isAtual
                    ? 'font-medium'
                    : 'text-muted-foreground'
                }
              >
                {etapa.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Métricas */}
      {status !== 'idle' && status !== 'erro' && (
        <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
          <span>Tempo: {formatarTempoDecorrido(tempoDecorrido)}</span>
          {custoAcumulado > 0 && (
            <span>Créditos: {custoAcumulado}₪</span>
          )}
        </div>
      )}
    </div>
  );
}
