import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  RefreshCw, 
  Settings, 
  History, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  Database,
  Info,
  Trash2,
  MessageSquare,
  Zap,
  Shield,
  Mail,
  FileText,
  Server
} from "lucide-react";
import { useCronJobs, formatCronSchedule, formatDuration, CronJob, CronJobHistory } from "@/hooks/useCronJobs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Presets de schedule comuns
const schedulePresets = [
  { label: "A cada minuto", value: "* * * * *", description: "Executa a cada 60 segundos" },
  { label: "A cada 5 minutos", value: "*/5 * * * *", description: "Executa 12 vezes por hora" },
  { label: "A cada 10 minutos", value: "*/10 * * * *", description: "Executa 6 vezes por hora" },
  { label: "A cada 15 minutos", value: "*/15 * * * *", description: "Executa 4 vezes por hora" },
  { label: "A cada 30 minutos", value: "*/30 * * * *", description: "Executa 2 vezes por hora" },
  { label: "A cada hora", value: "0 * * * *", description: "Executa no minuto 0 de cada hora" },
  { label: "A cada 2 horas", value: "0 */2 * * *", description: "Executa 12 vezes por dia" },
  { label: "A cada 6 horas", value: "0 */6 * * *", description: "Executa 4 vezes por dia" },
  { label: "A cada 12 horas", value: "0 */12 * * *", description: "Executa 2 vezes por dia" },
  { label: "Diariamente (meia-noite)", value: "0 0 * * *", description: "Executa às 00:00 UTC" },
  { label: "Diariamente (6h)", value: "0 6 * * *", description: "Executa às 06:00 UTC" },
  { label: "Diariamente (18h)", value: "0 18 * * *", description: "Executa às 18:00 UTC" },
  { label: "Semanalmente (Domingo)", value: "0 0 * * 0", description: "Executa todo domingo à meia-noite" },
  { label: "Mensalmente", value: "0 0 1 * *", description: "Executa no primeiro dia do mês" },
  { label: "Personalizado", value: "custom", description: "Defina manualmente o cron expression" },
];

