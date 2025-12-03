import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "./InfoTooltip";

interface ConnectionsChartProps {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  isLoading?: boolean;
}

interface DataPoint {
  time: string;
  total: number;
  active: number;
  idle: number;
}

const MAX_CONNECTIONS = 300;

export function ConnectionsChart({ 
  totalConnections, 
  activeConnections, 
  idleConnections,
  isLoading 
}: ConnectionsChartProps) {
  const [history, setHistory] = useState<DataPoint[]>([]);

  useEffect(() => {
    if (isLoading) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    setHistory(prev => {
      const newHistory = [...prev, {
        time: timeStr,
        total: totalConnections,
        active: activeConnections,
        idle: idleConnections
      }];
      
      // Manter apenas os últimos 20 pontos
      if (newHistory.length > 20) {
        return newHistory.slice(-20);
      }
      return newHistory;
    });
  }, [totalConnections, activeConnections, idleConnections, isLoading]);

  const usagePercent = Math.round((totalConnections / MAX_CONNECTIONS) * 100);
  const trend = history.length >= 2 
    ? history[history.length - 1].total - history[history.length - 2].total 
    : 0;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Conexões em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Conexões em Tempo Real
            <InfoTooltip content="Monitoramento do pool de conexões PostgreSQL. Mostra histórico das últimas 20 leituras. Linha tracejada amarela indica 80% da capacidade (threshold de alerta)." />
          </span>
          <div className="flex items-center gap-2">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-warning" />
            ) : trend < 0 ? (
              <TrendingDown className="h-4 w-4 text-success" />
            ) : null}
            <Badge 
              variant={usagePercent > 80 ? "destructive" : usagePercent > 50 ? "secondary" : "default"}
              className={usagePercent <= 50 ? "bg-success/20 text-success border-success/30" : ""}
            >
              {usagePercent}% usado
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalConnections}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Total
              <InfoTooltip content="Soma de todas as conexões ao banco de dados (ativas + idle). Máximo permitido: 300." />
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{activeConnections}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Ativas
              <InfoTooltip content="Conexões executando queries no momento. Alto número pode indicar queries lentas ou picos de uso." />
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">{idleConnections}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Idle
              <InfoTooltip content="Conexões abertas mas ociosas no pool. Mantidas para reutilização e evitar overhead de reconexão." />
            </div>
          </div>
        </div>

        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, MAX_CONNECTIONS]} 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <ReferenceLine 
                y={MAX_CONNECTIONS * 0.8} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="5 5"
                label={{ value: '80%', position: 'right', fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2}
                name="Total"
              />
              <Area
                type="monotone"
                dataKey="active"
                stroke="hsl(var(--success))"
                fillOpacity={1}
                fill="url(#colorActive)"
                strokeWidth={2}
                name="Ativas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
