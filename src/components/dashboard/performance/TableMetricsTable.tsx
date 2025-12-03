import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Database, ArrowUpDown, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "./InfoTooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TableMetric {
  table_name: string;
  row_count: number;
  seq_scan: number;
  idx_scan: number;
  n_live_tup: number;
  n_dead_tup: number;
  index_ratio: number;
}

interface TableMetricsTableProps {
  tables: TableMetric[];
  isLoading?: boolean;
}

type SortKey = 'table_name' | 'row_count' | 'seq_scan' | 'idx_scan' | 'index_ratio';
type SortOrder = 'asc' | 'desc';

export function TableMetricsTable({ tables, isLoading }: TableMetricsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('seq_scan');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const previousTablesRef = useRef<Map<string, TableMetric>>(new Map());
  const [deltas, setDeltas] = useState<Map<string, { seqDelta: number; idxDelta: number }>>(new Map());

  // Atualizar deltas quando tables mudar
  useEffect(() => {
    if (tables.length > 0) {
      const newDeltas = new Map<string, { seqDelta: number; idxDelta: number }>();
      tables.forEach(t => {
        const prev = previousTablesRef.current.get(t.table_name);
        if (prev) {
          newDeltas.set(t.table_name, {
            seqDelta: t.seq_scan - prev.seq_scan,
            idxDelta: t.idx_scan - prev.idx_scan
          });
        }
      });
      setDeltas(newDeltas);
      
      // Atualizar referência
      const newPrevMap = new Map<string, TableMetric>();
      tables.forEach(t => newPrevMap.set(t.table_name, { ...t }));
      previousTablesRef.current = newPrevMap;
    }
  }, [tables]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedTables = [...tables].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    const modifier = sortOrder === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string') {
      return aValue.localeCompare(bValue as string) * modifier;
    }
    return ((aValue as number) - (bValue as number)) * modifier;
  });

  const getIndexStatus = (ratio: number, seqScan: number) => {
    if (seqScan === 0) return 'healthy';
    if (ratio >= 90) return 'healthy';
    if (ratio >= 70) return 'warning';
    return 'critical';
  };

  const getDeadTupleStatus = (live: number, dead: number) => {
    if (live === 0) return 'healthy';
    const ratio = (dead / live) * 100;
    if (ratio <= 5) return 'healthy';
    if (ratio <= 10) return 'warning';
    return 'critical';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Métricas de Tabelas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDelta = (delta: number) => {
    if (delta === 0) return null;
    return delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Métricas de Tabelas
            <InfoTooltip content="Estatísticas CUMULATIVAS de acesso às tabelas (pg_stat_user_tables). Os contadores acumulam desde sempre - novos índices melhoram consultas futuras e o ratio aumenta gradualmente." />
          </span>
          <Badge variant="outline">{tables.length} tabelas</Badge>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Valores cumulativos • Δ mostra variação desde último refresh
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('table_name')}>
                    Tabela <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('row_count')}>
                      Rows <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <InfoTooltip content="Número aproximado de linhas na tabela (estimativa do PostgreSQL via ANALYZE)." />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('seq_scan')}>
                      Seq Scans <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <InfoTooltip content="Varreduras sequenciais: lê toda a tabela linha por linha. Alto número indica índice faltando ou queries não otimizadas." />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('idx_scan')}>
                      Idx Scans <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <InfoTooltip content="Varreduras por índice: muito mais eficientes que seq scans. Idealmente deve ser maior que seq scans." />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('index_ratio')}>
                      Idx Ratio <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <InfoTooltip content="Porcentagem de consultas usando índice. Fórmula: idx_scan / (idx_scan + seq_scan) × 100. Ideal: >90%." />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    Status
                    <InfoTooltip content="✓ Verde: saudável (>90% idx ratio, <5% dead tuples). ⚠ Amarelo: atenção (70-90% idx ou 5-10% dead). ❌ Vermelho: crítico (<70% idx ou >10% dead)." />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTables.slice(0, 15).map((table) => {
                const indexStatus = getIndexStatus(table.index_ratio, table.seq_scan);
                const deadStatus = getDeadTupleStatus(table.n_live_tup, table.n_dead_tup);
                const overallStatus = indexStatus === 'critical' || deadStatus === 'critical' 
                  ? 'critical' 
                  : indexStatus === 'warning' || deadStatus === 'warning'
                    ? 'warning'
                    : 'healthy';

                return (
                  <TableRow key={table.table_name}>
                    <TableCell className="font-mono text-xs">{table.table_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {table.row_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className={table.seq_scan > 1000 ? "text-warning" : ""}>
                          {table.seq_scan.toLocaleString()}
                        </span>
                        {deltas.get(table.table_name)?.seqDelta !== undefined && deltas.get(table.table_name)!.seqDelta !== 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            {deltas.get(table.table_name)!.seqDelta > 0 ? (
                              <TrendingUp className="h-2.5 w-2.5 text-destructive" />
                            ) : (
                              <TrendingDown className="h-2.5 w-2.5 text-success" />
                            )}
                            {formatDelta(deltas.get(table.table_name)!.seqDelta)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        {table.idx_scan.toLocaleString()}
                        {deltas.get(table.table_name)?.idxDelta !== undefined && deltas.get(table.table_name)!.idxDelta !== 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            {deltas.get(table.table_name)!.idxDelta > 0 ? (
                              <TrendingUp className="h-2.5 w-2.5 text-success" />
                            ) : (
                              <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                            )}
                            {formatDelta(deltas.get(table.table_name)!.idxDelta)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        table.index_ratio >= 90 ? "text-success" :
                        table.index_ratio >= 70 ? "text-warning" : "text-destructive"
                      }>
                        {table.index_ratio.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {overallStatus === 'healthy' ? (
                        <CheckCircle className="h-4 w-4 text-success inline" />
                      ) : overallStatus === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-warning inline" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive inline" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
