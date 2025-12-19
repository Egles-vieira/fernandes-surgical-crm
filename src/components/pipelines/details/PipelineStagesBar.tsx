import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Estagio {
  id: string;
  nome_estagio: string;
  ordem_estagio: number;
}

interface PipelineStagesBarProps {
  estagios: Estagio[];
  estagioAtualId: string | null;
  onEstagioClick?: (estagioId: string) => void;
  disabled?: boolean;
}

export function PipelineStagesBar({
  estagios,
  estagioAtualId,
  onEstagioClick,
  disabled = false,
}: PipelineStagesBarProps) {
  const estagioAtualIndex = estagios.findIndex((e) => e.id === estagioAtualId);

  if (!estagios.length) return null;

  return (
    <div className="flex items-center -space-x-3 flex-1">
      {estagios.map((estagio, index) => {
        const isAtual = estagio.id === estagioAtualId;
        const isConcluido = index < estagioAtualIndex;
        const isClickable = !disabled && onEstagioClick;

        return (
          <div
            key={estagio.id}
            onClick={() => isClickable && onEstagioClick(estagio.id)}
            className={cn(
              "relative flex items-center justify-center h-7 flex-1 transition-all",
              // Cores baseadas no estado
              isConcluido && "bg-success/90 text-success-foreground",
              isAtual && "bg-primary text-primary-foreground shadow-lg z-10 scale-105",
              !isConcluido && !isAtual && "bg-muted text-muted-foreground",
              // Primeiro item tem padding diferente
              index === 0 && "pl-6 rounded-l-md",
              // Último item tem rounded na direita
              index === estagios.length - 1 && "rounded-r-md",
              // Cursor pointer quando clicável
              isClickable && "cursor-pointer hover:opacity-90"
            )}
            style={{
              clipPath:
                index === 0
                  ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
                  : index === estagios.length - 1
                  ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)"
                  : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)",
            }}
          >
            <div className="flex items-center gap-1.5 relative z-10">
              {isConcluido && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              <span className="text-xs font-semibold whitespace-nowrap truncate max-w-[100px]">
                {estagio.nome_estagio}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
