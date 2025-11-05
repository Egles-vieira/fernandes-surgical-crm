import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, AlertCircle, ExternalLink } from "lucide-react";
import { limparCNPJ, validarCNPJ } from "@/lib/cnpja-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NovaSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovaSolicitacaoDialog({ open, onOpenChange }: NovaSolicitacaoDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cnpj, setCnpj] = useState("");
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [solicitacaoExistente, setSolicitacaoExistente] = useState<{
    id: string;
    status: string;
    razao_social?: string;
  } | null>(null);

  const verificarCNPJExistente = async (cnpjLimpo: string) => {
    setVerificando(true);
    try {
      const { data, error } = await supabase
        .from("solicitacoes_cadastro")
        .select("id, status, dados_coletados")
        .eq("cnpj", cnpjLimpo)
        .is("excluido_em", null)
        .in("status", ["rascunho", "em_analise"])
        .maybeSingle();

      if (error) {
        console.error("Erro ao verificar CNPJ:", error);
        return null;
      }

      if (data) {
        const razaoSocial = (data.dados_coletados as any)?.razao_social || 
                           (data.dados_coletados as any)?.office?.name;
        return {
          id: data.id,
          status: data.status,
          razao_social: razaoSocial
        };
      }

      return null;
    } finally {
      setVerificando(false);
    }
  };

  const handleIniciar = async () => {
    setErro("");
    setSolicitacaoExistente(null);
    
    if (!cnpj.trim()) {
      setErro("Digite um CNPJ");
      return;
    }

    if (!validarCNPJ(cnpj)) {
      setErro("CNPJ inválido");
      return;
    }

    const cnpjLimpo = limparCNPJ(cnpj);
    
    // Verificar se já existe solicitação
    const existente = await verificarCNPJExistente(cnpjLimpo);
    
    if (existente) {
      setSolicitacaoExistente(existente);
      
      const statusLabel = existente.status === "rascunho" ? "Rascunho" : "Em Análise";
      toast({
        title: "⚠️ Solicitação já existe",
        description: `Já existe uma solicitação ${statusLabel} para este CNPJ${existente.razao_social ? `: ${existente.razao_social}` : ''}`,
        variant: "default",
      });
      return;
    }

    // Não existe, pode criar nova
    navigate(`/clientes/cadastro-cnpj?cnpj=${cnpjLimpo}`);
    handleClose();
  };

  const handleAbrirExistente = () => {
    if (solicitacaoExistente) {
      navigate(`/clientes/cadastro-cnpj?solicitacao=${solicitacaoExistente.id}`);
      handleClose();
    }
  };

  const handleCriarNova = () => {
    const cnpjLimpo = limparCNPJ(cnpj);
    navigate(`/clientes/cadastro-cnpj?cnpj=${cnpjLimpo}`);
    handleClose();
  };

  const handleClose = () => {
    setCnpj("");
    setErro("");
    setSolicitacaoExistente(null);
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
                setSolicitacaoExistente(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleIniciar()}
              autoFocus
              disabled={verificando}
            />
            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}
          </div>

          {/* Alerta de Solicitação Existente */}
          {solicitacaoExistente && (
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-900 dark:text-orange-100">
                <p className="font-medium mb-2">
                  Já existe uma solicitação <strong>{solicitacaoExistente.status === "rascunho" ? "Rascunho" : "Em Análise"}</strong> para este CNPJ.
                </p>
                {solicitacaoExistente.razao_social && (
                  <p className="text-xs mb-3">
                    Empresa: <span className="font-medium">{solicitacaoExistente.razao_social}</span>
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleAbrirExistente}
                    className="flex-1"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Abrir Existente
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCriarNova}
                    className="flex-1"
                  >
                    Criar Nova
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleIniciar} 
            disabled={verificando || !!solicitacaoExistente}
          >
            {verificando ? (
              <>Verificando...</>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Iniciar Consulta
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
