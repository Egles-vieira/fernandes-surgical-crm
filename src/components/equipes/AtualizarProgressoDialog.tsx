import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MetaComProgresso } from "@/hooks/useMetasEquipe";

interface AtualizarProgressoDialogProps {
  meta: MetaComProgresso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAtualizar: (metaId: string, novoValor: number, observacao?: string) => void;
}

export function AtualizarProgressoDialog({
  meta,
  open,
  onOpenChange,
  onAtualizar,
}: AtualizarProgressoDialogProps) {
  const [novoValor, setNovoValor] = useState("");
  const [observacao, setObservacao] = useState("");

  if (!meta) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAtualizar(meta.id, parseFloat(novoValor), observacao || undefined);
    setNovoValor("");
    setObservacao("");
    onOpenChange(false);
  };

  const formatValor = (valor: number) => {
    if (meta.unidade_medida === 'R$') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(valor);
    }
    return `${valor.toFixed(2)} ${meta.unidade_medida || ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar Progresso</DialogTitle>
          <DialogDescription>{meta.nome}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Atual:</span>
              <span className="font-semibold">{formatValor(meta.valor_atual)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Objetivo:</span>
              <span className="font-semibold">{formatValor(meta.valor_objetivo)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso:</span>
              <span className="font-semibold">{meta.percentual_conclusao.toFixed(1)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="novo-valor">Novo Valor *</Label>
            <Input
              id="novo-valor"
              type="number"
              step="0.01"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              placeholder={`Ex: ${meta.valor_objetivo}`}
              required
            />
            <p className="text-sm text-muted-foreground">
              Unidade: {meta.unidade_medida}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione um comentário sobre esta atualização..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Atualizar Progresso
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
