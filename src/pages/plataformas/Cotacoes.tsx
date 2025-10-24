import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Clock, Building2, FileText, Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEDICotacoes } from "@/hooks/useEDICotacoes";
import ImportarXMLDialog from "@/components/plataformas/ImportarXMLDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const stepBadgeVariant = (step: string) => {
  switch (step) {
    case "nova":
      return "default";
    case "em_analise":
      return "secondary";
    case "respondida":
      return "outline";
    case "confirmada":
      return "default";
    default:
      return "outline";
  }
};

const stepLabel = (step: string) => {
  const labels: Record<string, string> = {
    nova: "Nova",
    em_analise: "Em Análise",
    respondida: "Respondida",
    confirmada: "Confirmada",
    perdida: "Perdida",
    cancelada: "Cancelada",
  };
  return labels[step] || step;
};

export default function Cotacoes() {
  const navigate = useNavigate();
  const [stepFiltro, setStepFiltro] = useState<string>("nova");
  const [importarDialogOpen, setImportarDialogOpen] = useState(false);
  const { cotacoes, isLoading, resgatarCotacao } = useEDICotacoes({
    step: stepFiltro,
  });

  const estatisticas = {
    novas: cotacoes?.filter((c) => c.step_atual === "nova").length || 0,
    emAnalise: cotacoes?.filter((c) => c.step_atual === "em_analise").length || 0,
    respondidas: cotacoes?.filter((c) => c.step_atual === "respondida").length || 0,
    confirmadas: cotacoes?.filter((c) => c.step_atual === "confirmada").length || 0,
  };

  const handleResgatar = async (cotacaoId: string) => {
    await resgatarCotacao.mutateAsync(cotacaoId);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
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
            <Calculator className="h-8 w-8" />
            Plataformas de eletrônicas
          </h1>
          <p className="text-muted-foreground">Gerenciamento de cotações das plataformas integradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" className="gap-2" onClick={() => setImportarDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar XML
          </Button>
          <Button size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Sugestões IA
          </Button>
        </div>
      </div>

      {/* Dialog de Importação */}
      <ImportarXMLDialog
        open={importarDialogOpen}
        onOpenChange={setImportarDialogOpen}
        plataformaId={null}
        tipoPlataforma="bionexo"
      />

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotações Novas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.novas}</div>
            <p className="text-xs text-muted-foreground">Aguardando resgate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.emAnalise}</div>
            <p className="text-xs text-muted-foreground">Sendo trabalhadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respondidas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.respondidas}</div>
            <p className="text-xs text-muted-foreground">Aguardando confirmação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.confirmadas}</div>
            <p className="text-xs text-muted-foreground">Pedidos confirmados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Cotações */}
      <Tabs value={stepFiltro} onValueChange={setStepFiltro}>
        <TabsList>
          <TabsTrigger value="nova">Novas ({estatisticas.novas})</TabsTrigger>
          <TabsTrigger value="em_analise">Em Análise ({estatisticas.emAnalise})</TabsTrigger>
          <TabsTrigger value="respondida">Respondidas ({estatisticas.respondidas})</TabsTrigger>
          <TabsTrigger value="confirmada">Confirmadas ({estatisticas.confirmadas})</TabsTrigger>
        </TabsList>

        <TabsContent value={stepFiltro} className="space-y-4 mt-4">
          {cotacoes && cotacoes.length > 0 ? (
            <div className="grid gap-4">
              {cotacoes.map((cotacao) => (
                <Card key={cotacao.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={stepBadgeVariant(cotacao.step_atual)}>{stepLabel(cotacao.step_atual)}</Badge>
                          {cotacao.plataformas_edi && <Badge variant="outline">{cotacao.plataformas_edi.nome}</Badge>}
                        </div>

                        <h3 className="font-semibold text-lg">
                          {cotacao.numero_cotacao || cotacao.id_cotacao_externa}
                        </h3>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Cliente:</span>
                            <p className="font-medium">{cotacao.nome_cliente}</p>
                            <p className="text-xs text-muted-foreground">{cotacao.cnpj_cliente}</p>
                          </div>

                          <div>
                            <span className="text-muted-foreground">Localização:</span>
                            <p className="font-medium">
                              {cotacao.cidade_cliente}, {cotacao.uf_cliente}
                            </p>
                          </div>

                          <div>
                            <span className="text-muted-foreground">Vencimento:</span>
                            <p className="font-medium">
                              {format(new Date(cotacao.data_vencimento_atual), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>

                          <div>
                            <span className="text-muted-foreground">Itens:</span>
                            <p className="font-medium">
                              {cotacao.total_itens} item(ns)
                              {cotacao.total_itens_respondidos > 0 &&
                                ` • ${cotacao.total_itens_respondidos} respondido(s)`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {!cotacao.resgatada && stepFiltro === "nova" && (
                          <Button onClick={() => handleResgatar(cotacao.id)} disabled={resgatarCotacao.isPending}>
                            Resgatar
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => navigate(`/plataformas/cotacoes/${cotacao.id}`)}>
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma cotação encontrada neste status</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
