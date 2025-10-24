import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEDIProdutosVinculo } from "@/hooks/useEDIProdutosVinculo";
import { Sparkles, Check, X, Search, Package, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function VinculosPendentes() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  
  const { vinculos, isLoading, aprovarVinculo, rejeitarVinculo } = useEDIProdutosVinculo({
    aguardando_aprovacao: true,
  });

  const vinculosFiltrados = vinculos?.filter(v => {
    if (!busca) return true;
    const searchLower = busca.toLowerCase();
    return (
      v.descricao_cliente?.toLowerCase().includes(searchLower) ||
      v.produtos?.nome?.toLowerCase().includes(searchLower) ||
      v.produtos?.referencia_interna?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleAprovar = async (vinculoId: string) => {
    try {
      await aprovarVinculo.mutateAsync(vinculoId);
    } catch (error) {
      console.error("Erro ao aprovar:", error);
    }
  };

  const handleRejeitar = async (vinculoId: string) => {
    try {
      await rejeitarVinculo.mutateAsync(vinculoId);
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
    }
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                Vínculos Pendentes de Aprovação
              </h1>
              <p className="text-muted-foreground">
                Revise e aprove vínculos sugeridos pela IA
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {vinculosFiltrados.length} pendentes
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : vinculosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {busca ? "Nenhum vínculo encontrado" : "Nenhum vínculo pendente"}
              </h3>
              <p className="text-muted-foreground">
                {busca 
                  ? "Tente ajustar sua busca" 
                  : "Todos os vínculos sugeridos pela IA foram revisados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vinculosFiltrados.map((vinculo) => (
              <Card key={vinculo.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Sugestão IA
                      </Badge>
                      <Badge variant={getScoreBadgeVariant(vinculo.score_confianca || 0)}>
                        <span className={getScoreColor(vinculo.score_confianca || 0)}>
                          {vinculo.score_confianca}% compatibilidade
                        </span>
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAprovar(vinculo.id)}
                        disabled={aprovarVinculo.isPending}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejeitar(vinculo.id)}
                        disabled={rejeitarVinculo.isPending}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Descrição do Cliente
                      </h4>
                      <p className="font-medium">{vinculo.descricao_cliente}</p>
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p>CNPJ: {vinculo.cnpj_cliente}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Produto Sugerido
                      </h4>
                      <p className="font-medium">{vinculo.produtos?.nome}</p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Ref:</span>{" "}
                          {vinculo.produtos?.referencia_interna}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Preço:</span> R${" "}
                          {vinculo.produtos?.preco_venda?.toFixed(2)}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Estoque:</span>{" "}
                          {vinculo.produtos?.quantidade_em_maos}{" "}
                          {vinculo.produtos?.unidade_medida}
                        </p>
                      </div>
                    </div>
                  </div>
                  {vinculo.criado_em && (
                    <p className="text-xs text-muted-foreground mt-4">
                      Sugerido em {new Date(vinculo.criado_em).toLocaleString('pt-BR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
