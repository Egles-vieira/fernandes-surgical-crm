/**
 * Gerenciamento de Carteiras WhatsApp
 * Interface para criar, transferir e remover carteiras de clientes
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Users, 
  UserPlus, 
  ArrowRightLeft, 
  Trash2, 
  Search, 
  Phone,
  Calendar,
  MessageSquare,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Carteira {
  id: string;
  whatsapp_contato_id: string;
  operador_id: string;
  motivo_transferencia: string | null;
  criado_em: string;
  esta_ativo: boolean;
  // Joins
  contato?: {
    id: string;
    nome_whatsapp: string;
    numero_whatsapp: string;
  };
  operador?: {
    id: string;
    nome_completo: string;
  };
  // Métricas (calculadas)
  total_atendimentos?: number;
  ultimo_atendimento?: string;
}

interface Operador {
  id: string;
  nome_completo: string;
  email?: string;
}

interface ContatoWhatsApp {
  id: string;
  nome_whatsapp: string;
  numero_whatsapp: string;
}

export function GerenciarCarteiras() {
  const queryClient = useQueryClient();
  const [filtroOperador, setFiltroOperador] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('ativos');
  const [busca, setBusca] = useState('');
  
  // Dialogs
  const [dialogCriar, setDialogCriar] = useState(false);
  const [dialogTransferir, setDialogTransferir] = useState(false);
  const [dialogRemover, setDialogRemover] = useState(false);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState<Carteira | null>(null);
  
  // Form states
  const [novoContatoId, setNovoContatoId] = useState('');
  const [novoOperadorId, setNovoOperadorId] = useState('');
  const [motivoTransferencia, setMotivoTransferencia] = useState('');

  // Buscar carteiras
  const { data: carteiras, isLoading: loadingCarteiras } = useQuery({
    queryKey: ['whatsapp-carteiras-gerenciar', filtroOperador, filtroStatus, busca],
    queryFn: async () => {
      let query = (supabase as any)
        .from('whatsapp_carteiras')
        .select(`
          id,
          whatsapp_contato_id,
          operador_id,
          motivo_transferencia,
          criado_em,
          esta_ativo,
          contato:whatsapp_contatos!whatsapp_carteiras_whatsapp_contato_id_fkey(
            id, nome_whatsapp, numero_whatsapp
          ),
          operador:perfis_usuario!whatsapp_carteiras_operador_id_fkey(
            id, nome_completo
          )
        `)
        .order('criado_em', { ascending: false })
        .limit(200);

      if (filtroStatus === 'ativos') {
        query = query.eq('esta_ativo', true);
      } else if (filtroStatus === 'inativos') {
        query = query.eq('esta_ativo', false);
      }

      if (filtroOperador && filtroOperador !== 'todos') {
        query = query.eq('operador_id', filtroOperador);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filtrar por busca (nome ou telefone do contato)
      let resultado = data || [];
      if (busca.trim()) {
        const termoBusca = busca.toLowerCase();
        resultado = resultado.filter((c: any) => 
          c.contato?.nome_whatsapp?.toLowerCase().includes(termoBusca) ||
          c.contato?.numero_whatsapp?.includes(termoBusca)
        );
      }

      return resultado as Carteira[];
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

  // Buscar contatos sem carteira (para criar nova)
  const { data: contatosSemCarteira } = useQuery({
    queryKey: ['contatos-sem-carteira'],
    queryFn: async () => {
      // Buscar IDs de contatos que já têm carteira ativa
      const { data: carteirasAtivas } = await (supabase as any)
        .from('whatsapp_carteiras')
        .select('whatsapp_contato_id')
        .eq('esta_ativo', true);
      
      const idsComCarteira = (carteirasAtivas || []).map((c: any) => c.whatsapp_contato_id);

      // Buscar contatos que não têm carteira
      let query = (supabase as any)
        .from('whatsapp_contatos')
        .select('id, nome_whatsapp, numero_whatsapp')
        .order('nome_whatsapp')
        .limit(100);

      if (idsComCarteira.length > 0) {
        query = query.not('id', 'in', `(${idsComCarteira.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContatoWhatsApp[];
    },
    staleTime: 30 * 1000,
    enabled: dialogCriar,
  });

  // Mutation: Criar carteira
  const criarCarteira = useMutation({
    mutationFn: async () => {
      if (!novoContatoId || !novoOperadorId) {
        throw new Error('Selecione contato e operador');
      }

      const { error } = await (supabase as any)
        .from('whatsapp_carteiras')
        .insert({
          whatsapp_contato_id: novoContatoId,
          operador_id: novoOperadorId,
          motivo_transferencia: 'Atribuição manual',
          esta_ativo: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras'] });
      toast.success('Carteira criada com sucesso');
      setDialogCriar(false);
      setNovoContatoId('');
      setNovoOperadorId('');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar carteira: ' + error.message);
    },
  });

  // Mutation: Transferir carteira
  const transferirCarteira = useMutation({
    mutationFn: async () => {
      if (!carteiraSelecionada || !novoOperadorId || !motivoTransferencia) {
        throw new Error('Preencha todos os campos');
      }

      const { error } = await (supabase as any)
        .from('whatsapp_carteiras')
        .update({
          operador_id: novoOperadorId,
          motivo_transferencia: motivoTransferencia,
        })
        .eq('id', carteiraSelecionada.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras'] });
      toast.success('Carteira transferida com sucesso');
      setDialogTransferir(false);
      setCarteiraSelecionada(null);
      setNovoOperadorId('');
      setMotivoTransferencia('');
    },
    onError: (error: any) => {
      toast.error('Erro ao transferir: ' + error.message);
    },
  });

  // Mutation: Remover carteira
  const removerCarteira = useMutation({
    mutationFn: async () => {
      if (!carteiraSelecionada) return;

      const { error } = await (supabase as any)
        .from('whatsapp_carteiras')
        .update({ esta_ativo: false })
        .eq('id', carteiraSelecionada.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-carteiras'] });
      toast.success('Carteira removida com sucesso');
      setDialogRemover(false);
      setCarteiraSelecionada(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });

  // Métricas
  const totalCarteiras = carteiras?.length || 0;
  const operadoresUnicos = new Set(carteiras?.map(c => c.operador_id)).size;

  return (
    <div className="space-y-6">
      {/* Header com métricas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Carteiras de Clientes (Sticky Agent)
          </h3>
          <p className="text-sm text-muted-foreground">
            Vincule contatos a operadores para atendimento exclusivo
          </p>
        </div>
        <Button onClick={() => setDialogCriar(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nova Carteira
        </Button>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalCarteiras}</span>
            </div>
            <p className="text-xs text-muted-foreground">Carteiras Ativas</p>
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
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {totalCarteiras > 0 ? Math.round(totalCarteiras / operadoresUnicos) : 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Média por Operador</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={filtroOperador} onValueChange={setFiltroOperador}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Operador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Operadores</SelectItem>
                {operadores?.map((op) => (
                  <SelectItem key={op.id} value={op.id}>{op.nome_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de carteiras */}
      <Card>
        <CardContent className="p-0">
          {loadingCarteiras ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : carteiras?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma carteira encontrada</p>
              <Button variant="link" onClick={() => setDialogCriar(true)}>
                Criar primeira carteira
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Operador Responsável</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carteiras?.map((carteira) => (
                  <TableRow key={carteira.id}>
                    <TableCell className="font-medium">
                      {carteira.contato?.nome_whatsapp || 'Desconhecido'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {carteira.contato?.numero_whatsapp}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {carteira.operador?.nome_completo || 'Não atribuído'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(carteira.criado_em), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={carteira.esta_ativo ? "default" : "secondary"}>
                        {carteira.esta_ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCarteiraSelecionada(carteira);
                            setDialogTransferir(true);
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            setCarteiraSelecionada(carteira);
                            setDialogRemover(true);
                          }}
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
              Vincule um contato a um operador para atendimento exclusivo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contato WhatsApp</Label>
              <Select value={novoContatoId} onValueChange={setNovoContatoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato..." />
                </SelectTrigger>
                <SelectContent>
                  {contatosSemCarteira?.map((contato) => (
                    <SelectItem key={contato.id} value={contato.id}>
                      <div className="flex items-center gap-2">
                        <span>{contato.nome_whatsapp}</span>
                        <span className="text-xs text-muted-foreground">
                          {contato.numero_whatsapp}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Operador Responsável</Label>
              <Select value={novoOperadorId} onValueChange={setNovoOperadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um operador..." />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCriar(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => criarCarteira.mutate()}
              disabled={criarCarteira.isPending || !novoContatoId || !novoOperadorId}
            >
              {criarCarteira.isPending ? 'Criando...' : 'Criar Carteira'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Transferir Carteira */}
      <Dialog open={dialogTransferir} onOpenChange={setDialogTransferir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Carteira</DialogTitle>
            <DialogDescription>
              Transfira o contato {carteiraSelecionada?.contato?.nome_whatsapp} para outro operador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                <strong>Contato:</strong> {carteiraSelecionada?.contato?.nome_whatsapp}
              </p>
              <p className="text-sm">
                <strong>Operador atual:</strong> {carteiraSelecionada?.operador?.nome_completo}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Novo Operador</Label>
              <Select value={novoOperadorId} onValueChange={setNovoOperadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo operador..." />
                </SelectTrigger>
                <SelectContent>
                  {operadores?.filter(op => op.id !== carteiraSelecionada?.operador_id).map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Motivo da Transferência</Label>
              <Input
                value={motivoTransferencia}
                onChange={(e) => setMotivoTransferencia(e.target.value)}
                placeholder="Ex: Férias do operador, redistribuição..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTransferir(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => transferirCarteira.mutate()}
              disabled={transferirCarteira.isPending || !novoOperadorId || !motivoTransferencia}
            >
              {transferirCarteira.isPending ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Remoção */}
      <Dialog open={dialogRemover} onOpenChange={setDialogRemover}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Carteira</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a carteira de {carteiraSelecionada?.contato?.nome_whatsapp}?
              O contato voltará a ser distribuído normalmente.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRemover(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => removerCarteira.mutate()}
              disabled={removerCarteira.isPending}
            >
              {removerCarteira.isPending ? 'Removendo...' : 'Remover Carteira'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GerenciarCarteiras;
