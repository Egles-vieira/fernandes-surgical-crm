import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Zap, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "./InfoTooltip";

interface EdgeFunctionMetric {
  function_id: string;
  function_name: string;
  total_calls: number;
  avg_execution_time: number;
  error_rate: number;
  status: 'ok' | 'slow' | 'critical';
}

interface EdgeFunctionsPerformanceProps {
  functions: EdgeFunctionMetric[];
  totalCalls: number;
  avgExecutionTime: number;
  errorRate: number;
  isLoading?: boolean;
}

export function EdgeFunctionsPerformance({ 
  functions, 
  totalCalls, 
  avgExecutionTime, 
  errorRate,
  isLoading 
}: EdgeFunctionsPerformanceProps) {
  const getStatusColor = (status: 'ok' | 'slow' | 'critical') => {
    switch (status) {
      case 'ok': return 'hsl(var(--success))';
      case 'slow': return 'hsl(var(--warning))';
      case 'critical': return 'hsl(var(--destructive))';
    }
  };

  const getStatusIcon = (status: 'ok' | 'slow' | 'critical') => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-3 w-3 text-success" />;
      case 'slow': return <AlertTriangle className="h-3 w-3 text-warning" />;
      case 'critical': return <XCircle className="h-3 w-3 text-destructive" />;
    }
  };

  const chartData = functions
    .slice(0, 10)
    .map(f => ({
      name: f.function_name.length > 15 ? f.function_name.slice(0, 15) + '...' : f.function_name,
      fullName: f.function_name,
      time: f.avg_execution_time,
      calls: f.total_calls,
      status: f.status
    }));

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Edge Functions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Edge Functions (24h)
            <InfoTooltip content="Performance das Edge Functions Deno nas últimas 24 horas. Monitora chamadas, tempo de execução e erros. Funções lentas (>2s) ou com alta taxa de erro são destacadas." />
          </span>
          <Badge variant="outline">{functions.length} funções</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Total Calls
              <InfoTooltip content="Total de chamadas a todas as Edge Functions nas últimas 24 horas. Inclui chamadas bem-sucedidas e com erro." />
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              <span className={avgExecutionTime > 2000 ? "text-destructive" : avgExecutionTime > 500 ? "text-warning" : "text-success"}>
                {avgExecutionTime}ms
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Tempo Médio
              <InfoTooltip content="Média de tempo de execução de todas as funções. Inclui processamento e queries ao banco. Ideal: <500ms (verde), Aceitável: <2000ms (amarelo)." />
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              <span className={errorRate > 5 ? "text-destructive" : errorRate > 1 ? "text-warning" : "text-success"}>
                {errorRate}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Taxa de Erro
              <InfoTooltip content="Porcentagem de chamadas que retornaram erro (status HTTP >= 400). Ideal: <1% (verde), Atenção: 1-5% (amarelo), Crítico: >5% (vermelho)." />
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                  tickFormatter={(value) => `${value}ms`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}ms (${props.payload.calls} calls)`,
                    props.payload.fullName
                  ]}
                />
                <Bar dataKey="time" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}

        {/* Lista de status das funções */}
        <div className="mt-4 space-y-1 max-h-32 overflow-auto">
          {functions.slice(0, 5).map((fn) => (
            <div key={fn.function_id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {getStatusIcon(fn.status)}
                <span className="text-muted-foreground truncate max-w-[150px]">{fn.function_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">{fn.avg_execution_time}ms</span>
                <span className="text-muted-foreground">({fn.total_calls})</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
