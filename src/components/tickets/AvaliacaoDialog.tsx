import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AvaliacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumero: string;
}

export function AvaliacaoDialog({ open, onOpenChange, ticketId, ticketNumero }: AvaliacaoDialogProps) {
  const [avaliacao, setAvaliacao] = useState(0);
  const [comentario, setComentario] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (avaliacao === 0) {
      toast({
        title: "Avaliação necessária",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("tickets")
      .update({
        avaliacao,
        comentario_avaliacao: comentario,
        avaliado_em: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Erro ao avaliar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Adicionar interação
    await supabase.from("tickets_interacoes").insert({
      ticket_id: ticketId,
      tipo_interacao: "avaliacao",
      mensagem: `Cliente avaliou com ${avaliacao} estrelas${comentario ? `: ${comentario}` : ""}`,
      mensagem_interna: false,
    });

    toast({
      title: "Avaliação enviada!",
      description: "Obrigado pelo seu feedback.",
    });

    queryClient.invalidateQueries({ queryKey: ["tickets"] });
    queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    
    onOpenChange(false);
    setAvaliacao(0);
    setComentario("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Avaliar Atendimento</DialogTitle>
          <DialogDescription>
            Ticket {ticketNumero} - Como foi sua experiência?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-medium">Qual sua nota para este atendimento?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setAvaliacao(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredStar || avaliacao)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {avaliacao > 0 && (
              <p className="text-sm text-muted-foreground">
                {avaliacao === 1 && "Muito insatisfeito"}
                {avaliacao === 2 && "Insatisfeito"}
                {avaliacao === 3 && "Neutro"}
                {avaliacao === 4 && "Satisfeito"}
                {avaliacao === 5 && "Muito satisfeito"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Deixe um comentário (opcional)
            </label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conte-nos mais sobre sua experiência..."
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Enviar Avaliação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
