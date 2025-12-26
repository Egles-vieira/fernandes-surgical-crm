import { useState, useMemo, useEffect } from 'react';
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
import {
  Search,
  Send,
  FileText,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  MessageSquareText,
  Loader2,
  Sparkles,
  Tag,
  Hash,
  Globe,
  Megaphone,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useWhatsAppTemplates, WhatsAppTemplate, useSendTemplateFromChat } from '@/hooks/whatsapp/useWhatsAppTemplates';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contaId: string | null;
  conversaId: string;
  contatoId: string;
  numeroDestino: string;
}

type CategoriaFiltro = 'ALL' | 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

const categoriaConfig: Record<CategoriaFiltro, { label: string; icon: React.ElementType; color: string }> = {
  ALL: { label: 'Todos', icon: Sparkles, color: 'bg-muted text-foreground' },
  UTILITY: { label: 'Utilidade', icon: Zap, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  MARKETING: { label: 'Marketing', icon: Megaphone, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  AUTHENTICATION: { label: 'Autenticação', icon: ShieldCheck, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
};

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
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaFiltro>('ALL');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Buscar templates aprovados
  const { data: templatesData, isLoading } = useWhatsAppTemplates({
    contaId,
    page: 1,
    pageSize: 50,
    search,
  });

  // Mutation para enviar template
  const sendTemplateMutation = useSendTemplateFromChat();

  // Filtrar apenas templates aprovados e por categoria
  const templatesAprovados = useMemo(() => {
    const templates = (templatesData?.templates || []).filter(
      (t) => t.status_aprovacao === 'APPROVED' && t.ativo !== false
    );
    
    if (categoriaFiltro === 'ALL') return templates;
    return templates.filter((t) => (t.categoria || 'UTILITY') === categoriaFiltro);
  }, [templatesData?.templates, categoriaFiltro]);

  // Contagem por categoria
  const contagemPorCategoria = useMemo(() => {
    const templates = (templatesData?.templates || []).filter(
      (t) => t.status_aprovacao === 'APPROVED' && t.ativo !== false
    );
    
    return {
      ALL: templates.length,
      UTILITY: templates.filter((t) => (t.categoria || 'UTILITY') === 'UTILITY').length,
      MARKETING: templates.filter((t) => t.categoria === 'MARKETING').length,
      AUTHENTICATION: templates.filter((t) => t.categoria === 'AUTHENTICATION').length,
    };
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

  // Contar parâmetros em um template
  const contarParametros = (template: WhatsAppTemplate) => {
    const corpo = template.corpo || '';
    const matches = corpo.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].length;
  };

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
    setCategoriaFiltro('ALL');
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

    handleClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        if (selectedTemplate) {
          handleBack();
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedTemplate]);

  const todosParametrosPreenchidos = parametrosTemplate.every(
    (p) => parametros[p.key]?.trim()
  );

  const getCategoriaIcon = (categoria: string) => {
    const config = categoriaConfig[categoria as CategoriaFiltro];
    return config?.icon || Zap;
  };

  const getCategoriaColor = (categoria: string) => {
    const config = categoriaConfig[categoria as CategoriaFiltro];
    return config?.color || categoriaConfig.UTILITY.color;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header com gradiente WhatsApp */}
        <div className="relative bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                {selectedTemplate ? (
                  <motion.div
                    key="back"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleBack} 
                      className="h-9 w-9 bg-white/10 hover:bg-white/20 text-white"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
                  >
                    <MessageSquareText className="h-6 w-6 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex-1">
                <DialogTitle className="text-white text-lg font-semibold tracking-tight">
                  {selectedTemplate ? 'Configurar Template' : 'Templates de Mensagem'}
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-0.5">
                  {selectedTemplate
                    ? 'Preencha os parâmetros e visualize antes de enviar'
                    : `${contagemPorCategoria.ALL} templates aprovados disponíveis`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {!selectedTemplate ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                {/* Barra de busca premium */}
                <div className="px-4 pt-4 pb-3 space-y-3">
                  <div 
                    className={cn(
                      "relative transition-all duration-200",
                      isSearchFocused && "scale-[1.02]"
                    )}
                  >
                    <div className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200",
                      isSearchFocused ? "text-primary" : "text-muted-foreground"
                    )}>
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder="Buscar por nome ou conteúdo..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className={cn(
                        "pl-10 h-11 bg-muted/50 border-transparent rounded-xl",
                        "focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/10",
                        "placeholder:text-muted-foreground/60 transition-all duration-200"
                      )}
                    />
                  </div>
                  
                  {/* Chips de filtro por categoria */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {(Object.keys(categoriaConfig) as CategoriaFiltro[]).map((categoria) => {
                      const config = categoriaConfig[categoria];
                      const Icon = config.icon;
                      const count = contagemPorCategoria[categoria];
                      const isActive = categoriaFiltro === categoria;
                      
                      return (
                        <button
                          key={categoria}
                          onClick={() => setCategoriaFiltro(categoria)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                            "transition-all duration-200 border",
                            isActive 
                              ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                          <span className={cn(
                            "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                            isActive 
                              ? "bg-white/20 text-primary-foreground" 
                              : "bg-muted-foreground/10 text-muted-foreground"
                          )}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lista de templates */}
                <ScrollArea className="flex-1 px-4 pb-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 rounded-xl border bg-card">
                          <div className="flex items-start gap-3">
                            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : templatesAprovados.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-12 text-center"
                    >
                      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="font-medium text-foreground mb-1">
                        {search ? 'Nenhum resultado' : 'Sem templates'}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-[240px]">
                        {search
                          ? `Não encontramos templates para "${search}"`
                          : 'Não há templates aprovados disponíveis nesta categoria'}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-2">
                      {templatesAprovados.map((template, index) => {
                        const numParams = contarParametros(template);
                        const categoria = template.categoria || 'UTILITY';
                        const CategoriaIcon = getCategoriaIcon(categoria);
                        
                        return (
                          <motion.button
                            key={template.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.2 }}
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                              "w-full text-left p-4 rounded-xl border bg-card",
                              "transition-all duration-200 group",
                              "hover:shadow-md hover:border-primary/30 hover:bg-accent/30",
                              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* Ícone de categoria */}
                              <div className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                                getCategoriaColor(categoria)
                              )}>
                                <CategoriaIcon className="h-5 w-5" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {/* Header do card */}
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-medium text-sm text-foreground truncate">
                                    {template.nome_template}
                                  </span>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                </div>
                                
                                {/* Preview do corpo com gradiente fade */}
                                <div className="relative">
                                  <p className="text-xs text-muted-foreground line-clamp-2 pr-4">
                                    {template.corpo || 'Sem conteúdo'}
                                  </p>
                                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent" />
                                </div>
                                
                                {/* Badges */}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge 
                                    variant="secondary" 
                                    className="text-[10px] px-2 py-0.5 bg-muted/80"
                                  >
                                    <Globe className="h-2.5 w-2.5 mr-1" />
                                    {template.idioma || 'pt_BR'}
                                  </Badge>
                                  
                                  {numParams > 0 && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-2 py-0.5 bg-muted/80"
                                    >
                                      <Hash className="h-2.5 w-2.5 mr-1" />
                                      {numParams} {numParams === 1 ? 'parâmetro' : 'parâmetros'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {/* Seta */}
                              <div className="shrink-0 self-center">
                                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <ScrollArea className="flex-1 px-4 py-4">
                  <div className="space-y-5">
                    {/* Card de info do template */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-green-500/10 border border-emerald-500/20">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {selectedTemplate.nome_template}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                              <Tag className="h-2.5 w-2.5 mr-1" />
                              {selectedTemplate.categoria || 'UTILITY'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              <Globe className="h-2.5 w-2.5 mr-1" />
                              {selectedTemplate.idioma || 'pt_BR'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Campos de parâmetros */}
                    {parametrosTemplate.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Parâmetros Variáveis</Label>
                        </div>
                        
                        {parametrosTemplate.map((param, index) => (
                          <motion.div 
                            key={param.key}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                                  {param.key}
                                </span>
                                Variável {`{{${param.key}}}`}
                              </Label>
                              <span className="text-[10px] text-muted-foreground">
                                {parametros[param.key]?.length || 0} caracteres
                              </span>
                            </div>
                            <Input
                              placeholder={`Digite o valor para {{${param.key}}}...`}
                              value={parametros[param.key] || ''}
                              onChange={(e) =>
                                setParametros((prev) => ({
                                  ...prev,
                                  [param.key]: e.target.value,
                                }))
                              }
                              className="h-11 bg-muted/30 border-muted-foreground/10 focus:border-primary/50"
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Preview estilo WhatsApp */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Pré-visualização</Label>
                      </div>
                      
                      <div className="bg-[#e5ddd5] dark:bg-zinc-800 rounded-xl p-4 relative overflow-hidden">
                        {/* Pattern de fundo do WhatsApp */}
                        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]" 
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                          }}
                        />
                        
                        {/* Balão de mensagem */}
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="relative max-w-[85%] ml-auto"
                        >
                          <div className="bg-[#dcf8c6] dark:bg-emerald-900/60 rounded-lg rounded-tr-none p-3 shadow-sm">
                            <p className="text-sm text-zinc-800 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                              {templatePreview}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1.5">
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <CheckCircle2 className="h-3 w-3 text-blue-500" />
                            </div>
                          </div>
                          {/* Tail do balão */}
                          <div className="absolute -right-2 top-0 w-0 h-0 border-l-8 border-l-[#dcf8c6] dark:border-l-emerald-900/60 border-t-8 border-t-transparent" />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Footer com CTA premium */}
                <div className="px-4 pb-4 pt-2">
                  <Button
                    onClick={handleSend}
                    disabled={
                      sendTemplateMutation.isPending ||
                      (parametrosTemplate.length > 0 && !todosParametrosPreenchidos)
                    }
                    className={cn(
                      "w-full h-12 text-base font-medium rounded-xl",
                      "bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600",
                      "shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30",
                      "transition-all duration-200",
                      "disabled:opacity-50 disabled:shadow-none"
                    )}
                  >
                    {sendTemplateMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        <span>Enviar Template</span>
                      </div>
                    )}
                  </Button>
                  
                  {parametrosTemplate.length > 0 && !todosParametrosPreenchidos && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Preencha todos os parâmetros para enviar
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
