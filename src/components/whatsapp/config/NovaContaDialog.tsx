import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const contaSchema = z.object({
  nome_conta: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(150, "Nome deve ter no máximo 150 caracteres"),
  numero_whatsapp: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, "Número deve estar no formato internacional (ex: +5511999999999)")
    .max(20, "Número muito longo"),
  provider: z.enum(["twilio", "meta", "360dialog", "messagebird", "gupshup"]),
  account_sid: z.string().trim().max(255).optional(),
  business_account_id: z.string().trim().max(255).optional(),
  phone_number_id: z.string().trim().max(255).optional(),
  app_id: z.string().trim().max(255).optional(),
  api_key: z.string().trim().max(255).optional(),
  nome_exibicao: z.string().trim().max(150).optional(),
  descricao_negocio: z.string().trim().max(1000).optional(),
  categoria_negocio: z.string().trim().max(100).optional(),
  site: z.string().trim().url("URL inválida").max(255).optional().or(z.literal("")),
  email_contato: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  endereco: z.string().trim().max(500).optional(),
  limite_mensagens_dia: z.number().int().min(1).max(100000).default(1000),
  resposta_automatica_ativa: z.boolean().default(true),
  mensagem_fora_horario: z.string().trim().max(500).optional(),
});

type ContaFormData = z.infer<typeof contaSchema>;

interface NovaContaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta?: any;
}

