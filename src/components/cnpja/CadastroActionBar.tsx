import { Calculator, X, Edit, Users, CheckCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
interface CadastroActionBarProps {
  status: "idle" | "validando" | "consultando" | "decidindo" | "executando" | "consolidando" | "concluido" | "erro";
  onCalcular?: () => void;
  onCancelar: () => void;
  onEditar?: () => void;
  onDiretoria?: () => void;
  onEfetivar?: () => void;
  onSalvarRascunho?: () => void;
  onEnviarAnalise?: () => void;
}
export function CadastroActionBar({
  status,
  onCalcular,
  onCancelar,
  onEditar,
  onDiretoria,
  onEfetivar,
  onSalvarRascunho,
  onEnviarAnalise
}: CadastroActionBarProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "concluido":
        return {
          label: "Concluído",
          className: "bg-success/10 text-success border-success/20"
        };
      case "erro":
        return {
          label: "Erro",
          className: "bg-destructive/10 text-destructive border-destructive/20"
        };
      case "idle":
        return {
          label: "Aguardando",
          className: "bg-secondary/10 text-secondary border-secondary/20"
        };
      case "validando":
        return {
          label: "Validando",
          className: "bg-blue-500/10 text-blue-500 border-blue-500/20"
        };
      case "consultando":
        return {
          label: "Consultando",
          className: "bg-blue-500/10 text-blue-500 border-blue-500/20"
        };
      case "decidindo":
        return {
          label: "Analisando",
          className: "bg-purple-500/10 text-purple-500 border-purple-500/20"
        };
      case "executando":
        return {
          label: "Coletando",
          className: "bg-orange-500/10 text-orange-500 border-orange-500/20"
        };
      case "consolidando":
        return {
          label: "Consolidando",
          className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
        };
      default:
        return {
          label: status,
          className: "bg-muted"
        };
    }
  };
  const statusInfo = getStatusInfo();
  return <div className="sticky top-0 z-30 bg-card border-b shadow-sm px-8 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Status da Proposta:
          </span>
          <Badge variant="outline" className={statusInfo.className}>
            {statusInfo.label}
          </Badge>
        </div>

        {status === "concluido" && <div className="flex items-center gap-2">
            {onCalcular}
            
            {onDiretoria}
            
            <Button variant="outline" size="sm" onClick={onCancelar} className="gap-2">
              <X size={16} />
              Cancelar
            </Button>
            
            {onEditar}
            
            {onSalvarRascunho && <Button variant="outline" size="sm" onClick={onSalvarRascunho} className="gap-2">
                <Save size={16} />
                Salvar Rascunho
              </Button>}
            
            {onEnviarAnalise && <Button variant="default" size="sm" onClick={onEnviarAnalise} className="gap-2">
                Enviar para Análise
              </Button>}
            
            {onEfetivar && <Button variant="default" size="sm" onClick={onEfetivar} className="gap-2 bg-green-600 hover:bg-green-700">
                <CheckCircle size={16} />
                Efetivar
              </Button>}
          </div>}
      </div>
    </div>;
}