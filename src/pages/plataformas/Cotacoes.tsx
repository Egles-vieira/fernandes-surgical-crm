import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Clock, Building2, FileText, Sparkles, Upload, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEDICotacoes } from "@/hooks/useEDICotacoes";
import { useRealtimeCotacoes } from "@/hooks/useRealtimeCotacoes";
import ImportarXMLDialog from "@/components/plataformas/ImportarXMLDialog";
import { StatusAnaliseIABadge } from "@/components/plataformas/StatusAnaliseIABadge";
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
    cancelada: "Cancelada"
  };
  return labels[step] || step;
};
export default function Cotacoes() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<string>("novas");
  const [importarDialogOpen, setImportarDialogOpen] = useState(false);
  
  // Hook de realtime para atualizar automaticamente
  useRealtimeCotacoes();

  // Buscar todas as cotações para estatísticas
  const { cotacoes: todasCotacoes } = useEDICotacoes({});
  
  // Filtros por aba
  const getFiltros = (): {
    step?: string;
    resgatada?: boolean;
    status_analise_ia?: 'pendente' | 'em_analise' | 'concluida' | 'erro' | 'cancelada';
    respondida?: boolean;
  } => {
    switch (abaAtiva) {
      case "novas":
        return { step: "nova", resgatada: false };
      case "analise_ia":
        return { status_analise_ia: "em_analise" as const };
      case "aguardando":
        return { resgatada: true, respondida: false };
      case "respondidas":
        return { step: "respondida" };
      case "confirmadas":
        return { step: "confirmada" };
      default:
        return {};
    }
  };

  const {
    cotacoes,
    isLoading,
    resgatarCotacao
  } = useEDICotacoes(getFiltros());
  // Estatísticas calculadas de todas as cotações
  const estatisticas = {
    novas: todasCotacoes?.filter(c => c.step_atual === "nova" && !c.resgatada).length || 0,
    analiseIA: todasCotacoes?.filter(c => c.status_analise_ia === "em_analise").length || 0,
    aguardando: todasCotacoes?.filter(c => c.resgatada && !c.respondido_em).length || 0,
    respondidas: todasCotacoes?.filter(c => c.step_atual === "respondida").length || 0,
    confirmadas: todasCotacoes?.filter(c => c.step_atual === "confirmada").length || 0
  };
  const handleResgatar = async (cotacaoId: string) => {
    await resgatarCotacao.mutateAsync(cotacaoId);
  };
  if (isLoading) {
    return <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded"></div>)}
          </div>
        </div>
      </div>;
  }
  return <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          
          <p className="text-muted-foreground">
        </p>
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
      <ImportarXMLDialog open={importarDialogOpen} onOpenChange={setImportarDialogOpen} plataformaId={null} tipoPlataforma="bionexo" />

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.novas}</div>
            <p className="text-xs text-muted-foreground">Aguardando resgate</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Análise IA</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{estatisticas.analiseIA}</div>
            <p className="text-xs text-muted-foreground">IA analisando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.aguardando}</div>
            <p className="text-xs text-muted-foreground">Para responder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respondidas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.respondidas}</div>
            <p className="text-xs text-muted-foreground">Enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.confirmadas}</div>
            <p className="text-xs text-muted-foreground">Pedidos fechados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Cotações */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList>
          <TabsTrigger value="novas">
            Novas ({estatisticas.novas})
          </TabsTrigger>
          <TabsTrigger value="analise_ia" className="gap-2">
            <Brain className="h-3 w-3" />
            Análise IA ({estatisticas.analiseIA})
          </TabsTrigger>
          <TabsTrigger value="aguardando">
            Aguardando Resposta ({estatisticas.aguardando})
          </TabsTrigger>
          <TabsTrigger value="respondidas">
            Respondidas ({estatisticas.respondidas})
          </TabsTrigger>
          <TabsTrigger value="confirmadas">
            Confirmadas ({estatisticas.confirmadas})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={abaAtiva} className="space-y-2 mt-4">
          {cotacoes && cotacoes.length > 0 ? <div className="space-y-2">
              {cotacoes.map(cotacao => <Card key={cotacao.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            Origem: {cotacao.id_cotacao_externa}
                          </span>
                          {cotacao.plataformas_edi && <Badge variant="outline" className="text-xs">{cotacao.plataformas_edi.nome}</Badge>}
                          <StatusAnaliseIABadge 
                            statusAnalise={cotacao.status_analise_ia}
                            progresso={cotacao.progresso_analise_percent || 0}
                            itensAnalisados={cotacao.total_itens_analisados || 0}
                            totalItens={cotacao.total_itens}
                            tempoEstimado={cotacao.tempo_analise_segundos || undefined}
                          />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(cotacao.data_vencimento_atual), "dd/MM/yyyy | HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => navigate(`/plataformas/cotacoes/${cotacao.id}`)}
                            className="text-primary hover:underline font-medium text-sm truncate"
                          >
                            {cotacao.nome_cliente}
                          </button>
                          
                          <span className="text-xs text-muted-foreground">
                            {cotacao.total_itens} {cotacao.total_itens === 1 ? 'Item' : 'Itens'}
                          </span>
                          
                          <Badge variant={stepBadgeVariant(cotacao.step_atual)} className="text-xs">
                            {stepLabel(cotacao.step_atual)}
                          </Badge>
                          
                          <span className="text-xs font-medium">
                            {cotacao.cidade_cliente}, {cotacao.uf_cliente}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!cotacao.resgatada && abaAtiva === "novas" && <Button 
                            size="sm"
                            onClick={() => handleResgatar(cotacao.id)} 
                            disabled={resgatarCotacao.isPending}
                          >
                            Resgatar
                          </Button>}
                        <Button 
                          size="sm"
                          variant="outline" 
                          onClick={() => navigate(`/plataformas/cotacoes/${cotacao.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div> : <Card className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma cotação encontrada neste status</p>
            </Card>}
        </TabsContent>
      </Tabs>
    </div>;
}