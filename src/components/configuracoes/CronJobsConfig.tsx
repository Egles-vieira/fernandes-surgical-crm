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
  Info
} from "lucide-react";
import { useCronJobs, formatCronSchedule, formatDuration, CronJob, CronJobHistory } from "@/hooks/useCronJobs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CronJobsConfig() {
  const { jobs, isLoading, refetch, habilitar, desabilitar, atualizar, executar, isHabilitando, isDesabilitando, isAtualizando, isExecutando, useJobHistory } = useCronJobs();
  
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [historyJobId, setHistoryJobId] = useState<number | null>(null);
  const [infoJob, setInfoJob] = useState<CronJob | null>(null);
  const [editSchedule, setEditSchedule] = useState("");
  const [editCommand, setEditCommand] = useState("");

  const { data: history, isLoading: isLoadingHistory } = useJobHistory(historyJobId);

  // Mapeamento de documentação dos jobs
  const jobDocumentation: Record<string, { descricao: string; tipo: string; regra: string }> = {
    // === JOBS DE CACHE / MATERIALIZED VIEWS ===
    'refresh-dashboard-mvs': {
      descricao: 'Atualiza as Materialized Views do dashboard de vendas para garantir dados atualizados sem impactar performance. Essencial para métricas de vendas, ranking de vendedores e atividades prioritárias.',
      tipo: 'Atualização de Cache',
      regra: 'Executa REFRESH CONCURRENTLY nas MVs: mv_estatisticas_vendas (métricas de vendas consolidadas), mv_top_vendedores (ranking por performance), mv_atividades_prioridade (atividades ordenadas por score). Permite leitura durante atualização para não travar dashboards.'
    },
    'refresh-metas-mv': {
      descricao: 'Atualiza a Materialized View de metas com progresso calculado para exibição nos dashboards de gestão. Fundamental para acompanhamento de KPIs e metas da equipe.',
      tipo: 'Atualização de Cache',
      regra: 'Executa REFRESH CONCURRENTLY na MV vw_metas_com_progresso que calcula: valor_atingido / valor_meta * 100 para cada meta, consolidando vendas do período e comparando com targets definidos.'
    },
    
    // === JOBS DE PROCESSAMENTO ASSÍNCRONO ===
    'processar-jobs-recalculo': {
      descricao: 'Processa a fila de jobs de recálculo de valor de oportunidades de forma assíncrona. Criado para não travar a UI durante atualizações em massa de itens de oportunidade.',
      tipo: 'Processamento Assíncrono (Fire-and-Forget)',
      regra: 'Busca até 50 jobs pendentes na tabela jobs_recalculo_oportunidade, para cada um calcula SUM(quantidade * preco_unitario - valor_desconto) de todos os itens da oportunidade e atualiza o campo valor na tabela oportunidades. Jobs com falha são re-tentados até 3x.'
    },
    'processar-triagem-whatsapp': {
      descricao: 'Processa mensagens WhatsApp pendentes de triagem utilizando IA para classificação automática. Essencial para organização do atendimento e priorização de conversas.',
      tipo: 'Processamento Assíncrono com IA',
      regra: 'Busca mensagens na tabela whatsapp_mensagens com status "pendente_triagem", envia contexto para Edge Function de IA (DeepSeek), recebe classificação (urgência, tipo, sentimento) e atualiza metadados da mensagem. Limite de 20 mensagens por execução para controle de custo.'
    },
    
    // === JOBS DE INTEGRAÇÃO / SINCRONIZAÇÃO ===
    'sync-whatsapp-templates': {
      descricao: 'Sincroniza templates de mensagem do Meta Business Suite para uso no WhatsApp Business API. Mantém templates atualizados para envio de mensagens HSM.',
      tipo: 'Sincronização de Integração',
      regra: 'Chama a Edge Function meta-api-sync-templates que: (1) Autentica com Meta Graph API, (2) Lista todos templates aprovados da conta WABA, (3) Insere/Atualiza na tabela whatsapp_templates. Executado a cada 6 horas.'
    },
    'sincronizar-tokens-wppconnect': {
      descricao: 'Mantém os tokens de autenticação do WPPConnect Server atualizados para garantir conexão estável com sessões WhatsApp. Previne desconexões por expiração de token.',
      tipo: 'Manutenção de Integração',
      regra: 'Verifica validade dos tokens na tabela wppconnect_sessions, para tokens próximos de expirar (< 1 hora) faz refresh via API do WPPConnect Server e atualiza o token armazenado.'
    },
    
    // === JOBS DE MANUTENÇÃO / LIMPEZA ===
    'limpar-logs-antigos': {
      descricao: 'Remove logs e registros de auditoria antigos para manter performance do banco de dados. Essencial para gestão de espaço e compliance com LGPD.',
      tipo: 'Manutenção de Banco de Dados',
      regra: 'Deleta registros com mais de 90 dias das tabelas: cliente_api_logs, atividades_historico (soft delete já realizado), cron.job_run_details. Executa em horário de baixo uso.'
    },
    'verificar-vencimentos': {
      descricao: 'Verifica atividades e follow-ups vencidos e envia notificações para responsáveis. Importante para gestão de SLA e acompanhamento de clientes.',
      tipo: 'Notificação Automática',
      regra: 'Busca atividades com data_vencimento < NOW() e status != "concluida", gera alertas na tabela notificacoes para cada responsável. Também verifica oportunidades sem atividade há mais de X dias.'
    },
    'atualizar-scores-leads': {
      descricao: 'Recalcula scores de priorização de leads e contatos baseado em engajamento recente. Alimenta a fila de trabalho inteligente dos vendedores.',
      tipo: 'Processamento de Machine Learning',
      regra: 'Para cada lead/contato ativo calcula: score_engajamento (interações 7 dias), score_recencia (último contato), score_valor (oportunidades abertas), score_fit (match com ICP). Atualiza campos score_* na tabela atividades.'
    },
    'backup-incremental': {
      descricao: 'Executa backup incremental de tabelas críticas de negócio para bucket de storage. Complementa backups automáticos do Supabase.',
      tipo: 'Backup e Recuperação',
      regra: 'Exporta registros modificados nas últimas 24h das tabelas: vendas, oportunidades, clientes para formato JSON compactado no storage bucket "backups". Mantém 30 dias de histórico.'
    },
    'processar-fila-emails': {
      descricao: 'Processa fila de emails pendentes de envio (follow-ups, notificações, relatórios). Evita timeout em envios em massa.',
      tipo: 'Processamento Assíncrono',
      regra: 'Busca até 100 registros pendentes na tabela email_queue, envia via Edge Function (Resend/SendGrid), atualiza status para "enviado" ou "erro" com detalhes. Implementa rate limiting de 10 emails/segundo.'
    },
    'gerar-relatorios-diarios': {
      descricao: 'Gera relatórios consolidados diários e envia para gestores. Inclui resumo de vendas, atividades e indicadores.',
      tipo: 'Relatórios Automáticos',
      regra: 'Consolida dados do dia anterior: total vendas, oportunidades criadas/fechadas, atividades realizadas. Gera PDF via Edge Function e envia por email para usuários com role "manager" ou "admin".'
    },
    'sincronizar-erp': {
      descricao: 'Sincroniza dados com ERP externo (produtos, preços, estoque, pedidos). Mantém CRM atualizado com dados fiscais.',
      tipo: 'Integração ERP',
      regra: 'Chama API do ERP para: (1) Importar novos produtos/preços, (2) Atualizar estoque disponível, (3) Exportar pedidos aprovados. Usa fila de jobs para operações pesadas. Conflitos são logados para revisão manual.'
    },
  };

  const getJobDocumentation = (jobname: string) => {
    return jobDocumentation[jobname] || {
      descricao: 'Job de sistema sem documentação específica.',
      tipo: 'Sistema',
      regra: 'Executa o comando SQL configurado no schedule definido.'
    };
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setEditSchedule(job.schedule);
    setEditCommand(job.command);
  };

  const handleSaveEdit = () => {
    if (!editingJob) return;
    atualizar({ 
      jobid: editingJob.jobid, 
      schedule: editSchedule, 
      command: editCommand 
    });
    setEditingJob(null);
  };

  const handleToggleActive = (job: CronJob) => {
    if (job.active) {
      desabilitar(job.jobid);
    } else {
      habilitar(job.jobid);
    }
  };

  const getJobIcon = (jobname: string) => {
    if (jobname.includes('refresh') || jobname.includes('dashboard')) return <RefreshCw className="h-4 w-4" />;
    if (jobname.includes('whatsapp') || jobname.includes('triagem')) return <Clock className="h-4 w-4" />;
    if (jobname.includes('token')) return <AlertCircle className="h-4 w-4" />;
    if (jobname.includes('sync')) return <Database className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'succeeded') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
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
              Gerencie os processos agendados que executam automaticamente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Nome</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.map((job) => (
                <TableRow key={job.jobid}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getJobIcon(job.jobname)}
                      <span className="truncate max-w-[200px]">{job.jobname}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-muted-foreground">
                          {formatCronSchedule(job.schedule)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cron: <code>{job.schedule}</code></p>
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
                        <TooltipContent>Editar</TooltipContent>
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
                        <TooltipContent>Informações</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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

      {/* Sheet de Edição */}
      <Sheet open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Editar Cron Job
            </SheetTitle>
            <SheetDescription>
              Altere a frequência e o comando do agendamento
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label>Nome do Job</Label>
              <Input value={editingJob?.jobname || ""} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Schedule (Cron)</Label>
              <Input 
                id="schedule"
                value={editSchedule}
                onChange={(e) => setEditSchedule(e.target.value)}
                placeholder="*/5 * * * *"
              />
              <p className="text-xs text-muted-foreground">
                Formato: minuto hora dia mês dia_semana
              </p>
              {editSchedule && (
                <Badge variant="outline" className="mt-1">
                  {formatCronSchedule(editSchedule)}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="command">Comando SQL</Label>
              <Textarea 
                id="command"
                value={editCommand}
                onChange={(e) => setEditCommand(e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingJob(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isAtualizando}>
                {isAtualizando ? "Salvando..." : "Salvar"}
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
                        {formatDuration(run.start_time, run.end_time)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(run.status)}
                          <span className={run.status === 'succeeded' ? 'text-green-600' : run.status === 'failed' ? 'text-destructive' : ''}>
                            {run.status === 'succeeded' ? 'Sucesso' : run.status === 'failed' ? 'Falha' : run.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
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

      {/* Dialog de Informações do Job */}
      <Dialog open={!!infoJob} onOpenChange={(open) => !open && setInfoJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Informações do Job
            </DialogTitle>
            <DialogDescription>
              Detalhes sobre a funcionalidade e regras do agendamento
            </DialogDescription>
          </DialogHeader>
          
          {infoJob && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Nome</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  {getJobIcon(infoJob.jobname)}
                  <span className="font-medium">{infoJob.jobname}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Tipo</Label>
                <Badge variant="outline" className="text-sm">
                  {getJobDocumentation(infoJob.jobname).tipo}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Descrição</Label>
                <p className="text-sm text-foreground bg-muted p-3 rounded-md">
                  {getJobDocumentation(infoJob.jobname).descricao}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Regra de Execução</Label>
                <p className="text-sm text-foreground bg-muted p-3 rounded-md font-mono text-xs">
                  {getJobDocumentation(infoJob.jobname).regra}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Frequência</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{formatCronSchedule(infoJob.schedule)}</Badge>
                  <span className="text-xs text-muted-foreground">({infoJob.schedule})</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Status Atual</Label>
                <Badge variant={infoJob.active ? "default" : "secondary"}>
                  {infoJob.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
