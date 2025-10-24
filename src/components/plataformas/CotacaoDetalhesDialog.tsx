import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  User,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { EDICotacao } from "@/hooks/useEDICotacoes";

interface CotacaoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacao: EDICotacao | null;
}

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

export default function CotacaoDetalhesDialog({
  open,
  onOpenChange,
  cotacao,
}: CotacaoDetalhesDialogProps) {
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && cotacao) {
      carregarItens();
    }
  }, [open, cotacao]);

  const carregarItens = async () => {
    if (!cotacao) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("edi_cotacoes_itens")
        .select("*")
        .eq("cotacao_id", cotacao.id)
        .order("numero_item", { ascending: true });

      if (error) throw error;
      setItens(data || []);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!cotacao) return null;

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
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Respondido</Badge>;
      case "pendente":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "sem_estoque":
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Sem Estoque</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Cotação {cotacao.numero_cotacao}
            </DialogTitle>
            <Badge variant="default">{stepLabel(cotacao.step_atual)}</Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="itens">Itens ({cotacao.total_itens})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Dados do Cliente */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Building2 className="h-5 w-5" />
                    Cliente
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{cotacao.nome_cliente}</p>
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
                  <div className="space-y-2">
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
                      <p className="font-medium text-destructive">
                        {format(
                          new Date(cotacao.data_vencimento_atual),
                          "dd/MM/yyyy HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                    {cotacao.resgatada && (
                      <div>
                        <p className="text-sm text-muted-foreground">Resgatada em</p>
                        <p className="font-medium">
                          {cotacao.resgatada_em &&
                            format(new Date(cotacao.resgatada_em), "dd/MM/yyyy HH:mm", {
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
                  <div className="space-y-2">
                    {cotacao.plataformas_edi && (
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium">{cotacao.plataformas_edi.nome}</p>
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
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Itens</p>
                      <p className="font-medium">{cotacao.total_itens}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Itens Respondidos</p>
                      <p className="font-medium">{cotacao.total_itens_respondidos}</p>
                    </div>
                    {cotacao.valor_total_respondido > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total</p>
                        <p className="font-medium text-lg">
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
          </TabsContent>

          <TabsContent value="itens" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
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
                          <h4 className="font-semibold text-lg mb-1">
                            {item.descricao_produto_cliente}
                          </h4>
                          {item.codigo_produto_cliente && (
                            <p className="text-sm text-muted-foreground">
                              Código: {item.codigo_produto_cliente}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Qtd. Solicitada</p>
                          <p className="font-medium">
                            {item.quantidade_solicitada} {item.unidade_medida}
                          </p>
                        </div>
                        {item.quantidade_respondida && (
                          <>
                            <div>
                              <p className="text-muted-foreground">Qtd. Respondida</p>
                              <p className="font-medium">
                                {item.quantidade_respondida} {item.unidade_medida}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Preço Unitário</p>
                              <p className="font-medium">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(item.preco_unitario_respondido || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total</p>
                              <p className="font-medium text-lg">
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
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <Card className="p-6 text-center text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Histórico em desenvolvimento</p>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {cotacao.step_atual === "em_analise" && (
            <Button>Responder Cotação</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
