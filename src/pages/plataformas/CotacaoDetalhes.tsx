import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  Calendar,
  MapPin,
  FileText,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { EDICotacao } from "@/hooks/useEDICotacoes";
import { useToast } from "@/hooks/use-toast";

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cotacao, setCotacao] = useState<EDICotacao | null>(null);
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);

  const carregarDados = async () => {
    setIsLoading(true);
    try {
      // Carregar cotação
      const { data: cotacaoData, error: cotacaoError } = await supabase
        .from("edi_cotacoes")
        .select(`
          *,
          plataformas_edi(nome, slug)
        `)
        .eq("id", id)
        .single();

      if (cotacaoError) throw cotacaoError;
      setCotacao(cotacaoData as EDICotacao);

      // Carregar itens
      const { data: itensData, error: itensError } = await supabase
        .from("edi_cotacoes_itens")
        .select("*")
        .eq("cotacao_id", id)
        .order("numero_item", { ascending: true });

      if (itensError) throw itensError;
      setItens(itensData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
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
      cancelada: "Cancelada",
    };
    return labels[step] || step;
  };

  const statusItemBadge = (status: string) => {
    switch (status) {
      case "respondido":
        return (
          <Badge variant="default">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Respondido
          </Badge>
        );
      case "pendente":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "sem_estoque":
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            Sem Estoque
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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

  if (!cotacao) return null;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/plataformas/cotacoes")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Cotação {cotacao.numero_cotacao}
              </h1>
              <Badge variant="default">{stepLabel(cotacao.step_atual)}</Badge>
            </div>
            <p className="text-muted-foreground">
              ID Externo: {cotacao.id_cotacao_externa}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {cotacao.step_atual === "em_analise" && (
            <Button size="lg">Responder Cotação</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="itens">Itens ({cotacao.total_itens})</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dados do Cliente */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5" />
                  Cliente
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium text-lg">{cotacao.nome_cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CNPJ</p>
                    <p className="font-medium">{cotacao.cnpj_cliente}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {cotacao.cidade_cliente}, {cotacao.uf_cliente}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados da Cotação */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="h-5 w-5" />
                  Datas
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Abertura</p>
                    <p className="font-medium">
                      {format(new Date(cotacao.data_abertura), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium text-destructive text-lg">
                      {format(
                        new Date(cotacao.data_vencimento_atual),
                        "dd/MM/yyyy HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                  {cotacao.resgatada && cotacao.resgatada_em && (
                    <div>
                      <p className="text-sm text-muted-foreground">Resgatada em</p>
                      <p className="font-medium">
                        {format(new Date(cotacao.resgatada_em), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plataforma */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Package className="h-5 w-5" />
                  Plataforma
                </div>
                <Separator />
                <div className="space-y-3">
                  {cotacao.plataformas_edi && (
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium text-lg">
                        {cotacao.plataformas_edi.nome}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">ID Externo</p>
                    <p className="font-medium">{cotacao.id_cotacao_externa}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valores */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <DollarSign className="h-5 w-5" />
                  Valores
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Itens</p>
                    <p className="font-medium text-2xl">{cotacao.total_itens}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Itens Respondidos
                    </p>
                    <p className="font-medium text-xl">
                      {cotacao.total_itens_respondidos}
                    </p>
                  </div>
                  {cotacao.valor_total_respondido > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-2xl text-primary">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(cotacao.valor_total_respondido)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes Adicionais */}
          {cotacao.detalhes && Object.keys(cotacao.detalhes).length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Detalhes Adicionais</h3>
                <Separator className="mb-4" />
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(cotacao.detalhes, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="itens" className="space-y-4 mt-6">
          <div className="space-y-3">
            {itens.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Item {item.numero_item}</Badge>
                        {statusItemBadge(item.status)}
                      </div>
                      <h4 className="font-semibold text-lg mb-2">
                        {item.descricao_produto_cliente}
                      </h4>
                      {item.codigo_produto_cliente && (
                        <p className="text-sm text-muted-foreground">
                          Código: {item.codigo_produto_cliente}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Qtd. Solicitada
                      </p>
                      <p className="font-medium text-lg">
                        {item.quantidade_solicitada} {item.unidade_medida}
                      </p>
                    </div>
                    {item.quantidade_respondida && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Qtd. Respondida
                          </p>
                          <p className="font-medium text-lg">
                            {item.quantidade_respondida} {item.unidade_medida}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Preço Unitário
                          </p>
                          <p className="font-medium text-lg">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(item.preco_unitario_respondido || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Total
                          </p>
                          <p className="font-bold text-xl text-primary">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(item.preco_total || 0)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4 mt-6">
          <Card className="p-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">Histórico em desenvolvimento</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
