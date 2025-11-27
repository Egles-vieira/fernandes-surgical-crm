import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { Info, ArrowUp, ArrowDown } from "lucide-react";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Cores para gráficos - valores diretos para compatibilidade com SVG
export const CHART_COLORS = [
  "#0ea5e9", // primary (sky-500)
  "#8b5cf6", // secondary (violet-500)
  "#22c55e", // success (green-500)
  "#f59e0b", // warning (amber-500)
  "#ef4444", // destructive (red-500)
  "#06b6d4", // accent (cyan-500)
];

// Dados mock para sparklines
export const generateSparklineData = (trend: "up" | "down" | "neutral") => {
  const base = trend === "up" ? [30, 35, 32, 40, 38, 45, 50] : trend === "down" ? [50, 45, 48, 40, 42, 35, 30] : [40, 42, 38, 45, 40, 43, 41];
  return base.map(value => ({
    value
  }));
};

// Componente de Sparkline Mini
export const MiniSparkline = ({
  data,
  color
}: {
  data: {
    value: number;
  }[];
  color: string;
}) => (
  <ResponsiveContainer width={80} height={32}>
    <LineChart data={data}>
      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

// Componente Gauge Chart
export const GaugeChart = ({
  value,
  maxValue = 100
}: {
  value: number;
  maxValue?: number;
}) => {
  const percentage = Math.min(value / maxValue * 100, 100);
  const getColor = (pct: number) => {
    if (pct >= 80) return "#10b981";
    if (pct >= 60) return "#06b6d4";
    if (pct >= 40) return "#f59e0b";
    return "#ef4444";
  };
  const getLabel = (pct: number) => {
    if (pct >= 80) return "Excelente";
    if (pct >= 60) return "Bom";
    if (pct >= 40) return "Regular";
    return "Precisa Melhorar";
  };

  // Calculate the arc path
  const radius = 80;
  const strokeWidth = 12;
  const cx = 96;
  const cy = 90;
  const startAngle = 180;
  const sweepAngle = percentage * 1.8; // 180 degrees total

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians)
    };
  };
  
  const describeArc = (x: number, y: number, r: number, startAng: number, endAng: number) => {
    const start = polarToCartesian(x, y, r, endAng);
    const end = polarToCartesian(x, y, r, startAng);
    const largeArcFlag = endAng - startAng <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="192" height="110" viewBox="0 0 192 110">
        {/* Background arc */}
        <path d={describeArc(cx, cy, radius, startAngle, 0)} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Colored arc */}
        <path d={describeArc(cx, cy, radius, startAngle, startAngle - sweepAngle)} fill="none" stroke={getColor(percentage)} strokeWidth={strokeWidth} strokeLinecap="round" className="transition-all duration-1000" />
        {/* Center score */}
        <text x={cx} y={cy - 10} textAnchor="middle" className="fill-foreground text-4xl font-bold">
          {value}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-xs">
          de {maxValue}
        </text>
      </svg>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-3 h-3 rounded-full" style={{
          backgroundColor: getColor(percentage)
        }} />
        <span className="text-sm text-muted-foreground">{getLabel(percentage)}</span>
      </div>
    </div>
  );
};

// Componente KPI Card Moderno
export interface ModernKPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  progress?: number;
  progressGoal?: string;
  subtitle?: string;
  sparklineData?: {
    value: number;
  }[];
  sparklineColor?: string;
}

export const ModernKPICard = ({
  title,
  value,
  trend,
  progress,
  progressGoal,
  subtitle,
  sparklineData,
  sparklineColor = "#06b6d4"
}: ModernKPICardProps) => {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  return (
    <Card className="bg-card border-border/30 shadow-sm hover:shadow-md transition-all duration-200 py-0 my-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 py-[10px]">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Info className="h-4 w-4 text-muted-foreground/50 cursor-help" />
      </CardHeader>
      <CardContent className="py-[14px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-foreground">{value}</span>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
                {isPositive ? <ArrowUp className="h-4 w-4" /> : isNegative ? <ArrowDown className="h-4 w-4" /> : null}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          {sparklineData && <MiniSparkline data={sparklineData} color={sparklineColor} />}
        </div>

        {progress !== undefined && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.toFixed(0)}% Progress</span>
              {progressGoal && <span>{progressGoal}</span>}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {subtitle && <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

// Custom Tooltip para charts
export const CustomTooltip = ({
  active,
  payload,
  label
}: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};
