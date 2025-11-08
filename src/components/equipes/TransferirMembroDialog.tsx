import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  equipe_destino_id: z.string().min(1, "Selecione a equipe de destino"),
  manter_papel: z.boolean(),
  novo_papel: z.string().optional(),
  motivo: z.string().min(3, "Descreva o motivo da transferência"),
});

type FormData = z.infer<typeof formSchema>;

interface TransferirMembroDialogProps {
  membro: any;
  equipeAtual: any;
  equipesDisponiveis: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => Promise<void>;
}

export function TransferirMembroDialog({
  membro,
  equipeAtual,
  equipesDisponiveis,
  open,
  onOpenChange,
  onSubmit,
}: TransferirMembroDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipe_destino_id: "",
      manter_papel: true,
      novo_papel: "",
      motivo: "",
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Erro ao transferir membro:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const manterPapel = form.watch("manter_papel");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle>Transferir Membro Entre Equipes</DialogTitle>
              <DialogDescription>
                Mova o membro para outra equipe mantendo o histórico
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Equipe Atual</p>
            <Badge variant="outline">{equipeAtual?.nome}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Papel Atual</p>
            <Badge variant="secondary">{membro?.papel || "Não definido"}</Badge>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="equipe_destino_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipe de Destino*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a equipe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {equipesDisponiveis
                        .filter((e) => e.id !== equipeAtual?.id && e.esta_ativa)
                        .map((equipe) => (
                          <SelectItem key={equipe.id} value={equipe.id}>
                            {equipe.nome}
                            {equipe.tipo_equipe && ` (${equipe.tipo_equipe})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manter_papel"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Manter Papel Atual</FormLabel>
                    <FormDescription>
                      O membro manterá o papel "{membro?.papel || "atual"}" na nova equipe
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {!manterPapel && (
              <FormField
                control={form.control}
                name="novo_papel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novo Papel*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o novo papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="coordenador">Coordenador</SelectItem>
                        <SelectItem value="analista_senior">Analista Sênior</SelectItem>
                        <SelectItem value="analista_pleno">Analista Pleno</SelectItem>
                        <SelectItem value="analista_junior">Analista Júnior</SelectItem>
                        <SelectItem value="assistente">Assistente</SelectItem>
                        <SelectItem value="estagiario">Estagiário</SelectItem>
                        <SelectItem value="temporario">Temporário</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Transferência*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da transferência..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Este motivo será registrado no histórico do membro
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transferir Membro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
