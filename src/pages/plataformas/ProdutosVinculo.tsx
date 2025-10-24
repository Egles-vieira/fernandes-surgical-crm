import { useState } from "react";
import { Link, Check, X, Sparkles, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEDIProdutosVinculo } from "@/hooks/useEDIProdutosVinculo";

export default function ProdutosVinculo() {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ia" | "manual">("todos");

  const { vinculos, isLoading, aprovarVinculo, rejeitarVinculo } =
    useEDIProdutosVinculo({
      aguardando_aprovacao: filtroTipo === "ia",
    });

  const vinculosFiltrados = vinculos?.filter((v) => {
    const matchBusca =
      !busca ||
      v.descricao_cliente.toLowerCase().includes(busca.toLowerCase()) ||
      v.produtos?.nome.toLowerCase().includes(busca.toLowerCase());

    const matchTipo =
      filtroTipo === "todos" ||
      (filtroTipo === "ia" && v.sugerido_por_ia) ||
      (filtroTipo === "manual" && !v.sugerido_por_ia);

    return matchBusca && matchTipo;
  });

  const aguardandoAprovacao = vinculos?.filter(
    (v) => v.sugerido_por_ia && !v.aprovado_em && !v.ativo
  ).length || 0;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Link className="h-8 w-8" />
            DE-PARA de Produtos
          </h1>
          <p className="text-muted-foreground">
            Vínculo inteligente entre produtos dos clientes e seu catálogo
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vínculos Ativos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vinculos?.filter((v) => v.ativo).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Aprovados e funcionando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sugestões IA
            </CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aguardandoAprovacao}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Vínculos
            </CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vinculos?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              No sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por descrição do cliente ou produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1"
            />
            <Tabs value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="ia">
                  Sugestões IA ({aguardandoAprovacao})
                </TabsTrigger>
                <TabsTrigger value="manual">Manuais</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Vínculos */}
      <div className="space-y-4">
        {vinculosFiltrados && vinculosFiltrados.length > 0 ? (
          vinculosFiltrados.map((vinculo) => (
            <Card key={vinculo.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      {vinculo.sugerido_por_ia && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Sugestão IA
                        </Badge>
                      )}
                      {vinculo.ativo && (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          Ativo
                        </Badge>
                      )}
                      {vinculo.score_confianca && (
                        <Badge
                          variant={
                            vinculo.score_confianca >= 80
                              ? "default"
                              : vinculo.score_confianca >= 60
                              ? "secondary"
                              : "outline"
                          }
                        >
                          Score: {vinculo.score_confianca}%
                        </Badge>
                      )}
                    </div>

                    {/* Produto do Cliente */}
                    <div>
                      <p className="text-xs text-muted-foreground">Produto do Cliente:</p>
                      <p className="font-medium">{vinculo.descricao_cliente}</p>
                      <p className="text-xs text-muted-foreground">
                        CNPJ: {vinculo.cnpj_cliente} • Código:{" "}
                        {vinculo.codigo_produto_cliente}
                      </p>
                    </div>

                    {/* Seta de Vínculo */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-px bg-border flex-1"></div>
                      <Link className="h-4 w-4" />
                      <div className="h-px bg-border flex-1"></div>
                    </div>

                    {/* Nosso Produto */}
                    {vinculo.produtos && (
                      <div>
                        <p className="text-xs text-muted-foreground">Nosso Produto:</p>
                        <p className="font-medium">{vinculo.produtos.nome}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Ref: {vinculo.produtos.referencia_interna}</span>
                          <span>
                            Preço: R${" "}
                            {vinculo.produtos.preco_venda.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <span>Estoque: {vinculo.produtos.quantidade_em_maos}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2">
                    {vinculo.sugerido_por_ia && !vinculo.aprovado_em && !vinculo.ativo && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => aprovarVinculo.mutate(vinculo.id)}
                          disabled={aprovarVinculo.isPending}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejeitarVinculo.mutate(vinculo.id)}
                          disabled={rejeitarVinculo.isPending}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    {vinculo.ativo && (
                      <Button size="sm" variant="outline">
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum vínculo encontrado
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
