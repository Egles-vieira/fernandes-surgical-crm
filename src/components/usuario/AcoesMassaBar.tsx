import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppRole } from "@/hooks/useRoles";

interface AcoesMassaBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAdicionarPermissao: (role: AppRole) => void;
  onRemoverPermissao: (role: AppRole) => void;
}

const AVAILABLE_ROLES: { value: AppRole; label: string; color: string }[] = [
  {
    value: "admin",
    label: "Administrador",
    color: "bg-destructive",
  },
  {
    value: "lider",
    label: "Líder / Coordenador",
    color: "bg-secondary",
  },
  {
    value: "manager",
    label: "Gerente",
    color: "bg-accent",
  },
  {
    value: "sales",
    label: "Representante Comercial",
    color: "bg-primary",
  },
  {
    value: "backoffice",
    label: "Backoffice",
    color: "bg-[hsl(var(--tertiary))]",
  },
  {
    value: "warehouse",
    label: "Estoque",
    color: "bg-[hsl(var(--success))]",
  },
  {
    value: "support",
    label: "Suporte",
    color: "bg-[hsl(var(--warning))]",
  },
];

export function AcoesMassaBar({
  selectedCount,
  onClearSelection,
  onAdicionarPermissao,
  onRemoverPermissao,
}: AcoesMassaBarProps) {
  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5"
      style={{ marginLeft: 'calc(var(--sidebar-width) / 2)' }}
    >
      {/* Contador de selecionados */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="text-sm px-3 py-1">
          {selectedCount} {selectedCount === 1 ? "usuário selecionado" : "usuários selecionados"}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Adicionar Permissão */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Adicionar:</span>
        <Select onValueChange={(value) => onAdicionarPermissao(value as AppRole)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Selecionar role..." />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${role.color}`} />
                  <span>{role.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Remover Permissão */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Remover:</span>
        <Select onValueChange={(value) => onRemoverPermissao(value as AppRole)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Selecionar role..." />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${role.color}`} />
                  <span>{role.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
