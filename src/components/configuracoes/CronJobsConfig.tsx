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
  Database
} from "lucide-react";
import { useCronJobs, formatCronSchedule, formatDuration, CronJob, CronJobHistory } from "@/hooks/useCronJobs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CronJobsConfig() {
  const { jobs, isLoading, refetch, habilitar, desabilitar, atualizar, isHabilitando, isDesabilitando, isAtualizando, useJobHistory } = useCronJobs();
  
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [historyJobId, setHistoryJobId] = useState<number | null>(null);
  const [editSchedule, setEditSchedule] = useState("");
  const [editCommand, setEditCommand] = useState("");

  const { data: history, isLoading: isLoadingHistory } = useJobHistory(historyJobId);

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
    </TooltipProvider>
  );
}
