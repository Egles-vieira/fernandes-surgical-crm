import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Truck, FileText, Eye, ExternalLink, Loader2, Link2, Copy } from "lucide-react";
import { useVendasEntregasCount } from "@/hooks/useVendasEntregas";
import { useVendasNotasFiscaisCount } from "@/hooks/useVendasNotasFiscais";
import { useGerarLinkProposta } from "@/hooks/useGerarLinkProposta";
import { usePropostaActivity } from "@/hooks/usePropostaActivity";
import { PropostaActivitySheet } from "@/components/vendas/PropostaActivitySheet";
import { EntregasDialog } from "./EntregasDialog";
import { NotasFiscaisDialog } from "./NotasFiscaisDialog";

interface PropostaQuickActionsBarProps {
  vendaId: string;
}

export function PropostaQuickActionsBar({ 
  vendaId
}: PropostaQuickActionsBarProps) {
  const [entregasOpen, setEntregasOpen] = useState(false);
  const [notasOpen, setNotasOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);

  const { data: entregasCount = 0, isLoading: loadingEntregas } = useVendasEntregasCount(vendaId);
  const { data: notasCount = 0, isLoading: loadingNotas } = useVendasNotasFiscaisCount(vendaId);
  
  const { gerarLink, isGenerating, publicUrl, copiarLink, setPublicUrl } = useGerarLinkProposta(vendaId);
  const { publicUrl: existingUrl, data: activityData } = usePropostaActivity(vendaId);
  
  // Sincronizar URL existente com o estado do hook
  useEffect(() => {
    if (existingUrl && !publicUrl) {
      setPublicUrl(existingUrl);
    }
  }, [existingUrl, publicUrl, setPublicUrl]);
  
  const totalViews = activityData?.analytics?.length || 0;

  const handleAbrirLink = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  const handleGerarOuAbrir = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    } else {
      gerarLink();
    }
  };

  return (
    <>
      <TooltipProvider>
        <div className="flex items-center justify-end gap-1 py-2 px-4 bg-muted/30 border-b">
          {/* Entregas */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setEntregasOpen(true)}
              >
                {loadingEntregas ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Entregas</span>
                {entregasCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-5 min-w-5 px-1.5 text-xs"
                  >
                    {entregasCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rastreamento de entregas</TooltipContent>
          </Tooltip>

          {/* Notas Fiscais */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setNotasOpen(true)}
              >
                {loadingNotas ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Notas Fiscais</span>
                {notasCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="h-5 min-w-5 px-1.5 text-xs"
                  >
                    {notasCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notas fiscais emitidas</TooltipContent>
          </Tooltip>

          {/* Separador */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* Pré-Visualização com Link Público */}
          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Pré-Visualização</span>
                    {totalViews > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary/10 text-primary">
                        {totalViews}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Link público da proposta</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Link da Proposta</span>
                  {totalViews > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Eye size={12} />
                      {totalViews} {totalViews === 1 ? "visualização" : "visualizações"}
                    </Badge>
                  )}
                </div>
                
                {publicUrl ? (
                  <>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <code className="text-xs flex-1 truncate">{publicUrl}</code>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={copiarLink}
                      >
                        <Copy size={14} />
                        Copiar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={handleAbrirLink}
                      >
                        <ExternalLink size={14} />
                        Abrir
                      </Button>
                    </div>
                    
                    {/* Activity Sheet trigger */}
                    <div className="pt-2 border-t">
                      <PropostaActivitySheet vendaId={vendaId} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Gere um link público para compartilhar esta proposta com seu cliente.
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={handleGerarOuAbrir}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Link2 size={14} />
                          Gerar Link Público
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TooltipProvider>

      {/* Dialogs */}
      <EntregasDialog 
        open={entregasOpen} 
        onOpenChange={setEntregasOpen} 
        vendaId={vendaId} 
      />
      <NotasFiscaisDialog 
        open={notasOpen} 
        onOpenChange={setNotasOpen} 
        vendaId={vendaId} 
      />
    </>
  );
}
