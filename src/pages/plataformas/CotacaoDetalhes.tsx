import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Calendar, MapPin, FileText, Package, DollarSign, Clock, CheckCircle2, XCircle, ArrowLeft, ChevronRight, ChevronLeft } from "lucide-react";
import { EDICotacao } from "@/hooks/useEDICotacoes";
import { useToast } from "@/hooks/use-toast";
import { ItemCotacaoCard } from "@/components/plataformas/ItemCotacaoCard";
interface ItemCotacao {
  id: string;
  numero_item: number;
  codigo_produto_cliente: string;
  descricao_produto_cliente: string;
  quantidade_solicitada: number;
  quantidade_respondida: number | null;
  preco_unitario_respondido: number | null;
  preco_total: number | null;
  unidade_medida: string;
  status: string;
  respondido_em: string | null;
}
export default function CotacaoDetalhes() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [cotacao, setCotacao] = useState<EDICotacao | null>(null);
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historicoAberto, setHistoricoAberto] = useState(true);
  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);
  const carregarDados = async () => {
    setIsLoading(true);
    try {
      // Carregar cotação
      const {
        data: cotacaoData,
        error: cotacaoError
      } = await supabase.from("edi_cotacoes").select(`
          *,
          plataformas_edi(nome, slug)
        `).eq("id", id).single();
      if (cotacaoError) throw cotacaoError;
      setCotacao(cotacaoData as EDICotacao);

      // Carregar itens
      const {
        data: itensData,
        error: itensError
      } = await supabase.from("edi_cotacoes_itens").select("*").eq("cotacao_id", id).order("numero_item", {
        ascending: true
      });
      if (itensError) throw itensError;
      setItens(itensData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
      navigate("/plataformas/cotacoes");
    } finally {
      setIsLoading(false);
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
  const statusItemBadge = (status: string) => {
    switch (status) {
      case "respondido":
        return <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Respondido
          </Badge>;
      case "pendente":
        return <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>;
      case "sem_estoque":
        return <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            Sem Estoque
          </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  if (isLoading) {
    return <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>;
  }
  if (!cotacao) return null;
  const valorTotal = itens.reduce((acc, item) => acc + (item.preco_total || 0), 0);
  return <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Área Principal */}
        <div className={`flex-1 transition-all duration-300 ${historicoAberto ? 'mr-96' : 'mr-0'}`}>
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" size="icon" onClick={() => navigate("/plataformas/cotacoes")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold">
                    Cotação {cotacao.numero_cotacao}
                  </h1>
                  <Badge variant="default">{stepLabel(cotacao.step_atual)}</Badge>
                </div>
                <p className="text-muted-foreground">
                  ID Externo: {cotacao.id_cotacao_externa}
                </p>
              </div>
            </div>

            {/* CAPA - Informações principais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Capa
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Cliente */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <Building2 className="h-4 w-4" />
                      Cliente
                    </div>
                    <div className="space-y-2 pl-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium">{cotacao.nome_cliente}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">CNPJ</p>
                        <p className="font-medium">{cotacao.cnpj_cliente}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="text-sm">
                          {cotacao.cidade_cliente}, {cotacao.uf_cliente}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Datas */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <Calendar className="h-4 w-4" />
                      Datas
                    </div>
                    <div className="space-y-2 pl-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Abertura</p>
                        <p className="font-medium">
                          {format(new Date(cotacao.data_abertura), "dd/MM/yyyy HH:mm", {
                          locale: ptBR
                        })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vencimento</p>
                        <p className="font-medium text-destructive">
                          {format(new Date(cotacao.data_vencimento_atual), "dd/MM/yyyy HH:mm", {
                          locale: ptBR
                        })}
                        </p>
                      </div>
                      {cotacao.resgatada && cotacao.resgatada_em && <div>
                          <p className="text-sm text-muted-foreground">Resgatada em</p>
                          <p className="font-medium">
                            {format(new Date(cotacao.resgatada_em), "dd/MM/yyyy HH:mm", {
                          locale: ptBR
                        })}
                          </p>
                        </div>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CABEÇALHO - Plataforma */}
            

            {/* ITENS E INFORMAÇÕES DE ITENS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens e Informações de Itens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {itens.map(item => (
                    <ItemCotacaoCard 
                      key={item.id} 
                      item={item} 
                      cotacao={cotacao}
                      onUpdate={carregarDados}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* INFORMAÇÕES GERAIS, OBS E TERMO */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais, Obs e Termo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total de Itens</p>
                    <p className="font-medium text-xl">{cotacao.total_itens}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Itens Respondidos</p>
                    <p className="font-medium text-xl">{cotacao.total_itens_respondidos}</p>
                  </div>
                </div>
                
                {cotacao.detalhes && Object.keys(cotacao.detalhes).length > 0 && <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm font-semibold mb-2">Detalhes Adicionais</p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                        {JSON.stringify(cotacao.detalhes, null, 2)}
                      </pre>
                    </div>
                  </>}
              </CardContent>
            </Card>

            {/* VALOR TOTAL */}
            <Card className="border-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-primary" />
                    <span className="text-lg font-semibold">Valor Total com Base nos Itens</span>
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(valorTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {cotacao.step_atual === "em_analise" && <div className="flex justify-end gap-2">
                <Button size="lg">Responder Cotação</Button>
              </div>}
          </div>
        </div>

        {/* Painel Lateral de Histórico */}
        <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] bg-card border-l shadow-lg transition-all duration-500 ease-in-out z-50 ${historicoAberto ? 'w-96' : 'w-12'} overflow-hidden`}>
          {/* Botão de Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={`absolute left-2 top-4 z-10 transition-all duration-300 ${historicoAberto ? '' : 'hover:scale-110'}`}
            onClick={() => setHistoricoAberto(!historicoAberto)}
          >
            {historicoAberto ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          {/* Conteúdo do Histórico */}
          {historicoAberto && (
            <div className="p-6 pt-16 h-full overflow-y-auto animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-5 w-5" />
                <h2 className="text-xl font-bold">Histórico</h2>
              </div>
              
              <Separator className="mb-4" />
              
              <div className="space-y-4">
                <div className="text-center py-12 animate-scale-in">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Histórico de atividades será exibido aqui
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>;
}