const NovaContaDialog = ({ open, onOpenChange, conta }: NovaContaDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContaFormData>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      nome_conta: conta?.nome_conta || "",
      numero_whatsapp: conta?.numero_whatsapp || "",
      provider: conta?.provider || "gupshup",
      account_sid: conta?.account_sid || "",
      business_account_id: conta?.business_account_id || "",
      phone_number_id: conta?.phone_number_id || "",
      app_id: conta?.app_id || "",
      api_key: conta?.api_key || "",
      nome_exibicao: conta?.nome_exibicao || "",
      descricao_negocio: conta?.descricao_negocio || "",
      categoria_negocio: conta?.categoria_negocio || "",
      site: conta?.site || "",
      email_contato: conta?.email_contato || "",
      endereco: conta?.endereco || "",
      limite_mensagens_dia: conta?.limite_mensagens_dia || 1000,
      resposta_automatica_ativa: conta?.resposta_automatica_ativa ?? true,
      mensagem_fora_horario: conta?.mensagem_fora_horario || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ContaFormData) => {
      const user = await supabase.auth.getUser();
      
      if (conta) {
        const { data: result, error } = await supabase
          .from('whatsapp_contas')
          .update({
            nome_conta: data.nome_conta,
            numero_whatsapp: data.numero_whatsapp,
            provider: data.provider,
            account_sid: data.account_sid || null,
            business_account_id: data.business_account_id || null,
            phone_number_id: data.phone_number_id || null,
            app_id: data.app_id || null,
            api_key: data.api_key || null,
            nome_exibicao: data.nome_exibicao || null,
            descricao_negocio: data.descricao_negocio || null,
            categoria_negocio: data.categoria_negocio || null,
            site: data.site || null,
            email_contato: data.email_contato || null,
            endereco: data.endereco || null,
            limite_mensagens_dia: data.limite_mensagens_dia,
            resposta_automatica_ativa: data.resposta_automatica_ativa,
            mensagem_fora_horario: data.mensagem_fora_horario || null,
          })
          .eq('id', conta.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('whatsapp_contas')
          .insert([{
            nome_conta: data.nome_conta,
            numero_whatsapp: data.numero_whatsapp,
            provider: data.provider,
            account_sid: data.account_sid || null,
            business_account_id: data.business_account_id || null,
            phone_number_id: data.phone_number_id || null,
            app_id: data.app_id || null,
            api_key: data.api_key || null,
            nome_exibicao: data.nome_exibicao || null,
            descricao_negocio: data.descricao_negocio || null,
            categoria_negocio: data.categoria_negocio || null,
            site: data.site || null,
            email_contato: data.email_contato || null,
            endereco: data.endereco || null,
            limite_mensagens_dia: data.limite_mensagens_dia,
            resposta_automatica_ativa: data.resposta_automatica_ativa,
            mensagem_fora_horario: data.mensagem_fora_horario || null,
            criado_por: user.data.user?.id!,
            status: 'ativo',
          }])
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas-admin'] });
      toast({
        title: conta ? "Conta atualizada" : "Conta criada",
        description: conta 
          ? "Conta WhatsApp atualizada com sucesso" 
          : "Nova conta WhatsApp criada com sucesso",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: ContaFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {conta ? "Editar Conta WhatsApp" : "Nova Conta WhatsApp"}
          </DialogTitle>
          <DialogDescription>
            Configure uma nova conta WhatsApp Business para envio e recebimento de mensagens
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Informações Básicas</h3>
              
              <FormField
                control={form.control}
                name="nome_conta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Conta *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Atendimento Principal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero_whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número WhatsApp *</FormLabel>
                    <FormControl>
                      <Input placeholder="+5511999999999" {...field} />
                    </FormControl>
                    <FormDescription>
                      Formato internacional com código do país
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gupshup">Gupshup</SelectItem>
                        <SelectItem value="meta">Meta (Facebook)</SelectItem>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="360dialog">360Dialog</SelectItem>
                        <SelectItem value="messagebird">MessageBird</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Credenciais do Provider */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Credenciais do Provider</h3>
              
              {form.watch("provider") === "gupshup" && (
                <>
                  <FormField
                    control={form.control}
                    name="app_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App ID (Gupshup) *</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu App ID do Gupshup" {...field} />
                        </FormControl>
                        <FormDescription>
                          ID da aplicação no painel do Gupshup
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key (Gupshup) *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Sua chave de API do Gupshup" {...field} />
                        </FormControl>
                        <FormDescription>
                          Chave de API obtida no painel do Gupshup
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone_number_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number ID (Gupshup)</FormLabel>
                        <FormControl>
                          <Input placeholder="ID do número no Gupshup" {...field} />
                        </FormControl>
                        <FormDescription>
                          Opcional: ID do número de telefone no Gupshup
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm text-blue-900">
                      <strong>URL do Webhook:</strong><br/>
                      <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                        https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/gupshup-webhook
                      </code>
                      <br/><br/>
                      Configure esta URL no painel do Gupshup para receber mensagens.
                    </p>
                  </div>
                </>
              )}

              {form.watch("provider") === "twilio" && (
                <FormField
                  control={form.control}
                  name="account_sid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account SID (Twilio)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="AC..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("provider") === "meta" && (
                <>
                  <FormField
                    control={form.control}
                    name="business_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Account ID (Meta)</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone_number_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number ID (Meta)</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Informações do Negócio */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Informações do Negócio</h3>
              
              <FormField
                control={form.control}
                name="nome_exibicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Exibição</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome que aparece no WhatsApp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao_negocio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Negócio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição breve sobre seu negócio" 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoria_negocio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Saúde" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="site"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site</FormLabel>
                      <FormControl>
                        <Input placeholder="https://exemplo.com.br" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email_contato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de Contato</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Endereço completo" 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Configurações de Automação */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Configurações de Automação</h3>
              
              <FormField
                control={form.control}
                name="limite_mensagens_dia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Mensagens por Dia</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Limite diário de mensagens enviadas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resposta_automatica_ativa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Resposta Automática</FormLabel>
                      <FormDescription>
                        Ativar mensagens automáticas fora do horário
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

              {form.watch("resposta_automatica_ativa") && (
                <FormField
                  control={form.control}
                  name="mensagem_fora_horario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem Fora do Horário</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Mensagem enviada automaticamente fora do horário de atendimento" 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {conta ? "Salvar Alterações" : "Criar Conta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaContaDialog;
