import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";

interface NovaMetaVendedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedorId: string;
  equipeId?: string;
  onCriar: (meta: any) => void;
}

const TIPOS_META = [
  { value: 'vendas', label: 'Vendas' },
  { value: 'atendimentos', label: 'Atendimentos' },
  { value: 'conversao', label: 'Conversão' },
  { value: 'satisfacao_cliente', label: 'Satisfação do Cliente' },
];

export function NovaMetaVendedorDialog({
  open,
  onOpenChange,
  vendedorId,
  equipeId,
  onCriar,
}: NovaMetaVendedorDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoMeta, setTipoMeta] = useState("");
  const [valorObjetivo, setValorObjetivo] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta" | "critica">("media");

  const resetForm = () => {
    setNome("");
    setDescricao("");
    setTipoMeta("");
    setValorObjetivo("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setPrioridade("media");
  };

  const handleSubmit = () => {
    if (!nome || !tipoMeta || !valorObjetivo || !periodoInicio || !periodoFim) {
      return;
    }

    onCriar({
      vendedor_id: vendedorId,
      equipe_id: equipeId,
      nome,
      descricao: descricao || undefined,
      tipo_meta: tipoMeta,
      metrica: 'valor',
      unidade_medida: 'BRL',
      valor_objetivo: parseFloat(valorObjetivo),
      periodo_inicio: new Date(periodoInicio).toISOString(),
      periodo_fim: new Date(periodoFim).toISOString(),
      prioridade,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Definir Meta Individual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Meta*</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Meta de Vendas Q1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva os objetivos e critérios"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Meta*</Label>
              <Select value={tipoMeta} onValueChange={setTipoMeta}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_META.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor Objetivo (R$)*</Label>
              <Input
                id="valor"
                type="number"
                value={valorObjetivo}
                onChange={(e) => setValorObjetivo(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inicio">Período Início*</Label>
              <Input
                id="inicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
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
            <Label htmlFor="prioridade">Prioridade</Label>
            <Select value={prioridade} onValueChange={(v: any) => setPrioridade(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Criar Meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
