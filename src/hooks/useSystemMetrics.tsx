import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TableMetric {
  table_name: string;
  row_count: number;
  seq_scan: number;
  idx_scan: number;
  n_live_tup: number;
  n_dead_tup: number;
  last_vacuum: string | null;
  last_analyze: string | null;
  index_ratio: number;
}

interface ConnectionMetric {
  state: string;
  count: number;
  application_name: string;
}

interface SystemMetrics {
  tables: TableMetric[];
  connections: ConnectionMetric[];
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  timestamp: Date;
}

export function useSystemMetrics(enabled: boolean = true, refetchInterval: number = 30000) {
  return useQuery({
    queryKey: ["system-metrics"],
    queryFn: async (): Promise<SystemMetrics> => {
      // Buscar métricas de tabelas via pg_stat_user_tables
      const { data: tableStats, error: tableError } = await supabase
        .rpc('get_table_statistics' as any);

      if (tableError) {
        console.warn("Erro ao buscar estatísticas de tabelas:", tableError);
      }

      // Buscar conexões ativas via pg_stat_activity
      const { data: connectionStats, error: connError } = await supabase
        .rpc('get_connection_statistics' as any);

      if (connError) {
        console.warn("Erro ao buscar estatísticas de conexões:", connError);
      }

      const rawTables = (tableStats || []) as any[];
      const tables: TableMetric[] = rawTables.map((t: any) => ({
        table_name: t.table_name,
        row_count: Number(t.row_count) || 0,
        seq_scan: Number(t.seq_scan) || 0,
        idx_scan: Number(t.idx_scan) || 0,
        n_live_tup: Number(t.n_live_tup) || 0,
        n_dead_tup: Number(t.n_dead_tup) || 0,
        last_vacuum: t.last_vacuum,
        last_analyze: t.last_analyze,
        index_ratio: t.seq_scan + t.idx_scan > 0 
          ? (t.idx_scan / (t.seq_scan + t.idx_scan)) * 100 
          : 100
      }));

      const connections: ConnectionMetric[] = (connectionStats || []) as ConnectionMetric[];
      
      const totalConnections = connections.reduce((sum, c) => sum + Number(c.count), 0);
      const activeConnections = connections
        .filter(c => c.state === 'active')
        .reduce((sum, c) => sum + Number(c.count), 0);
      const idleConnections = connections
        .filter(c => c.state === 'idle')
        .reduce((sum, c) => sum + Number(c.count), 0);

      return {
        tables,
        connections,
        totalConnections,
        activeConnections,
        idleConnections,
        timestamp: new Date()
      };
    },
    enabled,
    refetchInterval,
    staleTime: 30000,
  });
}
