import { Search, Calendar, Building2, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CotacoesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: FilterValues) => void;
}

interface FilterValues {
  plataforma?: string;
  periodo?: string;
  ordenacao?: string;
}

export function CotacoesFilters({
  searchTerm,
  onSearchChange,
  onFiltersChange,
}: CotacoesFiltersProps) {
  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    onFiltersChange({ [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por cliente, ID ou cidade..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select onValueChange={(value) => handleFilterChange("plataforma", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="bionexo">Bionexo</SelectItem>
            <SelectItem value="mercado_eletronico">Mercado Eletrônico</SelectItem>
            <SelectItem value="comprasnet">ComprasNet</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => handleFilterChange("periodo", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mês</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => handleFilterChange("ordenacao", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recente">Mais Recentes</SelectItem>
            <SelectItem value="vencimento">Vencimento</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="valor">Valor</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
