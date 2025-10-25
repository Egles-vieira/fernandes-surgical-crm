import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Package, Sparkles, Save } from "lucide-react";
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
import { ProdutoSearchDialog } from "./ProdutoSearchDialog";
import { SugestoesIADialog } from "./SugestoesIADialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EDIProdutoVinculo } from "@/hooks/useEDIProdutosVinculo";

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
  const [sugestoesIA, setSugestoesIA] = useState<any[]>([]);
  const [itemsData, setItemsData] = useState<Map<string, any>>(new Map());
  const [previousMappings, setPreviousMappings] = useState<Map<string, EDIProdutoVinculo[]>>(new Map());

  useEffect(() => {
    // Inicializar dados dos itens
    const initialData = new Map();
    itens.forEach(item => {
      initialData.set(item.id, {
        produtoVinculado: item.produtos || null,
        quantidade: item.quantidade_respondida || item.quantidade_solicitada,
        precoUnitario: item.preco_unitario_respondido || 0,
        desconto: item.percentual_desconto || 0,
        isLoading: false,
      });
    });
    setItemsData(initialData);
  }, [itens]);

  const toggleRow = async (itemId: string, codigoCliente: string) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      
      // Carregar mapeamentos anteriores se ainda não carregados
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
          limite: 5,
        },
      });

      if (response.error) throw response.error;

      const sugestoes = response.data?.sugestoes || [];
      
      if (sugestoes.length > 0) {
        setSugestoesIA(sugestoes);
        setCurrentItemId(item.id);
        setSugestoesDialogAberto(true);
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

  const handleSelecionarSugestao = (sugestao: any) => {
    if (!currentItemId) return;

    const produtoSugerido = {
      id: sugestao.produto_id,
      nome: sugestao.nome,
      referencia_interna: sugestao.referencia_interna,
      preco_venda: sugestao.preco_venda,
      quantidade_em_maos: sugestao.quantidade_em_maos,
      unidade_medida: sugestao.unidade_medida
    };
    
    const newData = new Map(itemsData);
    const currentData = newData.get(currentItemId) || {};
    
    newData.set(currentItemId, {
      ...currentData,
      produtoVinculado: produtoSugerido,
      precoUnitario: sugestao.preco_venda || 0,
    });
    
    setItemsData(newData);
    
    toast({
      title: "Produto vinculado",
      description: `${sugestao.nome} (${sugestao.score}% compatibilidade)`,
    });
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

      const { error } = await supabase
        .from("edi_cotacoes_itens")
        .update({
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

      toast({
        title: "Item salvo",
        description: "As informações foram atualizadas com sucesso.",
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

  const updateItemField = (itemId: string, field: string, value: any) => {
    const newData = new Map(itemsData);
    const currentData = newData.get(itemId) || {};
    newData.set(itemId, { ...currentData, [field]: value });
    setItemsData(newData);
  };

  const getValorTotal = (itemId: string) => {
    const data = itemsData.get(itemId);
    if (!data) return 0;
    return data.quantidade * data.precoUnitario * (1 - data.desconto / 100);
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[50px]">
                <Checkbox />
              </TableHead>
              <TableHead className="w-[80px]">Item Nº</TableHead>
              <TableHead className="min-w-[200px]">Descrição Cliente</TableHead>
              <TableHead className="w-[120px]">Cód. Cliente</TableHead>
              <TableHead className="min-w-[200px]">Produto Vinculado</TableHead>
              <TableHead className="w-[100px]">Qtd.</TableHead>
              <TableHead className="w-[120px]">Preço Unit.</TableHead>
              <TableHead className="w-[100px]">Desc. %</TableHead>
              <TableHead className="w-[120px]">Total</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[200px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((item) => {
              const isExpanded = expandedRows.has(item.id);
              const isSelected = selectedItems.has(item.id);
              const data = itemsData.get(item.id);
              const mappings = previousMappings.get(item.id) || [];

              return (
                <>
                  {/* Linha Principal */}
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="font-medium">{item.numero_item}</TableCell>
                    <TableCell className="font-medium">{item.descricao_produto_cliente}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.codigo_produto_cliente || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentItemId(item.id);
                            setDialogAberto(true);
                          }}
                        >
                          <Package className="h-3 w-3" />
                        </Button>
                        {data?.produtoVinculado ? (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium">{data.produtoVinculado.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                Ref: {data.produtoVinculado.referencia_interna}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={data?.quantidade || 0}
                        onChange={(e) => updateItemField(item.id, "quantidade", Number(e.target.value))}
                        className="w-20 h-8"
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={data?.precoUnitario || 0}
                        onChange={(e) => updateItemField(item.id, "precoUnitario", Number(e.target.value))}
                        className="w-24 h-8"
                        min={0}
                        step={0.01}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={data?.desconto || 0}
                        onChange={(e) => updateItemField(item.id, "desconto", Number(e.target.value))}
                        className="w-20 h-8"
                        min={0}
                        max={100}
                        step={0.01}
                      />
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(getValorTotal(item.id))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === "respondido" ? "default" : "secondary"}>
                        {item.status === "respondido" ? "Respondido" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAnalisarIA(item)}
                          disabled={data?.isLoading}
                        >
                          <Sparkles className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSalvar(item)}
                          disabled={data?.isLoading || !data?.produtoVinculado}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Linhas Expandidas - Mapeamentos Anteriores */}
                  {isExpanded && mappings.length > 0 && mappings.map((mapping) => (
                    <TableRow
                      key={mapping.id}
                      className="bg-muted/20 hover:bg-muted/40 cursor-pointer"
                      onClick={() => handleSelectPreviousMapping(item.id, mapping)}
                    >
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell colSpan={3} className="pl-12">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>Mapeamento anterior</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{mapping.produtos?.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              Ref: {mapping.produtos?.referencia_interna}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">-</TableCell>
                      <TableCell className="text-sm font-medium">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(mapping.produtos?.preco_venda || 0)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {mapping.desconto_padrao || 0}%
                      </TableCell>
                      <TableCell className="text-sm">-</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {mapping.sugerido_por_ia ? "IA" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Usar este
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {isExpanded && mappings.length === 0 && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-4">
                        Nenhum mapeamento anterior encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProdutoSearchDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSelect={handleVincularProduto}
      />

      <SugestoesIADialog
        open={sugestoesDialogAberto}
        onOpenChange={setSugestoesDialogAberto}
        sugestoes={sugestoesIA}
        onSelecionar={handleSelecionarSugestao}
        onBuscarManual={() => {
          setSugestoesDialogAberto(false);
          setDialogAberto(true);
        }}
      />
    </>
  );
}
