import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface HealthCategory {
  name: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  details: string;
}

interface HealthScoreGaugeProps {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  categories: HealthCategory[];
  isLoading?: boolean;
}

export function HealthScoreGauge({ score, status, categories, isLoading }: HealthScoreGaugeProps) {
  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return 'hsl(var(--success))';
      case 'warning': return 'hsl(var(--warning))';
      case 'critical': return 'hsl(var(--destructive))';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'critical': return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return <Badge variant="default" className="bg-success/20 text-success border-success/30">Saudável</Badge>;
      case 'warning': return <Badge variant="default" className="bg-warning/20 text-warning border-warning/30">Atenção</Badge>;
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
    }
  };

  // Cálculo do arco do gauge (semicírculo)
  const radius = 80;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const rotation = -180;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Saúde do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Saúde do Sistema
          </span>
          {getStatusBadge(status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Gauge SVG */}
          <div className="relative w-48 h-28 mb-4">
            <svg viewBox="0 0 200 110" className="w-full h-full">
              {/* Background arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke={getStatusColor(status)}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
              />
              {/* Score text */}
              <text
                x="100"
                y="85"
                textAnchor="middle"
                className="text-3xl font-bold"
                fill="currentColor"
              >
                {score}
              </text>
              <text
                x="100"
                y="100"
                textAnchor="middle"
                className="text-xs"
                fill="hsl(var(--muted-foreground))"
              >
                /100
              </text>
            </svg>
          </div>

          {/* Categories breakdown */}
          <div className="w-full space-y-2">
            {categories.map((category) => (
              <div key={category.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(category.status)}
                  <span className="text-muted-foreground">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{category.score}%</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${category.score}%`,
                        backgroundColor: getStatusColor(category.status)
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
