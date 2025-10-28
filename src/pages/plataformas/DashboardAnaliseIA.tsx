import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Package,
  Target,
  Activity
} from "lucide-react";
import { useDashboardIA } from "@/hooks/useDashboardIA";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MLQuickStats } from "@/components/plataformas/MLQuickStats";

export default function DashboardAnaliseIA() {
  const { metricas, analisePorDia, produtosMaisSugeridos, isLoading } = useDashboardIA();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const formatTempo = (segundos: number) => {
    if (!segundos) return "N/A";
    if (segundos < 60) return `${Math.round(segundos)}s`;
    const minutos = Math.floor(segundos / 60);
    const segs = Math.round(segundos % 60);
    return `${minutos}m ${segs}s`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          Dashboard de Análise IA
        </h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe o desempenho e precisão da IA na análise de cotações
        </p>
      </div>

      {/* Quick Stats de ML */}
      <MLQuickStats />

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Automação</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {metricas?.taxa_automacao_percent || 0}%
            </div>
            <Progress value={metricas?.taxa_automacao_percent || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metricas?.total_analisadas || 0} de {metricas?.total_cotacoes || 0} cotações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatTempo(metricas?.tempo_medio_analise_seg || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Por cotação analisada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sugestões</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metricas?.taxa_sugestoes_percent || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metricas?.total_sugestoes_geradas || 0} sugestões geradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metricas?.taxa_erro_percent || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metricas?.analises_com_erro || 0} análises com erro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Últimas 24h</span>
              <Badge variant="secondary">{metricas?.analises_ultimas_24h || 0} análises</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Últimos 7 dias</span>
              <Badge variant="secondary">{metricas?.analises_ultimos_7_dias || 0} análises</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Em análise agora</span>
              <Badge variant="default" className="animate-pulse">
                {metricas?.em_analise_agora || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Status das Análises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Concluídas</span>
              <Badge className="bg-green-600">{metricas?.analises_concluidas || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Em andamento</span>
              <Badge variant="default">{metricas?.em_analise_agora || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Com erro</span>
              <Badge variant="destructive">{metricas?.analises_com_erro || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Itens Processados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de itens</span>
              <Badge variant="outline">{metricas?.total_itens_cotacoes || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Analisados</span>
              <Badge variant="secondary">{metricas?.total_itens_analisados || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Modelo IA</span>
              <Badge variant="outline" className="text-xs">
                {metricas?.modelo_mais_usado || "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos Mais Sugeridos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 10 Produtos Mais Sugeridos pela IA
          </CardTitle>
          <CardDescription>
            Produtos com maior frequência de sugestão e taxa de aceitação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {produtosMaisSugeridos && produtosMaisSugeridos.length > 0 ? (
              produtosMaisSugeridos.map((produto, idx) => (
                <div
                  key={produto.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant="outline" className="flex-shrink-0">
                      #{idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{produto.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Ref: {produto.referencia_interna}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">{produto.vezes_sugerido}x</p>
                      <p className="text-xs text-muted-foreground">sugerido</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {produto.score_medio?.toFixed(1) || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground">score médio</p>
                    </div>
                    <Badge
                      variant={
                        produto.taxa_aceitacao_percent >= 70
                          ? "default"
                          : produto.taxa_aceitacao_percent >= 40
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {produto.taxa_aceitacao_percent?.toFixed(0) || 0}% aceito
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhum produto sugerido ainda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
