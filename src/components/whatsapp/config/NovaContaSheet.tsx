import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Loader2, Save, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const contaSchema = z.object({
  nome_conta: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(150, "Nome deve ter no máximo 150 caracteres"),
  numero_whatsapp: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, "Número deve estar no formato internacional (ex: +5511999999999)")
    .max(20, "Número muito longo"),
  provider: z.enum(["gupshup", "w_api", "meta_cloud_api"]),
  provedor: z.enum(["gupshup", "w_api", "meta_cloud_api"]).default("meta_cloud_api"),
  // Gupshup
  app_id_gupshup: z.string().trim().max(255).optional(),
  api_key_gupshup: z.string().trim().max(255).optional(),
  phone_number_id_gupshup: z.string().trim().max(255).optional(),
  // W-API
  instance_id_wapi: z.string().trim().max(255).optional(),
  token_wapi: z.string().trim().max(255).optional(),
  // Meta Cloud API (Oficial)
  meta_access_token: z.string().trim().max(500).optional(),
  meta_phone_number_id: z.string().trim().max(100).optional(),
  meta_waba_id: z.string().trim().max(100).optional(),
  // Outros
  account_sid: z.string().trim().max(255).optional(),
  business_account_id: z.string().trim().max(255).optional(),
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

interface NovaContaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta?: any;
}

