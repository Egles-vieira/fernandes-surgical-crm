import { useMemo } from "react";
import { PipelineCustomField } from "@/types/pipelines";
import { DynamicField } from "./DynamicField";
import { cn } from "@/lib/utils";

interface DynamicFieldGroupProps {
  fields: PipelineCustomField[];
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  compact?: boolean;
  showGroups?: boolean;
  columns?: 1 | 2 | 3;
}

interface GroupedFields {
  [grupo: string]: PipelineCustomField[];
}

export function DynamicFieldGroup({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
  compact = false,
  showGroups = true,
  columns = 2,
}: DynamicFieldGroupProps) {
  const groupedFields = useMemo(() => {
    if (!showGroups) {
      return { "": fields };
    }

    return fields.reduce<GroupedFields>((acc, field) => {
      const grupo = field.grupo || "Outros";
      if (!acc[grupo]) {
        acc[grupo] = [];
      }
      acc[grupo].push(field);
      return acc;
    }, {});
  }, [fields, showGroups]);

  const gridClass = useMemo(() => {
    switch (columns) {
      case 1:
        return "grid-cols-1";
      case 3:
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      default:
        return "grid-cols-1 md:grid-cols-2";
    }
  }, [columns]);

  const getFieldWidth = (field: PipelineCustomField) => {
    if (field.largura === "full") return "col-span-full";
    if (field.largura === "half") return "col-span-1";
    // Campos textarea e multiselect ocupam largura total por padrão
    if (field.tipo_campo === "textarea" || field.tipo_campo === "multiselect") {
      return "col-span-full";
    }
    return "col-span-1";
  };

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedFields).map(([grupo, grupoFields]) => (
        <div key={grupo} className="space-y-4">
          {showGroups && grupo && grupo !== "" && (
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
              {grupo}
            </h4>
          )}
          <div className={cn("grid gap-4", gridClass)}>
            {grupoFields.map((field) => (
              <div key={field.id} className={getFieldWidth(field)}>
                <DynamicField
                  field={field}
                  value={values[field.nome_campo]}
                  onChange={(value) => onChange(field.nome_campo, value)}
                  error={errors[field.nome_campo]}
                  disabled={disabled}
                  compact={compact}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
