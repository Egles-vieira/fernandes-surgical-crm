import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PeriodOption = {
  label: string;
  value: string;
  getRange: () => { from: Date; to: Date };
};

const periodOptions: PeriodOption[] = [
  {
    label: "Hoje",
    value: "today",
    getRange: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: "Últimos 7 dias",
    value: "last7days",
    getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: "Últimos 30 dias",
    value: "last30days",
    getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: "Este mês",
    value: "thisMonth",
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: "Mês passado",
    value: "lastMonth",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
  {
    label: "Este trimestre",
    value: "thisQuarter",
    getRange: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }),
  },
  {
    label: "Este ano",
    value: "thisYear",
    getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }),
  },
];

interface DashboardFiltersProps {
  onDateRangeChange?: (from: Date, to: Date) => void;
  onRefresh?: () => void;
}

export function DashboardFilters({ onDateRangeChange, onRefresh }: DashboardFiltersProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last30days");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isCustom, setIsCustom] = useState(false);

  const handlePeriodSelect = (option: PeriodOption) => {
    setSelectedPeriod(option.value);
    setIsCustom(false);
    const range = option.getRange();
    setDateRange(range);
    onDateRangeChange?.(range.from, range.to);
  };

  const handleCustomDateSelect = (date: Date | undefined, type: "from" | "to") => {
    if (!date) return;
    
    const newRange = { ...dateRange, [type]: date };
    setDateRange(newRange);
    setIsCustom(true);
    setSelectedPeriod("custom");
    
    if (newRange.from && newRange.to) {
      onDateRangeChange?.(newRange.from, newRange.to);
    }
  };

  const selectedLabel = isCustom 
    ? "Personalizado" 
    : periodOptions.find(p => p.value === selectedPeriod)?.label || "Selecionar período";

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card border border-border/30 rounded-lg shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[160px] justify-between">
              <span className="text-sm">{selectedLabel}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px] bg-popover z-50">
            {periodOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePeriodSelect(option)}
                className={cn(
                  "cursor-pointer",
                  selectedPeriod === option.value && !isCustom && "bg-accent"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Pickers */}
        <div className="flex items-center gap-2">
          {/* From Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Data início</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => handleCustomDateSelect(date, "from")}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">até</span>

          {/* To Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? (
                  format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Data fim</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => handleCustomDateSelect(date, "to")}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={ptBR}
                disabled={(date) => date < dateRange.from}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        className="shrink-0"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}
