import { useState, useEffect } from "react";
import { Calculator, X, ShieldCheck, CheckCircle, Save, Loader2, ArrowLeft, Truck, Link2, ExternalLink, Copy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useGerarLinkProposta } from "@/hooks/useGerarLinkProposta";
import { usePropostaActivity } from "@/hooks/usePropostaActivity";
import { PropostaActivitySheet } from "@/components/vendas/PropostaActivitySheet";
import { toast } from "sonner";

interface VendasActionBarProps {
  status: "rascunho" | "aprovada" | "cancelada";
  onCalcular: () => void;
  onCancelar: () => void;
  onDiretoria: () => void;
  onEfetivar: () => void;
  onSalvar?: () => void;
  isSaving?: boolean;
  isCalculating?: boolean;
  editandoVendaId?: string | null;
  onVoltar?: () => void;
  numeroVenda?: string;
  etapaPipeline?: string;
  className?: string;
  // Props para frete
  freteCalculado?: boolean;
  onCalcularFrete?: () => void;
  isCalculatingFrete?: boolean;
  valorFrete?: number;
  // Props para Smart Proposal
  vendaId?: string | null;
}

export function VendasActionBar({
  status,
  onCalcular,
  onCancelar,
  onDiretoria,
  onEfetivar,
  onSalvar,
  isSaving = false,
  isCalculating = false,
  editandoVendaId = null,
  onVoltar,
  numeroVenda,
  etapaPipeline,
  className,
  freteCalculado = false,
  onCalcularFrete,
  isCalculatingFrete = false,
  valorFrete = 0,
  vendaId = null
}: VendasActionBarProps) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  
  const { gerarLink, isGenerating, publicUrl, copiarLink, setPublicUrl } = useGerarLinkProposta(vendaId);
  const { publicUrl: existingUrl, data: activityData } = usePropostaActivity(vendaId || "");

  // Se já existe um link, usar ele
  useEffect(() => {
    if (existingUrl && !publicUrl) {
      setPublicUrl(existingUrl);
    }
  }, [existingUrl, publicUrl, setPublicUrl]);

  // Calcular total de visualizações
  const totalViews = activityData?.analytics?.length || 0;

  const getStatusInfo = () => {
    switch (status) {
      case "rascunho":
        return {
          label: "Rascunho",
          className: "bg-secondary/10 text-secondary border-secondary/20"
        };
      case "aprovada":
        return {
          label: "Aprovada",
          className: "bg-success/10 text-success border-success/20"
        };
      case "cancelada":
        return {
          label: "Cancelada",
          className: "bg-destructive/10 text-destructive border-destructive/20"
        };
      default:
        return {
          label: status,
          className: "bg-muted"
        };
    }
  };
  const statusInfo = getStatusInfo();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleGerarLink = () => {
    if (publicUrl) {
      copiarLink();
    } else {
      gerarLink();
    }
  };

  const handleAbrirLink = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  return (
    <div className={cn("sticky top-0 z-30 bg-card border-b shadow-sm px-8 py-3", className)}>
      <div className="px-0 mx-0 flex items-center justify-between gap-0">
        <div className="flex items-center gap-3">
          {onVoltar && (
            <Button variant="ghost" size="icon" onClick={onVoltar}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {numeroVenda && (
            <div className="flex flex-col gap-0.5">
              {etapaPipeline && (
                <Badge variant="outline" className="w-fit text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-muted-foreground/30 rounded">
                  {etapaPipeline}
                </Badge>
              )}
              <h1 className="font-semibold text-base text-foreground tracking-tight">
                Proposta <span className="text-primary font-bold">#{numeroVenda}</span>
              </h1>
            </div>
          )}
          <div className="h-6 w-px bg-border mx-2" />
          
          {onSalvar && (
            <Save 
              size={16} 
              className="text-muted-foreground hover:text-primary cursor-pointer transition-colors" 
              onClick={onSalvar} 
            />
          )}
          
          {freteCalculado}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Link Público / Activity Sheet */}
          {vendaId && (
            <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "gap-2 relative",
                    publicUrl && "border-primary/50 text-primary"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Link2 size={16} />
                  )}
                  {publicUrl ? "Link Público" : "Gerar Link"}
                  {totalViews > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary">
                      {totalViews}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Link da Proposta</span>
                    {totalViews > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Eye size={12} />
                        {totalViews} {totalViews === 1 ? "visualização" : "visualizações"}
                      </Badge>
                    )}
                  </div>
                  
                  {publicUrl ? (
                    <>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <code className="text-xs flex-1 truncate">{publicUrl}</code>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 gap-1"
                          onClick={copiarLink}
                        >
                          <Copy size={14} />
                          Copiar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 gap-1"
                          onClick={handleAbrirLink}
                        >
                          <ExternalLink size={14} />
                          Abrir
                        </Button>
                      </div>
                      
                      {/* Activity Sheet trigger */}
                      <div className="pt-2 border-t">
                        <PropostaActivitySheet vendaId={vendaId} />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Gere um link público para compartilhar esta proposta com seu cliente.
                      </p>
                      <Button 
                        size="sm" 
                        className="w-full gap-2"
                        onClick={handleGerarLink}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="animate-spin" size={14} />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Link2 size={14} />
                            Gerar Link Público
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Botão Calcular Frete */}
          {!freteCalculado && onCalcularFrete && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCalcularFrete} 
              disabled={isCalculatingFrete} 
              className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              {isCalculatingFrete ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Calculando Frete...
                </>
              ) : (
                <>
                  <Truck size={16} />
                  Calcular Frete
                </>
              )}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onCalcular} disabled={isCalculating} className="gap-2">
            {isCalculating ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Calculando...
              </>
            ) : (
              <>
                <Calculator size={16} />
                Calcular
              </>
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={onCancelar} className="gap-2">
            <X size={16} />
            Cancelar
          </Button>
          
          <Button variant="outline" size="sm" onClick={onDiretoria} className="gap-2">
            <ShieldCheck size={16} />
            Diretoria
          </Button>
          
          <Button variant="default" size="sm" onClick={onEfetivar} className="gap-2">
            <CheckCircle size={16} />
            Efetivar
          </Button>
        </div>
      </div>
    </div>
  );
}
