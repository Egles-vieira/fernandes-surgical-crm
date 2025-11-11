import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, AlertCircle } from "lucide-react";
import { MetaVendedor } from "@/hooks/useMetasVendedor";
import { format } from "date-fns";

interface EditarMetaVendedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: MetaVendedor | null;
  onEditar: (metaId: string, dados: any) => void;
}

export function EditarMetaVendedorDialog({
  open,
  onOpenChange,
  meta,
  onEditar,
}: EditarMetaVendedorDialogProps) {
  const [metaValor, setMetaValor] = useState("");
  const [metaUnidades, setMetaUnidades] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // Preencher campos quando meta mudar
  useEffect(() => {
    if (meta) {
      setMetaValor(meta.meta_valor.toString());
      setMetaUnidades(meta.meta_unidades?.toString() || "");
      setPeriodoInicio(format(new Date(meta.periodo_inicio), "yyyy-MM-dd"));
      setPeriodoFim(format(new Date(meta.periodo_fim), "yyyy-MM-dd"));
      setObservacao("");
      setErro(null);
    }
  }, [meta]);

  const resetForm = () => {
    setMetaValor("");
    setMetaUnidades("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setObservacao("");
    setErro(null);
  };

  const validarPeriodo = () => {
    if (!periodoInicio || !periodoFim) {
      return "Período início e fim são obrigatórios";
    }

    const dataInicio = new Date(periodoInicio);
    const dataFim = new Date(periodoFim);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Validar que data fim é maior que data início
    if (dataFim <= dataInicio) {
      return "A data fim deve ser posterior à data início";
    }

    // Não permitir editar período que já passou completamente
    if (dataFim < hoje) {
      return "Não é possível editar meta com período já encerrado";
    }

    // Avisar se estiver editando período já iniciado
    if (dataInicio < hoje && meta) {
      const dataInicioOriginal = new Date(meta.periodo_inicio);
      // Só permite se a nova data início for igual à original
      if (dataInicio.getTime() !== dataInicioOriginal.getTime()) {
        return "Não é possível alterar a data de início de meta já em andamento";
      }
    }

    return null;
  };

  const handleSubmit = () => {
    if (!meta || !metaValor || !periodoInicio || !periodoFim) {
      setErro("Preencha todos os campos obrigatórios");
      return;
    }

    const erroValidacao = validarPeriodo();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    // Verificar se houve alterações
    const valorAlterado = parseFloat(metaValor) !== meta.meta_valor;
    const unidadesAlteradas = metaUnidades 
      ? parseInt(metaUnidades) !== (meta.meta_unidades || 0)
      : false;
    const periodoAlterado = 
      periodoFim !== format(new Date(meta.periodo_fim), "yyyy-MM-dd");

    if (!valorAlterado && !unidadesAlteradas && !periodoAlterado) {
      setErro("Nenhuma alteração foi detectada");
      return;
    }

    const dadosAtualizacao = {
      meta_valor: parseFloat(metaValor),
      meta_unidades: metaUnidades ? parseInt(metaUnidades) : null,
      periodo_inicio: new Date(periodoInicio).toISOString(),
      periodo_fim: new Date(periodoFim).toISOString(),
      observacao: observacao || "Meta editada",
      valor_anterior: meta.meta_valor,
      unidades_anterior: meta.meta_unidades,
      periodo_fim_anterior: meta.periodo_fim,
    };

    onEditar(meta.id, dadosAtualizacao);
    resetForm();
    onOpenChange(false);
  };

  if (!meta) return null;

  const metaAtiva = meta.status === "ativa";
  const metaEmAndamento = new Date(meta.periodo_inicio) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Editar Meta Individual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!metaAtiva && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta meta está com status "{meta.status}". Alterações podem não ter efeito esperado.
              </AlertDescription>
            </Alert>
          )}

          {metaEmAndamento && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Meta já iniciada. A data de início não pode ser alterada.
              </AlertDescription>
            </Alert>
          )}

          {erro && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="valor">Meta de Valor (R$)*</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={metaValor}
              onChange={(e) => setMetaValor(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Valor atual: {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(meta.meta_valor)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unidades">Meta de Unidades (opcional)</Label>
            <Input
              id="unidades"
              type="number"
              value={metaUnidades}
              onChange={(e) => setMetaUnidades(e.target.value)}
              placeholder="0"
            />
            {meta.meta_unidades && (
              <p className="text-xs text-muted-foreground">
                Valor atual: {meta.meta_unidades} unidades
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inicio">Período Início*</Label>
              <Input
                id="inicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                disabled={metaEmAndamento}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fim">Período Fim*</Label>
              <Input
                id="fim"
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Motivo da Alteração</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o motivo da alteração da meta..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
