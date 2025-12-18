import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { useCreateOportunidade } from "@/hooks/pipelines/useOportunidades";
import { useEstagiosPipeline } from "@/hooks/pipelines/usePipelines";

const quickSchema = z.object({
  nome_oportunidade: z.string().min(1, "Nome obrigatório"),
  valor: z.number().min(0).nullable().optional(),
});

type QuickFormData = z.infer<typeof quickSchema>;

interface QuickOportunidadeFormProps {
  pipelineId: string;
  estagioId?: string;
  onSuccess?: () => void;
  placeholder?: string;
  showValue?: boolean;
}

export function QuickOportunidadeForm({
  pipelineId,
  estagioId,
  onSuccess,
  placeholder = "Nova oportunidade...",
  showValue = false,
}: QuickOportunidadeFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: estagios } = useEstagiosPipeline(pipelineId);
  const createMutation = useCreateOportunidade();

  // Usar estágio fornecido ou primeiro estágio do pipeline
  const targetEstagioId = estagioId || estagios?.[0]?.id;

  const form = useForm<QuickFormData>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      nome_oportunidade: "",
      valor: null,
    },
  });

  const handleSubmit = async (data: QuickFormData) => {
    if (!targetEstagioId) return;

    try {
      await createMutation.mutateAsync({
        nome_oportunidade: data.nome_oportunidade,
        pipeline_id: pipelineId,
        estagio_id: targetEstagioId,
        valor: data.valor ?? undefined,
      } as any);
      
      form.reset();
      setIsExpanded(false);
      onSuccess?.();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar oportunidade
      </Button>
    );
  }

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(handleSubmit)} 
        className="space-y-2 p-2 border rounded-md bg-background"
      >
        <FormField
          control={form.control}
          name="nome_oportunidade"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder={placeholder}
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showValue && (
          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Valor (opcional)"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              form.reset();
              setIsExpanded(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Criar"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
