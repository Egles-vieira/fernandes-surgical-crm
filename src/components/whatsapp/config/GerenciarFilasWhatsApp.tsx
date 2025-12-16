import { useState } from "react";
import { useWhatsAppFilas, WhatsAppFila, WhatsAppFilaInsert, OperadorFila } from "@/hooks/useWhatsAppFilas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MoreHorizontal, Pencil, Trash2, RotateCcw, Clock, Users, Inbox, X, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CORES_DISPONIVEIS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

const ICONES_DISPONIVEIS = [
  { value: "inbox", label: "Caixa de Entrada" },
  { value: "users", label: "Usuários" },
  { value: "headphones", label: "Suporte" },
  { value: "star", label: "VIP" },
  { value: "zap", label: "Urgente" },
  { value: "briefcase", label: "Comercial" },
  { value: "heart", label: "SAC" },
  { value: "settings", label: "Técnico" },
];

const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface FilaFormData {
  nome: string;
  descricao: string;
  cor: string;
  icone: string;
  sla_primeira_resposta_minutos: number;
  sla_resolucao_minutos: number;
  max_conversas_simultaneas: number | null;
  horario_inicio: string;
  horario_fim: string;
  dias_semana: number[];
}

const initialFormData: FilaFormData = {
  nome: "",
  descricao: "",
  cor: "#3B82F6",
  icone: "inbox",
  sla_primeira_resposta_minutos: 5,
  sla_resolucao_minutos: 60,
  max_conversas_simultaneas: null,
  horario_inicio: "",
  horario_fim: "",
  dias_semana: [1, 2, 3, 4, 5],
};

