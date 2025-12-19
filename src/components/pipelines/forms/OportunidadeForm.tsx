import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

import { DynamicFieldGroup } from "../fields/DynamicFieldGroup";
import { SpotFieldsSection } from "../details/SpotFieldsSection";
import { usePipelineFields } from "@/hooks/pipelines/usePipelineFields";
import { useEstagiosPipeline, usePipeline } from "@/hooks/pipelines/usePipelines";
import { 
  Oportunidade, 
  OportunidadeInsert, 
  OportunidadeUpdate,
  EstagioPipeline 
} from "@/types/pipelines";
import { validateAllFields } from "@/hooks/pipelines/usePipelineFields";

// Schema base para campos fixos
const baseSchema = z.object({
  nome_oportunidade: z.string().min(1, "Nome da oportunidade é obrigatório"),
  valor: z.number().min(0, "Valor deve ser positivo").nullable().optional(),
  data_fechamento: z.string().nullable().optional(),
  estagio_id: z.string().min(1, "Estágio é obrigatório"),
  conta_id: z.string().nullable().optional(),
  contato_id: z.string().nullable().optional(),
  proprietario_id: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

type BaseFormData = z.infer<typeof baseSchema>;

interface OportunidadeFormProps {
  pipelineId: string;
  oportunidade?: Oportunidade | null;
  onSubmit: (data: OportunidadeInsert | OportunidadeUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
  contaId?: string | null;
  contatoId?: string | null;
}

export function OportunidadeForm({
  pipelineId,
  oportunidade,
  onSubmit,
  onCancel,
  isLoading = false,
  contaId,
  contatoId,
}: OportunidadeFormProps) {
  const isEditing = !!oportunidade;
  
  // Buscar estágios do pipeline
  const { data: estagios, isLoading: loadingEstagios } = useEstagiosPipeline(pipelineId);
  
  // Buscar dados do pipeline para verificar se é Spot
  const { data: pipeline } = usePipeline(pipelineId);
  const isSpotPipeline = pipeline?.nome === "Spot";
  
  // Buscar campos customizados do pipeline
  const { data: customFields, isLoading: loadingFields } = usePipelineFields({ 
    pipelineId 
  });

  // Estado para campos customizados
  const [camposCustomizados, setCamposCustomizados] = useState<Record<string, any>>(
    (oportunidade?.campos_customizados as Record<string, any>) || {}
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Primeiro estágio (para novas oportunidades)
  const primeiroEstagio = useMemo(() => {
    if (!estagios?.length) return null;
    return estagios.reduce((min, e) => 
      e.ordem_estagio < min.ordem_estagio ? e : min
    , estagios[0]);
  }, [estagios]);

  // Form setup
  const form = useForm<BaseFormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      nome_oportunidade: oportunidade?.nome_oportunidade || "",
      valor: oportunidade?.valor ?? null,
      data_fechamento: oportunidade?.data_fechamento_prevista || null,
      estagio_id: oportunidade?.estagio_id || "",
      conta_id: oportunidade?.conta_id || contaId || null,
      contato_id: oportunidade?.contato_id || contatoId || null,
      proprietario_id: oportunidade?.proprietario_id || null,
      observacoes: oportunidade?.observacoes || null,
    },
  });

  // Definir estágio inicial quando carregar
  useEffect(() => {
    if (!isEditing && primeiroEstagio && !form.getValues("estagio_id")) {
      form.setValue("estagio_id", primeiroEstagio.id);
    }
  }, [primeiroEstagio, isEditing, form]);

  // Atualizar campos customizados quando oportunidade mudar
  useEffect(() => {
    if (oportunidade?.campos_customizados) {
      setCamposCustomizados(oportunidade.campos_customizados as Record<string, any>);
    }
  }, [oportunidade]);

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCamposCustomizados((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Limpar erro quando campo é alterado
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleSubmit = (data: BaseFormData) => {
    // Validar campos customizados obrigatórios
    if (customFields?.length) {
      const validation = validateAllFields(customFields, camposCustomizados);
      if (!validation.valido) {
        setFieldErrors(validation.erros);
        return;
      }
    }

    const submitData = {
      nome_oportunidade: data.nome_oportunidade,
      pipeline_id: pipelineId,
      estagio_id: data.estagio_id,
      valor: data.valor,
      data_fechamento_prevista: data.data_fechamento,
      conta_id: data.conta_id,
      contato_id: data.contato_id,
      proprietario_id: data.proprietario_id,
      observacoes: data.observacoes,
      campos_customizados: Object.keys(camposCustomizados).length > 0 
        ? camposCustomizados 
        : null,
    };

    onSubmit(submitData);
  };

  if (loadingEstagios || loadingFields) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Campos Fixos */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
            Informações Básicas
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome da Oportunidade */}
            <FormField
              control={form.control}
              name="nome_oportunidade"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Nome da Oportunidade *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Projeto de implementação" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor */}
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Estimado</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="R$ 0,00"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data de Fechamento */}
            <FormField
              control={form.control}
              name="data_fechamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previsão de Fechamento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            "Selecione uma data"
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString().split("T")[0] || null)}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estágio */}
            <FormField
              control={form.control}
              name="estagio_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estágio *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estágio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {estagios?.map((estagio) => (
                        <SelectItem key={estagio.id} value={estagio.id}>
                          <div className="flex items-center gap-2">
                            {estagio.cor && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: estagio.cor }}
                              />
                            )}
                            {estagio.nome_estagio}
                            {estagio.percentual_probabilidade !== null && (
                              <span className="text-muted-foreground text-xs">
                                ({estagio.percentual_probabilidade}%)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionais sobre esta oportunidade..."
                      rows={3}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Campos específicos do Pipeline Spot */}
        {isSpotPipeline && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
              Dados do Pedido
            </h4>
            <SpotFieldsSection 
              camposCustomizados={camposCustomizados} 
              onChange={handleCustomFieldChange} 
            />
          </div>
        )}

        {/* Campos Customizados do Pipeline */}
        {customFields && customFields.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
              Campos Específicos
            </h4>
            <DynamicFieldGroup
              fields={customFields}
              values={camposCustomizados}
              onChange={handleCustomFieldChange}
              errors={fieldErrors}
              showGroups={true}
              columns={2}
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar Alterações" : "Criar Oportunidade"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
