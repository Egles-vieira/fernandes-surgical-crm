import { Search, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlataformasFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: "card" | "grid";
  onViewModeChange: (mode: "card" | "grid") => void;
  onFiltersChange: (filters: FilterValues) => void;
}

interface FilterValues {
  categoria?: string;
  status?: string;
  ordenacao?: string;
}

export function PlataformasFilters({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onFiltersChange,
}: PlataformasFiltersProps) {
  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    onFiltersChange({ [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="icon"
            onClick={() => onViewModeChange("card")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => onViewModeChange("grid")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select onValueChange={(value) => handleFilterChange("categoria", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="cotacoes">Cotações</SelectItem>
            <SelectItem value="pedidos">Pedidos</SelectItem>
            <SelectItem value="analytics">Analytics</SelectItem>
            <SelectItem value="config">Configurações</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => handleFilterChange("status", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => handleFilterChange("ordenacao", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="acessos">Mais acessados</SelectItem>
            <SelectItem value="recentes">Recentes</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
