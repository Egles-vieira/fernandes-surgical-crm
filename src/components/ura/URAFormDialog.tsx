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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Upload } from "lucide-react";
import { URA } from "@/hooks/useURAs";

const uraFormSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  descricao: z.string().optional(),
  numero_telefone: z.string().optional(),
  ativo: z.boolean().default(true),
  mensagem_boas_vindas: z.string().min(1, "Mensagem de boas-vindas é obrigatória"),
  tipo_mensagem_boas_vindas: z.enum(["texto", "audio_url"]).default("texto"),
  url_audio_boas_vindas: z.string().optional(),
  voz_tts: z.string().default("br-Ricardo"),
  tempo_espera_digito: z.number().min(1).max(30).default(5),
  opcao_invalida_mensagem: z.string().default("Opção inválida. Por favor, tente novamente."),
  max_tentativas_invalidas: z.number().min(1).max(10).default(3),
  acao_apos_max_tentativas: z.enum(["desligar", "transferir_atendente", "correio_voz"]).default("desligar"),
  ramal_transferencia_padrao: z.string().optional(),
});

type URAFormValues = z.infer<typeof uraFormSchema>;

interface URAFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: URAFormValues) => Promise<void>;
  initialData?: URA | null;
  mode: "create" | "edit";
}

export function URAFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
}: URAFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");

  const form = useForm<URAFormValues>({
    resolver: zodResolver(uraFormSchema),
    defaultValues: initialData
      ? {
          nome: initialData.nome,
          descricao: initialData.descricao || "",
          numero_telefone: initialData.numero_telefone || "",
          ativo: initialData.ativo ?? true,
          mensagem_boas_vindas: initialData.mensagem_boas_vindas,
          tipo_mensagem_boas_vindas: (initialData.tipo_mensagem_boas_vindas as "texto" | "audio_url") || "texto",
          url_audio_boas_vindas: initialData.url_audio_boas_vindas || "",
          voz_tts: initialData.voz_tts || "br-Ricardo",
          tempo_espera_digito: initialData.tempo_espera_digito || 5,
          opcao_invalida_mensagem: initialData.opcao_invalida_mensagem || "Opção inválida. Por favor, tente novamente.",
          max_tentativas_invalidas: initialData.max_tentativas_invalidas || 3,
          acao_apos_max_tentativas: (initialData.acao_apos_max_tentativas as "desligar" | "transferir_atendente" | "correio_voz") || "desligar",
          ramal_transferencia_padrao: initialData.ramal_transferencia_padrao || "",
        }
      : {
          nome: "",
          descricao: "",
          numero_telefone: "",
          ativo: true,
          mensagem_boas_vindas: "",
          tipo_mensagem_boas_vindas: "texto",
          url_audio_boas_vindas: "",
          voz_tts: "br-Ricardo",
          tempo_espera_digito: 5,
          opcao_invalida_mensagem: "Opção inválida. Por favor, tente novamente.",
          max_tentativas_invalidas: 3,
          acao_apos_max_tentativas: "desligar",
          ramal_transferencia_padrao: "",
        },
  });

  const tipoMensagem = form.watch("tipo_mensagem_boas_vindas");
  const acaoMaxTentativas = form.watch("acao_apos_max_tentativas");

  const handleSubmit = async (data: URAFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova URA" : "Editar URA"}
          </DialogTitle>
          <DialogDescription>
            Configure as opções da URA para atendimento telefônico automatizado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basico">Básico</TabsTrigger>
                <TabsTrigger value="mensagem">Mensagem</TabsTrigger>
                <TabsTrigger value="avancado">Avançado</TabsTrigger>
              </TabsList>

              <TabsContent value="basico" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da URA *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Atendimento Principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o propósito desta URA..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero_telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Telefone (DID)</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número de telefone associado a esta URA
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ativo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Status Ativo</FormLabel>
                        <FormDescription>
                          A URA estará disponível para receber chamadas
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
              </TabsContent>

              <TabsContent value="mensagem" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="tipo_mensagem_boas_vindas"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Mensagem</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="texto" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Texto (TTS - Text to Speech)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="audio_url" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Arquivo de Áudio
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipoMensagem === "texto" ? (
                  <>
                    <FormField
                      control={form.control}
                      name="mensagem_boas_vindas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensagem de Boas-Vindas *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Bem-vindo! Para vendas, pressione 1. Para suporte, pressione 2..."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="voz_tts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Voz</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a voz" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="br-Ricardo">Ricardo (Masculino)</SelectItem>
                              <SelectItem value="br-Vitoria">Vitória (Feminino)</SelectItem>
                              <SelectItem value="br-Camila">Camila (Feminino)</SelectItem>
                              <SelectItem value="br-Thiago">Thiago (Masculino)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="button" variant="outline" className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Ouvir Prévia
                    </Button>
                  </>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="url_audio_boas_vindas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Áudio</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="button" variant="outline" className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Fazer Upload de Áudio
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="avancado" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="tempo_espera_digito"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo de Espera (segundos): {field.value}s</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={30}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Tempo para o usuário digitar uma opção
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_tentativas_invalidas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo de Tentativas Inválidas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="opcao_invalida_mensagem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem de Opção Inválida</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acao_apos_max_tentativas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ação Após Máximo de Tentativas</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a ação" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="desligar">Desligar chamada</SelectItem>
                          <SelectItem value="transferir_atendente">Transferir para atendente</SelectItem>
                          <SelectItem value="correio_voz">Enviar para correio de voz</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {acaoMaxTentativas === "transferir_atendente" && (
                  <FormField
                    control={form.control}
                    name="ramal_transferencia_padrao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ramal de Transferência</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar e Fechar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
