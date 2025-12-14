/**
 * Calendário de Feriados WhatsApp
 * Gerencia feriados e dias especiais de não-atendimento
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
import { CalendarDays, Plus, Pencil, Trash2, Copy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Feriado {
  id: string;
  nome: string;
  data: string;
  tipo: string;
  recorrente: boolean;
  unidade_id?: string;
  esta_ativo: boolean;
  unidade?: { nome: string };
}

interface FeriadoFormData {
  nome: string;
  data: string;
  tipo: string;
  recorrente: boolean;
  unidade_id: string;
  esta_ativo: boolean;
}

const TIPOS_FERIADO = [
  { value: 'nacional', label: 'Nacional' },
  { value: 'estadual', label: 'Estadual' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'ponto_facultativo', label: 'Ponto Facultativo' },
  { value: 'recesso', label: 'Recesso' },
  { value: 'outro', label: 'Outro' },
];

const FERIADOS_NACIONAIS_2025 = [
  { nome: 'Confraternização Universal', data: '2025-01-01' },
  { nome: 'Carnaval', data: '2025-03-04' },
  { nome: 'Sexta-feira Santa', data: '2025-04-18' },
  { nome: 'Tiradentes', data: '2025-04-21' },
  { nome: 'Dia do Trabalho', data: '2025-05-01' },
  { nome: 'Corpus Christi', data: '2025-06-19' },
  { nome: 'Independência do Brasil', data: '2025-09-07' },
  { nome: 'Nossa Senhora Aparecida', data: '2025-10-12' },
  { nome: 'Finados', data: '2025-11-02' },
  { nome: 'Proclamação da República', data: '2025-11-15' },
  { nome: 'Natal', data: '2025-12-25' },
];

export function FeriadosCalendar() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeriado, setEditingFeriado] = useState<Feriado | null>(null);
  const [formData, setFormData] = useState<FeriadoFormData>({
    nome: '',
    data: '',
    tipo: 'nacional',
    recorrente: false,
    unidade_id: '',
    esta_ativo: true,
  });

  const queryClient = useQueryClient();

  // Buscar unidades
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

  // Buscar feriados
  const { data: feriados, isLoading } = useQuery({
    queryKey: ['whatsapp-feriados'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('whatsapp_feriados' as any)
        .select(`
          *,
          unidade:whatsapp_unidades(nome)
        `)
        .order('data') as any);
      if (error) throw error;
      return data as Feriado[];
    }
  });

  // Criar/Atualizar feriado
  const salvarMutation = useMutation({
    mutationFn: async (data: FeriadoFormData) => {
      const payload = {
        nome: data.nome,
        data: data.data,
        tipo: data.tipo,
        recorrente: data.recorrente,
        unidade_id: data.unidade_id || null,
        esta_ativo: data.esta_ativo,
      };

      if (editingFeriado) {
        const { error } = await (supabase
          .from('whatsapp_feriados' as any)
          .update(payload)
          .eq('id', editingFeriado.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('whatsapp_feriados' as any)
          .insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-feriados'] });
      toast.success(editingFeriado ? 'Feriado atualizado!' : 'Feriado criado!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  // Importar feriados nacionais
  const importarNacionaisMutation = useMutation({
    mutationFn: async () => {
      const feriadosImportar = FERIADOS_NACIONAIS_2025.map(f => ({
        nome: f.nome,
        data: f.data,
        tipo: 'nacional',
        recorrente: false,
        esta_ativo: true,
      }));

      const { error } = await (supabase
        .from('whatsapp_feriados' as any)
        .upsert(feriadosImportar, { onConflict: 'data' }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-feriados'] });
      toast.success('Feriados nacionais de 2025 importados!');
    }
  });

  // Excluir feriado
  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('whatsapp_feriados' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-feriados'] });
      toast.success('Feriado excluído!');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      data: '',
      tipo: 'nacional',
      recorrente: false,
      unidade_id: '',
      esta_ativo: true,
    });
    setEditingFeriado(null);
    setDialogOpen(false);
  };

  const handleEdit = (feriado: Feriado) => {
    setEditingFeriado(feriado);
    setFormData({
      nome: feriado.nome,
      data: feriado.data,
      tipo: feriado.tipo,
      recorrente: feriado.recorrente,
      unidade_id: feriado.unidade_id || '',
      esta_ativo: feriado.esta_ativo,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.data) {
      toast.error('Nome e data são obrigatórios');
      return;
    }
    salvarMutation.mutate(formData);
  };

  const getTipoBadgeVariant = (tipo: string): "default" | "secondary" | "outline" | "destructive" => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      nacional: 'default',
      estadual: 'secondary',
      municipal: 'outline',
      ponto_facultativo: 'outline',
      recesso: 'secondary',
      outro: 'outline',
    };
    return variants[tipo] || 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendário de Feriados
            </CardTitle>
            <CardDescription>
              Configure feriados e dias sem atendimento
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => importarNacionaisMutation.mutate()}
              disabled={importarNacionaisMutation.isPending}
            >
              <Copy className="h-4 w-4 mr-2" />
              Importar 2025
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Feriado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingFeriado ? 'Editar Feriado' : 'Novo Feriado'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure os dados do feriado
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Dia da Independência"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="data">Data *</Label>
                        <Input
                          id="data"
                          type="date"
                          value={formData.data}
                          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={formData.tipo}
                          onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_FERIADO.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recorrente"
                        checked={formData.recorrente}
                        onCheckedChange={(v) => setFormData({ ...formData, recorrente: v })}
                      />
                      <Label htmlFor="recorrente">Feriado recorrente (repete todo ano)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="esta_ativo"
                        checked={formData.esta_ativo}
                        onCheckedChange={(v) => setFormData({ ...formData, esta_ativo: v })}
                      />
                      <Label htmlFor="esta_ativo">Feriado ativo</Label>
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
            Carregando feriados...
          </div>
        ) : !feriados?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum feriado cadastrado. Clique em "Importar 2025" para iniciar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Recorrente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feriados.map((feriado) => (
                <TableRow key={feriado.id}>
                  <TableCell className="font-mono">
                    {format(parseISO(feriado.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{feriado.nome}</TableCell>
                  <TableCell>
                    <Badge variant={getTipoBadgeVariant(feriado.tipo)}>
                      {TIPOS_FERIADO.find(t => t.value === feriado.tipo)?.label || feriado.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {feriado.unidade?.nome || (
                      <span className="text-muted-foreground">Todas</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {feriado.recorrente ? (
                      <Badge variant="outline" className="text-green-600">Sim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={feriado.esta_ativo ? "default" : "secondary"}>
                      {feriado.esta_ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(feriado)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Excluir este feriado?')) {
                            excluirMutation.mutate(feriado.id);
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

export default FeriadosCalendar;
