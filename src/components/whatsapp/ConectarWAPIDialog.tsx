import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConectarWAPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
}

export const ConectarWAPIDialog = ({ open, onOpenChange, contaId }: ConectarWAPIDialogProps) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const gerarQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      setQrCode(null);

      const { data, error } = await supabase.functions.invoke('w-api-gerar-qrcode', {
        body: { contaId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setQrCode(data.qrcode);
      iniciarPolling();
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar QR Code');
      toast({
        title: "Erro ao gerar QR Code",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verificarStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('w-api-verificar-status', {
        body: { contaId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.connected) {
        setConnected(true);
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ['whatsapp-contas'] });
        toast({
          title: "✅ Conectado com sucesso!",
          description: `Número: ${data.connectedPhone}`,
        });
        setTimeout(() => onOpenChange(false), 2000);
      }

      return data.connected;
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      return false;
    }
  };

  const iniciarPolling = () => {
    setPolling(true);
    setProgress(0);
    
    let attempts = 0;
    const maxAttempts = 60; // 2 minutos (60 * 2seg)
    
    const interval = setInterval(async () => {
      attempts++;
      setProgress((attempts / maxAttempts) * 100);

      const isConnected = await verificarStatus();
      
      if (isConnected || attempts >= maxAttempts) {
        clearInterval(interval);
        setPolling(false);
        
        if (!isConnected) {
          setError('Tempo esgotado. QR Code expirado.');
          toast({
            title: "QR Code expirado",
            description: "Clique em 'Gerar Novo QR Code' para tentar novamente",
            variant: "destructive",
          });
        }
      }
    }, 2000);
  };

  useEffect(() => {
    if (open && !qrCode && !loading) {
      gerarQRCode();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      setPolling(false);
      setQrCode(null);
      setConnected(false);
      setError(null);
      setProgress(0);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Conectar WhatsApp (W-API)
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {connected && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                WhatsApp conectado com sucesso!
              </AlertDescription>
            </Alert>
          )}

          {qrCode && !connected && (
            <>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 object-contain"
                />
              </div>

              {polling && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Aguardando escaneamento...</span>
                    <span className="text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">Como conectar:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em Menu (⋮) &gt; Aparelhos conectados</li>
                  <li>Toque em "Conectar um aparelho"</li>
                  <li>Aponte a câmera para este QR Code</li>
                </ol>
              </div>

              {error && (
                <Button 
                  onClick={gerarQRCode} 
                  variant="outline" 
                  className="w-full"
                  disabled={loading}
                >
                  Gerar Novo QR Code
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
