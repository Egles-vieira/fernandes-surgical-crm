import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";

interface NovoTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  template?: any;
}

const NovoTemplateDialog = ({
  open,
  onOpenChange,
  contaId,
  template,
}: NovoTemplateDialogProps) => {
  const [nomeTemplate, setNomeTemplate] = useState(template?.nome_template || "");
  const [categoria, setCategoria] = useState(template?.categoria && template.categoria !== "" ? template.categoria : "marketing");
  const [idioma, setIdioma] = useState(template?.idioma && template.idioma !== "" ? template.idioma : "pt_BR");
  const [titulo, setTitulo] = useState(template?.titulo || "");
  const [corpo, setCorpo] = useState(template?.corpo || "");
  const [rodape, setRodape] = useState(template?.rodape || "");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const salvarTemplateMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      const dadosTemplate = {
        nome_template: nomeTemplate,
        categoria,
        idioma,
        titulo,
        corpo,
        rodape,
        whatsapp_conta_id: contaId,
        criado_por: user.data.user.id,
        status_aprovacao: 'pendente',
        ativo: true,
      };

      if (template) {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .update(dadosTemplate)
          .eq('id', template.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .insert(dadosTemplate)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast({
        title: template ? "Template atualizado" : "Template criado",
        description: template
          ? "Template atualizado com sucesso"
          : "Novo template criado com sucesso",
      });
      onOpenChange(false);
      limparFormulario();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const limparFormulario = () => {
    setNomeTemplate("");
    setCategoria("marketing");
    setIdioma("pt_BR");
    setTitulo("");
    setCorpo("");
    setRodape("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeTemplate.trim() || !corpo.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e corpo do template são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    salvarTemplateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {template ? "Editar Template" : "Novo Template"}
          </DialogTitle>
          <DialogDescription>
            {template 
              ? "Edite as informações do template WhatsApp" 
              : "Crie um novo template de mensagem para WhatsApp Business"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Template *</Label>
              <Input
                id="nome"
                placeholder="ex: boas_vindas"
                value={nomeTemplate}
                onChange={(e) => setNomeTemplate(e.target.value)}
                disabled={salvarTemplateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Use apenas letras minúsculas e underscores
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="utility">Utilitário</SelectItem>
                  <SelectItem value="authentication">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idioma">Idioma</Label>
            <Select value={idioma} onValueChange={setIdioma}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt_BR">Português (Brasil)</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título (Header)</Label>
            <Input
              id="titulo"
              placeholder="Título da mensagem (opcional)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={salvarTemplateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="corpo">Corpo da Mensagem *</Label>
            <Textarea
              id="corpo"
              placeholder="Digite o corpo do template aqui..."
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              disabled={salvarTemplateMutation.isPending}
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use {`{{1}}`}, {`{{2}}`}, etc. para variáveis dinâmicas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rodape">Rodapé (Footer)</Label>
            <Input
              id="rodape"
              placeholder="Texto do rodapé (opcional)"
              value={rodape}
              onChange={(e) => setRodape(e.target.value)}
              disabled={salvarTemplateMutation.isPending}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                limparFormulario();
              }}
              disabled={salvarTemplateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvarTemplateMutation.isPending}>
              {salvarTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {template ? "Atualizar" : "Criar Template"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoTemplateDialog;
