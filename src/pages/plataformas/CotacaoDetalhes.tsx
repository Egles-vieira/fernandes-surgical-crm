import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, FileText, Package, DollarSign, Clock, CheckCircle2, XCircle, ArrowLeft, ChevronRight, ChevronLeft, Trash2, Sparkles } from "lucide-react";
import { EDICotacao } from "@/hooks/useEDICotacoes";
import { useToast } from "@/hooks/use-toast";
import { ItemCotacaoTable } from "@/components/plataformas/ItemCotacaoTable";
import { CotacaoActionBar } from "@/components/plataformas/CotacaoActionBar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIAAnalysis } from "@/hooks/useIAAnalysis";
import { useRealtimeItemUpdates } from "@/hooks/useRealtimeItemUpdates";
import { ProgressoAnaliseIA } from "@/components/plataformas/ProgressoAnaliseIA";
import { SugestoesIACard } from "@/components/plataformas/SugestoesIACard";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
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
  percentual_desconto?: number | null;
  produto_id?: string | null;
  produtos?: {
    id: string;
    nome: string;
    referencia_interna: string;
    preco_venda: number;
    quantidade_em_maos: number;
    unidade_medida: string;
  } | null;
  produto_selecionado?: {
    id: string;
    nome: string;
    referencia_interna: string;
  } | null;
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
  const {
    track
  } = usePerformanceMonitor();
  const [cotacao, setCotacao] = useState<EDICotacao | null>(null);
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Análise de IA
  const {
    isAnalyzing,
    progress,
    error: iaError,
    iniciarAnalise
  } = useIAAnalysis(id);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Hook de realtime updates para itens
  useRealtimeItemUpdates({
    cotacaoId: id || '',
    onItemUpdate: (itemId, updates) => {
      // Atualiza o item na lista local
      setItens(prevItens => prevItens.map(item => item.id === itemId ? {
        ...item,
        ...updates
      } : item));
    }
  });
  useEffect(() => {
    if (id) {
      carregarDados();
    }
  }, [id]);
  const carregarDados = async () => {
    setIsLoading(true);
    try {
      await track('carregar-cotacao-detalhes', async () => {
        // Carregar cotação e itens em PARALELO para melhor performance
        const [cotacaoResult, itensResult] = await Promise.all([supabase.from("edi_cotacoes").select(`
            *,
            plataformas_edi(nome, slug)
          `).eq("id", id).single(), supabase.from("edi_cotacoes_itens").select(`
            *,
            produtos!produto_id(id, nome, referencia_interna, preco_venda, quantidade_em_maos, unidade_medida),
            produto_selecionado:produtos!produto_selecionado_id(id, nome, referencia_interna)
          `).eq("cotacao_id", id).order("numero_item", {
          ascending: true
        })]);
        if (cotacaoResult.error) throw cotacaoResult.error;
        if (itensResult.error) throw itensResult.error;
        setCotacao(cotacaoResult.data as EDICotacao);
        setItens(itensResult.data || []);
      });
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
  const handleResponder = () => {
    toast({
      title: "Responder Cotação",
      description: "Funcionalidade em desenvolvimento"
    });
  };
  const handleCancelar = () => {
    toast({
      title: "Cancelar Cotação",
      description: "Funcionalidade em desenvolvimento",
      variant: "destructive"
    });
  };
  const handleConfirmar = () => {
    toast({
      title: "Confirmar Cotação",
      description: "Funcionalidade em desenvolvimento"
    });
  };
  const handleEnviar = () => {
    toast({
      title: "Enviar Cotação",
      description: "Funcionalidade em desenvolvimento"
    });
  };
  const handleResetarAnalise = async () => {
    if (!id) return;
    setIsResetting(true);
    try {
      // Resetar estado da cotação
      const {
        error: resetError
      } = await supabase.from('edi_cotacoes').update({
        status_analise_ia: 'pendente',
        progresso_analise_percent: 0,
        itens_analisados: 0,
        total_sugestoes_geradas: 0,
        erro_analise_ia: null
      }).eq('id', id);
      if (resetError) throw resetError;

      // Resetar itens
      const {
        error: itensError
      } = await supabase.from('edi_cotacoes_itens').update({
        analisado_por_ia: false,
        score_confianca_ia: null,
        produtos_sugeridos_ia: null,
        produto_selecionado_id: null,
        requer_revisao_humana: false
      }).eq('cotacao_id', id);
      if (itensError) throw itensError;
      toast({
        title: "Análise resetada",
        description: "A análise foi resetada. Reiniciando agora..."
      });

      // Reiniciar análise
      await carregarDados();
      if (id) {
        setTimeout(() => iniciarAnalise(id), 1000);
      }
    } catch (error) {
      console.error('Erro ao resetar análise:', error);
      toast({
        title: "Erro ao resetar",
        description: "Não foi possível resetar a análise. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };
  const handleExcluir = async () => {
    setIsDeleting(true);
    try {
      const {
        error
      } = await supabase.from("edi_cotacoes").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Cotação excluída",
        description: "A cotação foi excluída com sucesso. Você pode importar novamente se necessário."
      });
      navigate("/plataformas/cotacoes");
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cotação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  const valorTotal = itens.reduce((acc, item) => acc + (item.preco_total || 0), 0);
  return <div className="min-h-screen bg-background">
      {/* ActionBar fixo que respeita sidebar e histórico */}
      <div className="fixed top-16 z-20 bg-card border-b shadow-sm px-4 md:px-6 py-3 transition-all duration-300" style={{
      left: 'var(--sidebar-width)' as any,
      right: historicoAberto ? '24rem' : '3rem'
    }}>
        <CotacaoActionBar status={cotacao.step_atual as any} onResponder={handleResponder} onCancelar={handleCancelar} onConfirmar={handleConfirmar} onEnviar={handleEnviar} onResetarAnalise={handleResetarAnalise} analiseIATravada={cotacao.status_analise_ia === 'em_analise' && (cotacao.progresso_analise_percent || 0) > 0 && (cotacao.progresso_analise_percent || 0) < 100 && !isAnalyzing} />
      </div>

      <div className="flex pt-[72px] w-full">
        {/* Área Principal */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${historicoAberto ? 'mr-96' : 'mr-12'}`}>
          <div className="px-4 py-6 space-y-6 w-full md:px-6 md:py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" size="icon" onClick={() => navigate("/plataformas/cotacoes")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-bold text-xl">
                    Cotação {cotacao.numero_cotacao}
                  </h1>
                  <Badge variant="default">{stepLabel(cotacao.step_atual)}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-muted-foreground">
                    ID Externo: {cotacao.id_cotacao_externa}
                  </p>
                  {cotacao.detalhes?.contato_comprador && <p className="text-muted-foreground">
                      | Contato: {cotacao.detalhes.contato_comprador}
                    </p>}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Cotação
              </Button>
            </div>

            {/* CAPA - Informações principais e Condições Comerciais */}
            <Card className="rounded-lg mx-0 w-full overflow-hidden">
              <CardContent className="mx-0 py-[12px] my-0 px-[24px]">
                {/* Informações do Cliente e Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Cliente */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      
                      Informações do Cliente
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nome</Label>
                        <p className="font-medium text-sm">{cotacao.nome_cliente}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">CNPJ</Label>
                        <p className="font-medium text-sm">{cotacao.cnpj_cliente}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Localização</Label>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">
                            {cotacao.cidade_cliente}, {cotacao.uf_cliente}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Datas */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      
                      Cronograma
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Data de Abertura</Label>
                        <p className="font-medium text-sm">
                          {format(new Date(cotacao.data_abertura), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Data de Vencimento</Label>
                        <p className="font-medium text-sm text-destructive">
                          {format(new Date(cotacao.data_vencimento_atual), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}
                        </p>
                      </div>
                      {cotacao.resgatada && cotacao.resgatada_em && <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Data de Resgate</Label>
                          <p className="font-medium text-sm">
                            {format(new Date(cotacao.resgatada_em), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}
                          </p>
                        </div>}
                      {cotacao.detalhes?.contato && <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Contato</Label>
                          <p className="font-medium text-sm">
                            {cotacao.detalhes.contato}
                          </p>
                        </div>}
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Condições Comerciais */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Suas condições comerciais</h3>
                
                <Tabs defaultValue="condicoes" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="condicoes">Condições Comerciais</TabsTrigger>
                    <TabsTrigger value="observacoes">Observações</TabsTrigger>
                    <TabsTrigger value="anexos">Anexos</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="condicoes" className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Forma de Pagamento */}
                      <div className="space-y-2">
                        <Label htmlFor="forma-pagamento">Forma de pagamento</Label>
                        <Select>
                          <SelectTrigger id="forma-pagamento">
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30ddi">30 ddi</SelectItem>
                            <SelectItem value="60ddi">60 ddi</SelectItem>
                            <SelectItem value="90ddi">90 ddi</SelectItem>
                            <SelectItem value="avista">À vista</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {cotacao.forma_pagamento_portal || cotacao.detalhes?.forma_pagamento ? `Sugestão: ${cotacao.forma_pagamento_portal || cotacao.detalhes?.forma_pagamento}` : 'Não informada'}
                        </p>
                      </div>

                      {/* Tipo de Frete */}
                      <div className="space-y-2">
                        <Label htmlFor="tipo-frete">Tipo de frete</Label>
                        <Select>
                          <SelectTrigger id="tipo-frete">
                            <SelectValue placeholder="Selecione o tipo de frete" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cif">CIF - Preço Inclui Frete</SelectItem>
                            <SelectItem value="fob">FOB - Frete por conta do comprador</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {cotacao.detalhes?.tipo_frete ? `Sugestão: ${cotacao.detalhes.tipo_frete}` : 'Não informada'}
                        </p>
                      </div>

                      {/* Prazo de Entrega */}
                      <div className="space-y-2">
                        <Label htmlFor="prazo-entrega">Prazo de entrega (dias)</Label>
                        <Input id="prazo-entrega" type="number" placeholder={cotacao.detalhes?.prazo_entrega_dias || "2"} className="w-full" />
                        {cotacao.detalhes?.prazo_entrega_dias && <p className="text-xs text-muted-foreground">
                            Sugestão: {cotacao.detalhes.prazo_entrega_dias} dias
                          </p>}
                      </div>

                      {/* Validade Mínima da Proposta */}
                      <div className="space-y-2">
                        <Label htmlFor="validade-proposta">Validade da proposta</Label>
                        <Input id="validade-proposta" type="date" className="w-full" />
                        <p className="text-xs text-muted-foreground">
                          Mínimo {cotacao.detalhes?.validade_minima_dias || '5'} dias
                        </p>
                      </div>

                      {/* Faturamento Mínimo */}
                      <div className="space-y-2 lg:col-span-2">
                        <Label htmlFor="faturamento-minimo">Faturamento mínimo (R$)</Label>
                        <Input id="faturamento-minimo" type="number" placeholder={cotacao.detalhes?.faturamento_minimo || "500.00"} className="w-full" step="0.01" />
                        {cotacao.detalhes?.faturamento_minimo && <p className="text-xs text-muted-foreground">
                            Sugestão: R$ {Number(cotacao.detalhes.faturamento_minimo).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                          </p>}
                      </div>

                      {/* Local de Entrega */}
                      
                    </div>
                  </TabsContent>

                  <TabsContent value="observacoes" className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea id="observacoes" placeholder="Adicione observações sobre esta cotação..." className="min-h-[150px]" />
                    </div>
                  </TabsContent>

                  <TabsContent value="anexos" className="space-y-4 pt-6">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum anexo adicionado ainda
                      </p>
                      <Button variant="outline" size="sm" className="mt-4">
                        Adicionar Anexo
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* ANÁLISE DE IA */}
            {cotacao.step_atual === 'em_analise' && <div className="space-y-4 w-full">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Análise com IA
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setMostrarSugestoes(!mostrarSugestoes)} disabled={!progress || progress.status !== 'concluido'}>
                      {mostrarSugestoes ? 'Ocultar Sugestões' : 'Ver Sugestões'}
                    </Button>
                    <Button onClick={() => id && iniciarAnalise(id)} disabled={isAnalyzing} size="sm">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                    </Button>
                  </div>
                </div>

                <ProgressoAnaliseIA progresso={progress} isAnalyzing={isAnalyzing} />

                {iaError && <Card className="border-destructive w-full overflow-hidden">
                    <CardContent className="pt-6">
                      <p className="text-sm text-destructive">{iaError}</p>
                    </CardContent>
                  </Card>}
              </div>}

            {/* ITENS E INFORMAÇÕES DE ITENS */}
            <Card className="w-full overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens e Informações de Itens
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <ItemCotacaoTable itens={itens} cotacao={cotacao} onUpdate={carregarDados} />
                </div>
              </CardContent>
            </Card>

            {/* SUGESTÕES DE IA POR ITEM */}
            {mostrarSugestoes && progress?.status === 'concluido' && progress.itens_detalhes.length > 0 && <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sugestões de Produtos</h3>
                {progress.itens_detalhes.map(analise => {
              const item = itens.find(i => i.id === analise.item_id);
              if (!item) return null;
              return <div key={analise.item_id} className="space-y-2">
                      <div className="bg-muted/50 p-3 rounded-md">
                        <p className="text-sm font-medium">Item {item.numero_item}</p>
                        <p className="text-xs text-muted-foreground">{item.descricao_produto_cliente}</p>
                      </div>
                      <SugestoesIACard analise={analise} onSelecionarProduto={async (itemId, produtoId) => {
                  try {
                    const {
                      error
                    } = await supabase.from('edi_cotacoes_itens').update({
                      produto_selecionado_id: produtoId,
                      status: 'vinculado_ia'
                    }).eq('id', itemId);
                    if (error) throw error;
                    toast({
                      title: "Produto selecionado",
                      description: "Produto vinculado ao item com sucesso"
                    });
                    carregarDados();
                  } catch (error: any) {
                    toast({
                      title: "Erro ao selecionar produto",
                      description: error.message,
                      variant: "destructive"
                    });
                  }
                }} produtoSelecionadoId={item.produto_selecionado?.id} />
                    </div>;
            })}
              </div>}

            {/* INFORMAÇÕES GERAIS, OBS E TERMO */}
            <Card className="w-full overflow-hidden">
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
                      <p className="text-sm font-semibold mb-3">Detalhes Adicionais</p>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.entries(cotacao.detalhes).map(([key, value]) => <div key={key} className="bg-muted/50 p-3 rounded">
                            <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm break-words whitespace-pre-wrap">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </p>
                          </div>)}
                      </div>
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
        <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] bg-card border-l shadow-lg transition-all duration-500 ease-in-out z-30 ${historicoAberto ? 'w-96' : 'w-12'} overflow-hidden`}>
          {/* Botão de Toggle */}
          <Button variant="ghost" size="icon" className={`absolute left-2 top-4 z-10 transition-all duration-300 ${historicoAberto ? '' : 'hover:scale-110'}`} onClick={() => setHistoricoAberto(!historicoAberto)}>
            {historicoAberto ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          {/* Conteúdo do Histórico */}
          {historicoAberto && <div className="p-6 pt-16 h-full overflow-y-auto animate-fade-in">
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
            </div>}
        </div>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cotação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta cotação? Esta ação não pode ser desfeita.
              Todos os itens e vínculos relacionados também serão excluídos.
              <br /><br />
              <strong>Cotação:</strong> {cotacao?.numero_cotacao}
              <br />
              <strong>Cliente:</strong> {cotacao?.nome_cliente}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}