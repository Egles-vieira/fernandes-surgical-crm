import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PropostaRecusarDialogOportunidadeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenId: string;
  oportunidadeId: string;
}

const MOTIVOS_RECUSA = [
  { value: 'preco', label: 'Preço acima do orçamento' },
  { value: 'prazo', label: 'Prazo não atende' },
  { value: 'concorrente', label: 'Optamos por outro fornecedor' },
  { value: 'cancelado', label: 'Projeto cancelado/adiado' },
  { value: 'outro', label: 'Outro motivo' }
];

export function PropostaRecusarDialogOportunidade({ 
  open, 
  onOpenChange, 
  tokenId, 
  oportunidadeId 
}: PropostaRecusarDialogOportunidadeProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    motivo: '',
    comentario: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.motivo) {
      toast.error('Por favor, selecione um motivo');
      return;
    }

    setLoading(true);
    try {
      const motivoLabel = MOTIVOS_RECUSA.find(m => m.value === formData.motivo)?.label || formData.motivo;
      
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/proposta-responder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            tokenId,
            oportunidadeId,
            tipoResposta: 'recusada',
            nome: formData.nome || null,
            motivoRecusa: motivoLabel,
            comentario: formData.comentario || null
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erro ao processar recusa');
      }

      toast.success('Feedback enviado', {
        description: 'Agradecemos o retorno. Qualquer dúvida, estamos à disposição.'
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao recusar proposta:', err);
      toast.error('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Recusar Proposta
          </DialogTitle>
          <DialogDescription>
            Gostaríamos de entender o motivo para podermos melhorar nossas propostas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Seu nome (opcional)</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-3">
            <Label>Motivo da recusa *</Label>
            <RadioGroup
              value={formData.motivo}
              onValueChange={(value) => setFormData(prev => ({ ...prev, motivo: value }))}
              className="space-y-2"
            >
              {MOTIVOS_RECUSA.map(motivo => (
                <div key={motivo.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={motivo.value} id={`op-${motivo.value}`} />
                  <Label htmlFor={`op-${motivo.value}`} className="font-normal cursor-pointer">
                    {motivo.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">Comentário adicional</Label>
            <Textarea
              id="comentario"
              value={formData.comentario}
              onChange={(e) => setFormData(prev => ({ ...prev, comentario: e.target.value }))}
              placeholder="Pode nos contar mais sobre sua decisão?"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              variant="destructive"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                'Enviar Feedback'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
