import { Search, Filter, Calendar, SlidersHorizontal, Plus } from "lucide-react";
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
import type { StatusSolicitacao } from "@/hooks/useSolicitacoesCadastro";

interface SolicitacoesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusSolicitacao | "todos";
  onStatusChange: (status: StatusSolicitacao | "todos") => void;
  onNovaSolicitacao: () => void;
}

export function SolicitacoesFilters({ 
  searchTerm, 
  onSearchChange, 
  statusFilter, 
  onStatusChange,
  onNovaSolicitacao 
}: SolicitacoesFiltersProps) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 py-2 px-8 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-8 -mt-8 mb-4">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Buscar por CNPJ ou razão social..." 
          value={searchTerm} 
          onChange={(e) => onSearchChange(e.target.value)} 
          className="pl-10 h-9 bg-background"
        />
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as StatusSolicitacao | "todos")}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="rascunho">Rascunho</SelectItem>
          <SelectItem value="em_analise">Em Análise</SelectItem>
          <SelectItem value="aprovado">Aprovado</SelectItem>
          <SelectItem value="rejeitado">Rejeitado</SelectItem>
        </SelectContent>
      </Select>

      {/* Ordenação */}
      <Select defaultValue="recente">
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recente">Mais recentes</SelectItem>
          <SelectItem value="antigo">Mais antigos</SelectItem>
          <SelectItem value="razao-social">Razão Social (A-Z)</SelectItem>
          <SelectItem value="razao-social-desc">Razão Social (Z-A)</SelectItem>
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

      {/* Botão Nova Solicitação */}
      <Button size="sm" className="h-9 bg-primary hover:bg-primary/90" onClick={onNovaSolicitacao}>
        <Plus className="h-4 w-4 mr-2" />
        Nova Solicitação
      </Button>
    </div>
  );
}