export function CronJobsConfig() {
  const { 
    jobs, 
    isLoading, 
    refetch, 
    habilitar, 
    desabilitar, 
    atualizar, 
    executar, 
    isHabilitando, 
    isDesabilitando, 
    isAtualizando, 
    isExecutando, 
    useJobHistory 
  } = useCronJobs();
  
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [historyJobId, setHistoryJobId] = useState<number | null>(null);
  const [infoJob, setInfoJob] = useState<CronJob | null>(null);
  const [editSchedule, setEditSchedule] = useState("");
  const [editCommand, setEditCommand] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const { data: history, isLoading: isLoadingHistory } = useJobHistory(historyJobId);

  // Mapeamento de documentação dos jobs
  const jobDocumentation: Record<string, { descricao: string; tipo: string; regra: string; categoria: string }> = {
    // === JOBS DE CACHE / MATERIALIZED VIEWS ===
    'refresh-dashboard-views': {
      descricao: 'Atualiza as views do dashboard de vendas para garantir dados atualizados.',
      tipo: 'Atualização de Cache',
      regra: 'Executa a função refresh_dashboard_views() que atualiza views materializadas do dashboard.',
      categoria: 'cache'
    },
    'refresh-dashboard-mvs': {
      descricao: 'Atualiza as Materialized Views do dashboard de vendas para garantir dados atualizados sem impactar performance. Essencial para métricas de vendas, ranking de vendedores e atividades prioritárias.',
      tipo: 'Atualização de Cache',
      regra: 'Executa REFRESH CONCURRENTLY nas MVs: mv_estatisticas_vendas (métricas de vendas consolidadas), mv_top_vendedores (ranking por performance), mv_atividades_prioridade (atividades ordenadas por score).',
      categoria: 'cache'
    },
    'refresh-metas-mv': {
      descricao: 'Atualiza a Materialized View de metas com progresso calculado para exibição nos dashboards de gestão.',
      tipo: 'Atualização de Cache',
      regra: 'Executa REFRESH CONCURRENTLY na MV vw_metas_com_progresso que calcula: valor_atingido / valor_meta * 100 para cada meta.',
      categoria: 'cache'
    },
    
    // === JOBS DE PROCESSAMENTO ASSÍNCRONO ===
    'processar-jobs-recalculo': {
      descricao: 'Processa a fila de jobs de recálculo de valor de oportunidades de forma assíncrona.',
      tipo: 'Processamento Assíncrono',
      regra: 'Busca até 50 jobs pendentes, calcula SUM dos itens da oportunidade e atualiza o campo valor. Jobs com falha são re-tentados até 3x.',
      categoria: 'async'
    },
    'processar-jobs-recalculo-oportunidade': {
      descricao: 'Job dedicado ao recálculo automático do valor total das oportunidades.',
      tipo: 'Processamento Assíncrono',
      regra: 'Consome a fila jobs_recalculo_oportunidade: busca pendentes, marca como processing, calcula totais, atualiza oportunidades.valor.',
      categoria: 'async'
    },
    'processar-triagem-whatsapp': {
      descricao: 'Processa mensagens WhatsApp pendentes de triagem utilizando IA para classificação automática.',
      tipo: 'Processamento com IA',
      regra: 'Busca mensagens com status "pendente_triagem", envia para IA (DeepSeek), recebe classificação (urgência, tipo, sentimento). Limite de 20 mensagens por execução.',
      categoria: 'whatsapp'
    },
    
    // === JOBS DE WHATSAPP ===
    'sync-whatsapp-templates': {
      descricao: 'Sincroniza templates de mensagem do Meta Business Suite para uso no WhatsApp Business API.',
      tipo: 'Sincronização',
      regra: 'Chama Edge Function meta-api-sync-templates: (1) Autentica com Meta Graph API, (2) Lista templates aprovados, (3) Atualiza tabela whatsapp_templates.',
      categoria: 'whatsapp'
    },
    'verificar-tokens-whatsapp-diario': {
      descricao: 'Verifica e renova tokens de autenticação do WhatsApp para garantir conexão estável.',
      tipo: 'Manutenção',
      regra: 'Chama Edge Function meta-api-verificar-tokens-cron para verificar validade dos tokens e renovar se necessário.',
      categoria: 'whatsapp'
    },
    'whatsapp-cleanup-sessoes': {
      descricao: 'Limpa sessões expiradas do agente WhatsApp, carrinhos órfãos e logs antigos. Essencial para manter o banco de dados saudável.',
      tipo: 'Manutenção/Limpeza',
      regra: 'Executa a cada hora: (1) Arquiva e remove sessões expiradas de whatsapp_agente_sessoes, (2) Limpa carrinhos de conversas inativas há 24h, (3) Remove logs com mais de 30 dias, (4) Limpa jobs completos/falhos há mais de 7 dias.',
      categoria: 'whatsapp'
    },
    
    // === JOBS DE INTEGRAÇÃO ===
    'sincronizar-tokens-wppconnect': {
      descricao: 'Mantém os tokens de autenticação do WPPConnect Server atualizados.',
      tipo: 'Manutenção',
      regra: 'Verifica validade dos tokens, para tokens próximos de expirar faz refresh via API.',
      categoria: 'integracao'
    },
    
    // === JOBS DE MANUTENÇÃO ===
    'limpar-logs-antigos': {
      descricao: 'Remove logs e registros de auditoria antigos para manter performance do banco.',
      tipo: 'Manutenção',
      regra: 'Deleta registros com mais de 90 dias de: cliente_api_logs, atividades_historico, cron.job_run_details.',
      categoria: 'manutencao'
    },
    'verificar-vencimentos': {
      descricao: 'Verifica atividades e follow-ups vencidos e envia notificações.',
      tipo: 'Notificação',
      regra: 'Busca atividades com data_vencimento < NOW() e status != "concluida", gera alertas para responsáveis.',
      categoria: 'notificacao'
    },
    'atualizar-scores-leads': {
      descricao: 'Recalcula scores de priorização de leads baseado em engajamento recente.',
      tipo: 'Processamento ML',
      regra: 'Calcula score_engajamento, score_recencia, score_valor, score_fit para cada lead ativo.',
      categoria: 'ml'
    },
    'backup-incremental': {
      descricao: 'Executa backup incremental de tabelas críticas.',
      tipo: 'Backup',
      regra: 'Exporta registros modificados nas últimas 24h para storage bucket "backups".',
      categoria: 'backup'
    },
    'processar-fila-emails': {
      descricao: 'Processa fila de emails pendentes de envio.',
      tipo: 'Processamento Assíncrono',
      regra: 'Busca até 100 registros pendentes na email_queue, envia via Edge Function, atualiza status.',
      categoria: 'async'
    },
    'gerar-relatorios-diarios': {
      descricao: 'Gera relatórios consolidados diários e envia para gestores.',
      tipo: 'Relatórios',
      regra: 'Consolida dados do dia anterior: vendas, oportunidades, atividades. Gera PDF e envia por email.',
      categoria: 'relatorios'
    },
    'sincronizar-erp': {
      descricao: 'Sincroniza dados com ERP externo.',
      tipo: 'Integração ERP',
      regra: 'Importa produtos/preços, atualiza estoque, exporta pedidos aprovados.',
      categoria: 'integracao'
    },
  };

  const getJobDocumentation = (jobname: string) => {
    return jobDocumentation[jobname] || {
      descricao: 'Job de sistema sem documentação específica.',
      tipo: 'Sistema',
      regra: 'Executa o comando SQL configurado no schedule definido.',
      categoria: 'sistema'
    };
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setEditSchedule(job.schedule);
    setEditCommand(job.command);
    
    // Tenta encontrar preset correspondente
    const preset = schedulePresets.find(p => p.value === job.schedule);
    setSelectedPreset(preset?.value || 'custom');
  };

  const handleSaveEdit = () => {
    if (!editingJob) return;
    atualizar({ 
      jobid: editingJob.jobid, 
      schedule: editSchedule, 
      command: editCommand 
    });
    setEditingJob(null);
    setSelectedPreset("");
  };

  const handleToggleActive = (job: CronJob) => {
    if (job.active) {
      desabilitar(job.jobid);
    } else {
      habilitar(job.jobid);
    }
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value !== 'custom') {
      setEditSchedule(value);
    }
  };

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'cache': return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'async': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'integracao': return <Server className="h-4 w-4 text-purple-500" />;
      case 'manutencao': return <Shield className="h-4 w-4 text-orange-500" />;
      case 'notificacao': return <Mail className="h-4 w-4 text-pink-500" />;
      case 'relatorios': return <FileText className="h-4 w-4 text-cyan-500" />;
      case 'backup': return <Database className="h-4 w-4 text-indigo-500" />;
      case 'ml': return <Zap className="h-4 w-4 text-emerald-500" />;
      default: return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryBadge = (categoria: string) => {
    const colors: Record<string, string> = {
      cache: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      async: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      whatsapp: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      integracao: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      manutencao: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      notificacao: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      relatorios: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      backup: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      ml: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
    return colors[categoria] || 'bg-muted text-muted-foreground';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'succeeded') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  // Agrupar jobs por categoria
  const groupedJobs = jobs?.reduce((acc, job) => {
    const doc = getJobDocumentation(job.jobname);
    const cat = doc.categoria;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(job);
    return acc;
  }, {} as Record<string, CronJob[]>) || {};

  const categoryLabels: Record<string, string> = {
    cache: 'Cache / Views',
    async: 'Processamento Assíncrono',
    whatsapp: 'WhatsApp',
    integracao: 'Integrações',
    manutencao: 'Manutenção',
    notificacao: 'Notificações',
    relatorios: 'Relatórios',
    backup: 'Backup',
    ml: 'Machine Learning',
    sistema: 'Sistema',
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
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Agendamentos do Sistema (Cron Jobs)
            </CardTitle>
            <CardDescription>
              Gerencie os processos agendados que executam automaticamente • {jobs?.length || 0} jobs configurados
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumo de Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{jobs?.filter(j => j.active).length || 0}</div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-muted-foreground">{jobs?.filter(j => !j.active).length || 0}</div>
              <div className="text-sm text-muted-foreground">Inativos</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{jobs?.filter(j => j.schedule.includes('*/5') || j.schedule.includes('*/10')).length || 0}</div>
              <div className="text-sm text-muted-foreground">Alta Frequência</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{Object.keys(groupedJobs).length}</div>
              <div className="text-sm text-muted-foreground">Categorias</div>
            </div>
          </div>

          <Separator />

          {/* Tabela de Jobs */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Nome / Categoria</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.map((job) => {
                const doc = getJobDocumentation(job.jobname);
                return (
                  <TableRow key={job.jobid} className={!job.active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(doc.categoria)}
                          <span className="font-medium">{job.jobname}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getCategoryBadge(doc.categoria)}`}>
                            {doc.tipo}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <div className="font-medium text-sm">{formatCronSchedule(job.schedule)}</div>
                            <code className="text-xs text-muted-foreground">{job.schedule}</code>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Expressão Cron: <code>{job.schedule}</code></p>
                          <p className="text-xs text-muted-foreground mt-1">minuto hora dia mês dia_semana</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={job.active} 
                          onCheckedChange={() => handleToggleActive(job)}
                          disabled={isHabilitando || isDesabilitando}
                        />
                        <Badge variant={job.active ? "default" : "secondary"}>
                          {job.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => executar(job.jobid)}
                              disabled={isExecutando}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Executar agora</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(job)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Configurar</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setHistoryJobId(job.jobid)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Histórico</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setInfoJob(job)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Documentação</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!jobs || jobs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum cron job encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet de Edição/Configuração */}
      <Sheet open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Cron Job
            </SheetTitle>
            <SheetDescription>
              Altere a frequência de execução e outras configurações
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            {/* Nome do Job (readonly) */}
            <div className="space-y-2">
              <Label>Nome do Job</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                {editingJob && getCategoryIcon(getJobDocumentation(editingJob.jobname).categoria)}
                <span className="font-medium">{editingJob?.jobname}</span>
              </div>
            </div>

            {/* Descrição */}
            {editingJob && (
              <div className="space-y-2">
                <Label>Descrição</Label>
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                  {getJobDocumentation(editingJob.jobname).descricao}
                </p>
              </div>
            )}

            <Separator />

            {/* Preset de Schedule */}
            <div className="space-y-2">
              <Label>Frequência de Execução</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma frequência" />
                </SelectTrigger>
                <SelectContent>
                  {schedulePresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      <div className="flex flex-col">
                        <span>{preset.label}</span>
                        <span className="text-xs text-muted-foreground">{preset.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Manual */}
            <div className="space-y-2">
              <Label htmlFor="schedule">Expressão Cron</Label>
              <Input 
                id="schedule"
                value={editSchedule}
                onChange={(e) => {
                  setEditSchedule(e.target.value);
                  setSelectedPreset('custom');
                }}
                placeholder="*/5 * * * *"
                className="font-mono"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Formato: minuto hora dia mês dia_semana
                </p>
                {editSchedule && (
                  <Badge variant="outline">
                    {formatCronSchedule(editSchedule)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Guia Rápido de Cron */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Guia Rápido</Label>
              <div className="grid grid-cols-5 gap-2 text-xs text-center">
                <div className="p-2 bg-background rounded">
                  <div className="font-mono font-bold">*</div>
                  <div className="text-muted-foreground">min</div>
                  <div className="text-muted-foreground text-[10px]">0-59</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="font-mono font-bold">*</div>
                  <div className="text-muted-foreground">hora</div>
                  <div className="text-muted-foreground text-[10px]">0-23</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="font-mono font-bold">*</div>
                  <div className="text-muted-foreground">dia</div>
                  <div className="text-muted-foreground text-[10px]">1-31</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="font-mono font-bold">*</div>
                  <div className="text-muted-foreground">mês</div>
                  <div className="text-muted-foreground text-[10px]">1-12</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="font-mono font-bold">*</div>
                  <div className="text-muted-foreground">semana</div>
                  <div className="text-muted-foreground text-[10px]">0-6</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use <code className="bg-background px-1 rounded">*/N</code> para "a cada N unidades"
              </p>
            </div>

            <Separator />

            {/* Comando SQL */}
            <div className="space-y-2">
              <Label htmlFor="command">Comando SQL</Label>
              <Textarea 
                id="command"
                value={editCommand}
                onChange={(e) => setEditCommand(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ Altere apenas se souber o que está fazendo
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingJob(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isAtualizando}>
                {isAtualizando ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog de Histórico */}
      <Dialog open={!!historyJobId} onOpenChange={(open) => !open && setHistoryJobId(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Execuções
            </DialogTitle>
            <DialogDescription>
              Últimas 50 execuções do cron job
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            {isLoadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Início</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((run) => (
                    <TableRow key={run.runid}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(run.start_time), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatDuration(run.start_time, run.end_time)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(run.status)}
                          <span className={run.status === 'succeeded' ? 'text-green-600' : run.status === 'failed' ? 'text-destructive' : ''}>
                            {run.status === 'succeeded' ? 'Sucesso' : run.status === 'failed' ? 'Falha' : run.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block text-xs text-muted-foreground cursor-help">
                              {run.return_message || '-'}
                            </span>
                          </TooltipTrigger>
                          {run.return_message && (
                            <TooltipContent className="max-w-md">
                              <pre className="text-xs whitespace-pre-wrap">{run.return_message}</pre>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!history || history.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma execução registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de Informações/Documentação */}
      <Dialog open={!!infoJob} onOpenChange={(open) => !open && setInfoJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Documentação do Job
            </DialogTitle>
            <DialogDescription>
              Detalhes sobre funcionalidade e regras de execução
            </DialogDescription>
          </DialogHeader>
          
          {infoJob && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nome</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  {getCategoryIcon(getJobDocumentation(infoJob.jobname).categoria)}
                  <span className="font-medium">{infoJob.jobname}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Categoria / Tipo</Label>
                <div className="flex gap-2">
                  <Badge className={getCategoryBadge(getJobDocumentation(infoJob.jobname).categoria)}>
                    {categoryLabels[getJobDocumentation(infoJob.jobname).categoria] || 'Sistema'}
                  </Badge>
                  <Badge variant="outline">
                    {getJobDocumentation(infoJob.jobname).tipo}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Descrição</Label>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {getJobDocumentation(infoJob.jobname).descricao}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Regra de Execução</Label>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {getJobDocumentation(infoJob.jobname).regra}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Frequência Atual</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {formatCronSchedule(infoJob.schedule)}
                  </Badge>
                  <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {infoJob.schedule}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Status</Label>
                <Badge variant={infoJob.active ? "default" : "secondary"}>
                  {infoJob.active ? "✓ Ativo" : "○ Inativo"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
