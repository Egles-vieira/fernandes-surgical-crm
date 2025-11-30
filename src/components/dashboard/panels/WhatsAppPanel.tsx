import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MessageCircle, Send, Bot, Users, CheckCircle } from "lucide-react";
import { formatCurrency, CHART_COLORS, ModernKPICard, CustomTooltip, generateSparklineData } from "../shared/ChartComponents";

interface WhatsAppPanelProps {
  isActive: boolean;
}

export function WhatsAppPanel({ isActive }: WhatsAppPanelProps) {
  // KPIs de WhatsApp - usando Materialized View
  const { data: whatsappKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["whatsapp-panel-kpis-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_whatsapp_resumo")
        .select("*")
        .single();

      if (error) throw error;
      
      return {
        totalConversas: data?.total_conversas || 0,
        conversasAtivas: data?.conversas_ativas || 0,
        totalMensagens: data?.total_mensagens || 0,
        mensagensBot: data?.mensagens_bot || 0,
        totalPropostas: data?.total_propostas || 0,
        propostasAceitas: data?.propostas_aceitas || 0,
        valorPropostas: data?.valor_propostas || 0,
        contasAtivas: data?.contas_ativas || 0,
        taxaConversao: data?.taxa_conversao || 0
      };
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Conversas por status - usando Materialized View
  const { data: conversasPorStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["whatsapp-panel-status-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_conversas_por_status")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Propostas por status - usando Materialized View
  const { data: propostasPorStatus, isLoading: isLoadingPropostas } = useQuery({
    queryKey: ["whatsapp-panel-propostas-mv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mv_propostas_por_status")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const isLoading = isLoadingKpis || isLoadingStatus || isLoadingPropostas;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernKPICard 
          title="Conversas Totais" 
          value={whatsappKpis?.totalConversas || 0} 
          trend={18.5} 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#25D366" 
        />
        <ModernKPICard 
          title="Conversas Ativas" 
          value={whatsappKpis?.conversasAtivas || 0} 
          trend={5.2} 
          subtitle="Em atendimento agora" 
          sparklineData={generateSparklineData("up")} 
          sparklineColor="#06b6d4" 
        />
        <ModernKPICard 
          title="Propostas Geradas" 
          value={whatsappKpis?.totalPropostas || 0} 
          trend={22.1} 
          subtitle={`${whatsappKpis?.propostasAceitas || 0} aceitas`} 
        />
        <ModernKPICard 
          title="Taxa de Conversão" 
          value={`${whatsappKpis?.taxaConversao || 0}%`} 
          progress={whatsappKpis?.taxaConversao || 0} 
          progressGoal="Meta: 40%" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversas por Status */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversas por Status
              </CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={conversasPorStatus || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="quantidade" nameKey="status">
                      {(conversasPorStatus || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {(conversasPorStatus || []).map((item: any, index: number) => (
                  <div key={item.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.status}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Propostas por Status */}
        <Card className="bg-card border-border/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Propostas por Status
              </CardTitle>
              <Send className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propostasPorStatus || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Quantidade" radius={[0, 4, 4, 0]}>
                    {(propostasPorStatus || []).map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <MessageCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{whatsappKpis?.totalMensagens || 0}</p>
                <p className="text-sm text-muted-foreground">Total Mensagens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Bot className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{whatsappKpis?.mensagensBot || 0}</p>
                <p className="text-sm text-muted-foreground">Mensagens do Bot</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{whatsappKpis?.contasAtivas || 0}</p>
                <p className="text-sm text-muted-foreground">Contas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <CheckCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(whatsappKpis?.valorPropostas || 0)}</p>
                <p className="text-sm text-muted-foreground">Valor Propostas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}