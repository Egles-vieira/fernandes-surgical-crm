import { usePipelines } from "@/hooks/pipelines/usePipelines";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineSelectorProps {
  value: string | null;
  onChange: (pipelineId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function PipelineSelector({
  value,
  onChange,
  label = "Pipeline",
  placeholder = "Selecione um pipeline",
  disabled = false,
  className,
  showLabel = true,
}: PipelineSelectorProps) {
  const { data: pipelines, isLoading } = usePipelines({ apenasAtivos: true });

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && <Label>{label}</Label>}
        <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && <Label>{label}</Label>}
      <Select 
        value={value || ""} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {pipelines?.map((pipeline) => (
            <SelectItem key={pipeline.id} value={pipeline.id}>
              <div className="flex items-center gap-2">
                {pipeline.cor && (
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: pipeline.cor }}
                  />
                )}
                <span>{pipeline.nome}</span>
                {pipeline.descricao && (
                  <span className="text-muted-foreground text-xs ml-2">
                    {pipeline.descricao}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
