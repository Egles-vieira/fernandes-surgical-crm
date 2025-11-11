import { useState } from "react";
import { usePerformanceVendedores } from "@/hooks/usePerformanceVendedores";
import { useEquipesFiltros } from "@/contexts/EquipesFiltrosContext";
import { LeaderboardVendedores } from "./LeaderboardVendedores";
import { RadarPerformance } from "./RadarPerformance";
import { KPIsVendedor } from "./KPIsVendedor";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function AnaliseVendedores() {
  const { filtros } = useEquipesFiltros();
  const { vendedores, isLoading } = usePerformanceVendedores({
    equipeId: filtros.equipeId,
    vendedorId: filtros.vendedorId,
  });
  const [vendedorSelecionado, setVendedorSelecionado] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!vendedores || vendedores.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhum vendedor encontrado. Certifique-se de que há usuários com role de vendas e metas configuradas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {vendedorSelecionado ? (
        <div>
          <button
            onClick={() => setVendedorSelecionado(null)}
            className="mb-4 text-sm text-primary hover:underline"
          >
            ← Voltar para o leaderboard
          </button>
          <KPIsVendedor vendedor={vendedorSelecionado} />
        </div>
      ) : (
        <>
          <LeaderboardVendedores vendedores={vendedores} onSelectVendedor={setVendedorSelecionado} />
          <RadarPerformance vendedores={vendedores} topN={5} />
        </>
      )}
    </div>
  );
}