export function GerenciarFilasWhatsApp() {
  const { 
    filas, 
    todasFilas, 
    isLoading, 
    createFila, 
    updateFila, 
    deleteFila, 
    reativarFila,
    operadoresDisponiveis,
    getOperadoresDaFila,
    getOperadoresNaoVinculados,
    vincularOperador,
    desvincularOperador,
  } = useWhatsAppFilas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFila, setEditingFila] = useState<WhatsAppFila | null>(null);
  const [formData, setFormData] = useState<FilaFormData>(initialFormData);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedOperadorId, setSelectedOperadorId] = useState<string>("");

  const filasExibidas = showInactive ? todasFilas : filas;

  const handleVincularOperador = async () => {
    if (!selectedOperadorId || !editingFila) return;
    await vincularOperador.mutateAsync({ operadorId: selectedOperadorId, filaId: editingFila.id });
    setSelectedOperadorId("");
  };

  const handleDesvincularOperador = async (operadorId: string) => {
    if (!editingFila) return;
    await desvincularOperador.mutateAsync({ operadorId, filaId: editingFila.id });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "pausa": return "bg-yellow-500";
      case "ocupado": return "bg-orange-500";
      default: return "bg-gray-400";
    }
  };

  const getOperadorNomeCompleto = (op: OperadorFila) => {
    return `${op.primeiro_nome || ""} ${op.sobrenome || ""}`.trim() || "Sem nome";
  };

  const getOperadorIniciais = (op: OperadorFila) => {
    const nome = op.primeiro_nome || "";
    const sobrenome = op.sobrenome || "";
    return `${nome.charAt(0)}${sobrenome.charAt(0)}`.toUpperCase() || "?";
  };

  const handleOpenCreate = () => {
    setEditingFila(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (fila: WhatsAppFila) => {
    setEditingFila(fila);
    setFormData({
      nome: fila.nome,
      descricao: fila.descricao || "",
      cor: fila.cor,
      icone: fila.icone,
      sla_primeira_resposta_minutos: fila.sla_primeira_resposta_minutos,
      sla_resolucao_minutos: fila.sla_resolucao_minutos,
      max_conversas_simultaneas: fila.max_conversas_simultaneas,
      horario_inicio: fila.horario_inicio || "",
      horario_fim: fila.horario_fim || "",
      dias_semana: fila.dias_semana || [1, 2, 3, 4, 5],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: WhatsAppFilaInsert = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      cor: formData.cor,
      icone: formData.icone,
      sla_primeira_resposta_minutos: formData.sla_primeira_resposta_minutos,
      sla_resolucao_minutos: formData.sla_resolucao_minutos,
      max_conversas_simultaneas: formData.max_conversas_simultaneas || null,
      horario_inicio: formData.horario_inicio || null,
      horario_fim: formData.horario_fim || null,
      dias_semana: formData.dias_semana,
    };

    if (editingFila) {
      await updateFila.mutateAsync({ id: editingFila.id, ...payload });
    } else {
      await createFila.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteFila.mutateAsync(id);
  };

  const handleReativar = async (id: string) => {
    await reativarFila.mutateAsync(id);
  };

  const toggleDiaSemana = (dia: number) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia].sort(),
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Filas de Atendimento WhatsApp
            </CardTitle>
            <CardDescription>
              Gerencie as filas de atendimento específicas do WhatsApp com SLA e horários
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
                Mostrar inativas
              </Label>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fila
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filasExibidas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma fila cadastrada. Crie a primeira fila clicando no botão acima.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Operadores</TableHead>
                  <TableHead>SLA 1ª Resposta</TableHead>
                  <TableHead>SLA Resolução</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasExibidas.map((fila) => (
                  <TableRow key={fila.id} className={!fila.esta_ativa ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: fila.cor }}
                        />
                        <div>
                          <div className="font-medium">{fila.nome}</div>
                          {fila.descricao && (
                            <div className="text-xs text-muted-foreground">{fila.descricao}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const operadoresFila = getOperadoresDaFila(fila.id);
                        const count = operadoresFila.length;
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-pointer">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{count}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {count === 0 ? (
                                  <span>Nenhum operador vinculado</span>
                                ) : (
                                  <div className="space-y-1">
                                    {operadoresFila.map(op => (
                                      <div key={op.id} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(op.status_atendimento_whatsapp)}`} />
                                        <span>{getOperadorNomeCompleto(op)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {fila.sla_primeira_resposta_minutos} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {fila.sla_resolucao_minutos} min
                      </div>
                    </TableCell>
                    <TableCell>
                      {fila.horario_inicio && fila.horario_fim ? (
                        <span className="text-sm">
                          {fila.horario_inicio.slice(0, 5)} - {fila.horario_fim.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">24h</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {DIAS_SEMANA.map(dia => (
                          <span
                            key={dia.value}
                            className={`text-xs px-1 rounded ${
                              fila.dias_semana?.includes(dia.value)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {dia.label[0]}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fila.esta_ativa ? "default" : "secondary"}>
                        {fila.esta_ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(fila)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {fila.esta_ativa ? (
                            <DropdownMenuItem
                              onClick={() => handleDelete(fila.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Desativar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReativar(fila.id)}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reativar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingFila ? "Editar Fila" : "Nova Fila de WhatsApp"}
            </SheetTitle>
            <SheetDescription>
              Configure os parâmetros da fila de atendimento
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-6 py-4">
            {/* Nome e Descrição */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Fila *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Vendas, Suporte, VIP"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {CORES_DISPONIVEIS.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setFormData({ ...formData, cor })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.cor === cor ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional da fila"
                rows={2}
              />
            </div>

            {/* SLA */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sla_primeira_resposta">SLA 1ª Resposta (min)</Label>
                <Input
                  id="sla_primeira_resposta"
                  type="number"
                  value={formData.sla_primeira_resposta_minutos}
                  onChange={(e) =>
                    setFormData({ ...formData, sla_primeira_resposta_minutos: parseInt(e.target.value) || 5 })
                  }
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sla_resolucao">SLA Resolução (min)</Label>
                <Input
                  id="sla_resolucao"
                  type="number"
                  value={formData.sla_resolucao_minutos}
                  onChange={(e) =>
                    setFormData({ ...formData, sla_resolucao_minutos: parseInt(e.target.value) || 60 })
                  }
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_conversas">Máx. Conversas Simultâneas</Label>
                <Input
                  id="max_conversas"
                  type="number"
                  value={formData.max_conversas_simultaneas || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_conversas_simultaneas: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Ilimitado"
                  min={1}
                />
              </div>
            </div>

            {/* Horário */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horario_inicio">Horário de Início</Label>
                <Input
                  id="horario_inicio"
                  type="time"
                  value={formData.horario_inicio}
                  onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
                />
            </div>

            {/* Operadores da Fila - só aparece ao editar */}
            {editingFila && (
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <Label className="text-base font-semibold">Operadores da Fila</Label>
                </div>

                {/* Adicionar operador */}
                <div className="flex gap-2">
                  <Select value={selectedOperadorId} onValueChange={setSelectedOperadorId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar operador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperadoresNaoVinculados(editingFila.id).map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(op.status_atendimento_whatsapp)}`} />
                            {getOperadorNomeCompleto(op)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleVincularOperador} 
                    disabled={!selectedOperadorId || vincularOperador.isPending}
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {/* Lista de operadores vinculados */}
                <div className="space-y-2">
                  {getOperadoresDaFila(editingFila.id).length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
                      Nenhum operador vinculado a esta fila
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {getOperadoresDaFila(editingFila.id).map((op) => (
                        <div
                          key={op.id}
                          className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={op.url_avatar || undefined} />
                              <AvatarFallback className="text-xs">
                                {getOperadorIniciais(op)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(op.status_atendimento_whatsapp)}`} />
                              <span className="text-sm font-medium">{getOperadorNomeCompleto(op)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDesvincularOperador(op.id)}
                            disabled={desvincularOperador.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
              <div className="space-y-2">
                <Label htmlFor="horario_fim">Horário de Fim</Label>
                <Input
                  id="horario_fim"
                  type="time"
                  value={formData.horario_fim}
                  onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
                />
              </div>
            </div>

            {/* Dias da Semana */}
            <div className="space-y-2">
              <Label>Dias de Funcionamento</Label>
              <div className="flex gap-2">
                {DIAS_SEMANA.map((dia) => (
                  <Button
                    key={dia.value}
                    type="button"
                    variant={formData.dias_semana.includes(dia.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDiaSemana(dia.value)}
                  >
                    {dia.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.nome || createFila.isPending || updateFila.isPending}
            >
              {editingFila ? "Salvar Alterações" : "Criar Fila"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
