import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GEDDocumento } from "@/hooks/useGEDDocumentos";
import { GEDStatusBadge } from "./GEDStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Download, X, FileText, FileImage, FileSpreadsheet, 
  File, ExternalLink, ZoomIn, ZoomOut, RotateCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface GEDPreviewDialogProps {
  documento: GEDDocumento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType?.startsWith('image/')) return FileImage;
  if (mimeType?.includes('pdf')) return FileText;
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return FileSpreadsheet;
  return File;
};

const isPreviewable = (mimeType: string) => {
  return mimeType?.startsWith('image/') || mimeType?.includes('pdf');
};

export function GEDPreviewDialog({ documento, open, onOpenChange }: GEDPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (documento && open) {
      loadPreview();
      registrarVisualizacao();
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [documento, open]);

  const loadPreview = async () => {
    if (!documento) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.storage
        .from('ged-documentos')
        .download(documento.arquivo_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
    } catch (error: any) {
      toast.error("Erro ao carregar preview: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const registrarVisualizacao = async () => {
    if (!documento) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('ged_visualizacoes').insert({
          documento_id: documento.id,
          usuario_id: user.id,
          acao: 'visualizou'
        });
      }
    } catch (error) {
      console.error('Erro ao registrar visualização:', error);
    }
  };

  const handleDownload = async () => {
    if (!documento || !previewUrl) return;
    
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = documento.arquivo_nome;
    a.click();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('ged_visualizacoes').insert({
          documento_id: documento.id,
          usuario_id: user.id,
          acao: 'baixou'
        });
      }
    } catch (error) {
      console.error('Erro ao registrar download:', error);
    }
  };

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom(z => Math.max(z - 25, 50));
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const FileIcon = documento ? getFileIcon(documento.tipo_mime || '') : File;
  const canPreview = documento && isPreviewable(documento.tipo_mime || '');
  const isImage = documento?.tipo_mime?.startsWith('image/');
  const isPdf = documento?.tipo_mime?.includes('pdf');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">{documento?.titulo}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {documento?.tipo && (
                    <Badge 
                      variant="secondary"
                      style={{ backgroundColor: documento.tipo.cor + '20', color: documento.tipo.cor }}
                    >
                      {documento.tipo.nome}
                    </Badge>
                  )}
                  {documento && <GEDStatusBadge status={documento.status_validade} />}
                </div>
              </div>
            </div>
            
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Diminuir zoom">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Aumentar zoom">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotacionar">
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                </>
              )}
              <Button variant="ghost" size="icon" onClick={handleOpenExternal} title="Abrir em nova aba">
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-muted/30 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Skeleton className="h-64 w-96 mx-auto" />
                <p className="text-muted-foreground">Carregando preview...</p>
              </div>
            </div>
          ) : canPreview && previewUrl ? (
            <div className="h-full flex items-center justify-center p-4">
              {isImage ? (
                <img 
                  src={previewUrl} 
                  alt={documento?.titulo}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ 
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  }}
                />
              ) : isPdf ? (
                <iframe 
                  src={previewUrl}
                  className="w-full h-full rounded-lg border"
                  title={documento?.titulo}
                />
              ) : null}
            </div>
          ) : (
            /* Fallback para arquivos não visualizáveis */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <div className="p-6 rounded-full bg-muted inline-block">
                  <FileIcon className="h-16 w-16 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Preview não disponível</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Este tipo de arquivo não suporta visualização direta
                  </p>
                </div>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar arquivo
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer com informações */}
        <div className="p-4 border-t bg-card flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Arquivo:</span>
              <p className="font-medium truncate">{documento?.arquivo_nome}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tamanho:</span>
              <p className="font-medium">
                {documento?.tamanho_bytes 
                  ? `${(documento.tamanho_bytes / 1024 / 1024).toFixed(2)} MB`
                  : '-'
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Validade:</span>
              <p className="font-medium">
                {documento?.data_validade 
                  ? format(new Date(documento.data_validade), "dd/MM/yyyy", { locale: ptBR })
                  : 'Sem validade'
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Versão:</span>
              <p className="font-medium">{documento?.versao_label || 'v1.0'}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
