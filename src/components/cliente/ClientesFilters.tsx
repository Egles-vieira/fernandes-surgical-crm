import { Filter, Building2, DollarSign, Calendar, SlidersHorizontal, Search, LayoutGrid, List, Plus, Upload, ChevronDown, FileSearch } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  view: "card" | "grid";
  onViewChange: (view: "card" | "grid") => void;
  onFilterChange?: (filters: FilterValues) => void;
  onNovoCliente: () => void;
  onImportarCSV: () => void;
  onCadastrarViaCNPJ?: () => void;
}

interface FilterValues {
  atividade?: string;
  limiteCredito?: string;
  status?: string;
  periodo?: string;
  ordenacao?: string;
}

export function ClientesFilters({ searchTerm, onSearchChange, view, onViewChange, onFilterChange, onNovoCliente, onImportarCSV, onCadastrarViaCNPJ }: ClientesFiltersProps) {
  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    if (onFilterChange) {
      onFilterChange({ [key]: value });
    }
  };

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 py-3 px-8 border-b bg-card shadow-sm -mx-8 -mt-8 mb-6">
      {/* Toggle de visualização Card/Grid */}
      <ToggleGroup type="single" value={view} onValueChange={(value) => value && onViewChange(value as "card" | "grid")} className="border rounded-md">
        <ToggleGroupItem value="card" aria-label="Visualização Cards" className="px-3">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" aria-label="Visualização Grid" className="px-3">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="h-6 w-px bg-border" />

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Buscar por nome, CNPJ ou cidade..." 
          value={searchTerm} 
          onChange={(e) => onSearchChange(e.target.value)} 
          className="pl-10 h-9 bg-background"
        />
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Atividade/Segmento */}
      <Select defaultValue="todos" onValueChange={(value) => handleFilterChange("atividade", value)}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Atividade" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as atividades</SelectItem>
          <SelectItem value="comercio">Comércio</SelectItem>
          <SelectItem value="industria">Indústria</SelectItem>
          <SelectItem value="servicos">Serviços</SelectItem>
          <SelectItem value="saude">Saúde</SelectItem>
          <SelectItem value="educacao">Educação</SelectItem>
        </SelectContent>
      </Select>

      {/* Limite de Crédito */}
      <Select defaultValue="todos" onValueChange={(value) => handleFilterChange("limiteCredito", value)}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Limite de Crédito" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os limites</SelectItem>
          <SelectItem value="ate-10k">Até R$ 10.000</SelectItem>
          <SelectItem value="10k-50k">R$ 10.000 - R$ 50.000</SelectItem>
          <SelectItem value="50k-100k">R$ 50.000 - R$ 100.000</SelectItem>
          <SelectItem value="acima-100k">Acima de R$ 100.000</SelectItem>
          <SelectItem value="sem-limite">Sem limite</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select defaultValue="todos" onValueChange={(value) => handleFilterChange("status", value)}>
        <SelectTrigger className="w-[160px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="ativos">Ativos</SelectItem>
          <SelectItem value="inativos">Inativos</SelectItem>
          <SelectItem value="bloqueados">Bloqueados</SelectItem>
        </SelectContent>
      </Select>

      {/* Ordenação */}
      <Select defaultValue="nome" onValueChange={(value) => handleFilterChange("ordenacao", value)}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nome">Nome (A-Z)</SelectItem>
          <SelectItem value="nome-desc">Nome (Z-A)</SelectItem>
          <SelectItem value="limite-maior">Maior limite</SelectItem>
          <SelectItem value="limite-menor">Menor limite</SelectItem>
          <SelectItem value="recente">Mais recentes</SelectItem>
          <SelectItem value="antigo">Mais antigos</SelectItem>
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

      {/* Botão de Ações */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-9 bg-primary hover:bg-primary/90">
            Ações
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onCadastrarViaCNPJ && (
            <DropdownMenuItem onClick={onCadastrarViaCNPJ}>
              <FileSearch className="mr-2 h-4 w-4" />
              Cadastrar via CNPJ
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onImportarCSV}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNovoCliente}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
