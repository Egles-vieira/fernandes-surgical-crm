import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NovaMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipeId: string;
  onCriar: (meta: any) => void;
}

const TIPOS_META = [
  { value: 'vendas', label: 'Vendas' },
  { value: 'atendimentos', label: 'Atendimentos' },
  { value: 'tickets_resolvidos', label: 'Tickets Resolvidos' },
  { value: 'tempo_resposta', label: 'Tempo de Resposta' },
  { value: 'qualidade', label: 'Qualidade' },
  { value: 'produtividade', label: 'Produtividade' },
  { value: 'satisfacao_cliente', label: 'Satisfação do Cliente' },
  { value: 'conversao', label: 'Conversão' },
];

const METRICAS_POR_TIPO: Record<string, { value: string; label: string; unidade: string }[]> = {
  vendas: [
    { value: 'valor_total', label: 'Valor Total', unidade: 'R$' },
    { value: 'quantidade', label: 'Quantidade de Vendas', unidade: 'unidades' },
  ],
  atendimentos: [
    { value: 'quantidade', label: 'Quantidade de Atendimentos', unidade: 'unidades' },
  ],
  tickets_resolvidos: [
    { value: 'quantidade', label: 'Quantidade de Tickets', unidade: 'unidades' },
  ],
  tempo_resposta: [
    { value: 'tempo_medio', label: 'Tempo Médio', unidade: 'horas' },
  ],
  qualidade: [
    { value: 'percentual', label: 'Percentual de Qualidade', unidade: '%' },
  ],
  produtividade: [
    { value: 'percentual', label: 'Percentual de Produtividade', unidade: '%' },
  ],
  satisfacao_cliente: [
    { value: 'percentual', label: 'Percentual de Satisfação', unidade: '%' },
  ],
  conversao: [
    { value: 'percentual', label: 'Taxa de Conversão', unidade: '%' },
  ],
};

export function NovaMetaDialog({ open, onOpenChange, equipeId, onCriar }: NovaMetaDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoMeta, setTipoMeta] = useState("");
  const [metrica, setMetrica] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("");
  const [valorObjetivo, setValorObjetivo] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta" | "critica">("media");

  const metricasDisponiveis = tipoMeta ? METRICAS_POR_TIPO[tipoMeta] || [] : [];

  const handleTipoMetaChange = (value: string) => {
    setTipoMeta(value);
    setMetrica("");
    setUnidadeMedida("");
  };

  const handleMetricaChange = (value: string) => {
    setMetrica(value);
    const metricaSelecionada = metricasDisponiveis.find(m => m.value === value);
    if (metricaSelecionada) {
      setUnidadeMedida(metricaSelecionada.unidade);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCriar({
      equipe_id: equipeId,
      nome,
      descricao: descricao || null,
      tipo_meta: tipoMeta,
      metrica,
      valor_objetivo: parseFloat(valorObjetivo),
      unidade_medida: unidadeMedida,
      periodo_inicio: new Date(periodoInicio).toISOString(),
      periodo_fim: new Date(periodoFim).toISOString(),
      prioridade,
      status: 'ativa',
    });

    // Limpar formulário
    setNome("");
    setDescricao("");
    setTipoMeta("");
    setMetrica("");
    setUnidadeMedida("");
    setValorObjetivo("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setPrioridade("media");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Meta</DialogTitle>
          <DialogDescription>
            Crie uma nova meta para a equipe com acompanhamento automático
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Meta *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Meta de Vendas Q1 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva os detalhes da meta..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo-meta">Tipo de Meta *</Label>
              <Select value={tipoMeta} onValueChange={handleTipoMetaChange} required>
                <SelectTrigger id="tipo-meta">
                  <SelectValue placeholder="Selecione o tipo" />
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
              <Label htmlFor="metrica">Métrica *</Label>
              <Select value={metrica} onValueChange={handleMetricaChange} required disabled={!tipoMeta}>
                <SelectTrigger id="metrica">
                  <SelectValue placeholder="Selecione a métrica" />
                </SelectTrigger>
                <SelectContent>
                  {metricasDisponiveis.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor-objetivo">Valor Objetivo *</Label>
              <Input
                id="valor-objetivo"
                type="number"
                step="0.01"
                value={valorObjetivo}
                onChange={(e) => setValorObjetivo(e.target.value)}
                placeholder="Ex: 100000"
                required
              />
              {unidadeMedida && (
                <p className="text-sm text-muted-foreground">Unidade: {unidadeMedida}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade *</Label>
              <Select value={prioridade} onValueChange={(v: any) => setPrioridade(v)} required>
                <SelectTrigger id="prioridade">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo-inicio">Período Início *</Label>
              <Input
                id="periodo-inicio"
                type="datetime-local"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodo-fim">Período Fim *</Label>
              <Input
                id="periodo-fim"
                type="datetime-local"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Criar Meta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
