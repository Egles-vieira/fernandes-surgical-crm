import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, Target, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function MLQuickStats() {
  const [stats, setStats] = useState({ total: 0, aceitos: 0, taxa: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    carregarStats();
  }, []);

  const carregarStats = async () => {
    try {
      const { data } = await supabase
        .from('ia_feedback_historico')
        .select('foi_aceito');

      const total = data?.length || 0;
      const aceitos = data?.filter(f => f.foi_aceito).length || 0;
      const taxa = total > 0 ? (aceitos / total) * 100 : 0;

      setStats({ total, aceitos, taxa });
    } catch (error) {
      console.error('Erro ao carregar stats de ML:', error);
    }
  };

  if (stats.total === 0) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Machine Learning Ativo</p>
                <Badge variant="secondary" className="text-xs">
                  {stats.total} feedbacks
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-muted-foreground">
                  Taxa de aceitação: <strong className="text-green-600">{stats.taxa.toFixed(1)}%</strong>
                </span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/plataformas/ml-dashboard')}
            className="gap-1"
          >
            <span className="text-xs">Ver Dashboard</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
