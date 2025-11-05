import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Building2, CheckCircle2, Sparkles, Shield, FileSearch, Brain, BarChart3, PackageCheck } from "lucide-react";
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
    { id: 'validando', label: 'Validando CNPJ', Icon: Shield },
    { id: 'consultando', label: 'Consultando dados', Icon: FileSearch },
    { id: 'decidindo', label: 'Analisando necessidades', Icon: Brain },
    { id: 'executando', label: 'Coletando informações', Icon: BarChart3 },
    { id: 'consolidando', label: 'Finalizando', Icon: PackageCheck },
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
      <DialogContent className="max-w-full w-full h-full [&>button]:hidden border-none p-0 m-0">
        <div className="w-full h-full bg-background/95 backdrop-blur-md flex items-center justify-center">
          <div className="w-full max-w-md space-y-8 py-8 px-6">
          {/* Animação Central Inspirada no iFood */}
          <div className="relative flex items-center justify-center">
            {/* Ondas de Pulso */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full bg-primary/10 animate-ping" 
                   style={{ animationDuration: '2s' }} />
              <div className="absolute w-24 h-24 rounded-full bg-primary/20 animate-ping" 
                   style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
              <div className="absolute w-16 h-16 rounded-full bg-primary/30 animate-ping" 
                   style={{ animationDuration: '1s', animationDelay: '0.6s' }} />
            </div>
            
            {/* Ícone Central Animado */}
            <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg animate-pulse">
              <Building2 className="h-10 w-10 text-primary-foreground animate-bounce" 
                         style={{ animationDuration: '2s' }} />
            </div>
            
            {/* Partículas Flutuantes */}
            <Sparkles className="absolute top-0 right-0 h-5 w-5 text-primary animate-pulse" 
                      style={{ animationDelay: '0s' }} />
            <Sparkles className="absolute bottom-0 left-0 h-4 w-4 text-primary/70 animate-pulse" 
                      style={{ animationDelay: '0.5s' }} />
            <Sparkles className="absolute top-1/2 right-2 h-3 w-3 text-primary/50 animate-pulse" 
                      style={{ animationDelay: '1s' }} />
          </div>

          {/* Título com Animação */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent animate-fade-in">
              Consultando CNPJ
            </h3>
            <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Coletando as melhores informações para você
            </p>
          </div>

          {/* Barra de Progresso com Gradiente Animado */}
          <div className="space-y-3">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary transition-all duration-500 ease-out"
                style={{ 
                  width: `${progresso}%`,
                  boxShadow: '0 0 20px rgba(var(--primary), 0.5)'
                }}
              >
                {/* Efeito de Brilho Deslizante */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                     style={{ 
                       backgroundSize: '200% 100%',
                       animation: 'shimmer 2s infinite'
                     }} />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-primary">
                {progresso}% concluído
              </p>
              <p className="text-xs text-muted-foreground">
                Aguarde...
              </p>
            </div>
          </div>

          {/* Lista de Etapas Animadas */}
          <div className="space-y-3">
            {etapas.map((etapa, index) => {
              const etapaStatus = getEtapaStatus(etapa.id);
              const IconComponent = etapa.Icon;
              return (
                <div 
                  key={etapa.id}
                  className="flex items-center gap-3 text-sm transform transition-all duration-500 ease-out"
                  style={{
                    animation: `slideInRight 0.5s ease-out ${index * 0.1}s both`,
                    opacity: etapaStatus === 'idle' ? 0.5 : 1
                  }}
                >
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    transition-all duration-500 transform
                    ${etapaStatus === 'concluido' 
                      ? 'bg-green-500 scale-100 shadow-lg' 
                      : etapaStatus === 'ativo'
                      ? 'bg-primary scale-110 shadow-lg shadow-primary/50 animate-pulse'
                      : 'bg-muted scale-90'
                    }
                  `}>
                    {etapaStatus === 'concluido' ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : (
                      <IconComponent className={`h-4 w-4 ${etapaStatus === 'ativo' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <span className={`
                    transition-all duration-500 flex-1
                    ${etapaStatus === 'concluido' 
                      ? 'text-foreground font-medium line-through opacity-60' 
                      : etapaStatus === 'ativo'
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground'
                    }
                  `}>
                    {etapa.label}
                  </span>
                  {etapaStatus === 'ativo' && (
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" 
                           style={{ animationDelay: '0s' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" 
                           style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" 
                           style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}