export function NovaContaSheet({ open, onOpenChange, conta }: NovaContaSheetProps) {
  const queryClient = useQueryClient();

  const form = useForm<ContaFormData>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      nome_conta: conta?.nome_conta || "",
      numero_whatsapp: conta?.numero_whatsapp || "",
      provider: conta?.provider || "meta_cloud_api",
      provedor: conta?.provedor || "meta_cloud_api",
      meta_access_token: conta?.meta_access_token || "",
      meta_phone_number_id: conta?.meta_phone_number_id || "",
      meta_waba_id: conta?.meta_waba_id || "",
      account_sid: conta?.account_sid || "",
      business_account_id: conta?.business_account_id || "",
      phone_number_id_gupshup: conta?.phone_number_id_gupshup || "",
      app_id_gupshup: conta?.app_id_gupshup || "",
      api_key_gupshup: conta?.api_key_gupshup || "",
      instance_id_wapi: conta?.instance_id_wapi || "",
      token_wapi: conta?.token_wapi || "",
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

  // Reset form when conta changes (for editing)
  useEffect(() => {
    if (open) {
      form.reset({
        nome_conta: conta?.nome_conta || "",
        numero_whatsapp: conta?.numero_whatsapp || "",
        provider: conta?.provider || "meta_cloud_api",
        provedor: conta?.provedor || "meta_cloud_api",
        meta_access_token: conta?.meta_access_token || "",
        meta_phone_number_id: conta?.meta_phone_number_id || "",
        meta_waba_id: conta?.meta_waba_id || "",
        account_sid: conta?.account_sid || "",
        business_account_id: conta?.business_account_id || "",
        phone_number_id_gupshup: conta?.phone_number_id_gupshup || "",
        app_id_gupshup: conta?.app_id_gupshup || "",
        api_key_gupshup: conta?.api_key_gupshup || "",
        instance_id_wapi: conta?.instance_id_wapi || "",
        token_wapi: conta?.token_wapi || "",
        nome_exibicao: conta?.nome_exibicao || "",
        descricao_negocio: conta?.descricao_negocio || "",
        categoria_negocio: conta?.categoria_negocio || "",
        site: conta?.site || "",
        email_contato: conta?.email_contato || "",
        endereco: conta?.endereco || "",
        limite_mensagens_dia: conta?.limite_mensagens_dia || 1000,
        resposta_automatica_ativa: conta?.resposta_automatica_ativa ?? true,
        mensagem_fora_horario: conta?.mensagem_fora_horario || "",
      });
    }
  }, [open, conta, form]);

  const mutation = useMutation({
    mutationFn: async (data: ContaFormData) => {
      const user = await supabase.auth.getUser();
      
      const payload = {
        nome_conta: data.nome_conta,
        numero_whatsapp: data.numero_whatsapp,
        provider: data.provider,
        provedor: data.provedor,
        account_sid: data.account_sid || null,
        business_account_id: data.business_account_id || null,
        phone_number_id_gupshup: data.phone_number_id_gupshup || null,
        app_id_gupshup: data.app_id_gupshup || null,
        api_key_gupshup: data.api_key_gupshup || null,
        instance_id_wapi: data.instance_id_wapi || null,
        token_wapi: data.token_wapi || null,
        meta_access_token: data.meta_access_token || null,
        meta_phone_number_id: data.meta_phone_number_id || null,
        meta_waba_id: data.meta_waba_id || null,
        nome_exibicao: data.nome_exibicao || null,
        descricao_negocio: data.descricao_negocio || null,
        categoria_negocio: data.categoria_negocio || null,
        site: data.site || null,
        email_contato: data.email_contato || null,
        endereco: data.endereco || null,
        limite_mensagens_dia: data.limite_mensagens_dia,
        resposta_automatica_ativa: data.resposta_automatica_ativa,
        mensagem_fora_horario: data.mensagem_fora_horario || null,
      };

      if (conta) {
        const { data: result, error } = await supabase
          .from('whatsapp_contas')
          .update(payload as any)
          .eq('id', conta.id)
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { data: result, error } = await supabase
          .from('whatsapp_contas')
          .insert([{
            ...payload,
            criado_por: user.data.user?.id!,
            status: 'ativo',
          }] as any)
          .select()
          .single();

        if (error) throw error;
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas-admin'] });
      toast.success(conta ? "Conta atualizada com sucesso" : "Nova conta criada com sucesso");
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const onSubmit = (data: ContaFormData) => {
    mutation.mutate(data);
  };

  const selectedProvider = form.watch("provider");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {conta ? "Editar Conta WhatsApp" : "Nova Conta WhatsApp"}
          </SheetTitle>
          <SheetDescription>
            Configure uma conta WhatsApp Business para envio e recebimento de mensagens
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <Form {...form}>
            <form id="conta-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Informações Básicas</h3>
                
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
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('provedor', value as any);
                        }} 
                        value={field.value} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="meta_cloud_api">Meta Cloud API (Oficial)</SelectItem>
                          <SelectItem value="gupshup">Gupshup</SelectItem>
                          <SelectItem value="w_api">W-API (Não Oficial)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Credenciais do Provider */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Credenciais do Provider</h3>
                
                {selectedProvider === "meta_cloud_api" && (
                  <>
                    <FormField
                      control={form.control}
                      name="meta_access_token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access Token (Meta) *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Token de acesso permanente" {...field} />
                          </FormControl>
                          <FormDescription>
                            Token de acesso obtido no Meta Business Manager
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meta_phone_number_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number ID (Meta) *</FormLabel>
                          <FormControl>
                            <Input placeholder="ID do número de telefone" {...field} />
                          </FormControl>
                          <FormDescription>
                            ID do número registrado no WhatsApp Business
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="meta_waba_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WABA ID (Meta) *</FormLabel>
                          <FormControl>
                            <Input placeholder="WhatsApp Business Account ID" {...field} />
                          </FormControl>
                          <FormDescription>
                            ID da conta WhatsApp Business
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/50 dark:border-green-800 p-4">
                      <p className="text-sm text-green-900 dark:text-green-100">
                        <strong>URL do Webhook:</strong><br/>
                        <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded block mt-2 break-all">
                          https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/meta-api-webhook
                        </code>
                        <br/>
                        Configure no Meta Business Manager → WhatsApp → Configuration → Webhook
                      </p>
                    </div>
                  </>
                )}

                {selectedProvider === "gupshup" && (
                  <>
                    <FormField
                      control={form.control}
                      name="app_id_gupshup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>App ID (Gupshup) *</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu App ID do Gupshup" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="api_key_gupshup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key (Gupshup) *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Sua chave de API do Gupshup" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone_number_id_gupshup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number ID (Gupshup)</FormLabel>
                          <FormControl>
                            <Input placeholder="ID do número no Gupshup" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800 p-4">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>URL do Webhook:</strong><br/>
                        <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded block mt-2 break-all">
                          https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/gupshup-webhook
                        </code>
                      </p>
                    </div>
                  </>
                )}

                {selectedProvider === "w_api" && (
                  <>
                    <FormField
                      control={form.control}
                      name="instance_id_wapi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instance ID (W-API) *</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu Instance ID do W-API" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="token_wapi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Token (W-API) *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Seu token do W-API" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/50 dark:border-purple-800 p-4">
                      <p className="text-sm text-purple-900 dark:text-purple-100">
                        <strong>URL do Webhook:</strong><br/>
                        <code className="text-xs bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded block mt-2 break-all">
                          https://rzzzfprgnoywmmjwepzm.supabase.co/functions/v1/w-api-webhook
                        </code>
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* Informações do Negócio */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Informações do Negócio</h3>
                
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
                          rows={3}
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
                          <Input placeholder="https://..." {...field} />
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
                        <Input placeholder="contato@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Automação */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Automação</h3>
                
                <FormField
                  control={form.control}
                  name="limite_mensagens_dia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Mensagens/Dia</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1000)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resposta_automatica_ativa"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Resposta Automática</FormLabel>
                        <FormDescription>
                          Ativar respostas automáticas fora do horário
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
                            placeholder="Mensagem enviada fora do horário de atendimento..."
                            className="resize-none"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </form>
          </Form>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="conta-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {conta ? "Salvar Alterações" : "Criar Conta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
