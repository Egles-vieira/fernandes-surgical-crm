import { Search, Calendar, Building2, SlidersHorizontal, FileText, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  status?: string;
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
    <div className="sticky top-0 z-30 flex items-center gap-3 py-3 px-8 border-b bg-card shadow-sm -mx-8 -mt-8">
      {/* Busca */}
      <div className="relative w-[280px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por cliente, ID ou cidade..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-9 bg-background"
        />
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Plataforma */}
      <Select defaultValue="todos" onValueChange={(value) => handleFilterChange("plataforma", value)}>
        <SelectTrigger className="w-[200px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Plataforma" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as plataformas</SelectItem>
          <SelectItem value="bionexo">Bionexo</SelectItem>
          <SelectItem value="mercado_eletronico">Mercado Eletrônico</SelectItem>
          <SelectItem value="comprasnet">ComprasNet</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select defaultValue="todos" onValueChange={(value) => handleFilterChange("status", value)}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="nova">Nova</SelectItem>
          <SelectItem value="em_analise">Em Análise</SelectItem>
          <SelectItem value="respondida">Respondida</SelectItem>
          <SelectItem value="confirmada">Confirmada</SelectItem>
        </SelectContent>
      </Select>

      {/* Período */}
      <Select defaultValue="mes" onValueChange={(value) => handleFilterChange("periodo", value)}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Período" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hoje">Hoje</SelectItem>
          <SelectItem value="semana">Esta semana</SelectItem>
          <SelectItem value="mes">Este mês</SelectItem>
          <SelectItem value="trimestre">Este trimestre</SelectItem>
          <SelectItem value="ano">Este ano</SelectItem>
        </SelectContent>
      </Select>

      {/* Ordenação */}
      <Select defaultValue="recente" onValueChange={(value) => handleFilterChange("ordenacao", value)}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recente">Mais recentes</SelectItem>
          <SelectItem value="vencimento">Vencimento</SelectItem>
          <SelectItem value="cliente">Cliente</SelectItem>
          <SelectItem value="valor-maior">Maior valor</SelectItem>
          <SelectItem value="valor-menor">Menor valor</SelectItem>
        </SelectContent>
      </Select>

      {/* Botão de Filtros Avançados */}
      <Button variant="outline" size="sm" className="h-9 ml-auto">
        <SlidersHorizontal className="h-4 w-4 mr-2" />
        Filtros
        <Badge variant="secondary" className="ml-2">
          0
        </Badge>
      </Button>
    </div>
  );
}
