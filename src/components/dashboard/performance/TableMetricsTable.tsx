import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Database, ArrowUpDown, AlertTriangle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Métricas de Tabelas
          </span>
          <Badge variant="outline">{tables.length} tabelas</Badge>
        </CardTitle>
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
                  <Button variant="ghost" size="sm" onClick={() => handleSort('row_count')}>
                    Rows <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('seq_scan')}>
                    Seq Scans <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('idx_scan')}>
                    Idx Scans <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('index_ratio')}>
                    Idx Ratio <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
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
                      <span className={table.seq_scan > 1000 ? "text-warning" : ""}>
                        {table.seq_scan.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {table.idx_scan.toLocaleString()}
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
