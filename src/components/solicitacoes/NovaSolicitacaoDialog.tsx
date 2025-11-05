import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { limparCNPJ, validarCNPJ } from "@/lib/cnpja-utils";

interface NovaSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaSolicitacaoDialog({ open, onOpenChange }: NovaSolicitacaoDialogProps) {
  const navigate = useNavigate();
  const [cnpj, setCnpj] = useState("");
  const [erro, setErro] = useState("");

  const handleIniciar = () => {
    setErro("");
    
    if (!cnpj.trim()) {
      setErro("Digite um CNPJ");
      return;
    }

    if (!validarCNPJ(cnpj)) {
      setErro("CNPJ inválido");
      return;
    }

    const cnpjLimpo = limparCNPJ(cnpj);
    navigate(`/clientes/cadastro-cnpj?cnpj=${cnpjLimpo}`);
  };

  const handleClose = () => {
    setCnpj("");
    setErro("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Cadastro</DialogTitle>
          <DialogDescription>
            Digite o CNPJ da empresa para iniciar uma nova solicitação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => {
                setCnpj(e.target.value);
                setErro("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleIniciar()}
              autoFocus
            />
            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleIniciar}>
            <Search className="h-4 w-4 mr-2" />
            Iniciar Consulta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
