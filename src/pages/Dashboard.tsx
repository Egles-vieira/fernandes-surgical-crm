import { Users, DollarSign, FileText, Package, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const metrics = [
    { label: "Total de Clientes", value: "3", icon: Users, color: "text-primary" },
    { label: "Vendas do Mês", value: "R$ 45.280", icon: DollarSign, color: "text-success" },
    { label: "Licitações Ativas", value: "2", icon: FileText, color: "text-secondary" },
    { label: "Produtos Cadastrados", value: "11", icon: Package, color: "text-accent" },
  ];

  const recentActivities = [
    { type: "sale", text: "Novo pedido #S209210 criado", time: "Há 2 horas", icon: DollarSign },
    { type: "client", text: "Cliente H PREMIUM atualizado", time: "Há 4 horas", icon: Users },
    { type: "product", text: "Produto Campo Cirúrgico adicionado", time: "Há 6 horas", icon: Package },
    { type: "sale", text: "Pedido #S209209 aprovado", time: "Há 1 dia", icon: FileText },
  ];

  const alerts = [
    { type: "warning", text: "Cliente MEDICAL CENTER com limite excedido", priority: "high" },
    { type: "info", text: "Proposta #S209210 vence em 3 dias", priority: "medium" },
    { type: "alert", text: "Produto Luvas com estoque baixo (15 unidades)", priority: "low" },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema CRM</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="p-6 shadow-elegant hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-muted ${metric.color}`}>
                <metric.icon size={24} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="p-6 shadow-elegant">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="text-primary" size={20} />
            Atividades Recentes
          </h2>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="p-2 rounded-full bg-primary/10">
                  <activity.icon size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts and Pending */}
        <Card className="p-6 shadow-elegant">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-destructive" size={20} />
            Alertas e Pendências
          </h2>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.priority === "high"
                    ? "bg-destructive/10 border-destructive"
                    : alert.priority === "medium"
                    ? "bg-secondary/10 border-secondary"
                    : "bg-muted border-border"
                }`}
              >
                <p className="text-sm font-medium">{alert.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
