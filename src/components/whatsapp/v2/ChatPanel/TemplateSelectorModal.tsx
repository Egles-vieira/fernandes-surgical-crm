import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Send,
  FileText,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useWhatsAppTemplates, WhatsAppTemplate, useSendTemplateFromChat } from '@/hooks/whatsapp/useWhatsAppTemplates';
import { cn } from '@/lib/utils';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contaId: string | null;
  conversaId: string;
  contatoId: string;
  numeroDestino: string;
}

export function TemplateSelectorModal({
  isOpen,
  onClose,
  contaId,
  conversaId,
  contatoId,
  numeroDestino,
}: TemplateSelectorModalProps) {
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [parametros, setParametros] = useState<Record<string, string>>({});

  // Buscar templates aprovados
  const { data: templatesData, isLoading } = useWhatsAppTemplates({
    contaId,
    page: 1,
    pageSize: 50,
    search,
  });

  // Mutation para enviar template
  const sendTemplateMutation = useSendTemplateFromChat();

  // Filtrar apenas templates aprovados
  const templatesAprovados = useMemo(() => {
    return (templatesData?.templates || []).filter(
      (t) => t.status_aprovacao === 'APPROVED' && t.ativo !== false
    );
  }, [templatesData?.templates]);

  // Extrair parâmetros do template ({{1}}, {{2}}, etc)
  const parametrosTemplate = useMemo(() => {
    if (!selectedTemplate) return [];
    
    const corpo = selectedTemplate.corpo || '';
    const matches = corpo.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueParams = [...new Set(matches)].sort();
    
    return uniqueParams.map((param) => {
      const num = param.replace(/[{}]/g, '');
      return { key: num, placeholder: `Valor para {{${num}}}` };
    });
  }, [selectedTemplate]);

  // Preview do template com parâmetros preenchidos
  const templatePreview = useMemo(() => {
    if (!selectedTemplate) return '';
    
    let corpo = selectedTemplate.corpo || '';
    Object.entries(parametros).forEach(([key, value]) => {
      corpo = corpo.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    });
    
    return corpo;
  }, [selectedTemplate, parametros]);

  const handleSelectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setParametros({});
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setParametros({});
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setParametros({});
    setSearch('');
    onClose();
  };

  const handleSend = async () => {
    if (!selectedTemplate || !contaId) return;

    // Preparar componentes com parâmetros
    const components: any[] = [];
    
    if (parametrosTemplate.length > 0) {
      components.push({
        type: 'body',
        parameters: parametrosTemplate.map((p) => ({
          type: 'text',
          text: parametros[p.key] || '',
        })),
      });
    }

    await sendTemplateMutation.mutateAsync({
      contaId,
      conversaId,
      contatoId,
      numeroDestino,
      templateName: selectedTemplate.nome_template,
      languageCode: selectedTemplate.idioma || 'pt_BR',
      components: components.length > 0 ? components : undefined,
    });

    // Fechar modal e limpar estado
    handleClose();
  };

  const todosParametrosPreenchidos = parametrosTemplate.every(
    (p) => parametros[p.key]?.trim()
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedTemplate ? (
              <>
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Configurar Template
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Selecionar Template
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedTemplate
              ? 'Preencha os parâmetros e envie o template'
              : 'Escolha um template aprovado para enviar'}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-2" />

        <div className="flex-1 overflow-hidden">
          {!selectedTemplate ? (
            // Lista de templates
            <div className="flex flex-col h-full">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="flex-1 max-h-[400px]">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : templatesAprovados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? 'Nenhum template encontrado'
                        : 'Nenhum template aprovado disponível'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {templatesAprovados.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          "hover:bg-accent hover:border-primary/50",
                          "focus:outline-none focus:ring-2 focus:ring-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {template.nome_template}
                              </span>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {template.categoria || 'UTILITY'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {template.corpo || 'Sem conteúdo'}
                            </p>
                            {template.idioma && (
                              <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                                {template.idioma}
                              </span>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            // Configuração do template
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4 pr-2">
                {/* Info do template */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm">{selectedTemplate.nome_template}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {selectedTemplate.categoria || 'UTILITY'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedTemplate.idioma || 'pt_BR'}
                    </Badge>
                  </div>
                </div>

                {/* Campos de parâmetros */}
                {parametrosTemplate.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Parâmetros</Label>
                    {parametrosTemplate.map((param) => (
                      <div key={param.key}>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Variável {`{{${param.key}}}`}
                        </Label>
                        <Input
                          placeholder={param.placeholder}
                          value={parametros[param.key] || ''}
                          onChange={(e) =>
                            setParametros((prev) => ({
                              ...prev,
                              [param.key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-sm whitespace-pre-wrap">{templatePreview}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {selectedTemplate && (
          <DialogFooter className="mt-4">
            <Button
              onClick={handleSend}
              disabled={
                sendTemplateMutation.isPending ||
                (parametrosTemplate.length > 0 && !todosParametrosPreenchidos)
              }
              className="w-full"
            >
              {sendTemplateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Template
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
