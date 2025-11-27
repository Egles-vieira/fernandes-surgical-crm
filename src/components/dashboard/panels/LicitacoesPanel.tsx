import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, FileText, Clock, TrendingUp } from "lucide-react";
import { ModernKPICard, generateSparklineData } from "../shared/ChartComponents";

interface LicitacoesPanelProps {
  isActive: boolean;
}

export function LicitacoesPanel({ isActive }: LicitacoesPanelProps) {
  // Placeholder - módulo em desenvolvimento
  return (
    <div className="space-y-6">
      {/* KPI Cards Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernKPICard 
          title="Licitações Ativas" 
          value={0} 
          trend={0} 
          sparklineData={generateSparklineData("neutral")} 
          sparklineColor="#8b5cf6" 
        />
        <ModernKPICard 
          title="Participações" 
          value={0} 
          trend={0} 
          subtitle="Este mês" 
        />
        <ModernKPICard 
          title="Taxa de Sucesso" 
          value="0%" 
          progress={0} 
          progressGoal="Meta: 30%" 
        />
        <ModernKPICard 
          title="Valor em Disputa" 
          value="R$ 0" 
          trend={0} 
          subtitle="Total em aberto" 
        />
      </div>

      {/* Módulo em Desenvolvimento */}
      <Card className="bg-card border-border/30 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <Gavel className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Módulo de Licitações</h3>
          <p className="text-muted-foreground text-center max-w-md">
            O painel de licitações está em desenvolvimento. Em breve você poderá acompanhar 
            editais, participações e resultados diretamente aqui.
          </p>
        </CardContent>
      </Card>

      {/* Cards de Features Futuras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/30 shadow-sm opacity-60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Editais</p>
                <p className="text-sm text-muted-foreground">Acompanhamento de editais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm opacity-60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Prazos</p>
                <p className="text-sm text-muted-foreground">Alertas de vencimento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm opacity-60">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Resultados</p>
                <p className="text-sm text-muted-foreground">Análise de performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
