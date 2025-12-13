/**
 * Gestão de Templates do Sistema WhatsApp
 * Mensagens automáticas e respostas padrão
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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Pencil, Trash2, Copy, Eye } from "lucide-react";
import { toast } from "sonner";

interface TemplateSistema {
  id: string;
  tipo: string;
  nome: string;
  conteudo: string;
  variaveis: string[];
  ativo: boolean;
  unidade_id?: string;
  criado_em: string;
  unidade?: { nome: string };
}

interface TemplateFormData {
  tipo: string;
  nome: string;
  conteudo: string;
  variaveis: string;
  ativo: boolean;
  unidade_id: string;
}

const TIPOS_TEMPLATE = [
  { value: 'boas_vindas', label: 'Boas-vindas', desc: 'Primeira mensagem ao cliente' },
  { value: 'fora_expediente', label: 'Fora do Expediente', desc: 'Mensagem fora do horário' },
  { value: 'fila_espera', label: 'Fila de Espera', desc: 'Aviso de posição na fila' },
  { value: 'transferencia', label: 'Transferência', desc: 'Aviso de transferência' },
  { value: 'encerramento', label: 'Encerramento', desc: 'Despedida ao cliente' },
  { value: 'ausencia_temporaria', label: 'Ausência Temporária', desc: 'Operador ausente' },
  { value: 'pesquisa_satisfacao', label: 'Pesquisa de Satisfação', desc: 'Convite para avaliação' },
  { value: 'lembrete_retorno', label: 'Lembrete de Retorno', desc: 'Cliente sem resposta' },
  { value: 'confirmacao_pedido', label: 'Confirmação de Pedido', desc: 'Pedido confirmado' },
  { value: 'atualizacao_status', label: 'Atualização de Status', desc: 'Status do pedido' },
];

const VARIAVEIS_DISPONIVEIS = [
  { key: 'nome_cliente', desc: 'Nome do cliente' },
  { key: 'nome_atendente', desc: 'Nome do atendente' },
  { key: 'nome_empresa', desc: 'Nome da empresa' },
  { key: 'numero_protocolo', desc: 'Número do protocolo' },
  { key: 'posicao_fila', desc: 'Posição na fila' },
  { key: 'tempo_espera', desc: 'Tempo estimado de espera' },
  { key: 'setor_destino', desc: 'Setor de destino (transferência)' },
  { key: 'link_pesquisa', desc: 'Link para pesquisa' },
  { key: 'numero_pedido', desc: 'Número do pedido' },
  { key: 'status_pedido', desc: 'Status do pedido' },
];

export function TemplatesSistema() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateSistema | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateSistema | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    tipo: 'boas_vindas',
    nome: '',
    conteudo: '',
    variaveis: '',
    ativo: true,
    unidade_id: '',
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

  // Buscar templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['whatsapp-templates-sistema'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('whatsapp_templates_sistema' as any)
        .select(`
          *,
          unidade:whatsapp_unidades(nome)
        `)
        .order('tipo') as any);
      if (error) throw error;
      return data as TemplateSistema[];
    }
  });

  // Criar/Atualizar template
  const salvarMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const variaveis = data.variaveis
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);

      const payload = {
        tipo: data.tipo,
        nome: data.nome || TIPOS_TEMPLATE.find(t => t.value === data.tipo)?.label || data.tipo,
        conteudo: data.conteudo,
        variaveis,
        ativo: data.ativo,
        unidade_id: data.unidade_id || null,
      };

      if (editingTemplate) {
        const { error } = await (supabase
          .from('whatsapp_templates_sistema' as any)
          .update(payload)
          .eq('id', editingTemplate.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('whatsapp_templates_sistema' as any)
          .insert(payload) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates-sistema'] });
      toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  // Excluir template
  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('whatsapp_templates_sistema' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates-sistema'] });
      toast.success('Template excluído!');
    }
  });

  // Duplicar template
  const duplicarMutation = useMutation({
    mutationFn: async (template: TemplateSistema) => {
      const { error } = await (supabase
        .from('whatsapp_templates_sistema' as any)
        .insert({
          tipo: template.tipo,
          nome: `${template.nome} (cópia)`,
          conteudo: template.conteudo,
          variaveis: template.variaveis,
          ativo: false,
          unidade_id: template.unidade_id,
        }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates-sistema'] });
      toast.success('Template duplicado!');
    }
  });

  const resetForm = () => {
    setFormData({
      tipo: 'boas_vindas',
      nome: '',
      conteudo: '',
      variaveis: '',
      ativo: true,
      unidade_id: '',
    });
    setEditingTemplate(null);
    setDialogOpen(false);
  };

  const handleEdit = (template: TemplateSistema) => {
    setEditingTemplate(template);
    setFormData({
      tipo: template.tipo,
      nome: template.nome,
      conteudo: template.conteudo,
      variaveis: template.variaveis?.join(', ') || '',
      ativo: template.ativo,
      unidade_id: template.unidade_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.conteudo) {
      toast.error('Conteúdo é obrigatório');
      return;
    }
    salvarMutation.mutate(formData);
  };

  const insertVariable = (varKey: string) => {
    const newContent = formData.conteudo + `{{${varKey}}}`;
    setFormData({ ...formData, conteudo: newContent });
  };

  const previewContent = (template: TemplateSistema) => {
    let content = template.conteudo;
    // Substituir variáveis por exemplos
    content = content.replace(/\{\{nome_cliente\}\}/g, 'João Silva');
    content = content.replace(/\{\{nome_atendente\}\}/g, 'Maria');
    content = content.replace(/\{\{nome_empresa\}\}/g, 'Empresa XYZ');
    content = content.replace(/\{\{numero_protocolo\}\}/g, 'PROT-2025-001234');
    content = content.replace(/\{\{posicao_fila\}\}/g, '3');
    content = content.replace(/\{\{tempo_espera\}\}/g, '5 minutos');
    content = content.replace(/\{\{setor_destino\}\}/g, 'Comercial');
    content = content.replace(/\{\{link_pesquisa\}\}/g, 'https://exemplo.com/avaliacao');
    content = content.replace(/\{\{numero_pedido\}\}/g, 'PED-123456');
    content = content.replace(/\{\{status_pedido\}\}/g, 'Em processamento');
    return content;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates do Sistema
            </CardTitle>
            <CardDescription>
              Configure mensagens automáticas e respostas padrão
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Editar Template' : 'Novo Template'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure o template de mensagem automática
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
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
                          {TIPOS_TEMPLATE.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div>
                                <div className="font-medium">{t.label}</div>
                                <div className="text-xs text-muted-foreground">{t.desc}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome (opcional)</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Nome personalizado"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Unidade (opcional)</Label>
                    <Select
                      value={formData.unidade_id}
                      onValueChange={(v) => setFormData({ ...formData, unidade_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as unidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as unidades</SelectItem>
                        {unidades?.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conteudo">Conteúdo *</Label>
                    <Textarea
                      id="conteudo"
                      rows={6}
                      value={formData.conteudo}
                      onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                      placeholder="Digite o conteúdo da mensagem. Use {{variavel}} para dados dinâmicos."
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-muted-foreground mr-2">Variáveis:</span>
                      {VARIAVEIS_DISPONIVEIS.map((v) => (
                        <Badge
                          key={v.key}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => insertVariable(v.key)}
                          title={v.desc}
                        >
                          {`{{${v.key}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
                    />
                    <Label htmlFor="ativo">Template ativo</Label>
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
            Carregando templates...
          </div>
        ) : !templates?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum template cadastrado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Variáveis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {TIPOS_TEMPLATE.find(t => t.value === template.tipo)?.label || template.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{template.nome}</TableCell>
                  <TableCell>
                    {template.unidade?.nome || (
                      <span className="text-muted-foreground">Todas</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {template.variaveis?.length || 0} variáveis
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.ativo ? "default" : "secondary"}>
                      {template.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPreviewTemplate(template);
                          setPreviewOpen(true);
                        }}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicarMutation.mutate(template)}
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Excluir este template?')) {
                            excluirMutation.mutate(template.id);
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.nome}</DialogTitle>
            <DialogDescription>
              Visualização com dados de exemplo
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
            {previewTemplate && previewContent(previewTemplate)}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default TemplatesSistema;
