import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EdgeFunctionMetric {
  function_id: string;
  function_name: string;
  total_calls: number;
  avg_execution_time: number;
  max_execution_time: number;
  min_execution_time: number;
  error_count: number;
  success_count: number;
  error_rate: number;
  status: 'ok' | 'slow' | 'critical';
}

interface EdgeFunctionLog {
  id: string;
  timestamp: number;
  function_id: string;
  execution_time_ms: number;
  status_code: number;
  method: string;
}

interface EdgeFunctionMetrics {
  functions: EdgeFunctionMetric[];
  recentLogs: EdgeFunctionLog[];
  totalCalls: number;
  avgExecutionTime: number;
  errorRate: number;
  timestamp: Date;
}

// Mapeamento de function_id para nomes legíveis
const FUNCTION_NAMES: Record<string, string> = {
  'agente-vendas-whatsapp': 'Agente WhatsApp',
  'w-api-webhook': 'W-API Webhook',
  'w-api-enviar-mensagem': 'Enviar Mensagem',
  'calcular-frete-datasul': 'Calcular Frete',
  'calcular-pedido-datasul': 'Calcular Pedido',
  'rag-assistant': 'RAG Assistant',
  'gerar-link-proposta': 'Gerar Link Proposta',
  'buscar-proposta-publica': 'Buscar Proposta',
  'edi-importar-xml': 'Importar XML EDI',
  'analisar-cotacao-completa': 'Analisar Cotação',
};

export function useEdgeFunctionMetrics(enabled: boolean = true, refetchInterval: number = 60000) {
  return useQuery({
    queryKey: ["edge-function-metrics"],
    queryFn: async (): Promise<EdgeFunctionMetrics> => {
      // Query para buscar logs de edge functions das últimas 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: logs, error } = await supabase
        .from('function_edge_logs' as any)
        .select('id, timestamp, metadata')
        .gte('timestamp', twentyFourHoursAgo)
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (error) {
        console.warn("Erro ao buscar logs de edge functions:", error);
        // Retornar dados mock se não conseguir acessar os logs
        return getMockMetrics();
      }

      // Processar logs para extrair métricas
      const functionMap = new Map<string, {
        calls: number;
        totalTime: number;
        maxTime: number;
        minTime: number;
        errors: number;
        successes: number;
      }>();

      const recentLogs: EdgeFunctionLog[] = [];

      (logs || []).forEach((log: any) => {
        const metadata = log.metadata?.[0] || log.metadata || {};
        const functionId = metadata.function_id || 'unknown';
        const executionTime = metadata.execution_time_ms || 0;
        const statusCode = metadata.response?.status_code || 200;

        // Adicionar aos logs recentes (últimos 50)
        if (recentLogs.length < 50) {
          recentLogs.push({
            id: log.id,
            timestamp: new Date(log.timestamp).getTime(),
            function_id: functionId,
            execution_time_ms: executionTime,
            status_code: statusCode,
            method: metadata.request?.method || 'POST'
          });
        }

        // Agregar por função
        const existing = functionMap.get(functionId) || {
          calls: 0,
          totalTime: 0,
          maxTime: 0,
          minTime: Infinity,
          errors: 0,
          successes: 0
        };

        existing.calls++;
        existing.totalTime += executionTime;
        existing.maxTime = Math.max(existing.maxTime, executionTime);
        existing.minTime = Math.min(existing.minTime, executionTime);
        
        if (statusCode >= 400) {
          existing.errors++;
        } else {
          existing.successes++;
        }

        functionMap.set(functionId, existing);
      });

      // Converter para array de métricas
      const functions: EdgeFunctionMetric[] = Array.from(functionMap.entries())
        .map(([functionId, stats]) => {
          const avgTime = stats.calls > 0 ? stats.totalTime / stats.calls : 0;
          const errorRate = stats.calls > 0 ? (stats.errors / stats.calls) * 100 : 0;
          
          let status: 'ok' | 'slow' | 'critical' = 'ok';
          if (avgTime > 2000 || errorRate > 10) status = 'critical';
          else if (avgTime > 500 || errorRate > 5) status = 'slow';

          return {
            function_id: functionId,
            function_name: FUNCTION_NAMES[functionId] || functionId,
            total_calls: stats.calls,
            avg_execution_time: Math.round(avgTime),
            max_execution_time: stats.maxTime,
            min_execution_time: stats.minTime === Infinity ? 0 : stats.minTime,
            error_count: stats.errors,
            success_count: stats.successes,
            error_rate: Math.round(errorRate * 100) / 100,
            status
          };
        })
        .sort((a, b) => b.total_calls - a.total_calls);

      const totalCalls = functions.reduce((sum, f) => sum + f.total_calls, 0);
      const avgExecutionTime = totalCalls > 0 
        ? functions.reduce((sum, f) => sum + f.avg_execution_time * f.total_calls, 0) / totalCalls 
        : 0;
      const totalErrors = functions.reduce((sum, f) => sum + f.error_count, 0);
      const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;

      return {
        functions,
        recentLogs,
        totalCalls,
        avgExecutionTime: Math.round(avgExecutionTime),
        errorRate: Math.round(errorRate * 100) / 100,
        timestamp: new Date()
      };
    },
    enabled,
    refetchInterval,
    staleTime: 60000,
  });
}

// Dados mock para quando não há acesso aos logs
function getMockMetrics(): EdgeFunctionMetrics {
  return {
    functions: [
      { function_id: 'agente-vendas-whatsapp', function_name: 'Agente WhatsApp', total_calls: 0, avg_execution_time: 0, max_execution_time: 0, min_execution_time: 0, error_count: 0, success_count: 0, error_rate: 0, status: 'ok' },
    ],
    recentLogs: [],
    totalCalls: 0,
    avgExecutionTime: 0,
    errorRate: 0,
    timestamp: new Date()
  };
}
