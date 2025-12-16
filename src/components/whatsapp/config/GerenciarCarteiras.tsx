/**
 * Gerenciamento de Carteiras WhatsApp v2
 * Modelo: CARTEIRA (entidade) -> CONTATOS (N:N)
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Users, 
  UserPlus, 
  ArrowRightLeft, 
  Trash2, 
  Search, 
  Phone,
  Calendar,
  MessageSquare,
  Edit,
  Eye,
  Plus,
  X,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CarteiraV2 {
  id: string;
  nome: string;
  descricao: string | null;
  operador_id: string;
  max_contatos: number;
  recebe_novos_contatos: boolean;
  cor: string;
  esta_ativa: boolean;
  criado_em: string;
  total_contatos: number;
  operador?: {
    id: string;
    nome_completo: string;
  };
}

interface CarteiraContato {
  id: string;
  carteira_id: string;
  whatsapp_contato_id: string;
  vinculado_em: string;
  contato?: {
    id: string;
    nome_whatsapp: string;
    numero_whatsapp: string;
  };
}

interface Operador {
  id: string;
  nome_completo: string;
}

interface ContatoWhatsApp {
  id: string;
  nome_whatsapp: string;
  numero_whatsapp: string;
}

export function GerenciarCarteiras() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  
  // Dialogs
  const [dialogCriar, setDialogCriar] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [sheetContatos, setSheetContatos] = useState(false);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState<CarteiraV2 | null>(null);
  
  // Form states
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formOperadorId, setFormOperadorId] = useState('');
  const [formMaxContatos, setFormMaxContatos] = useState('50');
  const [formRecebeNovos, setFormRecebeNovos] = useState(true);
  
  // Contatos
  const [buscaContato, setBuscaContato] = useState('');
  const [contatosSelecionados, setContatosSelecionados] = useState<string[]>([]);

  // Buscar carteiras
  const { data: carteiras, isLoading: loadingCarteiras } = useQuery({
    queryKey: ['whatsapp-carteiras-v2-gerenciar', busca],
    queryFn: async () => {
      let query = (supabase as any)
        .from('whatsapp_carteiras_v2')
        .select(`
          *,
          operador:perfis_usuario!whatsapp_carteiras_v2_operador_id_fkey(
            id, nome_completo
          )
        `)
        .eq('esta_ativa', true)
        .order('nome');

      const { data, error } = await query;
      if (error) throw error;
      
      let resultado = data || [];
      if (busca.trim()) {
        const termoBusca = busca.toLowerCase();
        resultado = resultado.filter((c: any) => 
          c.nome?.toLowerCase().includes(termoBusca) ||
          c.operador?.nome_completo?.toLowerCase().includes(termoBusca)
        );
      }

      return resultado as CarteiraV2[];
    },
    staleTime: 30 * 1000,
  });

  // Buscar operadores
  const { data: operadores } = useQuery({
    queryKey: ['operadores-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis_usuario')
        .select('id, nome_completo')
        .eq('esta_ativo', true)
        .order('nome_completo');
      
      if (error) throw error;
      return data as Operador[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar contatos da carteira selecionada
  const { data: contatosCarteira, isLoading: loadingContatos } = useQuery({
    queryKey: ['whatsapp-carteira-contatos', carteiraSelecionada?.id],
    queryFn: async () => {
      if (!carteiraSelecionada) return [];
      
      const { data, error } = await (supabase as any)
        .from('whatsapp_carteiras_contatos')
        .select(`
          *,
          contato:whatsapp_contatos!whatsapp_carteiras_contatos_whatsapp_contato_id_fkey(
            id, nome_whatsapp, numero_whatsapp
          )
        `)
        .eq('carteira_id', carteiraSelecionada.id)
        .order('vinculado_em', { ascending: false });
      
      if (error) throw error;
      return data as CarteiraContato[];
    },
    enabled: !!carteiraSelecionada && sheetContatos,
    staleTime: 30 * 1000,
  });

  // Buscar contatos disponíveis (sem carteira)
  const { data: contatosDisponiveis } = useQuery({
    queryKey: ['whatsapp-contatos-disponiveis', buscaContato],
    queryFn: async () => {
      // Buscar IDs de contatos que já têm carteira
      const { data: contatosComCarteira } = await (supabase as any)
        .from('whatsapp_carteiras_contatos')
        .select('whatsapp_contato_id');
      
      const idsComCarteira = (contatosComCarteira || []).map((c: any) => c.whatsapp_contato_id);

      // Buscar contatos que não têm carteira
      let query = (supabase as any)
        .from('whatsapp_contatos')
        .select('id, nome_whatsapp, numero_whatsapp')
        .order('nome_whatsapp')
        .limit(50);

      if (idsComCarteira.length > 0) {
        query = query.not('id', 'in', `(${idsComCarteira.join(',')})`);
      }

      if (buscaContato.trim()) {
        query = query.or(`nome_whatsapp.ilike.%${buscaContato}%,numero_whatsapp.ilike.%${buscaContato}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContatoWhatsApp[];
    },
    enabled: sheetContatos,
    staleTime: 30 * 1000,
  });

  // Mutation: Criar carteira
  const criarCarteira = useMutation({
    mutationFn: async () => {
      if (!formNome.trim() || !formOperadorId) {
        throw new Error('Preencha nome e operador');
      }

      const { error } = await (supabase as any)
        .from('whatsapp_carteiras_v2')
        .insert({
          nome: formNome.trim(),
          descricao: formDescricao.trim() || null,
          operador_id: formOperadorId,
          max_contatos: parseInt(formMaxContatos) || 50,
          recebe_novos_contatos: formRecebeNovos,
          esta_ativa: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Carteira criada com sucesso');
      setDialogCriar(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao criar: ' + error.message);
    },
  });

  // Mutation: Editar carteira
  const editarCarteira = useMutation({
    mutationFn: async () => {
      if (!carteiraSelecionada || !formNome.trim() || !formOperadorId) {
        throw new Error('Dados incompletos');
      }

      const { error } = await (supabase as any)
        .from('whatsapp_carteiras_v2')
        .update({
          nome: formNome.trim(),
          descricao: formDescricao.trim() || null,
          operador_id: formOperadorId,
          max_contatos: parseInt(formMaxContatos) || 50,
          recebe_novos_contatos: formRecebeNovos,
        })
        .eq('id', carteiraSelecionada.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Carteira atualizada');
      setDialogEditar(false);
      setCarteiraSelecionada(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Mutation: Excluir carteira
  const excluirCarteira = useMutation({
    mutationFn: async () => {
      if (!carteiraSelecionada) return;

      const { error } = await (supabase as any)
        .from('whatsapp_carteiras_v2')
        .update({ esta_ativa: false })
        .eq('id', carteiraSelecionada.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      toast.success('Carteira excluída');
      setDialogExcluir(false);
      setCarteiraSelecionada(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  // Mutation: Adicionar contatos à carteira
  const adicionarContatos = useMutation({
    mutationFn: async () => {
      if (!carteiraSelecionada || contatosSelecionados.length === 0) {
        throw new Error('Selecione ao menos um contato');
      }

      const registros = contatosSelecionados.map(contatoId => ({
        carteira_id: carteiraSelecionada.id,
        whatsapp_contato_id: contatoId,
        motivo_vinculo: 'Adição manual',
      }));

      const { error } = await (supabase as any)
        .from('whatsapp_carteiras_contatos')
        .insert(registros);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteira-contatos'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contatos-disponiveis'] });
      toast.success(`${contatosSelecionados.length} contato(s) adicionado(s)`);
      setContatosSelecionados([]);
    },
    onError: (error: any) => {
      if (error.message?.includes('unique')) {
        toast.error('Um ou mais contatos já estão em outra carteira');
      } else {
        toast.error('Erro ao adicionar: ' + error.message);
      }
    },
  });

  // Mutation: Remover contato da carteira
  const removerContato = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await (supabase as any)
        .from('whatsapp_carteiras_contatos')
        .delete()
        .eq('id', vinculoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras-v2'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteira-contatos'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contatos-disponiveis'] });
      toast.success('Contato removido');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormNome('');
    setFormDescricao('');
    setFormOperadorId('');
    setFormMaxContatos('50');
    setFormRecebeNovos(true);
  };

  const abrirEditar = (carteira: CarteiraV2) => {
    setCarteiraSelecionada(carteira);
    setFormNome(carteira.nome);
    setFormDescricao(carteira.descricao || '');
    setFormOperadorId(carteira.operador_id);
    setFormMaxContatos(carteira.max_contatos.toString());
    setFormRecebeNovos(carteira.recebe_novos_contatos);
    setDialogEditar(true);
  };

  const abrirContatos = (carteira: CarteiraV2) => {
    setCarteiraSelecionada(carteira);
    setContatosSelecionados([]);
    setBuscaContato('');
    setSheetContatos(true);
  };

  const toggleContatoSelecionado = (contatoId: string) => {
    setContatosSelecionados(prev => 
      prev.includes(contatoId) 
        ? prev.filter(id => id !== contatoId)
        : [...prev, contatoId]
    );
  };

  // Métricas
  const totalCarteiras = carteiras?.length || 0;
  const totalContatos = carteiras?.reduce((acc, c) => acc + c.total_contatos, 0) || 0;
  const operadoresUnicos = new Set(carteiras?.map(c => c.operador_id)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Carteiras de Atendimento
          </h3>
          <p className="text-sm text-muted-foreground">
            Organize contatos em carteiras com operador responsável
          </p>
        </div>
        <Button onClick={() => setDialogCriar(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Carteira
        </Button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalCarteiras}</span>
            </div>
            <p className="text-xs text-muted-foreground">Carteiras Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalContatos}</span>
            </div>
            <p className="text-xs text-muted-foreground">Contatos Vinculados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{operadoresUnicos}</span>
            </div>
            <p className="text-xs text-muted-foreground">Operadores com Carteira</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar carteira por nome ou operador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de carteiras */}
      <Card>
        <CardContent className="p-0">
          {loadingCarteiras ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : carteiras?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma carteira encontrada</p>
              <Button variant="link" onClick={() => setDialogCriar(true)}>
                Criar primeira carteira
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carteira</TableHead>
                  <TableHead>Operador Responsável</TableHead>
                  <TableHead className="text-center">Contatos</TableHead>
                  <TableHead className="text-center">Recebe Novos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carteiras?.map((carteira) => (
                  <TableRow key={carteira.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: carteira.cor || '#3b82f6' }}
                        />
                        <div>
                          <p className="font-medium">{carteira.nome}</p>
                          {carteira.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {carteira.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {carteira.operador?.nome_completo || 'Não atribuído'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {carteira.total_contatos} / {carteira.max_contatos}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={carteira.recebe_novos_contatos ? "default" : "outline"}>
                        {carteira.recebe_novos_contatos ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(carteira.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirContatos(carteira)}
                          title="Ver contatos"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEditar(carteira)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            setCarteiraSelecionada(carteira);
                            setDialogExcluir(true);
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog: Criar Carteira */}
      <Dialog open={dialogCriar} onOpenChange={setDialogCriar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Carteira</DialogTitle>
            <DialogDescription>
              Crie uma carteira e atribua um operador responsável
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Carteira *</Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Clientes Premium"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Descrição opcional..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Operador Responsável *</Label>
              <Select value={formOperadorId} onValueChange={setFormOperadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o operador..." />
                </SelectTrigger>
                <SelectContent>
                  {operadores?.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máx. Contatos</Label>
                <Input
                  type="number"
                  value={formMaxContatos}
                  onChange={(e) => setFormMaxContatos(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Recebe Novos Contatos</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={formRecebeNovos}
                    onCheckedChange={setFormRecebeNovos}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {formRecebeNovos ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCriar(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => criarCarteira.mutate()}
              disabled={criarCarteira.isPending}
            >
              {criarCarteira.isPending ? 'Criando...' : 'Criar Carteira'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Carteira */}
      <Dialog open={dialogEditar} onOpenChange={setDialogEditar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Carteira</DialogTitle>
            <DialogDescription>
              Atualize os dados da carteira
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Carteira *</Label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Operador Responsável *</Label>
              <Select value={formOperadorId} onValueChange={setFormOperadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o operador..." />
                </SelectTrigger>
                <SelectContent>
                  {operadores?.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máx. Contatos</Label>
                <Input
                  type="number"
                  value={formMaxContatos}
                  onChange={(e) => setFormMaxContatos(e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Recebe Novos Contatos</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={formRecebeNovos}
                    onCheckedChange={setFormRecebeNovos}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {formRecebeNovos ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditar(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => editarCarteira.mutate()}
              disabled={editarCarteira.isPending}
            >
              {editarCarteira.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Excluir Carteira */}
      <Dialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Carteira</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a carteira "{carteiraSelecionada?.nome}"?
              Os contatos serão desvinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogExcluir(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => excluirCarteira.mutate()}
              disabled={excluirCarteira.isPending}
            >
              {excluirCarteira.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet: Gerenciar Contatos da Carteira */}
      <Sheet open={sheetContatos} onOpenChange={setSheetContatos}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contatos da Carteira
            </SheetTitle>
            <SheetDescription>
              {carteiraSelecionada?.nome} - {carteiraSelecionada?.total_contatos} contatos
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Adicionar Contatos */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Adicionar Contatos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contatos disponíveis..."
                  value={buscaContato}
                  onChange={(e) => setBuscaContato(e.target.value)}
                  className="pl-9"
                />
              </div>

              {contatosDisponiveis && contatosDisponiveis.length > 0 && (
                <ScrollArea className="h-40 border rounded-md p-2">
                  <div className="space-y-1">
                    {contatosDisponiveis.map((contato) => (
                      <div 
                        key={contato.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => toggleContatoSelecionado(contato.id)}
                      >
                        <Checkbox 
                          checked={contatosSelecionados.includes(contato.id)}
                          onCheckedChange={() => toggleContatoSelecionado(contato.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{contato.nome_whatsapp}</p>
                          <p className="text-xs text-muted-foreground">{contato.numero_whatsapp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {contatosSelecionados.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={() => adicionarContatos.mutate()}
                  disabled={adicionarContatos.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar {contatosSelecionados.length} selecionado(s)
                </Button>
              )}
            </div>

            {/* Lista de Contatos Vinculados */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Contatos Vinculados</Label>
              
              {loadingContatos ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : contatosCarteira?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum contato vinculado</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {contatosCarteira?.map((vinculo) => (
                      <div 
                        key={vinculo.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {vinculo.contato?.nome_whatsapp || 'Desconhecido'}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {vinculo.contato?.numero_whatsapp}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removerContato.mutate(vinculo.id)}
                          disabled={removerContato.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default GerenciarCarteiras;
