import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ChevronRight, ChevronDown, Package, Sparkles, Save, 
  ChevronLeft, ChevronsLeft, ChevronRight as ChevronRightIcon, ChevronsRight,
  Settings2, Download, Search, ArrowUpDown, Eye, EyeOff, Filter, CheckCircle2,
  AlertCircle, TrendingUp, ThumbsUp, ThumbsDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ProdutoSearchDialog } from "./ProdutoSearchDialog";
import { SugestoesIADialog } from "./SugestoesIADialog";
import { FeedbackIADialog } from "./FeedbackIADialog";
import { ItemSugestaoIAIcon } from "./ItemSugestaoIAIcon";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EDIProdutoVinculo } from "@/hooks/useEDIProdutosVinculo";
import type { SugestaoProduto } from "@/types/ia-analysis";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  analisado_por_ia?: boolean;
  analise_ia_em?: string | null;
  score_confianca_ia?: number | null;
  produtos_sugeridos_ia?: any;
}

interface ItemCotacaoTableProps {
  itens: ItemCotacao[];
  cotacao: {
    cnpj_cliente: string;
    plataforma_id: string;
  };
  onUpdate: () => void;
}

export function ItemCotacaoTable({ itens, cotacao, onUpdate }: ItemCotacaoTableProps) {
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [dialogAberto, setDialogAberto] = useState(false);
  const [sugestoesDialogAberto, setSugestoesDialogAberto] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<ItemCotacao | null>(null);
  const [sugestoesIA, setSugestoesIA] = useState<any[]>([]);
  const [itemsData, setItemsData] = useState<Map<string, any>>(new Map());
  const [previousMappings, setPreviousMappings] = useState<Map<string, EDIProdutoVinculo[]>>(new Map());
  const [itemSugestoes, setItemSugestoes] = useState<Map<string, SugestaoProduto[]>>(new Map());
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [sugestaoParaFeedback, setSugestaoParaFeedback] = useState<{item: ItemCotacao, sugestao: SugestaoProduto} | null>(null);
  
  // Grid Controls
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Debounce search para reduzir re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">("normal");
  const [visibleColumns, setVisibleColumns] = useState({
    expand: true,
    select: true,
    numero: true,
    descricao: true,
    codigo: true,
    vinculo: true,
    unidadeInterna: true,
    quantidade: true,
    preco: true,
    desconto: true,
    total: true,
    status: true,
    sugestoesIA: true,
    acoes: true,
  });

  useEffect(() => {
    // Inicializar dados dos itens
    const initialData = new Map();
    const initialSugestoes = new Map();
    
    itens.forEach(item => {
      initialData.set(item.id, {
        produtoVinculado: item.produtos || null,
        quantidade: item.quantidade_respondida || item.quantidade_solicitada,
        precoUnitario: item.preco_unitario_respondido || 0,
        desconto: item.percentual_desconto || 0,
        isLoading: false,
        sugeridoPorIA: false,
      });
      
      // Se já tem sugestões salvas, carregar
      if (item.produtos_sugeridos_ia) {
        try {
          const sugestoes = JSON.parse(JSON.stringify(item.produtos_sugeridos_ia));
          if (Array.isArray(sugestoes)) {
            initialSugestoes.set(item.id, sugestoes);
          }
        } catch (e) {
          console.error('Erro ao parsear sugestões IA:', e);
        }
      }
    });
    
    setItemsData(initialData);
    setItemSugestoes(initialSugestoes);
  }, [itens]);

  const toggleRow = async (itemId: string, codigoCliente: string) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      
      if (!previousMappings.has(itemId)) {
        await loadPreviousMappings(itemId, codigoCliente);
      }
    }
    
    setExpandedRows(newExpanded);
  };

  const loadPreviousMappings = async (itemId: string, codigoCliente: string) => {
    try {
      const { data, error } = await supabase
        .from("edi_produtos_vinculo")
        .select(`
          *,
          produtos(id, nome, referencia_interna, preco_venda, quantidade_em_maos, unidade_medida)
        `)
        .eq("cnpj_cliente", cotacao.cnpj_cliente)
        .eq("codigo_produto_cliente", codigoCliente)
        .eq("ativo", true)
        .order("aprovado_em", { ascending: false });

      if (error) throw error;

      const mappings = new Map(previousMappings);
      mappings.set(itemId, data as EDIProdutoVinculo[]);
      setPreviousMappings(mappings);
    } catch (error: any) {
      console.error("Erro ao carregar mapeamentos:", error);
    }
  };

  const handleSelectPreviousMapping = (itemId: string, mapping: EDIProdutoVinculo) => {
    const newData = new Map(itemsData);
    const currentData = newData.get(itemId) || {};
    
    newData.set(itemId, {
      ...currentData,
      produtoVinculado: mapping.produtos,
      precoUnitario: mapping.produtos?.preco_venda || 0,
      desconto: mapping.desconto_padrao ?? currentData.desconto ?? 0,
      mappingId: mapping.id,
      sugeridoPorIA: mapping.sugerido_por_ia || false,
    });
    
    setItemsData(newData);
    
    toast({
      title: "Produto vinculado",
      description: `${mapping.produtos?.nome} foi vinculado ao item.`,
    });
  };

  const handleVincularProduto = (produto: any) => {
    if (!currentItemId) return;
    
    const newData = new Map(itemsData);
    const currentData = newData.get(currentItemId) || {};
    
    newData.set(currentItemId, {
      ...currentData,
      produtoVinculado: produto,
      precoUnitario: produto.preco_venda || 0,
      sugeridoPorIA: false,
    });
    
    setItemsData(newData);
    setDialogAberto(false);
    setCurrentItemId(null);
  };

  const handleAnalisarIA = async (item: ItemCotacao) => {
    const newData = new Map(itemsData);
    const currentData = newData.get(item.id) || {};
    newData.set(item.id, { ...currentData, isLoading: true });
    setItemsData(newData);

    try {
      toast({
        title: "Analisando com IA...",
        description: "Buscando produtos compatíveis no catálogo.",
      });

      const response = await supabase.functions.invoke("edi-sugerir-produtos", {
        body: {
          descricao_cliente: item.descricao_produto_cliente,
          cnpj_cliente: cotacao.cnpj_cliente,
          plataforma_id: cotacao.plataforma_id,
          codigo_produto_cliente: item.codigo_produto_cliente,
          quantidade_solicitada: item.quantidade_solicitada,
          unidade_medida: item.unidade_medida,
          item_id: item.id,
          limite: 5,
        },
      });

      if (response.error) throw response.error;

      const sugestoes = response.data?.sugestoes || [];
      
      if (sugestoes.length > 0) {
        // Salvar sugestões no estado
        const newSugestoes = new Map(itemSugestoes);
        newSugestoes.set(item.id, sugestoes);
        setItemSugestoes(newSugestoes);
        
        // Salvar no banco para cache
        await supabase
          .from('edi_cotacoes_itens')
          .update({
            produtos_sugeridos_ia: sugestoes,
            analisado_por_ia: true,
            analise_ia_em: new Date().toISOString(),
            score_confianca_ia: sugestoes[0]?.score_final || null,
            justificativa_ia: sugestoes[0]?.justificativa || null,
          })
          .eq('id', item.id);
        
        toast({
          title: "Análise concluída",
          description: `${sugestoes.length} sugestões encontradas`,
        });
      } else {
        toast({
          title: "Nenhuma sugestão encontrada",
          description: "Não encontramos match no catálogo.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      const newData = new Map(itemsData);
      const currentData = newData.get(item.id) || {};
      newData.set(item.id, { ...currentData, isLoading: false });
      setItemsData(newData);
    }
  };

  const handleAceitarSugestaoInline = async (item: ItemCotacao, sugestao: SugestaoProduto) => {
    const produtoSugerido = {
      id: sugestao.produto_id,
      nome: sugestao.descricao,
      referencia_interna: sugestao.codigo,
      preco_venda: sugestao.preco_venda || 0,
      quantidade_em_maos: sugestao.estoque_disponivel || 0,
      unidade_medida: sugestao.unidade_medida || ''
    };
    
    const newData = new Map(itemsData);
    const currentData = newData.get(item.id) || {};
    
    newData.set(item.id, {
      ...currentData,
      produtoVinculado: produtoSugerido,
      precoUnitario: sugestao.preco_venda || 0,
      sugeridoPorIA: true,
    });
    
    setItemsData(newData);
    
    // Salvar automaticamente
    await handleSalvar(item);
    
    toast({
      title: "Sugestão aceita",
      description: `${sugestao.descricao} (${sugestao.score_final}% compatibilidade)`,
    });
  };

  const getConfiancaBadge = (confianca: 'alta' | 'media' | 'baixa') => {
    const variants = {
      alta: { variant: 'default' as const, icon: CheckCircle2, text: 'Alta' },
      media: { variant: 'secondary' as const, icon: TrendingUp, text: 'Média' },
      baixa: { variant: 'outline' as const, icon: AlertCircle, text: 'Baixa' },
    };
    const config = variants[confianca];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const handleSalvar = async (item: ItemCotacao) => {
    const data = itemsData.get(item.id);
    if (!data?.produtoVinculado) {
      toast({
        title: "Produto não vinculado",
        description: "Vincule um produto antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    const newData = new Map(itemsData);
    const currentData = newData.get(item.id) || {};
    newData.set(item.id, { ...currentData, isLoading: true });
    setItemsData(newData);

    try {
      const valorTotal = data.quantidade * data.precoUnitario * (1 - data.desconto / 100);

      let mappingId: string | undefined = currentData.mappingId;

      if (!mappingId) {
        const { data: found, error: findError } = await supabase
          .from("edi_produtos_vinculo")
          .select("id")
          .eq("cnpj_cliente", cotacao.cnpj_cliente)
          .eq("codigo_produto_cliente", item.codigo_produto_cliente)
          .eq("produto_id", data.produtoVinculado.id)
          .eq("ativo", true)
          .limit(1);

        if (findError) {
          console.error("Erro ao buscar mapeamento:", findError);
        }

        mappingId = found?.[0]?.id;

        if (!mappingId) {
          const { data: inserted, error: insertError } = await supabase
            .from("edi_produtos_vinculo")
            .insert({
              plataforma_id: cotacao.plataforma_id,
              produto_id: data.produtoVinculado.id,
              cnpj_cliente: cotacao.cnpj_cliente,
              codigo_produto_cliente: item.codigo_produto_cliente,
              descricao_cliente: item.descricao_produto_cliente,
              preco_padrao: data.precoUnitario,
              desconto_padrao: data.desconto,
              aprovado_em: new Date().toISOString(),
              ativo: true,
              sugerido_por_ia: data.sugeridoPorIA || false,
            })
            .select("id")
            .single();

          if (insertError) throw insertError;
          mappingId = inserted?.id;
        }
      }

      const { error } = await supabase
        .from("edi_cotacoes_itens")
        .update({
          produto_vinculo_id: mappingId,
          produto_id: data.produtoVinculado.id,
          quantidade_respondida: data.quantidade,
          preco_unitario_respondido: data.precoUnitario,
          percentual_desconto: data.desconto,
          valor_desconto: (data.quantidade * data.precoUnitario * data.desconto) / 100,
          preco_total: valorTotal,
          status: "respondido",
          respondido_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      const afterSave = new Map(itemsData);
      const current = afterSave.get(item.id) || {};
      afterSave.set(item.id, { ...current, mappingId });
      setItemsData(afterSave);

      await loadPreviousMappings(item.id, item.codigo_produto_cliente);

      toast({
        title: "Item salvo",
        description: "Mapeamento DE-PARA registrado e item respondido.",
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      const newData = new Map(itemsData);
      const currentData = newData.get(item.id) || {};
      newData.set(item.id, { ...currentData, isLoading: false });
      setItemsData(newData);
    }
  };

  const updateItemField = useCallback((itemId: string, field: string, value: any) => {
    setItemsData(prev => {
      const newData = new Map(prev);
      const currentData = newData.get(itemId) || {};
      newData.set(itemId, { ...currentData, [field]: value });
      return newData;
    });
  }, []);

  const getValorTotal = useCallback((itemId: string) => {
    const data = itemsData.get(itemId);
    if (!data) return 0;
    return data.quantidade * data.precoUnitario * (1 - data.desconto / 100);
  }, [itemsData]);

  // Filtrar e ordenar itens (com debounce no search)
  const filteredAndSortedItems = useMemo(() => {
    let result = [...itens];

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(
        (item) =>
          item.descricao_produto_cliente.toLowerCase().includes(searchLower) ||
          item.codigo_produto_cliente?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (sortColumn) {
      result.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof ItemCotacao];
        let bVal: any = b[sortColumn as keyof ItemCotacao];

        if (sortColumn === "total") {
          aVal = getValorTotal(a.id);
          bVal = getValorTotal(b.id);
        }

        if (typeof aVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [itens, debouncedSearch, statusFilter, sortColumn, sortDirection, getValorTotal]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / pageSize);
  const paginatedItems = filteredAndSortedItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedItems.map((item) => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const exportToCSV = () => {
    const headers = ["Item", "Descrição", "Código", "Unidade", "Quantidade", "Preço", "Desconto", "Total", "Status"];
    const rows = filteredAndSortedItems.map((item) => {
      const data = itemsData.get(item.id);
      return [
        item.numero_item,
        item.descricao_produto_cliente,
        item.codigo_produto_cliente || "",
        item.unidade_medida || "",
        data?.quantidade || 0,
        data?.precoUnitario || 0,
        data?.desconto || 0,
        getValorTotal(item.id),
        item.status,
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cotacao-itens-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const densityClasses = {
    compact: "py-1",
    normal: "py-2",
    comfortable: "py-3",
  };

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-muted/30 rounded-lg border">
          <div className="flex flex-1 gap-2 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou código..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("respondido")}>
                  Respondidos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("pendente")}>
                  Pendentes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Densidade
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Densidade da Tabela</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDensity("compact")}>
                  Compacta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDensity("normal")}>
                  Normal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDensity("comfortable")}>
                  Confortável
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(visibleColumns).map(([key, value]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={value}
                    onCheckedChange={(checked) =>
                      setVisibleColumns({ ...visibleColumns, [key]: checked })
                    }
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Grid com Scroll */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <Table className="relative border-separate border-spacing-0">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  {visibleColumns.expand && <TableHead className="sticky left-0 z-10 bg-background w-[40px] p-1"></TableHead>}
                  {visibleColumns.select && (
                    <TableHead className="sticky left-[40px] z-10 bg-background w-[40px] p-1">
                      <Checkbox
                        checked={selectedItems.size === paginatedItems.length && paginatedItems.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.numero && (
                    <TableHead className="sticky left-[80px] z-10 bg-background w-[70px] cursor-pointer p-1" onClick={() => handleSort("numero_item")}>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        #
                        {sortColumn === "numero_item" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.descricao && (
                    <TableHead className="sticky left-[150px] z-10 bg-background min-w-[250px] max-w-[400px] cursor-pointer p-1" onClick={() => handleSort("descricao_produto_cliente")}>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        Descrição
                        {sortColumn === "descricao_produto_cliente" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.codigo && (
                    <TableHead className="w-[100px] cursor-pointer p-2" onClick={() => handleSort("codigo_produto_cliente")}>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        Cód. Cliente
                        {sortColumn === "codigo_produto_cliente" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.vinculo && <TableHead className="min-w-[200px] p-2 text-xs font-semibold">Produto Vinculado</TableHead>}
                  {visibleColumns.unidadeInterna && <TableHead className="w-[100px] p-2 text-xs font-semibold">Unidade</TableHead>}
                  {visibleColumns.quantidade && (
                    <TableHead className="w-[80px] cursor-pointer p-2 text-right" onClick={() => handleSort("quantidade_solicitada")}>
                      <div className="flex items-center gap-1 justify-end text-xs font-semibold">
                        Qtd.
                        {sortColumn === "quantidade_solicitada" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.preco && <TableHead className="w-[110px] p-2 text-right text-xs font-semibold">Preço Unit.</TableHead>}
                  {visibleColumns.desconto && <TableHead className="w-[80px] p-2 text-right text-xs font-semibold">Desc. %</TableHead>}
                  {visibleColumns.total && (
                    <TableHead className="w-[120px] cursor-pointer p-2 text-right" onClick={() => handleSort("total")}>
                      <div className="flex items-center gap-1 justify-end text-xs font-semibold">
                        Total
                        {sortColumn === "total" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead className="w-[100px] cursor-pointer p-2" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1 text-xs font-semibold">
                        Status
                        {sortColumn === "status" && <ArrowUpDown className="h-3 w-3" />}
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.sugestoesIA && (
                    <TableHead className="min-w-[300px]">
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Sugestões IA
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.acoes && <TableHead className="min-w-[200px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => {
                    const isExpanded = expandedRows.has(item.id);
                    const isSelected = selectedItems.has(item.id);
                    const data = itemsData.get(item.id);
                    const mappings = previousMappings.get(item.id) || [];

                    return (
                      <>
                        {/* Linha Principal */}
                        <TableRow key={item.id} className="group hover:bg-muted/50">
                          {visibleColumns.expand && <TableCell className={`sticky left-0 z-10 bg-background p-1 ${densityClasses[density]}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleRow(item.id, item.codigo_produto_cliente)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>}
                          {visibleColumns.select && <TableCell className={`sticky left-[40px] z-10 bg-background p-1 ${densityClasses[density]}`}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedItems);
                                if (checked) {
                                  newSelected.add(item.id);
                                } else {
                                  newSelected.delete(item.id);
                                }
                                setSelectedItems(newSelected);
                              }}
                            />
                          </TableCell>}
                          {visibleColumns.numero && <TableCell className={`sticky left-[80px] z-10 bg-background font-medium text-sm p-1 ${densityClasses[density]}`}>{item.numero_item}</TableCell>}
                          {visibleColumns.descricao && <TableCell className={`sticky left-[150px] z-10 bg-background text-sm p-1 ${densityClasses[density]}`}>
                            <div className="line-clamp-2 max-w-[400px]">{item.descricao_produto_cliente}</div>
                          </TableCell>}
                          {visibleColumns.codigo && <TableCell className={`text-muted-foreground text-xs p-2 ${densityClasses[density]}`}>
                            {item.codigo_produto_cliente || "-"}
                          </TableCell>}
                          {visibleColumns.vinculo && <TableCell className={`p-2 ${densityClasses[density]}`}>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentItemId(item.id);
                                  setDialogAberto(true);
                                }}
                                className="h-7 w-7 p-0"
                              >
                                <Package className="h-3 w-3" />
                              </Button>
                              {data?.produtoVinculado ? (
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-xs font-medium line-clamp-1">{data.produtoVinculado.nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Ref: {data.produtoVinculado.referencia_interna}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>}
                          {visibleColumns.unidadeInterna && <TableCell className={`text-xs p-2 ${densityClasses[density]}`}>
                            {item.unidade_medida || "-"}
                          </TableCell>}
                          {visibleColumns.quantidade && <TableCell className={`p-2 ${densityClasses[density]}`}>
                            <Input
                              type="number"
                              value={data?.quantidade || 0}
                              onChange={(e) => updateItemField(item.id, "quantidade", Number(e.target.value))}
                              className="w-16 h-7 text-xs text-right"
                              min={0}
                            />
                          </TableCell>}
                          {visibleColumns.preco && <TableCell className={`p-2 ${densityClasses[density]}`}>
                            <Input
                              type="number"
                              value={data?.precoUnitario || 0}
                              onChange={(e) => updateItemField(item.id, "precoUnitario", Number(e.target.value))}
                              className="w-24 h-7 text-xs text-right"
                              min={0}
                              step={0.01}
                            />
                          </TableCell>}
                          {visibleColumns.desconto && <TableCell className={`p-2 ${densityClasses[density]}`}>
                            <Input
                              type="number"
                              value={data?.desconto || 0}
                              onChange={(e) => updateItemField(item.id, "desconto", Number(e.target.value))}
                              className="w-16 h-7 text-xs text-right"
                              min={0}
                              max={100}
                              step={0.01}
                            />
                          </TableCell>}
                          {visibleColumns.total && <TableCell className={`font-semibold text-primary text-xs text-right p-2 ${densityClasses[density]}`}>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(getValorTotal(item.id))}
                          </TableCell>}
                          {visibleColumns.status && <TableCell className={`p-2 ${densityClasses[density]}`}>
                            <Badge variant={item.status === "respondido" ? "default" : "secondary"} className="text-xs">
                              {item.status === "respondido" ? "Respondido" : "Pendente"}
                            </Badge>
                          </TableCell>}
                          {visibleColumns.sugestoesIA && (
                            <TableCell className={`p-2 ${densityClasses[density]}`}>
                              {(() => {
                                const sugestoes = itemSugestoes.get(item.id);
                                if (!sugestoes || sugestoes.length === 0) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <ItemSugestaoIAIcon
                                        scoreConfianca={0}
                                        totalSugestoes={0}
                                        onClick={() => handleAnalisarIA(item)}
                                        className="opacity-50"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        Clique para analisar
                                      </span>
                                    </div>
                                  );
                                }
                                
                                const principal = sugestoes[0];
                                return (
                                  <Collapsible>
                                    <div className="space-y-2">
                                      {/* Ícone animado + Sugestão principal inline */}
                                      <div className="flex items-start gap-2">
                                        <ItemSugestaoIAIcon
                                          scoreConfianca={principal.score_final}
                                          totalSugestoes={sugestoes.length}
                                          onClick={() => {
                                            setCurrentItem(item);
                                            setSugestoesIA(sugestoes);
                                            setSugestoesDialogAberto(true);
                                          }}
                                        />
                                        <div className="flex items-start justify-between gap-2 p-2 border rounded-md bg-primary/5 flex-1">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              {getConfiancaBadge(principal.confianca)}
                                              <Badge variant="outline" className="text-xs">
                                                {principal.score_final}%
                                              </Badge>
                                            </div>
                                            <p className="text-xs font-medium truncate">
                                              {principal.descricao}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                              {principal.codigo}
                                            </p>
                                          </div>
                                          <div className="flex gap-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0"
                                              onClick={() => handleAceitarSugestaoInline(item, principal)}
                                              title="Aceitar sugestão"
                                            >
                                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                                            </Button>
                                             <Button
                                               size="sm"
                                               variant="ghost"
                                               className="h-7 w-7 p-0"
                                               onClick={() => {
                                                 setSugestaoParaFeedback({ item, sugestao: principal });
                                                 setFeedbackDialogOpen(true);
                                               }}
                                               title="Dar feedback"
                                             >
                                               <ThumbsDown className="h-3 w-3" />
                                             </Button>
                                           </div>
                                         </div>
                                       </div>
                                      
                                      {/* Alternativas colapsáveis */}
                                      {sugestoes.length > 1 && (
                                        <CollapsibleTrigger asChild>
                                          <Button variant="ghost" size="sm" className="w-full text-xs">
                                            {sugestoes.length - 1} alternativas
                                            <ChevronDown className="h-3 w-3 ml-1" />
                                          </Button>
                                        </CollapsibleTrigger>
                                      )}
                                      
                                      <CollapsibleContent className="space-y-2">
                                        {sugestoes.slice(1, 3).map((alt, idx) => (
                                          <div key={idx} className="p-2 border rounded-md bg-muted/30">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 mb-1">
                                                  {getConfiancaBadge(alt.confianca)}
                                                  <Badge variant="outline" className="text-xs">
                                                    {alt.score_final}%
                                                  </Badge>
                                                </div>
                                                <p className="text-xs font-medium truncate">
                                                  {alt.descricao}
                                                </p>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                                onClick={() => handleAceitarSugestaoInline(item, alt)}
                                              >
                                                <CheckCircle2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                );
                              })()}
                            </TableCell>
                          )}
                          {visibleColumns.acoes && <TableCell className={`p-2 ${densityClasses[density]}`}>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAnalisarIA(item)}
                                disabled={data?.isLoading}
                                className="h-7 w-7 p-0"
                              >
                                <Sparkles className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSalvar(item)}
                                disabled={data?.isLoading || !data?.produtoVinculado}
                                className="h-7 w-7 p-0"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>}
                        </TableRow>

                        {/* Linhas Expandidas - Mapeamentos Anteriores */}
                        {isExpanded && mappings.length > 0 && mappings.map((mapping) => (
                          <TableRow
                            key={`${item.id}-mapping-${mapping.id}`}
                            className="bg-muted/20 hover:bg-muted/40 cursor-pointer"
                            onClick={() => handleSelectPreviousMapping(item.id, mapping)}
                          >
                            {visibleColumns.expand && <TableCell className="sticky left-0 z-10 bg-muted/20 p-1"></TableCell>}
                            {visibleColumns.select && <TableCell className="sticky left-[40px] z-10 bg-muted/20 p-1"></TableCell>}
                            {visibleColumns.numero && <TableCell className="sticky left-[80px] z-10 bg-muted/20 p-1"></TableCell>}
                            {visibleColumns.descricao && <TableCell className="sticky left-[150px] z-10 bg-muted/20 pl-10 p-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Package className="h-3 w-3" />
                                <span>Mapeamento anterior</span>
                              </div>
                            </TableCell>}
                            {visibleColumns.codigo && <TableCell className="text-xs p-2">-</TableCell>}
                             {visibleColumns.vinculo && <TableCell className="p-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-xs font-medium line-clamp-1">{mapping.produtos?.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Ref: {mapping.produtos?.referencia_interna}
                                  </p>
                                </div>
                              </div>
                            </TableCell>}
                            {visibleColumns.unidadeInterna && <TableCell className="text-xs p-2">-</TableCell>}
                            {visibleColumns.quantidade && <TableCell className="text-xs text-right p-2">-</TableCell>}
                            {visibleColumns.preco && <TableCell className="text-xs font-medium text-right p-2">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(mapping.produtos?.preco_venda || 0)}
                            </TableCell>}
                            {visibleColumns.desconto && <TableCell className="text-xs text-right p-2">
                              {mapping.desconto_padrao || 0}%
                            </TableCell>}
                            {visibleColumns.total && <TableCell className="text-xs text-right p-2">-</TableCell>}
                            {visibleColumns.status && <TableCell className="p-2">
                              <Badge variant="outline" className="text-xs">
                                {mapping.sugerido_por_ia ? "IA" : "Manual"}
                              </Badge>
                            </TableCell>}
                            {visibleColumns.sugestoesIA && <TableCell className="p-2"></TableCell>}
                            {visibleColumns.acoes && <TableCell className="p-2">
                              <Button variant="ghost" size="sm" className="text-xs h-7">
                                Usar este
                              </Button>
                            </TableCell>}
                          </TableRow>
                        ))}

                        {isExpanded && mappings.length === 0 && (
                          <TableRow className="bg-muted/20">
                            {visibleColumns.expand && <TableCell className="sticky left-0 z-10 bg-muted/20 p-1"></TableCell>}
                            {visibleColumns.select && <TableCell className="sticky left-[40px] z-10 bg-muted/20 p-1"></TableCell>}
                            {visibleColumns.numero && <TableCell className="sticky left-[80px] z-10 bg-muted/20 p-1"></TableCell>}
                            {visibleColumns.descricao && <TableCell className="sticky left-[150px] z-10 bg-muted/20 pl-10 p-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <AlertCircle className="h-3 w-3" />
                                <span>Nenhum mapeamento anterior</span>
                              </div>
                            </TableCell>}
                            {visibleColumns.codigo && <TableCell></TableCell>}
                            {visibleColumns.vinculo && <TableCell></TableCell>}
                            {visibleColumns.unidadeInterna && <TableCell></TableCell>}
                            {visibleColumns.quantidade && <TableCell></TableCell>}
                            {visibleColumns.preco && <TableCell></TableCell>}
                            {visibleColumns.desconto && <TableCell></TableCell>}
                            {visibleColumns.total && <TableCell></TableCell>}
                            {visibleColumns.status && <TableCell></TableCell>}
                            {visibleColumns.sugestoesIA && <TableCell></TableCell>}
                            <TableCell colSpan={1} className="text-center text-sm text-muted-foreground py-4">
                              Nenhum mapeamento anterior encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Mostrando {paginatedItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredAndSortedItems.length)} de {filteredAndSortedItems.length} itens
            </span>
            {selectedItems.size > 0 && (
              <Badge variant="secondary">
                {selectedItems.size} selecionado(s)
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / página</SelectItem>
                <SelectItem value="10">10 / página</SelectItem>
                <SelectItem value="20">20 / página</SelectItem>
                <SelectItem value="50">50 / página</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3">
                Página {currentPage} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ProdutoSearchDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSelect={handleVincularProduto}
      />

      <SugestoesIADialog
        open={sugestoesDialogAberto}
        onOpenChange={setSugestoesDialogAberto}
        sugestoes={sugestoesIA.map(s => ({
          produto_id: s.produto_id,
          nome: s.descricao,
          referencia_interna: s.codigo,
          preco_venda: s.preco_venda || 0,
          unidade_medida: s.unidade_medida || '',
          quantidade_em_maos: s.estoque_disponivel || 0,
          score: s.score_final,
          motivo: s.justificativa,
          metodo: s.confianca,
        }))}
        onSelecionar={(sugestaoOld) => {
          if (currentItem) {
            // Encontrar a sugestão original
            const sugestaoOriginal = sugestoesIA.find(s => s.produto_id === sugestaoOld.produto_id);
            if (sugestaoOriginal) {
              handleAceitarSugestaoInline(currentItem, sugestaoOriginal);
            }
            setSugestoesDialogAberto(false);
          }
        }}
        onBuscarManual={() => {
          setSugestoesDialogAberto(false);
          setDialogAberto(true);
        }}
        itemCliente={currentItem ? {
          descricao: currentItem.descricao_produto_cliente,
          quantidade: currentItem.quantidade_solicitada,
          unidade_medida: currentItem.unidade_medida,
        } : undefined}
      />

      {sugestaoParaFeedback && (
        <FeedbackIADialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          itemId={sugestaoParaFeedback.item.id}
          sugestao={sugestaoParaFeedback.sugestao}
        />
      )}
    </>
  );
}
