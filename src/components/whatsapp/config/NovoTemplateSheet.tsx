import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Loader2, AlertCircle, Cloud } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface NovoTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  template?: any;
}

const NovoTemplateSheet = ({
  open,
  onOpenChange,
  contaId,
  template,
}: NovoTemplateSheetProps) => {
  const [nomeTemplate, setNomeTemplate] = useState("");
  const [categoria, setCategoria] = useState("MARKETING");
  const [idioma, setIdioma] = useState("pt_BR");
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [rodape, setRodape] = useState("");
  const [criarNaMeta, setCriarNaMeta] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!template;

  // Reset form when sheet opens/closes or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setNomeTemplate(template.nome_template || "");
        setCategoria(template.categoria && template.categoria !== "" ? template.categoria.toUpperCase() : "MARKETING");
        setIdioma(template.idioma && template.idioma !== "" ? template.idioma : "pt_BR");
        setTitulo(template.titulo || "");
        setCorpo(template.corpo || "");
        setRodape(template.rodape || "");
        setCriarNaMeta(false); // Editing doesn't create in Meta
      } else {
        limparFormulario();
      }
    }
  }, [open, template]);

  const criarNaMetaMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-api-create-template', {
        body: {
          contaId,
          name: nomeTemplate.toLowerCase().replace(/\s+/g, '_'),
          category: categoria,
          language: idioma,
          components: buildMetaComponents()
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao criar template na Meta');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast({
        title: "Template enviado para Meta",
        description: `Template "${nomeTemplate}" enviado para aprovação. Status: ${data.template?.status || 'PENDING'}`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar template na Meta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const salvarLocalMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      const dadosTemplate = {
        nome_template: nomeTemplate.toLowerCase().replace(/\s+/g, '_'),
        categoria: categoria.toLowerCase(),
        idioma,
        titulo,
        corpo,
        rodape,
        whatsapp_conta_id: contaId,
        criado_por: user.data.user.id,
        status_aprovacao: 'pendente',
        ativo: true,
        sincronizado_com_meta: false,
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
          ? "Template atualizado localmente"
          : "Template criado localmente (não sincronizado com Meta)",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const buildMetaComponents = () => {
    const components: any[] = [];

    // Header component
    if (titulo.trim()) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: titulo
      });
    }

    // Body component (required)
    const bodyComponent: any = {
      type: "BODY",
      text: corpo
    };

    // Extract variables from body {{1}}, {{2}}, etc.
    const variables = corpo.match(/\{\{(\d+)\}\}/g);
    if (variables && variables.length > 0) {
      bodyComponent.example = {
        body_text: [variables.map((_, i) => `exemplo_${i + 1}`)]
      };
    }
    components.push(bodyComponent);

    // Footer component
    if (rodape.trim()) {
      components.push({
        type: "FOOTER",
        text: rodape
      });
    }

    return components;
  };

  const limparFormulario = () => {
    setNomeTemplate("");
    setCategoria("MARKETING");
    setIdioma("pt_BR");
    setTitulo("");
    setCorpo("");
    setRodape("");
    setCriarNaMeta(true);
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

    // Validate template name format
    const nomeFormatado = nomeTemplate.toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z_][a-z0-9_]*$/.test(nomeFormatado)) {
      toast({
        title: "Nome inválido",
        description: "Use apenas letras minúsculas, números e underscores. Deve iniciar com letra ou underscore.",
        variant: "destructive",
      });
      return;
    }

    if (criarNaMeta && !isEditing) {
      criarNaMetaMutation.mutate();
    } else {
      salvarLocalMutation.mutate();
    }
  };

  const isPending = criarNaMetaMutation.isPending || salvarLocalMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[550px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isEditing ? "Editar Template" : "Novo Template HSM"}
          </SheetTitle>
          <SheetDescription>
            {isEditing 
              ? "Edite as informações do template WhatsApp" 
              : "Crie um novo template de mensagem para WhatsApp Business"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {!isEditing && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Criar na Meta Cloud API</p>
                  <p className="text-xs text-muted-foreground">
                    Envia o template para aprovação da Meta
                  </p>
                </div>
              </div>
              <Switch
                checked={criarNaMeta}
                onCheckedChange={setCriarNaMeta}
                disabled={isPending}
              />
            </div>
          )}

          {criarNaMeta && !isEditing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Templates criados na Meta passam por revisão (24-48h). 
                Status inicial: <strong>PENDING</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Template *</Label>
            <Input
              id="nome"
              placeholder="ex: boas_vindas"
              value={nomeTemplate}
              onChange={(e) => setNomeTemplate(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Use apenas letras minúsculas e underscores
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utilitário</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idioma">Idioma</Label>
              <Select value={idioma} onValueChange={setIdioma} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título (Header)</Label>
            <Input
              id="titulo"
              placeholder="Título da mensagem (opcional)"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={isPending}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              Máximo 60 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="corpo">Corpo da Mensagem *</Label>
            <Textarea
              id="corpo"
              placeholder="Digite o corpo do template aqui..."
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              disabled={isPending}
              rows={6}
              className="font-mono text-sm"
              maxLength={1024}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Use {`{{1}}`}, {`{{2}}`}, etc. para variáveis</span>
              <span>{corpo.length}/1024</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rodape">Rodapé (Footer)</Label>
            <Input
              id="rodape"
              placeholder="Texto do rodapé (opcional)"
              value={rodape}
              onChange={(e) => setRodape(e.target.value)}
              disabled={isPending}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              Máximo 60 caracteres
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {criarNaMeta ? "Enviando..." : "Salvando..."}
                </>
              ) : (
                <>
                  {criarNaMeta && !isEditing ? (
                    <>
                      <Cloud className="w-4 h-4 mr-2" />
                      Enviar para Meta
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      {isEditing ? "Atualizar" : "Salvar Local"}
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default NovoTemplateSheet;
