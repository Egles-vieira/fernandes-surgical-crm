/**
 * Gerenciador de Unidades WhatsApp
 * CRUD de unidades de atendimento com cobertura geográfica
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
import { Building2, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Unidade {
  id: string;
  nome: string;
  codigo: string;
  tipo: string;
  timezone: string;
  esta_ativa: boolean;
  endereco?: any;
  criado_em: string;
}

interface UnidadeFormData {
  nome: string;
  codigo: string;
  tipo: string;
  timezone: string;
  esta_ativa: boolean;
  endereco_cep?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
];

const TIPOS_UNIDADE = [
  { value: 'matriz', label: 'Matriz' },
  { value: 'filial', label: 'Filial' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'loja', label: 'Loja' },
  { value: 'cd', label: 'Centro de Distribuição' },
];

export function UnidadesManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [formData, setFormData] = useState<UnidadeFormData>({
    nome: '',
    codigo: '',
    tipo: 'filial',
    timezone: 'America/Sao_Paulo',
    esta_ativa: true,
  });

  const queryClient = useQueryClient();

  // Buscar unidades
  const { data: unidades, isLoading } = useQuery({
    queryKey: ['whatsapp-unidades'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('whatsapp_unidades' as any)
        .select('*')
        .order('nome') as any);
      
      if (error) throw error;
      return data as Unidade[];
    }
  });

  // Criar/Atualizar unidade
  const salvarMutation = useMutation({
    mutationFn: async (data: UnidadeFormData) => {
      const payload = {
        nome: data.nome,
        codigo: data.codigo,
        tipo: data.tipo,
        timezone: data.timezone,
        esta_ativa: data.esta_ativa,
        endereco: data.endereco_cep ? {
          cep: data.endereco_cep,
          cidade: data.endereco_cidade,
          estado: data.endereco_estado
        } : null
      };

      if (editingUnidade) {
        const { error } = await (supabase
          .from('whatsapp_unidades' as any)
          .update(payload)
          .eq('id', editingUnidade.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('whatsapp_unidades' as any)
          .insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-unidades'] });
      toast.success(editingUnidade ? 'Unidade atualizada!' : 'Unidade criada!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar unidade: ' + error.message);
    }
  });

  // Excluir unidade
  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('whatsapp_unidades' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-unidades'] });
      toast.success('Unidade excluída!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir unidade: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      tipo: 'filial',
      timezone: 'America/Sao_Paulo',
      esta_ativa: true,
    });
    setEditingUnidade(null);
    setDialogOpen(false);
  };

  const handleEdit = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setFormData({
      nome: unidade.nome,
      codigo: unidade.codigo,
      tipo: unidade.tipo,
      timezone: unidade.timezone,
      esta_ativa: unidade.esta_ativa,
      endereco_cep: unidade.endereco?.cep,
      endereco_cidade: unidade.endereco?.cidade,
      endereco_estado: unidade.endereco?.estado,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.codigo) {
      toast.error('Nome e código são obrigatórios');
      return;
    }
    salvarMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Unidades de Atendimento
            </CardTitle>
            <CardDescription>
              Configure as unidades/filiais para distribuição de atendimentos
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingUnidade ? 'Editar Unidade' : 'Nova Unidade'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure os dados da unidade de atendimento
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Filial São Paulo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código *</Label>
                      <Input
                        id="codigo"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                        placeholder="Ex: SP01"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                          {TIPOS_UNIDADE.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={formData.timezone}
                        onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço (opcional)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="CEP"
                        value={formData.endereco_cep || ''}
                        onChange={(e) => setFormData({ ...formData, endereco_cep: e.target.value })}
                      />
                      <Input
                        placeholder="Cidade"
                        value={formData.endereco_cidade || ''}
                        onChange={(e) => setFormData({ ...formData, endereco_cidade: e.target.value })}
                      />
                      <Input
                        placeholder="UF"
                        maxLength={2}
                        value={formData.endereco_estado || ''}
                        onChange={(e) => setFormData({ ...formData, endereco_estado: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="esta_ativa"
                      checked={formData.esta_ativa}
                      onCheckedChange={(v) => setFormData({ ...formData, esta_ativa: v })}
                    />
                    <Label htmlFor="esta_ativa">Unidade ativa</Label>
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
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando unidades...
          </div>
        ) : !unidades?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma unidade cadastrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((unidade) => (
                <TableRow key={unidade.id}>
                  <TableCell className="font-mono font-semibold">
                    {unidade.codigo}
                  </TableCell>
                  <TableCell>{unidade.nome}</TableCell>
                  <TableCell className="capitalize">{unidade.tipo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {unidade.timezone.replace('America/', '')}
                  </TableCell>
                  <TableCell>
                    {unidade.endereco?.cidade ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {unidade.endereco.cidade}/{unidade.endereco.estado}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={unidade.esta_ativa ? "default" : "secondary"}>
                      {unidade.esta_ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(unidade)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Excluir esta unidade?')) {
                            excluirMutation.mutate(unidade.id);
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

export default UnidadesManager;
