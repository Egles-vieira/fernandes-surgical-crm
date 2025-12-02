import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MessageCircle, Download } from "lucide-react";

interface PropostaFooterProps {
  onAceitar?: () => void;
  onRecusar?: () => void;
  onWhatsApp?: () => void;
  onDownloadPDF?: () => void;
}

export function PropostaFooter({ 
  onAceitar, 
  onRecusar, 
  onWhatsApp, 
  onDownloadPDF 
}: PropostaFooterProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Ações secundárias */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onWhatsApp && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onWhatsApp}
              className="flex-1 sm:flex-none gap-2"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          )}
          
          {onDownloadPDF && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownloadPDF}
              className="flex-1 sm:flex-none gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          )}
        </div>

        {/* Ações principais */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onRecusar && (
            <Button 
              variant="outline" 
              onClick={onRecusar}
              className="flex-1 sm:flex-none gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
              Recusar
            </Button>
          )}
          
          {onAceitar && (
            <Button 
              onClick={onAceitar}
              className="flex-1 sm:flex-none gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              Aceitar Proposta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
