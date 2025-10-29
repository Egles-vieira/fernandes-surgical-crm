import { Filter, Users, BarChart3, Calendar, SlidersHorizontal, Kanban, List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface VendasFiltersProps {
  view: "pipeline" | "list";
  onViewChange: (view: "pipeline" | "list") => void;
  onFilterChange?: (filters: FilterValues) => void;
}

interface FilterValues {
  pipeline?: string;
  responsavel?: string;
  status?: string;
  periodo?: string;
  ordenacao?: string;
}

export function VendasFilters({ view, onViewChange, onFilterChange }: VendasFiltersProps) {
  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    if (onFilterChange) {
      onFilterChange({ [key]: value });
    }
  };

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 py-3 px-8 border-b bg-card shadow-sm -mx-8">
      {/* Toggle de visualização Pipeline/Lista */}
      <ToggleGroup type="single" value={view} onValueChange={(value) => value && onViewChange(value as "pipeline" | "list")} className="border rounded-md">
        <ToggleGroupItem value="pipeline" aria-label="Visualização Pipeline" className="px-3">
          <Kanban className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="Visualização Lista" className="px-3">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="h-6 w-px bg-border" />
      {/* Funil de Vendas */}
      <Select defaultValue="todos" onValueChange={(value) => handleFilterChange("pipeline", value)}>
        <SelectTrigger className="w-[200px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Funil de Vendas" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os funis</SelectItem>
          <SelectItem value="closer">Funil de Vendas (Closer)</SelectItem>
          <SelectItem value="enterprise">Funil Enterprise</SelectItem>
          <SelectItem value="inbound">Funil Inbound</SelectItem>
          <SelectItem value="outbound">Funil Outbound</SelectItem>
        </SelectContent>
      </Select>

      {/* Responsável */}
      <Select defaultValue="todos" onValueChange={(value) => handleFilterChange("responsavel", value)}>
        <SelectTrigger className="w-[200px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Responsável" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os responsáveis</SelectItem>
          <SelectItem value="eu">Minhas oportunidades</SelectItem>
          <SelectItem value="equipe">Minha equipe</SelectItem>
          <SelectItem value="sem">Sem responsável</SelectItem>
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
          <SelectItem value="rascunho">Rascunho</SelectItem>
          <SelectItem value="aprovada">Aprovada</SelectItem>
          <SelectItem value="enviada">Enviada</SelectItem>
          <SelectItem value="ganha">Ganha</SelectItem>
          <SelectItem value="perdida">Perdida</SelectItem>
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
          <SelectItem value="customizado">Período customizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Ordenação */}
      <Select defaultValue="recente" onValueChange={(value) => handleFilterChange("ordenacao", value)}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recente">Criadas por último</SelectItem>
          <SelectItem value="antiga">Mais antigas</SelectItem>
          <SelectItem value="valor-maior">Maior valor</SelectItem>
          <SelectItem value="valor-menor">Menor valor</SelectItem>
          <SelectItem value="vencimento">Data de vencimento</SelectItem>
          <SelectItem value="probabilidade">Probabilidade</SelectItem>
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
