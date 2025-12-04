import { useGEDResumo, useGEDPorTipo, useGEDDocumentos } from "@/hooks/useGEDDocumentos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, CheckCircle, AlertTriangle, XCircle, 
  HardDrive, Clock, FileIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function GEDDashboard() {
  const { data: resumo, isLoading: loadingResumo } = useGEDResumo();
  const { data: porTipo, isLoading: loadingTipos } = useGEDPorTipo();
  const { documentos: docsVencendo, isLoading: loadingVencendo } = useGEDDocumentos({ 
    status: 'vencendo', 
    pageSize: 5 
  });
  const { documentos: docsVencidos, isLoading: loadingVencidos } = useGEDDocumentos({ 
    status: 'vencido', 
    pageSize: 5 
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-elegant hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Documentos</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingResumo ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{resumo?.total_documentos || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Válidos</CardTitle>
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingResumo ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-success">{resumo?.docs_validos || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencendo</CardTitle>
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingResumo ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-warning">{resumo?.docs_vencendo || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-elegant hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos</CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingResumo ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{resumo?.docs_vencidos || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Armazenamento */}
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Armazenamento Utilizado</CardTitle>
          <div className="p-2 rounded-lg bg-muted">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {loadingResumo ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <div className="text-2xl font-bold">{formatBytes(Number(resumo?.total_bytes) || 0)}</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por Tipo */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg">Documentos por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTipos ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : porTipo && porTipo.length > 0 ? (
              <div className="space-y-3">
                {porTipo.map(tipo => (
                  <div key={tipo.tipo_id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tipo.cor }}
                      />
                      <span className="font-medium">{tipo.tipo_nome}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{tipo.total} docs</span>
                      {tipo.vencendo > 0 && (
                        <span className="text-warning font-medium">{tipo.vencendo} vencendo</span>
                      )}
                      {tipo.vencidos > 0 && (
                        <span className="text-destructive font-medium">{tipo.vencidos} vencidos</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum documento cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Documentos que Requerem Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Vencendo */}
              {loadingVencendo ? (
                <Skeleton className="h-20 w-full" />
              ) : docsVencendo.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-warning mb-2">Vencendo em breve</h4>
                  <div className="space-y-2">
                    {docsVencendo.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-warning/30 bg-warning/5">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{doc.titulo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {doc.data_validade && format(new Date(doc.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Vencidos */}
              {loadingVencidos ? (
                <Skeleton className="h-20 w-full" />
              ) : docsVencidos.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-destructive mb-2">Vencidos</h4>
                  <div className="space-y-2">
                    {docsVencidos.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{doc.titulo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {doc.data_validade && format(new Date(doc.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!loadingVencendo && !loadingVencidos && docsVencendo.length === 0 && docsVencidos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                  <p>Todos os documentos estão em dia!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}