import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { Search, Save, Trash2, Calculator, Loader2, ChevronLeft, ChevronRight, GripVertical, Edit } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useVendaDetalhes } from "@/hooks/useVendaDetalhes";
import { useCondicoesPagamento } from "@/hooks/useCondicoesPagamento";
import { useTiposFrete } from "@/hooks/useTiposFrete";
import { useTiposPedido } from "@/hooks/useTiposPedido";
import { useVendedores } from "@/hooks/useVendedores";
import { useDatasulCalculaPedido } from "@/hooks/useDatasulCalculaPedido";
import { useDatasulCalculaFrete } from "@/hooks/useDatasulCalculaFrete";
import { useContatosCliente } from "@/hooks/useContatosCliente";
import { useEnderecosCliente } from "@/hooks/useEnderecosCliente";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { useUserRole } from "@/hooks/useUserRole";
import { useEmpresa } from "@/hooks/useEmpresa";
import { ProdutoSearchDialog } from "@/components/ProdutoSearchDialog";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { VendasActionBar } from "@/components/VendasActionBar";
import { FunnelStagesBar } from "@/components/vendas/FunnelStagesBar";
import { AprovarVendaDialog } from "@/components/vendas/AprovarVendaDialog";
import { IntegracaoDatasulLog } from "@/components/IntegracaoDatasulLog";
import { DatasulErrorDialog } from "@/components/vendas/DatasulErrorDialog";
import { EditarItemVendaDialog } from "@/components/vendas/EditarItemVendaDialog";
import { SortableItemRow } from "@/components/vendas/SortableItemRow";
import { SelecionarFreteDialog, TransportadoraOption } from "@/components/vendas/SelecionarFreteDialog";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
type Produto = Tables<"produtos">;
type Cliente = Tables<"clientes">;
interface VendaWithItems extends Tables<"vendas"> {
  vendas_itens?: (Tables<"vendas_itens"> & {
    produtos?: Produto;
  })[];
}
// ID do tipo de frete "CIF - INCLUSÃO NA NF"
const TIPO_FRETE_CIF_INCLUSO_NF = "d691ff67-c6d5-47eb-a714-8af30e191b57";

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  desconto: number;
  valor_total: number;
  datasul_dep_exp?: number | null;
  datasul_custo?: number | null;
  datasul_divisao?: number | null;
  datasul_vl_tot_item?: number | null;
  datasul_vl_merc_liq?: number | null;
  datasul_lote_mulven?: number | null;
  frete_rateado?: number;
}

// Função para calcular rateio de frete proporcional ao valor de cada item
const calcularRateioFrete = (itens: ItemCarrinho[], freteTotal: number): ItemCarrinho[] => {
  if (freteTotal <= 0 || itens.length === 0) {
    return itens.map(item => ({ ...item, frete_rateado: 0 }));
  }

  // Calcular valor total das mercadorias (sem frete)
  const valorTotalMercadorias = itens.reduce((sum, item) => sum + item.valor_total, 0);

  if (valorTotalMercadorias <= 0) {
    return itens.map(item => ({ ...item, frete_rateado: 0 }));
  }

  // Calcular frete proporcional para cada item
  let somaFreteRateado = 0;
  const itensComFrete = itens.map((item) => {
    const freteItem = Math.round((freteTotal * (item.valor_total / valorTotalMercadorias)) * 100) / 100;
    somaFreteRateado += freteItem;
    return {
      ...item,
      frete_rateado: freteItem
    };
  });

  // Ajustar diferença de centavos no item de maior valor
  const diferencaCentavos = Math.round((freteTotal - somaFreteRateado) * 100) / 100;

  if (diferencaCentavos !== 0) {
    // Encontrar índice do item de maior valor
    const indexMaiorValor = itensComFrete.reduce(
      (maxIndex, item, index, arr) =>
        item.valor_total > arr[maxIndex].valor_total ? index : maxIndex,
      0
    );

    itensComFrete[indexMaiorValor].frete_rateado = 
      (itensComFrete[indexMaiorValor].frete_rateado || 0) + diferencaCentavos;
  }

  return itensComFrete;
};

