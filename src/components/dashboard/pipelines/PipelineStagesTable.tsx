import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { formatCurrency } from "../shared/ChartComponents";
import type { MetricasEstagio, MetricasPipeline } from "@/hooks/useDashboardPipelines";

interface PipelineStagesTableProps {
  estagios: MetricasEstagio[];
  pipelines: MetricasPipeline[];
}

export function PipelineStagesTable({ estagios, pipelines }: PipelineStagesTableProps) {
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set());

  const togglePipeline = (pipelineId: string) => {
    setExpandedPipelines((prev) => {
      const next = new Set(prev);
      if (next.has(pipelineId)) {
        next.delete(pipelineId);
      } else {
        next.add(pipelineId);
      }
      return next;
    });
  };

  // Agrupar estágios por pipeline
  const estagiosPorPipeline = estagios.reduce<Record<string, MetricasEstagio[]>>(
    (acc, estagio) => {
      if (!acc[estagio.pipeline_id]) {
        acc[estagio.pipeline_id] = [];
      }
      acc[estagio.pipeline_id].push(estagio);
      return acc;
    },
    {}
  );

  return (
    <Card className="bg-card border-border/30 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Estágios por Pipeline
          </CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Pipeline / Estágio</TableHead>
                <TableHead className="text-center">Oportunidades</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Valor Ponderado</TableHead>
                <TableHead className="text-center">Dias Médio</TableHead>
                <TableHead className="text-center">Prob %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pipelines.map((pipeline) => {
                const isExpanded = expandedPipelines.has(pipeline.pipeline_id);
                const pipelineEstagios = estagiosPorPipeline[pipeline.pipeline_id] || [];
                const totalOportunidades = pipelineEstagios.reduce(
                  (sum, e) => sum + e.total_oportunidades,
                  0
                );
                const totalValor = pipelineEstagios.reduce(
                  (sum, e) => sum + Number(e.valor_total),
                  0
                );
                const totalPonderado = pipelineEstagios.reduce(
                  (sum, e) => sum + Number(e.valor_ponderado),
                  0
                );

                return (
                  <>
                    {/* Linha do Pipeline (pai) */}
                    <TableRow
                      key={pipeline.pipeline_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => togglePipeline(pipeline.pipeline_id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: pipeline.cor || "#6366f1" }}
                          />
                          <span>{pipeline.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{totalOportunidades}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totalValor)}
                      </TableCell>
                      <TableCell className="text-right text-primary font-medium">
                        {formatCurrency(totalPonderado)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        —
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        —
                      </TableCell>
                    </TableRow>

                    {/* Linhas dos Estágios (filhos) */}
                    {isExpanded &&
                      pipelineEstagios.map((estagio) => (
                        <TableRow
                          key={estagio.estagio_id}
                          className="bg-muted/20"
                        >
                          <TableCell className="pl-10">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: estagio.cor || "#94a3b8" }}
                              />
                              <span className="text-sm text-muted-foreground">
                                {estagio.nome_estagio}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {estagio.total_oportunidades}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(estagio.valor_total)}
                          </TableCell>
                          <TableCell className="text-right text-primary/80">
                            {formatCurrency(estagio.valor_ponderado)}
                          </TableCell>
                          <TableCell className="text-center">
                            {estagio.media_dias_estagio > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {estagio.media_dias_estagio}d
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-medium">
                              {estagio.percentual_probabilidade}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
