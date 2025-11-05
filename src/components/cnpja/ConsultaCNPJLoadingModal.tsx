import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2 } from "lucide-react";
import { StatusConsulta } from "@/types/cnpja";

interface ConsultaCNPJLoadingModalProps {
  open: boolean;
  status: StatusConsulta;
  progresso: number;
}

export function ConsultaCNPJLoadingModal({ 
  open, 
  status, 
  progresso 
}: ConsultaCNPJLoadingModalProps) {
  const etapas = [
    { id: 'validando', label: 'Validando CNPJ', status: 'idle' },
    { id: 'consultando', label: 'Consultando dados base', status: 'idle' },
    { id: 'decidindo', label: 'Analisando necessidades', status: 'idle' },
    { id: 'executando', label: 'Coletando dados complementares', status: 'idle' },
    { id: 'consolidando', label: 'Consolidando informações', status: 'idle' },
  ];

  const getEtapaStatus = (etapaId: string) => {
    const etapaIndex = etapas.findIndex(e => e.id === etapaId);
    const statusIndex = etapas.findIndex(e => e.id === status);
    
    if (statusIndex === -1) return 'idle';
    if (etapaIndex < statusIndex) return 'concluido';
    if (etapaIndex === statusIndex) return 'ativo';
    return 'idle';
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <div className="space-y-6 py-4">
          {/* Header com animação */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold">Consultando CNPJ</h3>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto coletamos as informações...
            </p>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-2">
            <Progress value={progresso} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {progresso}% concluído
            </p>
          </div>

          {/* Lista de Etapas */}
          <div className="space-y-3">
            {etapas.map((etapa) => {
              const etapaStatus = getEtapaStatus(etapa.id);
              return (
                <div 
                  key={etapa.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className={`
                    flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${etapaStatus === 'concluido' 
                      ? 'bg-green-500 text-white' 
                      : etapaStatus === 'ativo'
                      ? 'bg-primary text-primary-foreground animate-pulse'
                      : 'bg-muted'
                    }
                  `}>
                    {etapaStatus === 'concluido' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : etapaStatus === 'ativo' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  <span className={`
                    transition-colors duration-300
                    ${etapaStatus === 'concluido' 
                      ? 'text-foreground font-medium' 
                      : etapaStatus === 'ativo'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                    }
                  `}>
                    {etapa.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
