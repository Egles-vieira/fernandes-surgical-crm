import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useRoles } from "@/hooks/useRoles";
import { Badge } from "@/components/ui/badge";

interface AtribuirVendedorDialogProps {
  cliente: {
    id: string;
    nome_abrev?: string;
    vendedor_id?: string | null;
    equipe_id?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (clienteId: string, vendedorId: string) => Promise<void>;
}

export function AtribuirVendedorDialog({
  cliente,
  open,
  onOpenChange,
  onConfirm,
}: AtribuirVendedorDialogProps) {
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { allUsers } = useRoles();

  // Filtrar apenas vendedores (users com role 'sales')
  const vendedores = allUsers?.filter(user => 
    user.roles?.includes('sales')
  ) || [];

  const handleConfirm = async () => {
    if (!cliente || !vendedorSelecionado) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(cliente.id, vendedorSelecionado);
      onOpenChange(false);
      setVendedorSelecionado("");
    } catch (error) {
      console.error("Erro ao atribuir vendedor:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Atribuir Vendedor
          </DialogTitle>
          <DialogDescription>
            Atribua um vendedor responsável para o cliente <strong>{cliente.nome_abrev}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {cliente.vendedor_id && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">Vendedor atual:</span>
              <Badge variant="outline">
                {allUsers?.find(u => u.user_id === cliente.vendedor_id)?.email || "Não encontrado"}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vendedor">Selecionar Vendedor</Label>
            <Select value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um vendedor..." />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vendedor) => (
                  <SelectItem key={vendedor.user_id} value={vendedor.user_id}>
                    {vendedor.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!vendedorSelecionado || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atribuindo...
              </>
            ) : (
              "Atribuir Vendedor"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
