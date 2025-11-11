import { Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEquipesFiltros } from "@/contexts/EquipesFiltrosContext";
import { useEquipes } from "@/hooks/useEquipes";
import { useVendedores } from "@/hooks/useVendedores";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function EquipesFiltrosBar() {
  const {
    filtros,
    setDataInicio,
    setDataFim,
    setEquipeId,
    setVendedorId,
    setCriterio,
    resetFiltros,
  } = useEquipesFiltros();

  const { equipes } = useEquipes();
  const { vendedores } = useVendedores();

  const equipesAtivas = equipes?.filter((e) => e.esta_ativa) || [];
  
  // Filtrar vendedores (sem filtro por equipe por enquanto, pois não temos a relação direta)
  const vendedoresFiltrados = vendedores;

  const temFiltrosAtivos = filtros.equipeId || filtros.vendedorId;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Período:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
              <Calendar className="mr-2 h-4 w-4" />
              {format(filtros.dataInicio, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={filtros.dataInicio}
              onSelect={(date) => date && setDataInicio(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">até</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal")}>
              <Calendar className="mr-2 h-4 w-4" />
              {format(filtros.dataFim, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={filtros.dataFim}
              onSelect={(date) => date && setDataFim(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Equipe:</span>
        <Select value={filtros.equipeId || "todas"} onValueChange={(v) => setEquipeId(v === "todas" ? undefined : v)}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Todas as equipes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as equipes</SelectItem>
            {equipesAtivas.map((equipe) => (
              <SelectItem key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Vendedor:</span>
        <Select
          value={filtros.vendedorId || "todos"}
          onValueChange={(v) => setVendedorId(v === "todos" ? undefined : v)}
          disabled={!vendedoresFiltrados.length}
        >
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Todos os vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os vendedores</SelectItem>
            {vendedoresFiltrados.map((vendedor) => (
              <SelectItem key={vendedor.id} value={vendedor.id}>
                {vendedor.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Critério:</span>
        <Select value={filtros.criterio} onValueChange={(v: any) => setCriterio(v)}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="valor">Valor</SelectItem>
            <SelectItem value="unidades">Unidades</SelectItem>
            <SelectItem value="margem">Margem</SelectItem>
            <SelectItem value="conversao">Conversão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {temFiltrosAtivos && (
        <>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={resetFiltros} className="h-9">
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        </>
      )}
    </div>
  );
}
