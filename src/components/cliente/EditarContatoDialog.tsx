import { useState, useEffect } from "react";
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
import { useContatos } from "@/hooks/useContatos";
import { contatoSchema, type ContatoInput } from "@/lib/validations/contato";
import { UserPlus, User, Phone, Target, Share2, FileText } from "lucide-react";

interface EditarContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: any;
  clienteId: string;
}

export default function EditarContatoDialog({ open, onOpenChange, contato, clienteId }: EditarContatoDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateContato } = useContatos(clienteId);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ContatoInput>({
    resolver: zodResolver(contatoSchema),
  });

  // Atualizar valores quando o contato mudar
  useEffect(() => {
    if (contato) {
      reset({
        primeiro_nome: contato.primeiro_nome || "",
        sobrenome: contato.sobrenome || "",
        tratamento: contato.tratamento || "",
        cargo: contato.cargo || "",
        departamento: contato.departamento || "",
        data_nascimento: contato.data_nascimento || "",
        email: contato.email || "",
        telefone: contato.telefone || "",
        celular: contato.celular || "",
        whatsapp_numero: contato.whatsapp_numero || "",
        linkedin_url: contato.linkedin_url || "",
        twitter_url: contato.twitter_url || "",
        facebook_url: contato.facebook_url || "",
        instagram_url: contato.instagram_url || "",
        skype_id: contato.skype_id || "",
        preferencia_contato: contato.preferencia_contato || "",
        idioma_preferido: contato.idioma_preferido || "pt-BR",
        timezone: contato.timezone || "America/Sao_Paulo",
        melhor_horario_contato: contato.melhor_horario_contato || "",
        frequencia_contato_preferida: contato.frequencia_contato_preferida || "",
        consentimento_lgpd: contato.consentimento_lgpd || false,
        data_consentimento_lgpd: contato.data_consentimento_lgpd || "",
        aceita_marketing: contato.aceita_marketing || false,
        nivel_autoridade: contato.nivel_autoridade || "",
        budget_estimado: contato.budget_estimado || undefined,
        timeline_decisao: contato.timeline_decisao || "",
        necessidade_identificada: contato.necessidade_identificada || "",
        score_qualificacao: contato.score_qualificacao || undefined,
        relacionamento_com: contato.relacionamento_com || "",
        ultimo_contato: contato.ultimo_contato || "",
        proximo_followup: contato.proximo_followup || "",
        origem_lead: contato.origem_lead || "",
        campanha_origem: contato.campanha_origem || "",
        tags: contato.tags || [],
        interesses: contato.interesses || [],
        dores_identificadas: contato.dores_identificadas || "",
        objetivos_profissionais: contato.objetivos_profissionais || "",
        observacoes: contato.observacoes || "",
      });
    }
  }, [contato, reset]);

  const onSubmit = async (data: ContatoInput) => {
    setIsSubmitting(true);
    try {
      await updateContato.mutateAsync({
        id: contato.id,
        ...data,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-2">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Editar Contato
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
              <TabsTrigger value="basico" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Básico</span>
              </TabsTrigger>
              <TabsTrigger value="contato" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Contato</span>
              </TabsTrigger>
              <TabsTrigger value="qualificacao" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Qualificação</span>
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Social</span>
              </TabsTrigger>
              <TabsTrigger value="observacoes" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm py-3">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Notas</span>
              </TabsTrigger>
            </TabsList>

            {/* Aba: Informações Básicas */}
            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tratamento">Tratamento</Label>
                  <Select value={watch("tratamento") || ""} onValueChange={(value) => setValue("tratamento", value as any)}>
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
                  <Select value={watch("preferencia_contato") || ""} onValueChange={(value) => setValue("preferencia_contato", value as any)}>
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
                  <Input id="idioma_preferido" {...register("idioma_preferido")} placeholder="pt-BR" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequencia_contato_preferida">Frequência de Contato</Label>
                  <Select value={watch("frequencia_contato_preferida") || ""} onValueChange={(value) => setValue("frequencia_contato_preferida", value as any)}>
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
                  <Switch id="consentimento_lgpd" checked={watch("consentimento_lgpd")} onCheckedChange={(checked) => setValue("consentimento_lgpd", checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="aceita_marketing">Aceita Marketing</Label>
                  <Switch id="aceita_marketing" checked={watch("aceita_marketing")} onCheckedChange={(checked) => setValue("aceita_marketing", checked)} />
                </div>
              </div>
            </TabsContent>

            {/* Aba: Qualificação & Vendas */}
            <TabsContent value="qualificacao" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nivel_autoridade">Nível de Autoridade</Label>
                  <Select value={watch("nivel_autoridade") || ""} onValueChange={(value) => setValue("nivel_autoridade", value as any)}>
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

          <DialogFooter className="border-t pt-6 flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" />
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
