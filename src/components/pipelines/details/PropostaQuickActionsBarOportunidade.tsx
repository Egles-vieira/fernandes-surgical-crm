import { useState, useEffect } from "react";
import { ExternalLink, Link, Copy, Eye, Loader2, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGerarLinkPropostaOportunidade } from "@/hooks/useGerarLinkPropostaOportunidade";
import { usePropostaActivityOportunidade } from "@/hooks/usePropostaActivityOportunidade";
import { usePropostaActivityRealtimeOportunidade } from "@/hooks/usePropostaActivityRealtimeOportunidade";
import { PropostaActivitySheetOportunidade } from "./PropostaActivitySheetOportunidade";
import { toast } from "sonner";

interface PropostaQuickActionsBarOportunidadeProps {
  oportunidadeId: string;
}

export function PropostaQuickActionsBarOportunidade({ oportunidadeId }: PropostaQuickActionsBarOportunidadeProps) {
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  
  const { 
    gerarLink, 
    isGenerating, 
    publicUrl, 
    copiarLink, 
    setPublicUrl 
  } = useGerarLinkPropostaOportunidade(oportunidadeId);

  const { 
    data, 
    publicUrl: existingUrl, 
    tokenData 
  } = usePropostaActivityOportunidade(oportunidadeId);

  // Realtime para atualizações
  usePropostaActivityRealtimeOportunidade(oportunidadeId);

  // Sincronizar URL existente
  useEffect(() => {
    if (existingUrl && !publicUrl) {
      setPublicUrl(existingUrl);
    }
  }, [existingUrl, publicUrl, setPublicUrl]);

  const handleAbrirLink = () => {
    const url = publicUrl || existingUrl;
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleGerarOuAbrir = () => {
    const url = publicUrl || existingUrl;
    if (url) {
      setLinkPopoverOpen(true);
    } else {
      gerarLink();
    }
  };

  const totalVisualizacoes = data?.analytics?.length || 0;
  const linkAtivo = publicUrl || existingUrl;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Botão de pré-visualização / link público */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGerarOuAbrir}
              disabled={isGenerating}
              className="h-8 gap-1.5"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {linkAtivo ? "Link Público" : "Gerar Link"}
              </span>
              {totalVisualizacoes > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary">
                  <Eye className="h-3 w-3 mr-0.5" />
                  {totalVisualizacoes}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80" align="end">
            {linkAtivo ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Link Público da Proposta</p>
                  <p className="text-xs text-muted-foreground">
                    Compartilhe com seu cliente para visualização online
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded truncate">
                    {linkAtivo}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      copiarLink();
                      setLinkPopoverOpen(false);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleAbrirLink}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Abrir
                  </Button>
                </div>

                <Separator />

                {/* Estatísticas rápidas */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Visualizações:</span>
                  <span className="font-medium">{totalVisualizacoes}</span>
                </div>

                {tokenData?.expira_em && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Expira em:</span>
                    <span className="font-medium">
                      {new Date(tokenData.expira_em).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}

                <Separator />

                {/* Link para sheet de atividade */}
                <PropostaActivitySheetOportunidade oportunidadeId={oportunidadeId} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Gerar Link Público</p>
                  <p className="text-xs text-muted-foreground">
                    Crie um link para o cliente visualizar e responder à proposta online
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    gerarLink();
                    setLinkPopoverOpen(false);
                  }}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link className="h-4 w-4 mr-2" />
                  )}
                  Gerar Link Público
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Botão de atividade (se tiver link) */}
        {linkAtivo && totalVisualizacoes > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <PropostaActivitySheetOportunidade 
                  oportunidadeId={oportunidadeId} 
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Atividade</span>
                    </Button>
                  }
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver atividade da proposta</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