// Função auxiliar para formatar valores monetários no padrão brasileiro
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};
export default function VendaDetalhes() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    venda: vendaCarregada,
    isLoading,
    addItem,
    updateVenda,
    updateItem,
    removeItem,
    updateItemsSequence,
    aprovarVenda
  } = useVendaDetalhes({ vendaId: id || null });
  const {
    condicoes
  } = useCondicoesPagamento();
  const {
    tipos: tiposFrete
  } = useTiposFrete();
  const {
    tipos: tiposPedido
  } = useTiposPedido();
  const {
    vendedores
  } = useVendedores();
  const {
    calcularPedido,
    isCalculating,
    errorData,
    showErrorDialog,
    closeErrorDialog
  } = useDatasulCalculaPedido();
  const {
    calcularFrete,
    confirmarFrete,
    isCalculatingFrete,
    isConfirmingFrete,
    freteErrorData,
    showFreteErrorDialog,
    closeFreteErrorDialog,
    transportadoras,
    showSelectionDialog,
    setShowSelectionDialog
  } = useDatasulCalculaFrete();
  const {
    data: userRoleData
  } = useUserRole();
  const isAdmin = userRoleData?.isAdmin || false;
  const {
    toast
  } = useToast();
  const {
    empresa
  } = useEmpresa();
  
  // Estado para guardar o cliente_id para buscar contatos e endereços
  const [contatoClienteId, setContatoClienteId] = useState<string | null>(null);
  const { contatos: contatosCliente } = useContatosCliente(contatoClienteId);
  const { enderecos: enderecosCliente, isLoading: isLoadingEnderecos } = useEnderecosCliente(contatoClienteId);
  
  const {
    visibleColumns,
    toggleColumn
  } = useColumnVisibility("vendas_itens_columns", {
    precoTabela: true,
    precoUnit: true,
    desconto: true,
    total: true,
    freteRateado: true,
    custo: true,
    divisao: true,
    vlTotalDS: true,
    vlMercLiq: true,
    loteMult: true,
    deposito: true
  });
  const [venda, setVenda] = useState<VendaWithItems | null>(null);
  const [showProdutoSearch, setShowProdutoSearch] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [showAprovarDialog, setShowAprovarDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showEditarItem, setShowEditarItem] = useState(false);
  const [itemEditando, setItemEditando] = useState<ItemCarrinho | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [isLoadingCliente, setIsLoadingCliente] = useState(false);
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  const [numeroVenda, setNumeroVenda] = useState("");
  const [tipoFreteId, setTipoFreteId] = useState<string>("");
  const [tipoPedidoId, setTipoPedidoId] = useState<string>("");
  const [condicaoPagamentoId, setCondicaoPagamentoId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [valorEstimado, setValorEstimado] = useState<number>(0);
  const [probabilidade, setProbabilidade] = useState<number>(50);
  const [origemLead, setOrigemLead] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [validadeProposta, setValidadeProposta] = useState<string>("");
  const [faturamentoParcial, setFaturamentoParcial] = useState(false);
  const [dataFaturamentoProgramado, setDataFaturamentoProgramado] = useState<string>("");
  const [enderecoEntregaId, setEnderecoEntregaId] = useState<string>("");
  const [freteCalculado, setFreteCalculado] = useState(false);
  const [valorFrete, setValorFrete] = useState<number>(0);

  // Pagination states for items table
  const [currentItemsPage, setCurrentItemsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchItemTerm, setSearchItemTerm] = useState("");
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">("normal");

  // Drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  // Carregar venda quando os dados chegarem do hook
  useEffect(() => {
    const loadVendaData = async () => {
      if (vendaCarregada) {
        // Só mostrar loading na carga inicial, não em refreshes
        const isInitialLoad = !isLoadingComplete && !venda;
        if (isInitialLoad) {
          setIsLoadingComplete(false);
        }
        
        setVenda(vendaCarregada as VendaWithItems);
        setNumeroVenda(vendaCarregada.numero_venda || "");
        setTipoFreteId(vendaCarregada.tipo_frete_id || "");
        setTipoPedidoId(vendaCarregada.tipo_pedido_id || "");
        setCondicaoPagamentoId(vendaCarregada.condicao_pagamento_id || "");
        setObservacoes(vendaCarregada.observacoes || "");
        setValorEstimado(vendaCarregada.valor_estimado || 0);
        setProbabilidade(vendaCarregada.probabilidade || 50);
        setOrigemLead(vendaCarregada.origem_lead || "");
        setResponsavelId(vendaCarregada.responsavel_id || "");
        setValidadeProposta(vendaCarregada.validade_proposta || "");
        setFaturamentoParcial(vendaCarregada.faturamento_parcial === "YES");
        setDataFaturamentoProgramado((vendaCarregada as any).data_faturamento_programado || "");
        setEnderecoEntregaId((vendaCarregada as any).endereco_entrega_id || "");
        setFreteCalculado((vendaCarregada as any).frete_calculado || false);
        setValorFrete((vendaCarregada as any).frete_valor || 0);

        // Carregar cliente apenas na carga inicial
        if (vendaCarregada.cliente_id && isInitialLoad) {
          setIsLoadingCliente(true);
          setContatoClienteId(vendaCarregada.cliente_id);
          const {
            data
          } = await supabase.from("clientes").select("*").eq("id", vendaCarregada.cliente_id).single();
          if (data) setClienteSelecionado(data);
          setIsLoadingCliente(false);
        } else if (vendaCarregada.cliente_id && !contatoClienteId) {
          setContatoClienteId(vendaCarregada.cliente_id);
        }

        // Carregar itens no carrinho - SEMPRE ordenados pela sequência
        if (vendaCarregada.vendas_itens) {
          const itensOrdenados = [...vendaCarregada.vendas_itens].sort((a, b) => (a.sequencia_item || 0) - (b.sequencia_item || 0));
          const itens = itensOrdenados.map(item => ({
            produto: item.produtos!,
            quantidade: item.quantidade,
            desconto: item.desconto,
            valor_total: item.valor_total,
            datasul_dep_exp: item.datasul_dep_exp,
            datasul_custo: item.datasul_custo,
            datasul_divisao: item.datasul_divisao,
            datasul_vl_tot_item: item.datasul_vl_tot_item,
            datasul_vl_merc_liq: item.datasul_vl_merc_liq,
            datasul_lote_mulven: item.datasul_lote_mulven,
            frete_rateado: (item as any).frete_rateado || 0
          }));
          setCarrinho(itens);
        }
        
        if (!isLoadingComplete) {
          setIsLoadingComplete(true);
        }
      } else if (!isLoading && id && !vendaCarregada) {
        toast({
          title: "Venda não encontrada",
          variant: "destructive"
        });
        navigate("/vendas");
      }
    };
    loadVendaData();
  }, [vendaCarregada, isLoading, id, navigate, toast]);
  const valorTotal = useMemo(() => {
    return carrinho.reduce((sum, item) => sum + item.valor_total, 0);
  }, [carrinho]);
  const valorTotalLiquido = useMemo(() => {
    return carrinho.reduce((sum, item) => sum + (item.datasul_vl_merc_liq || 0), 0);
  }, [carrinho]);

  // Verificar se é CIF Incluso na NF e calcular rateio de frete
  const ehCifInclusoNaNF = tipoFreteId === TIPO_FRETE_CIF_INCLUSO_NF;
  
  const carrinhoComFrete = useMemo(() => {
    if (!ehCifInclusoNaNF || !freteCalculado || valorFrete <= 0) {
      return carrinho.map(item => ({ ...item, frete_rateado: 0 }));
    }
    return calcularRateioFrete(carrinho, valorFrete);
  }, [carrinho, ehCifInclusoNaNF, freteCalculado, valorFrete]);

  // Valor total com frete (para CIF Incluso)
  const valorTotalComFrete = useMemo(() => {
    if (ehCifInclusoNaNF && freteCalculado) {
      return valorTotal + valorFrete;
    }
    return valorTotal;
  }, [valorTotal, valorFrete, ehCifInclusoNaNF, freteCalculado]);
  const handleAdicionarProduto = (produto: Produto) => {
    // Validar se produto tem preço
    if (!produto.preco_venda || produto.preco_venda <= 0) {
      toast({
        title: "Produto sem preço",
        description: `O produto ${produto.nome} não possui preço de tabela definido. Configure o preço antes de adicionar.`,
        variant: "destructive"
      });
      return;
    }
    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    if (itemExistente) {
      const novoCarrinho = carrinho.map(item => item.produto.id === produto.id ? {
        ...item,
        quantidade: item.quantidade + 1,
        valor_total: (item.quantidade + 1) * produto.preco_venda * (1 - item.desconto / 100)
      } : item);
      setCarrinho(novoCarrinho);
    } else {
      setCarrinho([...carrinho, {
        produto,
        quantidade: 1,
        desconto: 0,
        valor_total: produto.preco_venda
      }]);
    }
    setShowProdutoSearch(false);
  };
  const handleRemoverItem = async (produtoId: string) => {
    if (!venda) return;
    const item = venda.vendas_itens?.find(i => i.produto_id === produtoId);
    if (item) {
      await removeItem.mutateAsync(item.id);
    }
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };
  const handleAtualizarItem = async (produtoId: string, campo: string, valor: any) => {
    const novoCarrinho = carrinho.map(item => {
      if (item.produto.id === produtoId) {
        const novoItem = {
          ...item,
          [campo]: valor
        };
        if (campo === 'quantidade' || campo === 'desconto') {
          novoItem.valor_total = novoItem.quantidade * item.produto.preco_venda * (1 - novoItem.desconto / 100);
        }

        // Atualizar no banco se a venda já existe
        if (venda) {
          const itemVenda = venda.vendas_itens?.find(i => i.produto_id === produtoId);
          if (itemVenda) {
            updateItem.mutateAsync({
              id: itemVenda.id,
              quantidade: novoItem.quantidade,
              desconto: novoItem.desconto,
              valor_total: novoItem.valor_total
            });
          }
        }
        return novoItem;
      }
      return item;
    });
    setCarrinho(novoCarrinho);
  };
  const handleEditarItem = (item: ItemCarrinho) => {
    setItemEditando(item);
    setShowEditarItem(true);
  };
  const handleSalvarEdicaoItem = async (produtoId: string, updates: any) => {
    const novoCarrinho = carrinho.map(item => {
      if (item.produto.id === produtoId) {
        const produto = updates.produto || item.produto;
        const quantidade = updates.quantidade ?? item.quantidade;
        const desconto = updates.desconto ?? item.desconto;
        const novoItem = {
          ...item,
          produto,
          quantidade,
          desconto,
          valor_total: quantidade * produto.preco_venda * (1 - desconto / 100)
        };

        // Se mudou o produto, precisa remover o item antigo e adicionar o novo
        if (venda && updates.produto) {
          const itemVenda = venda.vendas_itens?.find(i => i.produto_id === produtoId);
          if (itemVenda) {
            // Remover item antigo
            removeItem.mutateAsync(itemVenda.id).then(() => {
              // Adicionar novo item
              addItem.mutateAsync({
                venda_id: venda.id,
                produto_id: produto.id,
                quantidade,
                preco_unitario: produto.preco_venda,
                preco_tabela: produto.preco_venda,
                desconto,
                valor_total: novoItem.valor_total,
                sequencia_item: itemVenda.sequencia_item
              });
            });
          }
        } else if (venda) {
          // Apenas atualizar quantidade/desconto
          const itemVenda = venda.vendas_itens?.find(i => i.produto_id === produtoId);
          if (itemVenda) {
            updateItem.mutateAsync({
              id: itemVenda.id,
              quantidade,
              desconto,
              valor_total: novoItem.valor_total
            });
          }
        }
        return novoItem;
      }
      return item;
    });

    // Se mudou o produto, precisa remover o item antigo do carrinho
    if (updates.produto) {
      const novoCarrinhoSemDuplicata = novoCarrinho.filter(item => item.produto.id === updates.produto.id || item.produto.id !== produtoId);
      setCarrinho(novoCarrinhoSemDuplicata);
    } else {
      setCarrinho(novoCarrinho);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = carrinho.findIndex(item => item.produto.id === active.id);
    const newIndex = carrinho.findIndex(item => item.produto.id === over.id);
    const reorderedCarrinho = arrayMove(carrinho, oldIndex, newIndex);
    setCarrinho(reorderedCarrinho);

    // Atualizar sequência no banco
    if (venda?.vendas_itens) {
      const updates = reorderedCarrinho.map((item, index) => {
        const itemVenda = venda.vendas_itens?.find(i => i.produto_id === item.produto.id);
        return {
          id: itemVenda?.id || '',
          sequencia_item: index + 1
        };
      }).filter(u => u.id);
      updateItemsSequence.mutate(updates);
    }
  };
  const handleSelecionarCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setContatoClienteId(cliente.id);
    setEnderecoEntregaId(""); // Reset ao trocar cliente
    setFreteCalculado(false); // Reset frete ao trocar cliente
    setValorFrete(0);
    setShowClienteSearch(false);
  };
  const handleSalvar = async () => {
    // Validar campos obrigatórios
    const camposObrigatorios = [];
    if (!clienteSelecionado) camposObrigatorios.push("Cliente");
    if (!tipoPedidoId) camposObrigatorios.push("Tipo de Pedido");
    if (!condicaoPagamentoId) camposObrigatorios.push("Condição de Pagamento");
    if (carrinho.length === 0) camposObrigatorios.push("Itens");
    if (camposObrigatorios.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha: ${camposObrigatorios.join(", ")}`,
        variant: "destructive"
      });
      return;
    }
    if (!venda) return;
    try {
      // Atualizar venda
      await updateVenda.mutateAsync({
        id: venda.id,
        cliente_id: clienteSelecionado.id,
        cliente_nome: clienteSelecionado.nome_emit || clienteSelecionado.nome_abrev || "Cliente",
        cliente_cnpj: clienteSelecionado.cgc || "",
        numero_venda: numeroVenda,
        tipo_frete_id: tipoFreteId || null,
        tipo_pedido_id: tipoPedidoId || null,
        condicao_pagamento_id: condicaoPagamentoId || null,
        observacoes,
        valor_total: valorTotal,
        valor_estimado: valorEstimado,
        probabilidade,
        origem_lead: origemLead,
        responsavel_id: responsavelId || null,
        validade_proposta: validadeProposta || null,
        faturamento_parcial: faturamentoParcial ? "YES" : "NO",
        data_faturamento_programado: dataFaturamentoProgramado || null,
        endereco_entrega_id: enderecoEntregaId || null
      } as any);

      // Adicionar novos itens com sequencia_item
      // Calcular a próxima sequência disponível baseado nos itens ATUAIS
      const maxSequencia = Math.max(0, ...(venda.vendas_itens?.map(i => i.sequencia_item || 0) || []));
      let sequenciaAtual = maxSequencia + 1;
      for (const item of carrinho) {
        const itemExistente = venda.vendas_itens?.find(i => i.produto_id === item.produto.id);
        if (!itemExistente) {
          await addItem.mutateAsync({
            venda_id: venda.id,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            preco_tabela: item.produto.preco_venda,
            desconto: item.desconto,
            valor_total: item.valor_total,
            sequencia_item: sequenciaAtual++
          });
        }
      }

      // Se é CIF Incluso na NF e tem frete calculado, persistir o frete rateado
      if (ehCifInclusoNaNF && freteCalculado && valorFrete > 0) {
        const itensComFreteRateado = calcularRateioFrete(carrinho, valorFrete);
        for (const item of itensComFreteRateado) {
          const itemVenda = venda.vendas_itens?.find(i => i.produto_id === item.produto.id);
          if (itemVenda && item.frete_rateado !== undefined) {
            await updateItem.mutateAsync({
              id: itemVenda.id,
              frete_rateado: item.frete_rateado
            });
          }
        }
      }

      toast({
        title: "Venda atualizada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a venda",
        variant: "destructive"
      });
    }
  };
  const handleCalcularDatasul = async () => {
    // Validar campos obrigatórios antes de calcular
    const camposObrigatorios = [];
    if (!venda) camposObrigatorios.push("Venda");
    if (!clienteSelecionado) camposObrigatorios.push("Cliente");
    if (!tipoPedidoId) camposObrigatorios.push("Tipo de Pedido");
    if (!condicaoPagamentoId) camposObrigatorios.push("Condição de Pagamento");
    if (carrinho.length === 0) camposObrigatorios.push("Itens");
    if (camposObrigatorios.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha: ${camposObrigatorios.join(", ")} antes de calcular`,
        variant: "destructive"
      });
      return;
    }
    try {
      // Salvar automaticamente antes de calcular
      toast({
        title: "Salvando proposta...",
        description: "Salvando alterações antes de calcular no Datasul"
      });

      // Atualizar venda
      await updateVenda.mutateAsync({
        id: venda.id,
        cliente_id: clienteSelecionado.id,
        numero_venda: numeroVenda,
        tipo_frete_id: tipoFreteId || null,
        tipo_pedido_id: tipoPedidoId || null,
        condicao_pagamento_id: condicaoPagamentoId || null,
        observacoes,
        valor_total: valorTotal,
        valor_estimado: valorEstimado,
        probabilidade,
        origem_lead: origemLead,
        responsavel_id: responsavelId || null,
        validade_proposta: validadeProposta || null,
        faturamento_parcial: faturamentoParcial ? "YES" : "NO",
        data_faturamento_programado: dataFaturamentoProgramado || null
      } as any);

      // Adicionar novos itens com sequencia_item
      // Calcular a próxima sequência disponível baseado nos itens ATUAIS
      const maxSequencia = Math.max(0, ...(venda.vendas_itens?.map(i => i.sequencia_item || 0) || []));
      let sequenciaAtual = maxSequencia + 1;
      for (const item of carrinho) {
        const itemExistente = venda.vendas_itens?.find(i => i.produto_id === item.produto.id);
        if (!itemExistente) {
          await addItem.mutateAsync({
            venda_id: venda.id,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            preco_tabela: item.produto.preco_venda,
            desconto: item.desconto,
            valor_total: item.valor_total,
            sequencia_item: sequenciaAtual++
          });
        }
      }

      // Agora calcular no Datasul
      await calcularPedido(venda.id);
      toast({
        title: "Cálculo iniciado",
        description: "Proposta salva e cálculo no Datasul iniciado com sucesso!"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao calcular",
        description: error.message || "Ocorreu um erro ao iniciar o cálculo",
        variant: "destructive"
      });
    }
  };

  const handleCalcularFrete = async () => {
    if (!venda) return;
    
    // Validar campos obrigatórios para cálculo de frete
    const camposObrigatorios = [];
    if (!clienteSelecionado) camposObrigatorios.push("Cliente");
    if (!tipoFreteId) camposObrigatorios.push("Tipo de Frete");
    if (!enderecoEntregaId) camposObrigatorios.push("Endereço de Entrega");
    if (carrinho.length === 0) camposObrigatorios.push("Itens");
    
    if (camposObrigatorios.length > 0) {
      toast({
        title: "Campos obrigatórios para cálculo de frete",
        description: `Por favor, preencha: ${camposObrigatorios.join(", ")}`,
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Salvar antes de calcular frete
      await handleSalvar();
      
      // Calcular frete - abre o modal de seleção de transportadora
      await calcularFrete(venda.id);
    } catch (error: any) {
      toast({
        title: "Erro ao calcular frete",
        description: error.message || "Ocorreu um erro ao calcular o frete",
        variant: "destructive"
      });
    }
  };

  // Confirmar seleção de transportadora
  const handleConfirmarFrete = async (transportadora: TransportadoraOption) => {
    if (!venda) return;
    
    const resultado = await confirmarFrete(venda.id, transportadora);
    
    if (resultado?.success) {
      setFreteCalculado(true);
      setValorFrete(resultado.valor_frete || 0);
      
      // Salvar proposta automaticamente após confirmar frete
      await handleSalvar();
    }
  };

  if (isLoading || !venda || !isLoadingComplete || isLoadingCliente) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-background">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-24 w-24 border-4 border-primary/20 border-t-primary mx-auto"></div>
            {empresa?.url_logo && <img src={empresa.url_logo} alt="Logo" className="absolute inset-0 m-auto h-12 w-12 object-contain" />}
          </div>
          <p className="mt-6 text-muted-foreground font-medium">Carregando proposta...</p>
        </div>
      </div>;
  }
  return <div>
      {/* Barras sticky sem espaçamento entre elas */}
      <VendasActionBar 
        status={venda.status as "rascunho" | "aprovada" | "cancelada"} 
        onCalcular={handleCalcularDatasul} 
        onCancelar={() => {
          toast({
            title: "Cancelar proposta",
            description: "Funcionalidade em desenvolvimento"
          });
        }} 
        onDiretoria={() => {
          toast({
            title: "Enviar para diretoria",
            description: "Funcionalidade em desenvolvimento"
          });
        }} 
        onEfetivar={() => setShowAprovarDialog(true)} 
        onSalvar={handleSalvar} 
        isSaving={false} 
        isCalculating={isCalculating} 
        editandoVendaId={venda.id} 
        onVoltar={() => navigate("/vendas")} 
        numeroVenda={numeroVenda || "Nova"} 
        etapaPipeline={venda.etapa_pipeline || undefined} 
        className="py-[5px]"
        freteCalculado={freteCalculado}
        onCalcularFrete={handleCalcularFrete}
        isCalculatingFrete={isCalculatingFrete}
        valorFrete={valorFrete}
      />

      <FunnelStagesBar etapaAtual={venda.etapa_pipeline as any || "proposta"} onEtapaClick={async novaEtapa => {
      try {
        await updateVenda.mutateAsync({
          id: venda.id,
          etapa_pipeline: novaEtapa
        });
        toast.success(`Etapa alterada para ${novaEtapa}`);
      } catch (error) {
        toast.error("Erro ao alterar etapa");
      }
    }} camposEtapa={[{
      label: "Status",
      value: venda.status || null
    }, {
      label: "Data Prevista",
      value: venda.data_fechamento_prevista ? new Date(venda.data_fechamento_prevista).toLocaleDateString('pt-BR') : null
    }, {
      label: "Probabilidade",
      value: venda.probabilidade ? `${venda.probabilidade}%` : null
    }, {
      label: "Valor Estimado",
      value: venda.valor_estimado ? formatCurrency(venda.valor_estimado) : null
    }, {
      label: "Contato Responsável",
      value: null,
      type: "select" as const,
      options: contatosCliente.map(c => ({
        id: c.id,
        nome_completo: c.nome_completo,
        cargo: c.cargo
      })),
      selectedId: venda.responsavel_id || null,
      onSelect: async (contatoId: string) => {
        try {
          await updateVenda.mutateAsync({
            id: venda.id,
            responsavel_id: contatoId
          });
          setResponsavelId(contatoId);
          toast.success("Contato responsável atualizado");
        } catch (error) {
          toast.error("Erro ao atualizar contato responsável");
        }
      }
    }]} onEditarCampos={() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }} />

      {/* Conteúdo com espaçamento */}
      <div className="space-y-6 mt-6">
        <Card className="p-6 mx-[10px]">
        <div className="space-y-6">
          {/* Cliente */}
          <div>
            <Label>Cliente *</Label>
            {clienteSelecionado ? <div className="flex items-center gap-2 p-3 border rounded-md mt-2">
                <div className="flex-1">
                  <p className="font-medium">{clienteSelecionado.nome_emit}</p>
                  <p className="text-sm text-muted-foreground">{clienteSelecionado.cgc}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowClienteSearch(true)}>
                  Trocar
                </Button>
              </div> : <Button variant="outline" className="w-full mt-2" onClick={() => setShowClienteSearch(true)}>
                <Search className="h-4 w-4 mr-2" />
                Buscar Cliente
              </Button>}
          </div>

          {/* Endereço de Entrega */}
          {clienteSelecionado && (
            <div>
              <Label>Endereço de Entrega</Label>
              <Select 
                value={enderecoEntregaId} 
                onValueChange={(value) => {
                  setEnderecoEntregaId(value);
                  setFreteCalculado(false);
                  setValorFrete(0);
                }}
                disabled={isLoadingEnderecos}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={
                    isLoadingEnderecos 
                      ? "Carregando endereços..." 
                      : enderecosCliente.length === 0 
                        ? "Nenhum endereço cadastrado" 
                        : "Selecione o endereço..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {enderecosCliente.map(endereco => (
                    <SelectItem key={endereco.id} value={endereco.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {endereco.is_principal && "⭐ "}
                          {endereco.endereco}
                          {endereco.tipo === "entrega" && " (Entrega)"}
                          {endereco.tipo === "cobranca" && " (Cobrança)"}
                          {endereco.tipo === "principal" && " (Principal)"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {endereco.bairro}, {endereco.cidade}/{endereco.estado} - CEP: {endereco.cep}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Dados da Venda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Frete</Label>
              <Select value={tipoFreteId} onValueChange={(value) => {
                setTipoFreteId(value);
                setFreteCalculado(false);
                setValorFrete(0);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposFrete?.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={!tipoPedidoId ? "text-destructive" : ""}>
                Tipo de Pedido *
              </Label>
              <Select value={tipoPedidoId} onValueChange={setTipoPedidoId}>
                <SelectTrigger className={!tipoPedidoId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposPedido?.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={!condicaoPagamentoId ? "text-destructive" : ""}>
                Condição de Pagamento *
              </Label>
              <Select value={condicaoPagamentoId} onValueChange={setCondicaoPagamentoId}>
                <SelectTrigger className={!condicaoPagamentoId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {condicoes?.map(cond => <SelectItem key={cond.id} value={cond.id}>
                      {cond.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Validade da Proposta</Label>
              <Input type="date" value={validadeProposta} onChange={e => setValidadeProposta(e.target.value)} />
            </div>

            <div>
              <Label>Faturamento Programado</Label>
              <Input type="date" value={dataFaturamentoProgramado} onChange={e => setDataFaturamentoProgramado(e.target.value)} />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="faturamento-parcial" checked={faturamentoParcial} onCheckedChange={setFaturamentoParcial} />
              <Label htmlFor="faturamento-parcial">Faturamento Parcial</Label>
            </div>
          </div>

          <Separator />

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Itens da Venda *</Label>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar item..." value={searchItemTerm} onChange={e => setSearchItemTerm(e.target.value)} className="pl-8 w-[200px]" />
                </div>
                
                <Select value={density} onValueChange={(value: "compact" | "normal" | "comfortable") => setDensity(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacta</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="comfortable">Confortável</SelectItem>
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      Colunas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      {Object.entries(visibleColumns).map(([key, visible]) => <div key={key} className="flex items-center space-x-2">
                          <Checkbox checked={visible} onCheckedChange={() => toggleColumn(key)} />
                          <label className="text-sm">{key}</label>
                        </div>)}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={() => setShowProdutoSearch(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-auto h-[600px] relative">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <Table disableWrapper={true} className={cn("w-full caption-bottom text-sm", density === "compact" ? "text-xs" : density === "comfortable" ? "text-base" : "")}>
                  <TableHeader className="sticky top-0 z-20 bg-background border-b shadow-sm">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className={`w-12 ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}`}></TableHead>
                      <TableHead className={`w-12 ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}`}>#</TableHead>
                      <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Produto</TableHead>
                      {visibleColumns.precoTabela && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Preço Tabela</TableHead>}
                      {visibleColumns.loteMult && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Lote Mult</TableHead>}
                      <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Qtd</TableHead>
                      {visibleColumns.desconto && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Desc %</TableHead>}
                      {visibleColumns.precoUnit && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Preço Unit</TableHead>}
                      {visibleColumns.total && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Total</TableHead>}
                      {visibleColumns.freteRateado && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Frete</TableHead>}
                      {visibleColumns.deposito && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Estoque</TableHead>}
                      {visibleColumns.custo && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Custo DS</TableHead>}
                      {visibleColumns.divisao && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Divisão DS</TableHead>}
                      {visibleColumns.vlTotalDS && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Vlr Tot DS</TableHead>}
                      {visibleColumns.vlMercLiq && <TableHead className={density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}>Vlr Merc Liq</TableHead>}
                      <TableHead className={`w-24 ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"}`}></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext items={carrinhoComFrete.filter(item => {
                    if (!searchItemTerm) return true;
                    const searchLower = searchItemTerm.toLowerCase();
                    return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
                  }).slice((currentItemsPage - 1) * itemsPerPage, currentItemsPage * itemsPerPage).map(item => item.produto.id)} strategy={verticalListSortingStrategy}>
                      {carrinhoComFrete.filter(item => {
                      if (!searchItemTerm) return true;
                      const searchLower = searchItemTerm.toLowerCase();
                      return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
                    }).slice((currentItemsPage - 1) * itemsPerPage, currentItemsPage * itemsPerPage).map((item, index) => {
                      const realIndex = (currentItemsPage - 1) * itemsPerPage + index;
                      return <SortableItemRow key={item.produto.id} item={item} index={realIndex} density={density} visibleColumns={visibleColumns} onUpdate={handleAtualizarItem} onEdit={handleEditarItem} onRemove={handleRemoverItem} />;
                    })}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>

            {/* Pagination for items */}
            {carrinho.filter(item => {
            if (!searchItemTerm) return true;
            const searchLower = searchItemTerm.toLowerCase();
            return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
          }).length > itemsPerPage && <div className="flex items-center justify-between mt-4 gap-4">
                <div className="text-sm text-muted-foreground">
                  {carrinho.filter(item => {
                if (!searchItemTerm) return true;
                const searchLower = searchItemTerm.toLowerCase();
                return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
              }).length} itens no total
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={String(itemsPerPage)} onValueChange={value => {
                setItemsPerPage(Number(value));
                setCurrentItemsPage(1);
              }}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / página</SelectItem>
                      <SelectItem value="20">20 / página</SelectItem>
                      <SelectItem value="50">50 / página</SelectItem>
                      <SelectItem value="100">100 / página</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => setCurrentItemsPage(1)} disabled={currentItemsPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronLeft className="h-4 w-4 -ml-3" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentItemsPage(currentItemsPage - 1)} disabled={currentItemsPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-3">
                      Página {currentItemsPage} de {Math.ceil(carrinho.filter(item => {
                    if (!searchItemTerm) return true;
                    const searchLower = searchItemTerm.toLowerCase();
                    return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
                  }).length / itemsPerPage) || 1}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentItemsPage(currentItemsPage + 1)} disabled={currentItemsPage === Math.ceil(carrinho.filter(item => {
                  if (!searchItemTerm) return true;
                  const searchLower = searchItemTerm.toLowerCase();
                  return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
                }).length / itemsPerPage)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentItemsPage(Math.ceil(carrinho.filter(item => {
                  if (!searchItemTerm) return true;
                  const searchLower = searchItemTerm.toLowerCase();
                  return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
                }).length / itemsPerPage))} disabled={currentItemsPage === Math.ceil(carrinho.filter(item => {
                  if (!searchItemTerm) return true;
                  const searchLower = searchItemTerm.toLowerCase();
                  return item.produto.nome.toLowerCase().includes(searchLower) || item.produto.referencia_interna.toLowerCase().includes(searchLower);
                }).length / itemsPerPage)}>
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-3" />
                    </Button>
                  </div>
                </div>
              </div>}

            <div className="sticky bottom-0 bg-card border-t border-border pt-4 pb-2 -mx-6 px-6 mt-4">
              <div className="flex justify-end gap-8">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Mercadorias</p>
                  <p className="text-2xl font-bold text-green-500">{formatCurrency(valorTotal)}</p>
                </div>
                {freteCalculado && valorFrete > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Frete</p>
                    <p className="text-2xl font-bold">{formatCurrency(valorFrete)}</p>
                  </div>
                )}
                {ehCifInclusoNaNF && freteCalculado && valorFrete > 0 ? (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total c/ Frete</p>
                    <p className="text-2xl font-bold text-green-500">{formatCurrency(valorTotalComFrete)}</p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Valor Total Líquido</p>
                    <p className="text-2xl font-bold text-green-500">{formatCurrency(valorTotalLiquido)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações adicionais..." />
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <ProdutoSearchDialog open={showProdutoSearch} onOpenChange={setShowProdutoSearch} onSelectProduto={handleAdicionarProduto} />

      <ClienteSearchDialog open={showClienteSearch} onOpenChange={setShowClienteSearch} onSelectCliente={handleSelecionarCliente} />

      {showAprovarDialog && venda && <AprovarVendaDialog open={showAprovarDialog} onOpenChange={setShowAprovarDialog} onConfirm={async () => {
      await aprovarVenda.mutateAsync(venda.id);
      setShowAprovarDialog(false);
    }} vendaNumero={numeroVenda} vendaValor={valorTotal} />}

      <DatasulErrorDialog open={showErrorDialog} onOpenChange={closeErrorDialog} error={errorData} onViewLog={() => {
      document.getElementById('integracao-log')?.scrollIntoView({
        behavior: 'smooth'
      });
    }} />

      <EditarItemVendaDialog open={showEditarItem} onOpenChange={setShowEditarItem} item={itemEditando} onSave={handleSalvarEdicaoItem} />

      {/* Modal de Seleção de Transportadora */}
      <SelecionarFreteDialog
        open={showSelectionDialog}
        onOpenChange={setShowSelectionDialog}
        transportadoras={transportadoras}
        onSelect={handleConfirmarFrete}
        isConfirming={isConfirmingFrete}
      />

      {/* Logs do Cálculo Datasul */}
      {isAdmin && venda && <Card className="p-6 mx-[10px] mt-6" id="integracao-log">
          <IntegracaoDatasulLog vendaId={venda.id} />
        </Card>}
      </div>
    </div>;
}