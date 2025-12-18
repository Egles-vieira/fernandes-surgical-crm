// ============================================
// Toolbar de Filtros para Lista de Conversas
// ============================================

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CaixaFilaSelector } from './CaixaFilaSelector';
import { SetorSelector } from './SetorSelector';
import { CanalContaSelector } from './CanalContaSelector';
import { OrdenacaoSelector } from './OrdenacaoSelector';
import type { 
  CaixaTipo, 
  OrdenacaoTipo, 
  Contadores, 
  Setor, 
  Conta 
} from '@/hooks/useConversationFilters';

interface ConversationFiltersProps {
  // Filtros
  caixa: CaixaTipo;
  setorId: string | null;
  canalTipo: string;
  contaId: string | null;
  searchTerm: string;
  ordenacao: OrdenacaoTipo;
  
  // Setters
  onCaixaChange: (value: CaixaTipo) => void;
  onSetorChange: (value: string | null) => void;
  onCanalChange: (value: string) => void;
  onContaChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  onOrdenacaoChange: (value: OrdenacaoTipo) => void;
  
  // Dados
  contadores: Contadores | null;
  setores: Setor[];
  contas: Conta[];
  
  // Loading states
  isLoadingContadores?: boolean;
  isLoadingSetores?: boolean;
  isLoadingContas?: boolean;
}

export function ConversationFilters({
  caixa,
  setorId,
  canalTipo,
  contaId,
  searchTerm,
  ordenacao,
  onCaixaChange,
  onSetorChange,
  onCanalChange,
  onContaChange,
  onSearchChange,
  onOrdenacaoChange,
  contadores,
  setores,
  contas,
  isLoadingContadores,
  isLoadingSetores,
  isLoadingContas,
}: ConversationFiltersProps) {
  return (
    <div className="space-y-2 p-3 border-b bg-card">
      {/* Linha 1: Setor + Canal/Conta + Caixa/Fila */}
      <div className="flex items-center gap-2 flex-wrap">
        <SetorSelector
          value={setorId}
          onChange={onSetorChange}
          setores={setores}
          isLoading={isLoadingSetores}
        />
        
        <CanalContaSelector
          canalTipo={canalTipo}
          contaId={contaId}
          onCanalChange={onCanalChange}
          onContaChange={onContaChange}
          contas={contas}
          isLoading={isLoadingContas}
        />
        
        <CaixaFilaSelector
          value={caixa}
          onChange={onCaixaChange}
          contadores={contadores}
          isLoading={isLoadingContadores}
        />
      </div>

      {/* Linha 2: Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input 
          placeholder="Buscar..." 
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Linha 3: Ordenação */}
      <div className="flex items-center justify-end">
        <OrdenacaoSelector
          value={ordenacao}
          onChange={onOrdenacaoChange}
        />
      </div>
    </div>
  );
}
