import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, TrendingDown, Target, CheckCircle, XCircle, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
interface MLMetrics {
  total_feedback: number;
  feedbacks_aceitos: number;
  feedbacks_rejeitados: number;
  taxa_aceitacao: number;
  total_ajustes_ativos: number;
  produtos_aprendidos: number;
  melhorias_ultimos_30_dias: number;
}
interface ProdutoAprendizado {
  produto_id: string;
  nome_produto: string;
  referencia_interna: string;
  total_ajustes: number;
  ajuste_total_score: number;
  total_aceito: number;
  total_rejeitado: number;
  taxa_sucesso: number;
  ultima_utilizacao: string;
}
export default function MLDashboard() {
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  const [topProdutos, setTopProdutos] = useState<ProdutoAprendizado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    carregarDados();
  }, []);
  const carregarDados = async () => {
    setIsLoading(true);
    try {
      // 1. Métricas gerais de feedback
      const {
        data: feedbackData
      } = await supabase.from('ia_feedback_historico').select('foi_aceito, criado_em');
      const totalFeedback = feedbackData?.length || 0;
      const feedbacksAceitos = feedbackData?.filter(f => f.foi_aceito).length || 0;
      const feedbacksRejeitados = totalFeedback - feedbacksAceitos;
      const taxaAceitacao = totalFeedback > 0 ? feedbacksAceitos / totalFeedback * 100 : 0;

      // Feedbacks dos últimos 30 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);
      const feedbacksRecentes = feedbackData?.filter(f => new Date(f.criado_em) >= dataLimite && f.foi_aceito).length || 0;

      // 2. Ajustes ativos de ML
      const {
        data: ajustesData,
        count: totalAjustes
      } = await supabase.from('ia_score_ajustes').select('produto_id', {
        count: 'exact'
      }).eq('ativo', true);
      const produtosUnicos = new Set(ajustesData?.map(a => a.produto_id)).size;

      // 3. Top produtos com melhor aprendizado
      const {
        data: topProdutosData
      } = await supabase.from('ia_score_ajustes').select(`
          produto_id,
          ajuste_score,
          feedback_origem,
          ultima_utilizacao_em,
          produtos!inner(nome, referencia_interna)
        `).eq('ativo', true).order('ultima_utilizacao_em', {
        ascending: false
      }).limit(10);

      // Agregar por produto
      const produtosMap = new Map<string, ProdutoAprendizado>();
      topProdutosData?.forEach((item: any) => {
        const produtoId = item.produto_id;
        if (!produtosMap.has(produtoId)) {
          produtosMap.set(produtoId, {
            produto_id: produtoId,
            nome_produto: item.produtos.nome,
            referencia_interna: item.produtos.referencia_interna,
            total_ajustes: 0,
            ajuste_total_score: 0,
            total_aceito: 0,
            total_rejeitado: 0,
            taxa_sucesso: 0,
            ultima_utilizacao: item.ultima_utilizacao_em
          });
        }
        const produto = produtosMap.get(produtoId)!;
        produto.total_ajustes++;
        produto.ajuste_total_score += item.ajuste_score || 0;
        if (item.feedback_origem === 'aceito') {
          produto.total_aceito++;
        } else if (item.feedback_origem === 'rejeitado') {
          produto.total_rejeitado++;
        }
      });

      // Calcular taxa de sucesso
      const produtos = Array.from(produtosMap.values()).map(p => ({
        ...p,
        taxa_sucesso: p.total_aceito + p.total_rejeitado > 0 ? p.total_aceito / (p.total_aceito + p.total_rejeitado) * 100 : 0
      })).sort((a, b) => b.taxa_sucesso - a.taxa_sucesso).slice(0, 10);
      setMetrics({
        total_feedback: totalFeedback,
        feedbacks_aceitos: feedbacksAceitos,
        feedbacks_rejeitados: feedbacksRejeitados,
        taxa_aceitacao: taxaAceitacao,
        total_ajustes_ativos: totalAjustes || 0,
        produtos_aprendidos: produtosUnicos,
        melhorias_ultimos_30_dias: feedbacksRecentes
      });
      setTopProdutos(produtos);
    } catch (error) {
      console.error('Erro ao carregar métricas de ML:', error);
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando métricas de aprendizado...</p>
        </div>
      </div>;
  }
  if (!metrics) {
    return <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Erro ao carregar métricas</p>
      </div>;
  }
  return <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Feedbacks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_feedback}</div>
            <p className="text-xs text-muted-foreground">
              Desde o início
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aceitação</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taxa_aceitacao.toFixed(1)}%</div>
            <Progress value={metrics.taxa_aceitacao} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.feedbacks_aceitos} aceitos / {metrics.feedbacks_rejeitados} rejeitados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Aprendidos</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.produtos_aprendidos}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_ajustes_ativos} ajustes ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos 30 Dias</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.melhorias_ultimos_30_dias}</div>
            <p className="text-xs text-muted-foreground">
              Melhorias aprendidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Produtos com Melhor Aprendizado</CardTitle>
          <CardDescription>
            Produtos que a IA aprendeu mais com base no feedback dos vendedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topProdutos.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto com aprendizado ainda</p>
              <p className="text-sm">Comece dando feedback nas sugestões da IA</p>
            </div> : <div className="space-y-4">
              {topProdutos.map((produto, index) => <div key={produto.produto_id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium">{produto.nome_produto}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ref: {produto.referencia_interna}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{produto.total_aceito} aceitos</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span>{produto.total_rejeitado} rejeitados</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          {produto.ajuste_total_score > 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
                          <span>
                            {produto.ajuste_total_score > 0 ? '+' : ''}
                            {produto.ajuste_total_score.toFixed(0)} pontos
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {produto.taxa_sucesso.toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Taxa de sucesso
                      </p>
                      <Progress value={produto.taxa_sucesso} className="w-20 mt-2" />
                    </div>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>

      {/* Explicação */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Como funciona o aprendizado?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            <p>
              <strong>Feedback Aceito (+10 pontos):</strong> Quando você aceita uma sugestão da IA, 
              o produto ganha pontos e será priorizado em futuras análises similares.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <p>
              <strong>Feedback Rejeitado (-60 pontos):</strong> Quando você rejeita uma sugestão, 
              o produto perde pontos significativos para evitar que seja sugerido novamente.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 text-orange-600 mt-0.5" />
            <p>
              <strong>Feedback Modificado (-20 pontos):</strong> Quando você aceita mas faz modificações, 
              o produto perde alguns pontos indicando que não era a melhor opção.
            </p>
          </div>
          <Separator />
          <p className="text-muted-foreground">
            Esses ajustes são aplicados automaticamente nas próximas análises, 
            melhorando continuamente a precisão das sugestões da IA.
          </p>
        </CardContent>
      </Card>
    </div>;
}