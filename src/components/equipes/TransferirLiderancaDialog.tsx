import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Crown } from "lucide-react";

interface TransferirLiderancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipeId: string;
  equipeNome: string;
  liderAtualId: string | null;
  membros: Array<{
    usuario_id: string;
    perfis_usuario?: {
      primeiro_nome?: string;
      sobrenome?: string;
    };
  }>;
  allUsers: Array<{
    user_id: string;
    email: string;
  }>;
  onTransferir: (novoLiderId: string, motivo: string) => Promise<void>;
  isLoading: boolean;
}

export function TransferirLiderancaDialog({
  open,
  onOpenChange,
  equipeId,
  equipeNome,
  liderAtualId,
  membros,
  allUsers,
  onTransferir,
  isLoading,
}: TransferirLiderancaDialogProps) {
  const [novoLiderId, setNovoLiderId] = useState<string>("");
  const [motivo, setMotivo] = useState<string>("");

  const handleSubmit = async () => {
    if (!novoLiderId) return;
    
    await onTransferir(novoLiderId, motivo);
    setNovoLiderId("");
    setMotivo("");
  };

  const liderAtual = allUsers?.find(u => u.user_id === liderAtualId);
  
  // Filtrar membros que não são o líder atual
  const membrosElegiveis = membros.filter(m => m.usuario_id !== liderAtualId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Transferir Liderança
          </DialogTitle>
          <DialogDescription>
            Transferir a liderança da equipe "{equipeNome}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {liderAtual && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Líder Atual:</strong> {liderAtual.email}
                <br />
                <span className="text-sm text-muted-foreground">
                  Esta ação não pode ser desfeita. O líder atual perderá as permissões de gestão da equipe.
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="novo-lider">Novo Líder *</Label>
            <Select value={novoLiderId} onValueChange={setNovoLiderId}>
              <SelectTrigger id="novo-lider">
                <SelectValue placeholder="Selecione o novo líder" />
              </SelectTrigger>
              <SelectContent>
                {membrosElegiveis.map((membro) => {
                  const user = allUsers?.find(u => u.user_id === membro.usuario_id);
                  const perfil = membro.perfis_usuario;
                  const nome = perfil 
                    ? `${perfil.primeiro_nome || ''} ${perfil.sobrenome || ''}`.trim() 
                    : '';
                  
                  return (
                    <SelectItem key={membro.usuario_id} value={membro.usuario_id}>
                      <div className="flex flex-col">
                        {nome && <span className="font-medium">{nome}</span>}
                        <span className="text-sm text-muted-foreground">{user?.email}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {membrosElegiveis.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Adicione mais membros à equipe antes de transferir a liderança.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da transferência..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!novoLiderId || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transferir Liderança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
