import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, RefreshCw, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface AcoesRapidasBarProps {
  onNovaMeta: () => void;
  onExportarExcel: () => void;
  onExportarPDF: () => void;
  onAtualizar: () => void;
  isLoading?: boolean;
}

export function AcoesRapidasBar({
  onNovaMeta,
  onExportarExcel,
  onExportarPDF,
  onAtualizar,
  isLoading = false,
}: AcoesRapidasBarProps) {
  const { toast } = useToast();

  return (
    <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
      <Button
        onClick={onNovaMeta}
        size="sm"
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Nova Meta
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportarExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar para Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportarPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar para PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        onClick={onAtualizar}
        variant="ghost"
        size="sm"
        disabled={isLoading}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        Atualizar
      </Button>
    </div>
  );
}
