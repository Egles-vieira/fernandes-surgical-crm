// ============================================
// Status Bar Component
// ============================================

import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Settings,
  Wifi,
  WifiOff,
  Circle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StatusBarProps {
  isConnected: boolean;
  phoneNumberId?: string | null;
  qualityRating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
}

// Valores do banco: online, ocupado, paused, offline
type OperatorStatusDB = 'online' | 'ocupado' | 'paused' | 'offline';

const STATUS_OPTIONS: { value: OperatorStatusDB; label: string; color: string }[] = [
  { value: 'online', label: 'Disponível', color: 'bg-green-500' },
  { value: 'ocupado', label: 'Ocupado', color: 'bg-yellow-500' },
  { value: 'paused', label: 'Em Pausa', color: 'bg-orange-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-400' },
];

export function StatusBar({ 
  isConnected, 
  phoneNumberId,
  qualityRating = 'UNKNOWN' 
}: StatusBarProps) {
  const queryClient = useQueryClient();

  // Buscar status atual do banco
  const { data: operatorStatus = 'offline', isLoading } = useQuery({
    queryKey: ['whatsapp-operator-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'offline';
      
      const { data } = await supabase
        .from('perfis_usuario')
        .select('status_atendimento_whatsapp')
        .eq('id', user.id)
        .single();
      
      return (data?.status_atendimento_whatsapp as OperatorStatusDB) || 'offline';
    },
  });

  // Mutation para atualizar status
  const updateStatus = useMutation({
    mutationFn: async (status: OperatorStatusDB) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      const { error } = await supabase
        .from('perfis_usuario')
        .update({ status_atendimento_whatsapp: status })
        .eq('id', user.id);
      
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-operator-status'] });
      const option = STATUS_OPTIONS.find(o => o.value === status);
      toast.success(`Status alterado para ${option?.label || status}`);
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    }
  });

  const getQualityIcon = () => {
    switch (qualityRating) {
      case 'GREEN':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'YELLOW':
        return <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />;
      case 'RED':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getQualityLabel = () => {
    switch (qualityRating) {
      case 'GREEN':
        return 'Alta Qualidade';
      case 'YELLOW':
        return 'Média Qualidade';
      case 'RED':
        return 'Baixa Qualidade';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: OperatorStatusDB) => {
    return STATUS_OPTIONS.find(o => o.value === status)?.color || 'bg-gray-400';
  };

  const getStatusLabel = (status: OperatorStatusDB) => {
    return STATUS_OPTIONS.find(o => o.value === status)?.label || 'Offline';
  };

  const maskedPhoneId = phoneNumberId 
    ? `***${phoneNumberId.slice(-4)}` 
    : 'Não configurado';

  return (
    <TooltipProvider>
      <div className="h-10 px-4 flex items-center justify-between border-t bg-card text-sm">
        {/* Left: Operator Status */}
        <div className="flex items-center gap-3">
          <Select 
            value={operatorStatus} 
            onValueChange={(v) => updateStatus.mutate(v as OperatorStatusDB)}
            disabled={isLoading || updateStatus.isPending}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <div className="flex items-center gap-2">
                {updateStatus.isPending ? (
                  <Loader2 className="h-2 w-2 animate-spin" />
                ) : (
                  <span className={cn("h-2 w-2 rounded-full", getStatusColor(operatorStatus))} />
                )}
                <SelectValue>{getStatusLabel(operatorStatus)}</SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", option.color)} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Center: Connection Status */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className={cn(
                  "text-xs",
                  isConnected ? "text-green-600" : "text-destructive"
                )}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Phone ID: {maskedPhoneId}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {getQualityIcon()}
                <span className="text-xs text-muted-foreground">
                  Qualidade: {getQualityLabel()}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Qualidade do número do WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Afeta a capacidade de envio de mensagens
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right: Settings */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs"
            asChild
          >
            <Link to="/whatsapp/configuracoes">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Configurações
            </Link>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
