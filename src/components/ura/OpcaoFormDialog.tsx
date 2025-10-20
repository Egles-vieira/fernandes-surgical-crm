import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GitBranch,
  Phone,
  PhoneCall,
  Music,
  MessageSquare,
  XCircle,
  Voicemail,
} from "lucide-react";
import { URAOpcao } from "@/hooks/useURAs";

const opcaoFormSchema = z.object({
  numero_opcao: z.number().min(0).max(9),
  titulo: z.string().min(1, "Título é obrigatório"),
  tipo_acao: z.enum([
    "menu_submenu",
    "transferir_ramal",
    "transferir_numero",
    "reproduzir_audio",
    "enviar_callback",
    "desligar",
    "correio_voz",
  ]),
  ura_submenu_id: z.string().optional(),
  ramal_destino: z.string().optional(),
  numero_destino: z.string().optional(),
  mensagem_antes_acao: z.string().optional(),
  url_audio: z.string().optional(),
  ordem: z.number().default(0),
  ativo: z.boolean().default(true),
  horario_disponivel: z.any().optional(),
});

type OpcaoFormValues = z.infer<typeof opcaoFormSchema>;

interface OpcaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OpcaoFormValues) => Promise<void>;
  initialData?: URAOpcao | null;
  uraId: string;
}

const tiposAcao = [
  {
    value: "menu_submenu",
    label: "Submenu",
    description: "Direcionar para outra URA",
    icon: GitBranch,
  },
  {
    value: "transferir_ramal",
    label: "Transferir para Ramal",
    description: "Conectar com ramal interno",
    icon: Phone,
  },
  {
    value: "transferir_numero",
    label: "Transferir para Número",
    description: "Transferir para número externo",
    icon: PhoneCall,
  },
  {
    value: "reproduzir_audio",
    label: "Reproduzir Áudio",
    description: "Tocar áudio e voltar ao menu",
    icon: Music,
  },
  {
    value: "enviar_callback",
    label: "Solicitar Callback",
    description: "Registrar pedido de retorno",
    icon: MessageSquare,
  },
  {
    value: "desligar",
    label: "Encerrar Chamada",
    description: "Finalizar atendimento",
    icon: XCircle,
  },
  {
    value: "correio_voz",
    label: "Correio de Voz",
    description: "Gravar mensagem",
    icon: Voicemail,
  },
];

const diasSemana = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function OpcaoFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  uraId,
}: OpcaoFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarMensagemAntes, setMostrarMensagemAntes] = useState(
    !!initialData?.mensagem_antes_acao
  );
  const [restringirHorario, setRestringirHorario] = useState(
    !!initialData?.horario_disponivel
  );
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);

  const form = useForm<OpcaoFormValues>({
    resolver: zodResolver(opcaoFormSchema),
    defaultValues: initialData
      ? {
          numero_opcao: initialData.numero_opcao,
          titulo: initialData.titulo,
          tipo_acao: initialData.tipo_acao as any,
          ura_submenu_id: initialData.ura_submenu_id || "",
          ramal_destino: initialData.ramal_destino || "",
          numero_destino: initialData.numero_destino || "",
          mensagem_antes_acao: initialData.mensagem_antes_acao || "",
          url_audio: initialData.url_audio || "",
          ordem: initialData.ordem || 0,
          ativo: initialData.ativo ?? true,
          horario_disponivel: initialData.horario_disponivel,
        }
      : {
          numero_opcao: 1,
          titulo: "",
          tipo_acao: "transferir_ramal",
          ura_submenu_id: "",
          ramal_destino: "",
          numero_destino: "",
          mensagem_antes_acao: "",
          url_audio: "",
          ordem: 0,
          ativo: true,
          horario_disponivel: null,
        },
  });

  const tipoAcao = form.watch("tipo_acao");

  const handleSubmit = async (data: OpcaoFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDia = (dia: number) => {
    setDiasSelecionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Opção" : "Nova Opção"}
          </DialogTitle>
          <DialogDescription>
            Configure a opção do menu de atendimento
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Básico */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_opcao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da Tecla *</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            Tecla {num}
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
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Opção *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Falar com Vendas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mensagem antes da ação */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Mensagem antes da ação</p>
                  <p className="text-sm text-muted-foreground">
                    Reproduzir mensagem antes de executar a ação
                  </p>
                </div>
                <Switch
                  checked={mostrarMensagemAntes}
                  onCheckedChange={setMostrarMensagemAntes}
                />
              </div>

              {mostrarMensagemAntes && (
                <FormField
                  control={form.control}
                  name="mensagem_antes_acao"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Você será transferido para o setor de vendas..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Tipo de Ação */}
            <div className="space-y-4">
              <FormLabel>Tipo de Ação *</FormLabel>
              <FormField
                control={form.control}
                name="tipo_acao"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-3">
                        {tiposAcao.map((tipo) => (
                          <Card
                            key={tipo.value}
                            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                              field.value === tipo.value
                                ? "border-primary bg-primary/5"
                                : ""
                            }`}
                            onClick={() => field.onChange(tipo.value)}
                          >
                            <div className="flex items-start gap-3">
                              <tipo.icon
                                className={`w-5 h-5 mt-0.5 ${
                                  field.value === tipo.value
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <div>
                                <p className="font-medium text-sm">{tipo.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {tipo.description}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos específicos por tipo de ação */}
            {tipoAcao === "transferir_ramal" && (
              <FormField
                control={form.control}
                name="ramal_destino"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Ramal</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {tipoAcao === "transferir_numero" && (
              <FormField
                control={form.control}
                name="numero_destino"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {tipoAcao === "reproduzir_audio" && (
              <FormField
                control={form.control}
                name="url_audio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Áudio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar da biblioteca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="audio1">Áudio 1</SelectItem>
                        <SelectItem value="audio2">Áudio 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {tipoAcao === "menu_submenu" && (
              <FormField
                control={form.control}
                name="ura_submenu_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URA Submenu</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar URA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ura1">URA Suporte</SelectItem>
                        <SelectItem value="ura2">URA Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Horário de Disponibilidade */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Restringir por horário</p>
                  <p className="text-sm text-muted-foreground">
                    Disponível apenas em horários específicos
                  </p>
                </div>
                <Switch
                  checked={restringirHorario}
                  onCheckedChange={setRestringirHorario}
                />
              </div>

              {restringirHorario && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium mb-2">Dias da Semana</p>
                    <div className="grid grid-cols-4 gap-2">
                      {diasSemana.map((dia) => (
                        <div key={dia.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dia-${dia.value}`}
                            checked={diasSelecionados.includes(dia.value)}
                            onCheckedChange={() => toggleDia(dia.value)}
                          />
                          <label
                            htmlFor={`dia-${dia.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {dia.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Hora Início</label>
                      <Input type="time" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Hora Fim</label>
                      <Input type="time" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Mensagem fora do horário
                    </label>
                    <Textarea
                      placeholder="Esta opção está disponível apenas..."
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Opção Ativa</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Opção"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
