// ============================================
// Status Bar Component
// ============================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Settings,
  Wifi,
  WifiOff,
  Circle
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
import { useState } from 'react';

interface StatusBarProps {
  isConnected: boolean;
  phoneNumberId?: string | null;
  qualityRating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
}

type OperatorStatus = 'online' | 'busy' | 'break' | 'offline';

export function StatusBar({ 
  isConnected, 
  phoneNumberId,
  qualityRating = 'UNKNOWN' 
}: StatusBarProps) {
  const [operatorStatus, setOperatorStatus] = useState<OperatorStatus>('online');

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

  const getStatusColor = (status: OperatorStatus) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'break':
        return 'bg-orange-500';
      case 'offline':
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: OperatorStatus) => {
    switch (status) {
      case 'online':
        return 'Disponível';
      case 'busy':
        return 'Ocupado';
      case 'break':
        return 'Em Pausa';
      case 'offline':
        return 'Offline';
    }
  };

  const maskedPhoneId = phoneNumberId 
    ? `***${phoneNumberId.slice(-4)}` 
    : 'Não configurado';

  return (
    <TooltipProvider>
      <div className="h-10 px-4 flex items-center justify-between border-t bg-card text-sm">
        {/* Left: Operator Status */}
        <div className="flex items-center gap-3">
          <Select value={operatorStatus} onValueChange={(v) => setOperatorStatus(v as OperatorStatus)}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", getStatusColor(operatorStatus))} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Disponível
                </div>
              </SelectItem>
              <SelectItem value="busy">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Ocupado
                </div>
              </SelectItem>
              <SelectItem value="break">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Em Pausa
                </div>
              </SelectItem>
              <SelectItem value="offline">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  Offline
                </div>
              </SelectItem>
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
