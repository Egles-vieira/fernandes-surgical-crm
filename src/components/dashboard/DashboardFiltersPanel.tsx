import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Minus, 
  Calendar as CalendarIcon, 
  Save, 
  X,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSection {
  id: string;
  label: string;
  type: "select" | "checkbox" | "date" | "range" | "text";
  options?: FilterOption[];
  icon?: React.ReactNode;
}

const filterSections: FilterSection[] = [
  {
    id: "periodo",
    label: "Período",
    type: "date",
    icon: <CalendarIcon className="h-4 w-4" />
  },
  {
    id: "vendedor",
    label: "Vendedor",
    type: "select",
    options: [
      { value: "todos", label: "Todos" },
      { value: "vendedor1", label: "Vendedor 1" },
      { value: "vendedor2", label: "Vendedor 2" },
    ]
  },
  {
    id: "equipe",
    label: "Equipe",
    type: "select",
    options: [
      { value: "todas", label: "Todas" },
      { value: "equipe1", label: "Equipe Comercial" },
      { value: "equipe2", label: "Equipe Interna" },
    ]
  },
  {
    id: "cliente",
    label: "Cliente",
    type: "text"
  },
  {
    id: "produto",
    label: "Produto",
    type: "text"
  },
  {
    id: "status_venda",
    label: "Status da Venda",
    type: "checkbox",
    options: [
      { value: "aberta", label: "Aberta" },
      { value: "fechada", label: "Fechada" },
      { value: "cancelada", label: "Cancelada" },
    ]
  },
  {
    id: "canal",
    label: "Canal de Venda",
    type: "select",
    options: [
      { value: "todos", label: "Todos" },
      { value: "whatsapp", label: "WhatsApp" },
      { value: "plataforma", label: "Plataforma EDI" },
      { value: "direto", label: "Venda Direta" },
    ]
  },
  {
    id: "range_valor",
    label: "Faixa de Valor",
    type: "range"
  },
  {
    id: "regiao",
    label: "Região",
    type: "select",
    options: [
      { value: "todas", label: "Todas" },
      { value: "sul", label: "Sul" },
      { value: "sudeste", label: "Sudeste" },
      { value: "nordeste", label: "Nordeste" },
      { value: "norte", label: "Norte" },
      { value: "centro-oeste", label: "Centro-Oeste" },
    ]
  },
  {
    id: "origem",
    label: "Origem do Lead",
    type: "select",
    options: [
      { value: "todas", label: "Todas" },
      { value: "indicacao", label: "Indicação" },
      { value: "site", label: "Site" },
      { value: "whatsapp", label: "WhatsApp" },
      { value: "licitacao", label: "Licitação" },
    ]
  },
];

const savedFiltersOptions = [
  { value: "filtros_salvos", label: "Filtros salvos" },
  { value: "vendas_mes", label: "Vendas do Mês" },
  { value: "top_clientes", label: "Top Clientes" },
  { value: "pipeline_ativo", label: "Pipeline Ativo" },
];

interface DashboardFiltersPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFiltersChange?: (filters: Record<string, any>) => void;
}

export function DashboardFiltersPanel({ 
  isCollapsed, 
  onToggleCollapse,
  onFiltersChange 
}: DashboardFiltersPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openSections, setOpenSections] = useState<string[]>(["periodo"]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedSavedFilter, setSelectedSavedFilter] = useState("filtros_salvos");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Debounce seria aplicado aqui em produção
      return newFilters;
    });
  }, []);

  const handleApplyFilters = () => {
    // Atualiza URL params para filtros persistentes
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "" && value !== "todos" && value !== "todas") {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.set(key, String(value));
        }
      }
    });
    setSearchParams(params);
    onFiltersChange?.(filters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setDateRange({});
    setSearchParams(new URLSearchParams());
    onFiltersChange?.({});
  };

  const handleSaveFilter = () => {
    // Implementar salvamento de filtro
    console.log("Salvando filtro:", filters);
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    v && v !== "" && v !== "todos" && v !== "todas" && 
    (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  if (isCollapsed) {
    return (
      <div className="w-12 bg-card border-r border-border/50 flex flex-col items-center py-4 gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="relative">
          <Filter className="h-5 w-5 text-muted-foreground" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-card border-r border-border/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <span className="font-semibold text-foreground">Filtro</span>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleCollapse}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Saved Filters */}
      <div className="p-4 border-b border-border/50 space-y-2">
        <span className="text-xs font-medium text-primary">Salvar Filtros</span>
        <Select value={selectedSavedFilter} onValueChange={setSelectedSavedFilter}>
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue placeholder="Filtros salvos" />
          </SelectTrigger>
          <SelectContent>
            {savedFiltersOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full"
          onClick={handleSaveFilter}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar esse filtro
        </Button>
      </div>

      {/* Filter Sections */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filterSections.map(section => (
            <Collapsible
              key={section.id}
              open={openSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  {section.icon}
                  <span className="text-sm font-medium">{section.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  {filters[section.id] && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateFilter(section.id, undefined);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {openSections.includes(section.id) ? (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="px-2 pb-2">
                {section.type === "select" && section.options && (
                  <Select 
                    value={filters[section.id] || ""} 
                    onValueChange={(value) => updateFilter(section.id, value)}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {section.options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {section.type === "checkbox" && section.options && (
                  <div className="space-y-2 pt-1">
                    {section.options.map(option => (
                      <div key={option.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${section.id}-${option.value}`}
                          checked={(filters[section.id] || []).includes(option.value)}
                          onCheckedChange={(checked) => {
                            const current = filters[section.id] || [];
                            const newValue = checked
                              ? [...current, option.value]
                              : current.filter((v: string) => v !== option.value);
                            updateFilter(section.id, newValue);
                          }}
                        />
                        <label 
                          htmlFor={`${section.id}-${option.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {section.type === "date" && (
                  <div className="space-y-2 pt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9 text-sm",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                                {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                              </>
                            ) : (
                              format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                            )
                          ) : (
                            "Selecionar período"
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => {
                            setDateRange({ from: range?.from, to: range?.to });
                            updateFilter(section.id, range);
                          }}
                          locale={ptBR}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {section.type === "text" && (
                  <Input
                    placeholder={`Buscar ${section.label.toLowerCase()}...`}
                    value={filters[section.id] || ""}
                    onChange={(e) => updateFilter(section.id, e.target.value)}
                    className="h-9 text-sm"
                  />
                )}

                {section.type === "range" && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters[`${section.id}_min`] || ""}
                      onChange={(e) => updateFilter(`${section.id}_min`, e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters[`${section.id}_max`] || ""}
                      onChange={(e) => updateFilter(`${section.id}_max`, e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <Button 
            variant="link" 
            size="sm" 
            className="text-primary p-0 h-auto"
            onClick={handleClearFilters}
          >
            Limpar tudo
          </Button>
          {activeFiltersCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""} ativo{activeFiltersCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button 
          className="w-full"
          onClick={handleApplyFilters}
        >
          Filtrar
        </Button>
      </div>
    </div>
  );
}
