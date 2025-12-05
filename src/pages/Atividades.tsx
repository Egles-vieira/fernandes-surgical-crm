import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Search, Filter, CheckSquare, Phone, Users, Mail, 
  MessageCircle, MapPin, RefreshCw, FileText, Clock, AlertTriangle,
  ChevronRight, Calendar, User, Building2
} from 'lucide-react';
import { useAtividades, Atividade, FiltrosAtividades } from '@/hooks/useAtividades';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaAtividadeDialog } from '@/components/atividades/NovaAtividadeDialog';
import { AtividadeDetalhesSheet } from '@/components/atividades/AtividadeDetalhesSheet';

const tiposAtividade = [
  { value: 'tarefa', label: 'Tarefa', icon: CheckSquare, cor: '#6B7280' },
  { value: 'chamada', label: 'Chamada', icon: Phone, cor: '#3B82F6' },
  { value: 'reuniao', label: 'Reunião', icon: Users, cor: '#8B5CF6' },
  { value: 'email', label: 'Email', icon: Mail, cor: '#10B981' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, cor: '#25D366' },
  { value: 'visita', label: 'Visita', icon: MapPin, cor: '#F59E0B' },
  { value: 'follow_up', label: 'Follow-up', icon: RefreshCw, cor: '#6366F1' },
  { value: 'proposta', label: 'Proposta', icon: FileText, cor: '#EC4899' },
];

const prioridadeConfig: Record<string, { label: string; cor: string }> = {
  critica: { label: 'Crítica', cor: 'bg-red-500' },
  alta: { label: 'Alta', cor: 'bg-orange-500' },
  media: { label: 'Média', cor: 'bg-yellow-500' },
  baixa: { label: 'Baixa', cor: 'bg-green-500' },
};

const statusConfig: Record<string, { label: string; cor: string }> = {
  pendente: { label: 'Pendente', cor: 'bg-gray-500' },
  em_andamento: { label: 'Em Andamento', cor: 'bg-blue-500' },
  concluida: { label: 'Concluída', cor: 'bg-green-500' },
  cancelada: { label: 'Cancelada', cor: 'bg-red-500' },
  reagendada: { label: 'Reagendada', cor: 'bg-purple-500' },
  aguardando_resposta: { label: 'Aguardando', cor: 'bg-yellow-500' },
};

export default function Atividades() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosAtividades>({
    status: ['pendente', 'em_andamento', 'aguardando_resposta']
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [novaAtividadeOpen, setNovaAtividadeOpen] = useState(false);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<string | null>(null);

  const { atividades, isLoading, totalCount } = useAtividades({
    filtros: { ...filtros, search: searchTerm },
    ordenarPor: 'score_prioridade',
    limite: 100
  });

  const handleStatusFilter = (status: string) => {
    if (status === 'todas') {
      setFiltros({ ...filtros, status: undefined });
    } else if (status === 'ativas') {
      setFiltros({ ...filtros, status: ['pendente', 'em_andamento', 'aguardando_resposta'] });
    } else {
      setFiltros({ ...filtros, status: [status] });
    }
  };

  const getIconByTipo = (tipo: string) => {
    const config = tiposAtividade.find(t => t.value === tipo);
    if (config) {
      const Icon = config.icon;
      return <Icon className="h-4 w-4" style={{ color: config.cor }} />;
    }
    return <CheckSquare className="h-4 w-4 text-muted-foreground" />;
  };

  const getVencimentoBadge = (dataVencimento: string | null) => {
    if (!dataVencimento) return null;
    const data = new Date(dataVencimento);
    
    if (isPast(data) && !isToday(data)) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Atrasada
        </Badge>
      );
    }
    if (isToday(data)) {
      return (
        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          Hoje
        </Badge>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(data, { addSuffix: true, locale: ptBR })}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Central de Atividades</h1>
            <p className="text-muted-foreground">
              {totalCount} atividades encontradas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/atividades/focus')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Focus Zone
            </Button>
            <Button onClick={() => setNovaAtividadeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atividades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select 
            value={filtros.status?.join(',') || 'ativas'}
            onValueChange={handleStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativas">Ativas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Atividades */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : atividades.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atividade encontrada</p>
              </div>
            ) : (
              <div className="divide-y">
                {atividades.map((atividade) => (
                  <div
                    key={atividade.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setAtividadeSelecionada(atividade.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Ícone do tipo */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getIconByTipo(atividade.tipo)}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{atividade.titulo}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${prioridadeConfig[atividade.prioridade]?.cor} text-white border-0`}
                          >
                            {prioridadeConfig[atividade.prioridade]?.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {atividade.clientes && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {atividade.clientes.nome_abrev || atividade.clientes.nome_emit}
                            </span>
                          )}
                          {atividade.perfis_usuario && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {atividade.perfis_usuario.primeiro_nome}
                            </span>
                          )}
                          {atividade.data_vencimento && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(atividade.data_vencimento), 'dd/MM HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status e vencimento */}
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant="outline"
                          className={`${statusConfig[atividade.status]?.cor} text-white border-0 text-xs`}
                        >
                          {statusConfig[atividade.status]?.label}
                        </Badge>
                        {getVencimentoBadge(atividade.data_vencimento)}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <NovaAtividadeDialog
        open={novaAtividadeOpen}
        onOpenChange={setNovaAtividadeOpen}
      />

      <AtividadeDetalhesSheet
        atividadeId={atividadeSelecionada}
        open={!!atividadeSelecionada}
        onOpenChange={(open) => !open && setAtividadeSelecionada(null)}
      />
    </Layout>
  );
}
