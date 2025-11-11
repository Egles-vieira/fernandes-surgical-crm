import { useState } from "react";
import { usePerformanceVendedores } from "@/hooks/usePerformanceVendedores";
import { useEquipesFiltros } from "@/contexts/EquipesFiltrosContext";
import { LeaderboardVendedores } from "./LeaderboardVendedores";
import { RadarPerformance } from "./RadarPerformance";
import { KPIsVendedor } from "./KPIsVendedor";
import { ComparativoMetasEquipe } from "./ComparativoMetasEquipe";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, BarChart3, Users, TrendingUp } from "lucide-react";

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
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p className="font-semibold">Nenhum vendedor encontrado com metas ativas.</p>
            
            <div className="space-y-2 text-sm">
              <p className="font-medium">Para visualizar vendedores nesta aba, é necessário:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Usuário ter role de <code className="bg-muted px-1 py-0.5 rounded">sales</code>, <code className="bg-muted px-1 py-0.5 rounded">manager</code> ou <code className="bg-muted px-1 py-0.5 rounded">admin</code></li>
                <li>Ter pelo menos uma meta individual ativa criada</li>
                <li>Meta com período que inclua a data atual</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Como criar uma meta individual:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Acesse a aba <strong>Lista</strong> de equipes</li>
                <li>Clique em <strong>Ver Detalhes</strong> em uma equipe</li>
                <li>Selecione um membro vendedor</li>
                <li>Na seção <strong>Metas Individuais</strong>, clique em <strong>Nova Meta</strong></li>
                <li>Preencha o valor da meta e o período</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Obter nome da equipe selecionada
  const equipeNome = vendedores?.[0]?.equipe_nome;

  return (
    <div className="space-y-6">
      {vendedorSelecionado ? (
        <div>
          <button
            onClick={() => setVendedorSelecionado(null)}
            className="mb-4 text-sm text-primary hover:underline"
          >
            ← Voltar para análise de vendedores
          </button>
          <KPIsVendedor vendedor={vendedorSelecionado} />
        </div>
      ) : (
        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="comparativo" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Comparativo
            </TabsTrigger>
            <TabsTrigger value="radar" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Radar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <LeaderboardVendedores vendedores={vendedores} onSelectVendedor={setVendedorSelecionado} />
          </TabsContent>

          <TabsContent value="comparativo" className="space-y-6">
            <ComparativoMetasEquipe vendedores={vendedores} equipeNome={equipeNome} />
          </TabsContent>

          <TabsContent value="radar" className="space-y-6">
            <RadarPerformance vendedores={vendedores} topN={5} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
