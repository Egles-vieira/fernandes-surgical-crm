import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Calculator, Clock, Building2, FileText, Sparkles, Upload, Brain, Database, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEDICotacoes } from "@/hooks/useEDICotacoes";
import { useRealtimeCotacoes } from "@/hooks/useRealtimeCotacoes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ImportarXMLDialog from "@/components/plataformas/ImportarXMLDialog";
import { StatusAnaliseIABadge } from "@/components/plataformas/StatusAnaliseIABadge";
import { CotacoesFilters } from "@/components/plataformas/CotacoesFilters";
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
  const queryClient = useQueryClient();
  const {
    toast
  } = useToast();
  const [abaAtiva, setAbaAtiva] = useState<string>("novas");
  const [importarDialogOpen, setImportarDialogOpen] = useState(false);
  const [corrigindoAnalises, setCorrigindoAnalises] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [paginas, setPaginas] = useState<Record<string, number>>({
    novas: 0,
    analise_ia: 0,
    analisadas: 0,
    aguardando: 0,
    respondidas: 0,
    confirmadas: 0
  });
  const LIMITE_POR_PAGINA = 50;

  // Hook de realtime - só ativa nesta página
  useRealtimeCotacoes(true);

  // Buscar todas as cotações para estatísticas
  const {
    cotacoes: todasCotacoes
  } = useEDICotacoes({});

  // Filtros por aba com paginação
  const getFiltros = () => {
    const paginaAtual = paginas[abaAtiva] || 0;
    const filtrosBase = {
      limite: LIMITE_POR_PAGINA
    };
    switch (abaAtiva) {
      case "novas":
        return {
          ...filtrosBase,
          step: "nova",
          resgatada: false
        };
      case "analise_ia":
        return {
          ...filtrosBase,
          status_analise_ia: "em_analise" as const
        };
      case "analisadas":
        return {
          ...filtrosBase,
          analise_concluida: true
        };
      case "aguardando":
        return {
          ...filtrosBase,
          resgatada: true,
          respondida: false
        };
      case "respondidas":
        return {
          ...filtrosBase,
          step: "respondida"
        };
      case "confirmadas":
        return {
          ...filtrosBase,
          step: "confirmada"
        };
      default:
        return filtrosBase;
    }
  };
  const handleMudarPagina = (novaPagina: number) => {
    setPaginas(prev => ({
      ...prev,
      [abaAtiva]: novaPagina
    }));
  };
  const {
    cotacoes: cotacoesRaw,
    isLoading,
    resgatarCotacao
  } = useEDICotacoes(getFiltros());

  // Filtrar cotações pela busca
  const cotacoes = cotacoesRaw?.filter(cotacao => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      cotacao.nome_cliente?.toLowerCase().includes(searchLower) ||
      cotacao.id_cotacao_externa?.toLowerCase().includes(searchLower) ||
      cotacao.cidade_cliente?.toLowerCase().includes(searchLower) ||
      cotacao.uf_cliente?.toLowerCase().includes(searchLower)
    );
  });
  // Estatísticas calculadas de todas as cotações
  const estatisticas = {
    novas: todasCotacoes?.filter(c => c.step_atual === "nova" && !c.resgatada).length || 0,
    analiseIA: todasCotacoes?.filter(c => c.status_analise_ia === "em_analise").length || 0,
    analisadas: todasCotacoes?.filter(c => c.status_analise_ia === "concluida" && !c.respondido_em).length || 0,
    aguardando: todasCotacoes?.filter(c => c.resgatada && !c.respondido_em && c.status_analise_ia !== "em_analise" && c.status_analise_ia !== "concluida").length || 0,
    respondidas: todasCotacoes?.filter(c => c.step_atual === "respondida").length || 0,
    confirmadas: todasCotacoes?.filter(c => c.step_atual === "confirmada").length || 0
  };
  const handleResgatar = async (cotacaoId: string) => {
    await resgatarCotacao.mutateAsync(cotacaoId);
  };
  const handleCorrigirAnalisesTravadas = async () => {
    setCorrigindoAnalises(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("corrigir-analises-travadas");
      if (error) throw error;
      toast({
        title: "Análises corrigidas",
        description: `${data.total_corrigidas} de ${data.total_verificadas} cotações foram corrigidas.`
      });

      // Recarregar dados
      queryClient.invalidateQueries({
        queryKey: ["edi-cotacoes"]
      });
    } catch (error: any) {
      toast({
        title: "Erro ao corrigir análises",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCorrigindoAnalises(false);
    }
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
      {/* Filtros de Pesquisa - Sticky no topo */}
      <CotacoesFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFiltersChange={setFilters}
        onImportarXML={() => setImportarDialogOpen(true)}
        onHistoricoImportacoes={() => navigate("/plataformas/historico-importacoes")}
        onCorrigirTravadas={handleCorrigirAnalisesTravadas}
        mostrarCorrigirTravadas={abaAtiva === "analise_ia" && estatisticas.analiseIA > 0}
        corrigindoAnalises={corrigindoAnalises}
      />

      {/* Dialog de Importação */}
      <ImportarXMLDialog open={importarDialogOpen} onOpenChange={setImportarDialogOpen} plataformaId={null} tipoPlataforma="bionexo" />

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">Novas</CardTitle>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{estatisticas.novas}</div>
            <p className="text-[10px] text-muted-foreground">Aguardando resgate</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">Análise IA</CardTitle>
            <Brain className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-primary">{estatisticas.analiseIA}</div>
            <p className="text-[10px] text-muted-foreground">IA analisando</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">Analisadas</CardTitle>
            <Sparkles className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold text-green-600">{estatisticas.analisadas}</div>
            <p className="text-[10px] text-muted-foreground">Prontas para cotação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">Aguardando</CardTitle>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{estatisticas.aguardando}</div>
            <p className="text-[10px] text-muted-foreground">Para responder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">Respondidas</CardTitle>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{estatisticas.respondidas}</div>
            <p className="text-[10px] text-muted-foreground">Enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">Confirmadas</CardTitle>
            <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{estatisticas.confirmadas}</div>
            <p className="text-[10px] text-muted-foreground">Pedidos fechados</p>
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
            Analisando ({estatisticas.analiseIA})
          </TabsTrigger>
          <TabsTrigger value="analisadas" className="gap-2">
            <Sparkles className="h-3 w-3" />
            Analisadas ({estatisticas.analisadas})
          </TabsTrigger>
          <TabsTrigger value="aguardando">
            Aguardando ({estatisticas.aguardando})
          </TabsTrigger>
          <TabsTrigger value="respondidas">
            Respondidas ({estatisticas.respondidas})
          </TabsTrigger>
          <TabsTrigger value="confirmadas">
            Confirmadas ({estatisticas.confirmadas})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={abaAtiva} className="space-y-4 mt-4">
          {cotacoes && cotacoes.length > 0 ? <>
              <div className="space-y-2">
                {cotacoes.map(cotacao => <Card key={cotacao.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">
                              Origem: {cotacao.id_cotacao_externa}
                            </span>
                            {cotacao.plataformas_edi && <Badge variant="outline" className="text-xs">{cotacao.plataformas_edi.nome}</Badge>}
                            <StatusAnaliseIABadge statusAnalise={cotacao.status_analise_ia} progresso={cotacao.progresso_analise_percent ?? 0} itensAnalisados={cotacao.itens_analisados ?? cotacao.total_itens_analisados ?? 0} totalItens={cotacao.total_itens_para_analise ?? cotacao.total_itens ?? 0} tempoEstimado={cotacao.tempo_analise_segundos ?? undefined} />
                            {cotacao.tags && cotacao.tags.length > 0 && cotacao.tags.map(tag => <Badge key={tag} variant="destructive" className="text-xs">
                                {tag}
                              </Badge>)}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(cotacao.data_vencimento_atual), "dd/MM/yyyy | HH:mm", {
                          locale: ptBR
                        })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <button onClick={() => navigate(`/plataformas/cotacoes/${cotacao.id}`)} className="text-primary hover:underline font-medium text-sm truncate">
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
                          {!cotacao.resgatada && abaAtiva === "novas" && <Button size="sm" onClick={() => handleResgatar(cotacao.id)} disabled={resgatarCotacao.isPending}>
                              Resgatar
                            </Button>}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/plataformas/cotacoes/${cotacao.id}`)}>
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>
              
              {/* Paginação */}
              {cotacoes.length === LIMITE_POR_PAGINA && <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {(paginas[abaAtiva] || 0) + 1} • {cotacoes.length} registros
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleMudarPagina(Math.max(0, (paginas[abaAtiva] || 0) - 1))} disabled={(paginas[abaAtiva] || 0) === 0}>
                      Anterior
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleMudarPagina((paginas[abaAtiva] || 0) + 1)} disabled={cotacoes.length < LIMITE_POR_PAGINA}>
                      Próxima
                    </Button>
                  </div>
                </div>}
            </> : <Card className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma cotação encontrada neste status</p>
            </Card>}
        </TabsContent>
      </Tabs>
    </div>;
}