import { Search, Filter, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AppRole } from "@/hooks/useRoles";
import { CriarUsuarioSheet } from "./CriarUsuarioSheet";

interface UsuariosFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: AppRole | "todos";
  onRoleChange: (role: AppRole | "todos") => void;
  totalUsuarios: number;
}

export function UsuariosFilters({ 
  searchTerm, 
  onSearchChange, 
  roleFilter, 
  onRoleChange,
  totalUsuarios
}: UsuariosFiltersProps) {
  return (
    <div className="fixed top-16 left-0 right-0 z-30 flex items-center gap-3 py-3 px-6 border-b bg-card shadow-sm" style={{ marginLeft: 'var(--sidebar-width)' }}>
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Buscar por email ou nome..." 
          value={searchTerm} 
          onChange={(e) => onSearchChange(e.target.value)} 
          className="pl-10 h-9 bg-background"
        />
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Role Filter */}
      <Select value={roleFilter} onValueChange={(value) => onRoleChange(value as AppRole | "todos")}>
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Permissão" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas as permissões</SelectItem>
          <SelectItem value="admin">Administrador</SelectItem>
          <SelectItem value="lider">Líder de Equipe</SelectItem>
          <SelectItem value="manager">Gerente</SelectItem>
          <SelectItem value="sales">Vendedor</SelectItem>
          <SelectItem value="backoffice">Backoffice</SelectItem>
          <SelectItem value="warehouse">Estoque</SelectItem>
          <SelectItem value="support">Suporte</SelectItem>
        </SelectContent>
      </Select>

      {/* Ordenação */}
      <Select defaultValue="email-asc">
        <SelectTrigger className="w-[180px] h-9 bg-background">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="email-asc">Email (A-Z)</SelectItem>
          <SelectItem value="email-desc">Email (Z-A)</SelectItem>
          <SelectItem value="recente">Mais recentes</SelectItem>
          <SelectItem value="antigo">Mais antigos</SelectItem>
        </SelectContent>
      </Select>

      {/* Badge Total */}
      <Badge variant="secondary" className="h-9 px-4 ml-auto">
        {totalUsuarios}
      </Badge>

      {/* Botão Criar Usuário */}
      <CriarUsuarioSheet />
    </div>
  );
}
