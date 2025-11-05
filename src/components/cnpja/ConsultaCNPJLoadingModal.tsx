import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Sparkles, Shield, FileSearch, Brain, BarChart3, PackageCheck, PartyPopper } from "lucide-react";
import { StatusConsulta } from "@/types/cnpja";
import { useEffect, useState } from "react";

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
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const etapas = [
    { id: 'validando', label: 'Validando CNPJ', Icon: Shield },
    { id: 'consultando', label: 'Consultando dados', Icon: FileSearch },
    { id: 'decidindo', label: 'Analisando necessidades', Icon: Brain },
    { id: 'executando', label: 'Coletando informações', Icon: BarChart3 },
    { id: 'consolidando', label: 'Finalizando', Icon: PackageCheck },
  ];

  // Detectar conclusão e mostrar confete
  useEffect(() => {
    if (progresso === 100 && status === 'consolidando') {
      setTimeout(() => {
        setShowSuccess(true);
        setShowConfetti(true);
      }, 500);
    } else {
      setShowSuccess(false);
      setShowConfetti(false);
    }
  }, [progresso, status]);

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
        <div className="w-full h-full bg-background/95 backdrop-blur-md flex items-center justify-center overflow-hidden relative">
          {/* Confete Verde Animado */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-50">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-green-500 animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-${Math.random() * 20}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                    opacity: 0.7 + Math.random() * 0.3,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              ))}
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={`circle-${i}`}
                  className="absolute w-3 h-3 rounded-full bg-green-400 animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-${Math.random() * 20}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                    opacity: 0.6 + Math.random() * 0.4,
                  }}
                />
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`rect-${i}`}
                  className="absolute w-4 h-1 bg-green-600 animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `-${Math.random() * 20}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2.5 + Math.random() * 1.5}s`,
                    opacity: 0.5 + Math.random() * 0.5,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="w-full max-w-md space-y-8 py-8 px-6 relative z-10">{showSuccess && (
              <div className="absolute inset-0 flex items-center justify-center -mt-32 animate-scale-in">
                <div className="bg-green-500 rounded-full p-6 shadow-2xl shadow-green-500/50">
                  <PartyPopper className="h-16 w-16 text-white animate-bounce" />
                </div>
              </div>
            )}
          {/* Loader Circular Profissional */}
          <div className="relative flex items-center justify-center">
            {/* Círculos Concêntricos Animados */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full border-2 border-primary/20" />
              <div className="absolute w-32 h-32 rounded-full border-t-2 border-primary animate-spin" 
                   style={{ animationDuration: '2s' }} />
              
              <div className="absolute w-24 h-24 rounded-full border-2 border-primary/30" />
              <div className="absolute w-24 h-24 rounded-full border-t-2 border-primary/80 animate-spin" 
                   style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
              
              <div className="absolute w-16 h-16 rounded-full border-2 border-primary/40" />
              <div className="absolute w-16 h-16 rounded-full border-t-2 border-primary animate-spin" 
                   style={{ animationDuration: '1s' }} />
            </div>
            
            {/* Núcleo Central com Pulso */}
            <div className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 animate-pulse shadow-lg shadow-primary/50" />
            
            {/* Partículas Orbitantes */}
            <div className="absolute w-3 h-3 rounded-full bg-primary/60 animate-orbit-1" 
                 style={{ top: '10%', left: '50%' }} />
            <div className="absolute w-2 h-2 rounded-full bg-primary/40 animate-orbit-2" 
                 style={{ top: '50%', right: '10%' }} />
            <div className="absolute w-2.5 h-2.5 rounded-full bg-primary/50 animate-orbit-3" 
                 style={{ bottom: '15%', left: '20%' }} />
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
          
          @keyframes orbit-1 {
            0% { transform: rotate(0deg) translateX(60px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
          }
          
          @keyframes orbit-2 {
            0% { transform: rotate(120deg) translateX(50px) rotate(-120deg); }
            100% { transform: rotate(480deg) translateX(50px) rotate(-480deg); }
          }
          
          @keyframes orbit-3 {
            0% { transform: rotate(240deg) translateX(55px) rotate(-240deg); }
            100% { transform: rotate(600deg) translateX(55px) rotate(-600deg); }
          }
          
          @keyframes confetti {
            0% {
              transform: translateY(0) rotateZ(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotateZ(720deg);
              opacity: 0;
            }
          }
          
          .animate-orbit-1 {
            animation: orbit-1 3s linear infinite;
          }
          
          .animate-orbit-2 {
            animation: orbit-2 4s linear infinite;
          }
          
          .animate-orbit-3 {
            animation: orbit-3 3.5s linear infinite;
          }
          
          .animate-confetti {
            animation: confetti linear forwards;
          }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}
