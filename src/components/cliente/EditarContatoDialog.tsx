import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useContatos } from "@/hooks/useContatos";

const contatoSchema = z.object({
  primeiro_nome: z.string().min(1, "Nome obrigatório"),
  sobrenome: z.string().min(1, "Sobrenome obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  cargo: z.string().optional(),
  departamento: z.string().optional(),
  descricao: z.string().optional(),
});

type ContatoInput = z.infer<typeof contatoSchema>;

interface EditarContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: any;
  clienteId: string;
}

export default function EditarContatoDialog({ open, onOpenChange, contato, clienteId }: EditarContatoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateContato } = useContatos(clienteId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContatoInput>({
    resolver: zodResolver(contatoSchema),
    defaultValues: {
      primeiro_nome: contato?.primeiro_nome || "",
      sobrenome: contato?.sobrenome || "",
      email: contato?.email || "",
      telefone: contato?.telefone || "",
      celular: contato?.celular || "",
      cargo: contato?.cargo || "",
      departamento: contato?.departamento || "",
      descricao: contato?.descricao || "",
    },
  });

  // Atualizar valores quando o contato mudar
  useEffect(() => {
    if (contato) {
      reset({
        primeiro_nome: contato.primeiro_nome || "",
        sobrenome: contato.sobrenome || "",
        email: contato.email || "",
        telefone: contato.telefone || "",
        celular: contato.celular || "",
        cargo: contato.cargo || "",
        departamento: contato.departamento || "",
        descricao: contato.descricao || "",
      });
    }
  }, [contato, reset]);

  const onSubmit = async (data: ContatoInput) => {
    setIsSubmitting(true);
    try {
      await updateContato.mutateAsync({
        id: contato.id,
        primeiro_nome: data.primeiro_nome,
        sobrenome: data.sobrenome,
        email: data.email || null,
        telefone: data.telefone || null,
        celular: data.celular || null,
        cargo: data.cargo || null,
        departamento: data.departamento || null,
        descricao: data.descricao || null,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primeiro_nome">Nome *</Label>
              <Input
                id="primeiro_nome"
                {...register("primeiro_nome")}
                placeholder="João"
              />
              {errors.primeiro_nome && (
                <p className="text-sm text-destructive mt-1">{errors.primeiro_nome.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sobrenome">Sobrenome *</Label>
              <Input
                id="sobrenome"
                {...register("sobrenome")}
                placeholder="Silva"
              />
              {errors.sobrenome && (
                <p className="text-sm text-destructive mt-1">{errors.sobrenome.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="joao.silva@exemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register("telefone")}
                placeholder="(11) 3456-7890"
              />
            </div>

            <div>
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                {...register("celular")}
                placeholder="(11) 98765-4321"
              />
            </div>

            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                {...register("cargo")}
                placeholder="Gerente Comercial"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                {...register("departamento")}
                placeholder="Comercial"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="descricao">Observações</Label>
              <Textarea
                id="descricao"
                {...register("descricao")}
                placeholder="Informações adicionais sobre o contato..."
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
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
