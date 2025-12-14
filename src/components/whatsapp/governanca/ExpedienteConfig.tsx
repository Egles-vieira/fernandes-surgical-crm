/**
 * Configuração de Expedientes WhatsApp
 * Define horários de funcionamento por unidade/setor
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Expediente {
  id: string;
  nome: string;
  unidade_id?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  permite_fila: boolean;
  esta_ativo: boolean;
  unidade?: { nome: string };
}

interface ExpedienteFormData {
  nome: string;
  unidade_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  permite_fila: boolean;
  esta_ativo: boolean;
}

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export function ExpedienteConfig() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpediente, setEditingExpediente] = useState<Expediente | null>(null);
  const [formData, setFormData] = useState<ExpedienteFormData>({
    nome: '',
    unidade_id: '',
    dia_semana: 1,
    hora_inicio: '08:00',
    hora_fim: '18:00',
    permite_fila: true,
    esta_ativo: true,
  });

  const queryClient = useQueryClient();

  // Buscar unidades para select
  const { data: unidades } = useQuery({
    queryKey: ['whatsapp-unidades-select'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('whatsapp_unidades' as any)
        .select('id, nome')
        .eq('esta_ativa', true)
        .order('nome') as any);
      if (error) throw error;
      return data as { id: string; nome: string }[];
    }
  });

  // Buscar expedientes
  const { data: expedientes, isLoading } = useQuery({
    queryKey: ['whatsapp-expedientes'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('whatsapp_expedientes' as any)
        .select(`
          *,
          unidade:whatsapp_unidades(nome)
        `)
        .order('dia_semana')
        .order('hora_inicio') as any);
      if (error) throw error;
      return data as Expediente[];
    }
  });

  // Criar/Atualizar expediente
  const salvarMutation = useMutation({
    mutationFn: async (data: ExpedienteFormData) => {
      const payload = {
        nome: data.nome || `Expediente ${DIAS_SEMANA.find(d => d.value === data.dia_semana)?.label}`,
        unidade_id: data.unidade_id || null,
        dia_semana: data.dia_semana,
        hora_inicio: data.hora_inicio,
        hora_fim: data.hora_fim,
        permite_fila: data.permite_fila,
        esta_ativo: data.esta_ativo,
      };

      if (editingExpediente) {
        const { error } = await (supabase
          .from('whatsapp_expedientes' as any)
          .update(payload)
          .eq('id', editingExpediente.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('whatsapp_expedientes' as any)
          .insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-expedientes'] });
      toast.success(editingExpediente ? 'Expediente atualizado!' : 'Expediente criado!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  // Excluir expediente
  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('whatsapp_expedientes' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-expedientes'] });
      toast.success('Expediente excluído!');
    }
  });

  // Criar expediente padrão (seg-sex 08-18h)
  const criarPadraoMutation = useMutation({
    mutationFn: async () => {
      const expedientesPadrao = [1, 2, 3, 4, 5].map(dia => ({
        nome: `Expediente ${DIAS_SEMANA.find(d => d.value === dia)?.label}`,
        dia_semana: dia,
        hora_inicio: '08:00',
        hora_fim: '18:00',
        permite_fila: true,
        esta_ativo: true,
      }));

      const { error } = await (supabase
        .from('whatsapp_expedientes' as any)
        .insert(expedientesPadrao) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-expedientes'] });
      toast.success('Expediente padrão criado (Seg-Sex 08:00-18:00)!');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      unidade_id: '',
      dia_semana: 1,
      hora_inicio: '08:00',
      hora_fim: '18:00',
      permite_fila: true,
      esta_ativo: true,
    });
    setEditingExpediente(null);
    setDialogOpen(false);
  };

  const handleEdit = (expediente: Expediente) => {
    setEditingExpediente(expediente);
    setFormData({
      nome: expediente.nome,
      unidade_id: expediente.unidade_id || '',
      dia_semana: expediente.dia_semana,
      hora_inicio: expediente.hora_inicio,
      hora_fim: expediente.hora_fim,
      permite_fila: expediente.permite_fila,
      esta_ativo: expediente.esta_ativo,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salvarMutation.mutate(formData);
  };

  const getDiaLabel = (dia: number) => DIAS_SEMANA.find(d => d.value === dia)?.label || dia;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Expediente
            </CardTitle>
            <CardDescription>
              Configure os horários de funcionamento do atendimento
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!expedientes?.length && (
              <Button 
                variant="outline" 
                onClick={() => criarPadraoMutation.mutate()}
                disabled={criarPadraoMutation.isPending}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Criar Padrão
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Horário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpediente ? 'Editar Expediente' : 'Novo Expediente'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure o horário de funcionamento
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome (opcional)</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Expediente Comercial"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unidade (opcional)</Label>
                      <Select
                        value={formData.unidade_id}
                        onValueChange={(v) => setFormData({ ...formData, unidade_id: v === "__all__" ? null : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as unidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas as unidades</SelectItem>
                          {unidades?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Dia da Semana</Label>
                      <Select
                        value={String(formData.dia_semana)}
                        onValueChange={(v) => setFormData({ ...formData, dia_semana: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIAS_SEMANA.map((d) => (
                            <SelectItem key={d.value} value={String(d.value)}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hora_inicio">Hora Início</Label>
                        <Input
                          id="hora_inicio"
                          type="time"
                          value={formData.hora_inicio}
                          onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hora_fim">Hora Fim</Label>
                        <Input
                          id="hora_fim"
                          type="time"
                          value={formData.hora_fim}
                          onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="permite_fila"
                        checked={formData.permite_fila}
                        onCheckedChange={(v) => setFormData({ ...formData, permite_fila: v })}
                      />
                      <Label htmlFor="permite_fila">Permitir fila de espera</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="esta_ativo"
                        checked={formData.esta_ativo}
                        onCheckedChange={(v) => setFormData({ ...formData, esta_ativo: v })}
                      />
                      <Label htmlFor="esta_ativo">Expediente ativo</Label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={salvarMutation.isPending}>
                      {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando expedientes...
          </div>
        ) : !expedientes?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum expediente cadastrado. Clique em "Criar Padrão" para iniciar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Fila</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expedientes.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">
                    {getDiaLabel(exp.dia_semana)}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">
                      {exp.hora_inicio} - {exp.hora_fim}
                    </span>
                  </TableCell>
                  <TableCell>
                    {exp.unidade?.nome || (
                      <span className="text-muted-foreground">Todas</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {exp.permite_fila ? (
                      <Badge variant="outline" className="text-green-600">Sim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={exp.esta_ativo ? "default" : "secondary"}>
                      {exp.esta_ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(exp)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Excluir este expediente?')) {
                            excluirMutation.mutate(exp.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default ExpedienteConfig;
