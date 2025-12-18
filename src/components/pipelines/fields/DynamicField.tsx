import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PipelineCustomField, FieldOption } from "@/types/pipelines";
import { parseFieldOptions } from "@/hooks/pipelines/usePipelineFields";

interface DynamicFieldProps {
  field: PipelineCustomField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function DynamicField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  compact = false,
}: DynamicFieldProps) {
  const options = parseFieldOptions(field.opcoes);

  const renderField = () => {
    switch (field.tipo_campo) {
      case "texto":
        return (
          <Input
            id={field.nome_campo}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );

      case "numero":
        return (
          <Input
            id={field.nome_campo}
            type="number"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );

      case "moeda":
        return (
          <Input
            id={field.nome_campo}
            type="number"
            step="0.01"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.placeholder || "R$ 0,00"}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );

      case "percentual":
        return (
          <div className="relative">
            <Input
              id={field.nome_campo}
              type="number"
              min="0"
              max="100"
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="0"
              disabled={disabled}
              className={cn("pr-8", error && "border-destructive")}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
        );

      case "data":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={disabled}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                  error && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? (
                  format(typeof value === "string" ? parseISO(value) : value, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? (typeof value === "string" ? parseISO(value) : value) : undefined}
                onSelect={(date) => onChange(date?.toISOString().split("T")[0] || null)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        );

      case "datetime":
        return (
          <Input
            id={field.nome_campo}
            type="datetime-local"
            value={value ? value.slice(0, 16) : ""}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );

      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={cn(error && "border-destructive")}>
              <SelectValue placeholder={field.placeholder || "Selecione..."} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: FieldOption) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect":
        const selectedValues: string[] = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {options.map((opt: FieldOption) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, opt.value]);
                    } else {
                      onChange(selectedValues.filter((v) => v !== opt.value));
                    }
                  }}
                  disabled={disabled}
                  className="rounded border-input"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch
              id={field.nome_campo}
              checked={!!value}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">
              {value ? "Sim" : "Não"}
            </span>
          </div>
        );

      case "textarea":
        return (
          <Textarea
            id={field.nome_campo}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            disabled={disabled}
            rows={compact ? 2 : 4}
            className={cn(error && "border-destructive")}
          />
        );

      case "url":
        return (
          <Input
            id={field.nome_campo}
            type="url"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "https://"}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );

      case "email":
        return (
          <Input
            id={field.nome_campo}
            type="email"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "email@exemplo.com"}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );

      case "telefone":
        return (
          <Input
            id={field.nome_campo}
            type="tel"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "(00) 00000-0000"}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );

      default:
        return (
          <Input
            id={field.nome_campo}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(error && "border-destructive")}
          />
        );
    }
  };

  if (compact) {
    return (
      <div className="space-y-1">
        <Label
          htmlFor={field.nome_campo}
          className={cn(
            "text-xs font-medium",
            field.obrigatorio && "after:content-['*'] after:ml-0.5 after:text-destructive"
          )}
        >
          {field.label}
        </Label>
        {renderField()}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label
        htmlFor={field.nome_campo}
        className={cn(
          field.obrigatorio && "after:content-['*'] after:ml-0.5 after:text-destructive"
        )}
      >
        {field.label}
      </Label>
      {renderField()}
      {field.descricao && (
        <p className="text-xs text-muted-foreground">{field.descricao}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
