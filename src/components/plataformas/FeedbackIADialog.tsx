import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useIAFeedback } from "@/hooks/useIAFeedback";
import type { SugestaoProduto } from "@/types/ia-analysis";
import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";

interface FeedbackIADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  sugestao: SugestaoProduto;
}

export function FeedbackIADialog({ open, onOpenChange, itemId, sugestao }: FeedbackIADialogProps) {
  const [tipoFeedback, setTipoFeedback] = useState<string>('correto');
  const [foiAceito, setFoiAceito] = useState(true);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const { enviarFeedback, isSubmitting } = useIAFeedback();

  const handleSubmit = async () => {
    try {
      await enviarFeedback({
        cotacao_item_id: itemId,
        produto_sugerido_id: sugestao.produto_id,
        tipo_feedback: tipoFeedback,
        foi_aceito: foiAceito,
        motivo_rejeicao: motivoRejeicao || undefined,
        score_original: sugestao.score_final,
        detalhes_contexto: {
          score_token: sugestao.score_token,
          score_semantico: sugestao.score_semantico,
          confianca: sugestao.confianca,
          razoes_match: sugestao.razoes_match,
        },
      });
      onOpenChange(false);
      // Resetar formulário
      setTipoFeedback('correto');
      setFoiAceito(true);
      setMotivoRejeicao('');
    } catch (err) {
      console.error('Erro ao enviar feedback:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Feedback da Sugestão</DialogTitle>
          <DialogDescription>
            Ajude a melhorar as sugestões da IA fornecendo seu feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações da sugestão */}
          <div className="bg-muted p-3 rounded-md space-y-1">
            <p className="font-medium text-sm">{sugestao.descricao}</p>
            <p className="text-xs text-muted-foreground">Código: {sugestao.codigo}</p>
            <div className="flex items-center gap-2 text-xs">
              <span>Score: {sugestao.score_final}%</span>
              <span>•</span>
              <span>Confiança: {sugestao.confianca}</span>
            </div>
          </div>

          {/* Tipo de feedback */}
          <div className="space-y-3">
            <Label>Esta sugestão foi útil?</Label>
            <RadioGroup
              value={foiAceito ? 'aceito' : 'rejeitado'}
              onValueChange={(value) => {
                setFoiAceito(value === 'aceito');
                if (value === 'aceito') {
                  setTipoFeedback('correto');
                }
              }}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="aceito"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                  foiAceito ? 'border-primary' : ''
                }`}
              >
                <RadioGroupItem value="aceito" id="aceito" className="sr-only" />
                <ThumbsUp className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Sim, ótima sugestão</span>
              </Label>
              <Label
                htmlFor="rejeitado"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${
                  !foiAceito ? 'border-primary' : ''
                }`}
              >
                <RadioGroupItem value="rejeitado" id="rejeitado" className="sr-only" />
                <ThumbsDown className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Não, incorreta</span>
              </Label>
            </RadioGroup>
          </div>

          {!foiAceito && (
            <div className="space-y-3">
              <Label>Qual foi o problema?</Label>
              <RadioGroup value={tipoFeedback} onValueChange={setTipoFeedback}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="produto_diferente" id="produto_diferente" />
                  <Label htmlFor="produto_diferente" className="font-normal cursor-pointer">
                    Produto completamente diferente
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="especificacao_errada" id="especificacao_errada" />
                  <Label htmlFor="especificacao_errada" className="font-normal cursor-pointer">
                    Especificações incompatíveis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="marca_errada" id="marca_errada" />
                  <Label htmlFor="marca_errada" className="font-normal cursor-pointer">
                    Marca incorreta
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outro" id="outro" />
                  <Label htmlFor="outro" className="font-normal cursor-pointer">
                    Outro motivo
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Comentário adicional */}
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Comentário adicional {!foiAceito && '(opcional)'}
            </Label>
            <Textarea
              id="motivo"
              placeholder={
                foiAceito
                  ? "O que você achou bom nesta sugestão?"
                  : "Descreva o problema ou sugira melhorias..."
              }
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
