import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMetasVendedor } from "@/hooks/useMetasVendedor";
import { useVendedores } from "@/hooks/useVendedores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Target, TrendingUp, Calendar, Award, Plus } from "lucide-react";
import MetaIndividualCard from "@/components/vendedor/MetaIndividualCard";
import { useRoles } from "@/hooks/useRoles";
import { useToast } from "@/hooks/use-toast";

export default function PerfilVendedor() {
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const { toast } = useToast();
  const { vendedores } = useVendedores();
  const { metas, isLoading, criarMeta } = useMetasVendedor(user?.id);

  // Buscar informações do vendedor
  const vendedor = vendedores.find((v) => v.id === user?.id);

  // Calcular totalizadores
  const metasAtivas = metas?.filter((m) => m.status === "ativa") || [];
  const metasConcluidas = metas?.filter((m) => m.status === "concluida") || [];
  const totalMetaValor = metasAtivas.reduce((acc, m) => acc + (m.meta_valor || 0), 0);
  const totalRealizadoValor = metasAtivas.reduce((acc, m) => acc + (m.valor_atual || 0), 0);
  const percentualMedio = totalMetaValor > 0 ? (totalRealizadoValor / totalMetaValor) * 100 : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header - Perfil do Vendedor */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {vendedor?.nome?.charAt(0) || "V"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{vendedor?.nome || "Vendedor"}</CardTitle>
                <CardDescription>Minhas Metas e Performance</CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button onClick={() => {
                // TODO: Implementar criação de meta
                toast({
                  title: "Em desenvolvimento",
                  description: "A criação de metas será implementada na próxima fase.",
                });
              }} className="gap-2">
                <Plus size={16} />
                Nova Meta
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target size={16} className="text-primary" />
              Metas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metasAtivas.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Meta Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalMetaValor)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              Realizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalRealizadoValor)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award size={16} className="text-primary" />
              Atingimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{percentualMedio.toFixed(1)}%</div>
              <Badge
                variant={percentualMedio >= 100 ? "default" : percentualMedio >= 80 ? "secondary" : "destructive"}
              >
                {percentualMedio >= 100 ? "Superou" : percentualMedio >= 80 ? "No caminho" : "Atenção"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Metas */}
      <Tabs defaultValue="ativas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ativas">
            Ativas ({metasAtivas.length})
          </TabsTrigger>
          <TabsTrigger value="concluidas">
            Concluídas ({metasConcluidas.length})
          </TabsTrigger>
          <TabsTrigger value="todas">
            Todas ({metas?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="space-y-4">
          {metasAtivas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Nenhuma meta ativa</p>
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? "Clique em 'Nova Meta' para criar sua primeira meta."
                    : "Aguarde seu líder ou administrador criar metas para você."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metasAtivas.map((meta) => (
                <MetaIndividualCard key={meta.id} meta={meta} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concluidas" className="space-y-4">
          {metasConcluidas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Award size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Nenhuma meta concluída</p>
                <p className="text-sm text-muted-foreground">
                  Suas metas concluídas aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metasConcluidas.map((meta) => (
                <MetaIndividualCard key={meta.id} meta={meta} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="todas" className="space-y-4">
          {!metas || metas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Nenhuma meta encontrada</p>
                <p className="text-sm text-muted-foreground">
                  Você ainda não possui metas cadastradas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metas.map((meta) => (
                <MetaIndividualCard key={meta.id} meta={meta} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
