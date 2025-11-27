import { Calculator, X, ShieldCheck, CheckCircle, Save, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  className
}: VendasActionBarProps) {
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
  return <div className={cn("sticky top-0 z-30 bg-card border-b shadow-sm px-8 py-3", className)}>
      <div className="px-0 mx-0 flex items-center justify-between gap-0">
        <div className="flex items-center gap-3">
          {onVoltar && <Button variant="ghost" size="icon" onClick={onVoltar}>
              <ArrowLeft className="h-5 w-5" />
            </Button>}
          {numeroVenda && <div className="flex flex-col gap-0.5">
              {etapaPipeline && <Badge variant="outline" className="w-fit text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-muted-foreground/30 rounded">{etapaPipeline}</Badge>}
              <h1 className="font-semibold text-base text-foreground tracking-tight">Proposta <span className="text-primary font-bold">#{numeroVenda}</span></h1>
            </div>}
          <div className="h-6 w-px bg-border mx-2" />
          
          
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCalcular} disabled={isCalculating} className="gap-2">
            {isCalculating ? <>
                <Loader2 className="animate-spin" size={16} />
                Calculando...
              </> : <>
                <Calculator size={16} />
                Calcular
              </>}
          </Button>
          
          <Button variant="outline" size="sm" onClick={onCancelar} className="gap-2">
            <X size={16} />
            Cancelar
          </Button>
          
          {onSalvar && <Button variant="outline" size="sm" onClick={onSalvar} disabled={isSaving} className="gap-2">
              {isSaving ? <>
                  <Loader2 className="animate-spin" size={16} />
                  Salvando...
                </> : <>
                  <Save size={16} />
                  Salvar
                </>}
            </Button>}
          
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
    </div>;
}