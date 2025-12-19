import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTiposPedido } from "@/hooks/useTiposPedido";
import { useCondicoesPagamento } from "@/hooks/useCondicoesPagamento";
import { useTiposFrete } from "@/hooks/useTiposFrete";

interface SpotFieldsSectionProps {
  camposCustomizados: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export function SpotFieldsSection({ 
  camposCustomizados, 
  onChange 
}: SpotFieldsSectionProps) {
  const { tipos: tiposPedido, isLoading: isLoadingTipos } = useTiposPedido();
  const { condicoes, isLoading: isLoadingCondicoes } = useCondicoesPagamento();
  const { tipos: tiposFrete, isLoading: isLoadingFrete } = useTiposFrete();

  const tipoPedidoId = camposCustomizados?.tipo_pedido_id as string | undefined;
  const condicaoPagamentoId = camposCustomizados?.condicao_pagamento_id as string | undefined;
  const faturamentoProgramado = camposCustomizados?.faturamento_programado as string | undefined;
  const tipoFreteId = camposCustomizados?.tipo_frete_id as string | undefined;
  const faturamentoParcial = camposCustomizados?.faturamento_parcial as boolean | undefined;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Dados do Pedido</h3>
      
      {/* Tipo de Pedido */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Tipo de Pedido</Label>
        <Select
          value={tipoPedidoId || ""}
          onValueChange={(value) => onChange("tipo_pedido_id", value || null)}
          disabled={isLoadingTipos}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {tiposPedido.map((tipo) => (
              <SelectItem key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Condição de Pagamento */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Condição de Pagamento</Label>
        <Select
          value={condicaoPagamentoId || ""}
          onValueChange={(value) => onChange("condicao_pagamento_id", value || null)}
          disabled={isLoadingCondicoes}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {condicoes.map((condicao) => (
              <SelectItem key={condicao.id} value={condicao.id}>
                {condicao.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Faturamento Programado */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Faturamento Programado</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal bg-background",
                !faturamentoProgramado && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {faturamentoProgramado 
                ? format(parseISO(faturamentoProgramado), "dd/MM/yyyy", { locale: ptBR })
                : "Selecione uma data..."
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover" align="start">
            <Calendar
              mode="single"
              selected={faturamentoProgramado ? parseISO(faturamentoProgramado) : undefined}
              onSelect={(date) => onChange("faturamento_programado", date ? format(date, "yyyy-MM-dd") : null)}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Tipo de Frete */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Tipo de Frete</Label>
        <Select
          value={tipoFreteId || ""}
          onValueChange={(value) => onChange("tipo_frete_id", value || null)}
          disabled={isLoadingFrete}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {tiposFrete.map((tipo) => (
              <SelectItem key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Faturamento Parcial */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Faturamento Parcial</Label>
        <Switch
          checked={faturamentoParcial || false}
          onCheckedChange={(checked) => onChange("faturamento_parcial", checked)}
        />
      </div>
    </div>
  );
}
