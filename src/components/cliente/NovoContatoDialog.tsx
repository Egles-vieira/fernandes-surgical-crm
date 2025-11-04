import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contatoSchema, type ContatoInput } from "@/lib/validations/contato";

interface NovoContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  contaId: string | null;
}

export default function NovoContatoDialog({ open, onOpenChange, clienteId, contaId }: NovoContatoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ContatoInput>({
    resolver: zodResolver(contatoSchema),
  });

  const createContato = useMutation({
    mutationFn: async (data: ContatoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData: any = {
        primeiro_nome: data.primeiro_nome,
        sobrenome: data.sobrenome,
        tratamento: data.tratamento || null,
        cargo: data.cargo || null,
        departamento: data.departamento || null,
        data_nascimento: data.data_nascimento || null,
        email: data.email || null,
        telefone: data.telefone || null,
        celular: data.celular || null,
        whatsapp_numero: data.whatsapp_numero || null,
        linkedin_url: data.linkedin_url || null,
        twitter_url: data.twitter_url || null,
        facebook_url: data.facebook_url || null,
        instagram_url: data.instagram_url || null,
        skype_id: data.skype_id || null,
        preferencia_contato: data.preferencia_contato || null,
        idioma_preferido: data.idioma_preferido || "pt-BR",
        timezone: data.timezone || "America/Sao_Paulo",
        melhor_horario_contato: data.melhor_horario_contato || null,
        frequencia_contato_preferida: data.frequencia_contato_preferida || null,
        consentimento_lgpd: data.consentimento_lgpd || false,
        aceita_marketing: data.aceita_marketing || false,
        nivel_autoridade: data.nivel_autoridade || null,
        budget_estimado: data.budget_estimado || null,
        timeline_decisao: data.timeline_decisao || null,
        necessidade_identificada: data.necessidade_identificada || null,
        score_qualificacao: data.score_qualificacao || null,
        origem_lead: data.origem_lead || null,
        campanha_origem: data.campanha_origem || null,
        dores_identificadas: data.dores_identificadas || null,
        objetivos_profissionais: data.objetivos_profissionais || null,
        observacoes: data.observacoes || null,
        proximo_followup: data.proximo_followup || null,
        cliente_id: clienteId,
        conta_id: contaId,
        proprietario_id: userData.user?.id,
        status_lead: "qualificado",
        estagio_ciclo_vida: "cliente",
        esta_ativo: true,
      };
      
      const { data: novoContato, error } = await supabase
        .from("contatos")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return novoContato;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
      toast({
        title: "Contato criado!",
        description: "O contato foi adicionado com sucesso.",
      });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ContatoInput) => {
    setIsSubmitting(true);
    try {
      await createContato.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="contato">Contato</TabsTrigger>
              <TabsTrigger value="qualificacao">Qualificação</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="observacoes">Observações</TabsTrigger>
            </TabsList>

            {/* Aba: Informações Básicas */}
            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tratamento">Tratamento</Label>
                  <Select onValueChange={(value) => setValue("tratamento", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sr.">Sr.</SelectItem>
                      <SelectItem value="Sra.">Sra.</SelectItem>
                      <SelectItem value="Dr.">Dr.</SelectItem>
                      <SelectItem value="Dra.">Dra.</SelectItem>
                      <SelectItem value="Prof.">Prof.</SelectItem>
                      <SelectItem value="Eng.">Eng.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primeiro_nome">Nome *</Label>
                  <Input id="primeiro_nome" {...register("primeiro_nome")} placeholder="João" />
                  {errors.primeiro_nome && <p className="text-sm text-destructive">{errors.primeiro_nome.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome *</Label>
                  <Input id="sobrenome" {...register("sobrenome")} placeholder="Silva" />
                  {errors.sobrenome && <p className="text-sm text-destructive">{errors.sobrenome.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" {...register("cargo")} placeholder="Ex: Gerente de Compras" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input id="departamento" {...register("departamento")} placeholder="Ex: Compras" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input id="data_nascimento" type="date" {...register("data_nascimento")} />
              </div>
            </TabsContent>

            {/* Aba: Contato & Preferências */}
            <TabsContent value="contato" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} placeholder="email@exemplo.com" />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" {...register("telefone")} placeholder="(11) 3333-4444" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input id="celular" {...register("celular")} placeholder="(11) 99999-8888" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_numero">WhatsApp</Label>
                  <Input id="whatsapp_numero" {...register("whatsapp_numero")} placeholder="(11) 99999-8888" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferencia_contato">Preferência de Contato</Label>
                  <Select onValueChange={(value) => setValue("preferencia_contato", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="melhor_horario_contato">Melhor Horário</Label>
                  <Input id="melhor_horario_contato" {...register("melhor_horario_contato")} placeholder="Ex: 14h às 17h" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idioma_preferido">Idioma</Label>
                  <Input id="idioma_preferido" {...register("idioma_preferido")} placeholder="pt-BR" defaultValue="pt-BR" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequencia_contato_preferida">Frequência de Contato</Label>
                  <Select onValueChange={(value) => setValue("frequencia_contato_preferida", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium">LGPD & Consentimentos</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="consentimento_lgpd">Consentimento LGPD</Label>
                  <Switch id="consentimento_lgpd" onCheckedChange={(checked) => setValue("consentimento_lgpd", checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="aceita_marketing">Aceita Marketing</Label>
                  <Switch id="aceita_marketing" onCheckedChange={(checked) => setValue("aceita_marketing", checked)} />
                </div>
              </div>
            </TabsContent>

            {/* Aba: Qualificação & Vendas */}
            <TabsContent value="qualificacao" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nivel_autoridade">Nível de Autoridade</Label>
                  <Select onValueChange={(value) => setValue("nivel_autoridade", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="decisor">Decisor</SelectItem>
                      <SelectItem value="influenciador">Influenciador</SelectItem>
                      <SelectItem value="usuario_final">Usuário Final</SelectItem>
                      <SelectItem value="bloqueador">Bloqueador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="score_qualificacao">Score (0-100)</Label>
                  <Input id="score_qualificacao" type="number" min="0" max="100" {...register("score_qualificacao", { valueAsNumber: true })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_estimado">Budget Estimado (R$)</Label>
                  <Input id="budget_estimado" type="number" step="0.01" {...register("budget_estimado", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline_decisao">Timeline de Decisão</Label>
                  <Input id="timeline_decisao" {...register("timeline_decisao")} placeholder="Ex: 3 meses" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="necessidade_identificada">Necessidade Identificada</Label>
                <Textarea id="necessidade_identificada" {...register("necessidade_identificada")} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origem_lead">Origem do Lead</Label>
                  <Input id="origem_lead" {...register("origem_lead")} placeholder="Ex: Website, Indicação" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campanha_origem">Campanha</Label>
                  <Input id="campanha_origem" {...register("campanha_origem")} placeholder="Nome da campanha" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proximo_followup">Próximo Follow-up</Label>
                <Input id="proximo_followup" type="datetime-local" {...register("proximo_followup")} />
              </div>
            </TabsContent>

            {/* Aba: Redes Sociais */}
            <TabsContent value="social" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input id="linkedin_url" {...register("linkedin_url")} placeholder="https://linkedin.com/in/..." />
                {errors.linkedin_url && <p className="text-sm text-destructive">{errors.linkedin_url.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_url">Twitter / X</Label>
                <Input id="twitter_url" {...register("twitter_url")} placeholder="https://twitter.com/..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook_url">Facebook</Label>
                <Input id="facebook_url" {...register("facebook_url")} placeholder="https://facebook.com/..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input id="instagram_url" {...register("instagram_url")} placeholder="https://instagram.com/..." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skype_id">Skype</Label>
                <Input id="skype_id" {...register("skype_id")} placeholder="usuario.skype" />
              </div>
            </TabsContent>

            {/* Aba: Observações */}
            <TabsContent value="observacoes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="dores_identificadas">Dores Identificadas</Label>
                <Textarea id="dores_identificadas" {...register("dores_identificadas")} rows={4} placeholder="Quais problemas o contato enfrenta?" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objetivos_profissionais">Objetivos Profissionais</Label>
                <Textarea id="objetivos_profissionais" {...register("objetivos_profissionais")} rows={4} placeholder="Metas e objetivos do contato" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Gerais</Label>
                <Textarea id="observacoes" {...register("observacoes")} rows={4} placeholder="Informações adicionais" />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Contato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
