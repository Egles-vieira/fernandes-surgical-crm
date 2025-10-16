import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const oportunidadeSchema = z.object({
  nome_oportunidade: z.string().min(1, "Nome obrigatório"),
  valor: z.number().min(0, "Valor deve ser positivo").optional(),
  data_fechamento: z.date().optional(),
  descricao: z.string().optional(),
  tipo: z.string().optional(),
  origem_lead: z.string().optional(),
});

type OportunidadeInput = z.infer<typeof oportunidadeSchema>;

interface NovaOportunidadeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  contaId: string | null;
}

export default function NovaOportunidadeDialog({ 
  open, 
  onOpenChange, 
  clienteId, 
  contaId 
}: NovaOportunidadeDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataFechamento, setDataFechamento] = useState<Date>();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<OportunidadeInput>({
    resolver: zodResolver(oportunidadeSchema),
  });

  // Buscar pipelines e estágios
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipelines")
        .select(`
          id,
          nome,
          estagios:estagios_pipeline(
            id,
            nome_estagio,
            ordem_estagio,
            percentual_probabilidade
          )
        `)
        .eq("esta_ativo", true)
        .order("ordem_exibicao");

      if (error) throw error;
      return data;
    },
  });

  const primeiroEstagio = pipelines?.[0]?.estagios?.sort((a: any, b: any) => 
    a.ordem_estagio - b.ordem_estagio
  )[0];

  const createOportunidade = useMutation({
    mutationFn: async (data: OportunidadeInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: novaOportunidade, error } = await supabase
        .from("oportunidades")
        .insert([{
          nome_oportunidade: data.nome_oportunidade,
          valor: data.valor || null,
          data_fechamento: data.data_fechamento ? data.data_fechamento.toISOString().split('T')[0] : null,
          descricao: data.descricao || null,
          tipo: data.tipo || null,
          origem_lead: data.origem_lead || null,
          conta_id: contaId,
          pipeline_id: pipelines?.[0]?.id || null,
          estagio_id: primeiroEstagio?.id || null,
          percentual_probabilidade: primeiroEstagio?.percentual_probabilidade || 10,
          proprietario_id: userData.user?.id,
          esta_fechada: false,
          foi_ganha: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return novaOportunidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades-cliente", clienteId] });
      toast({
        title: "Oportunidade criada!",
        description: "A oportunidade foi adicionada com sucesso.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar oportunidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: OportunidadeInput) => {
    setIsSubmitting(true);
    try {
      await createOportunidade.mutateAsync({
        ...data,
        data_fechamento: dataFechamento,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="nome_oportunidade">Nome da Oportunidade *</Label>
              <Input
                id="nome_oportunidade"
                {...register("nome_oportunidade")}
                placeholder="Nova Venda - Produtos X"
              />
              {errors.nome_oportunidade && (
                <p className="text-sm text-destructive mt-1">{errors.nome_oportunidade.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="valor">Valor Estimado (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                {...register("valor", { valueAsNumber: true })}
                placeholder="0,00"
              />
              {errors.valor && (
                <p className="text-sm text-destructive mt-1">{errors.valor.message}</p>
              )}
            </div>

            <div>
              <Label>Data de Fechamento Prevista</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFechamento ? (
                      format(dataFechamento, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFechamento}
                    onSelect={setDataFechamento}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select onValueChange={(value) => setValue("tipo", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova_venda">Nova Venda</SelectItem>
                  <SelectItem value="upsell">Upsell</SelectItem>
                  <SelectItem value="renovacao">Renovação</SelectItem>
                  <SelectItem value="cross_sell">Cross-sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="origem_lead">Origem</Label>
              <Select onValueChange={(value) => setValue("origem_lead", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Detalhes sobre a oportunidade..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Criar Oportunidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
