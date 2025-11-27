import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { Search, Plus, Eye, Trash2, ShoppingCart, Save, Users, Edit, CheckCircle, Settings, Loader2, Calculator, ChevronLeft, ChevronRight, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useVendas } from "@/hooks/useVendas";
import { useCondicoesPagamento } from "@/hooks/useCondicoesPagamento";
import { useTiposFrete } from "@/hooks/useTiposFrete";
import { useTiposPedido } from "@/hooks/useTiposPedido";
import { useVendedores } from "@/hooks/useVendedores";
import { useHierarquia } from "@/hooks/useHierarquia";
import { useDatasulCalculaPedido } from "@/hooks/useDatasulCalculaPedido";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ProdutoSearchDialog } from "@/components/ProdutoSearchDialog";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { VendasActionBar } from "@/components/VendasActionBar";
import { VendasFilters } from "@/components/vendas/VendasFilters";
import { PipelineKanban, EtapaPipeline } from "@/components/vendas/PipelineKanban";
import { AprovarVendaDialog } from "@/components/vendas/AprovarVendaDialog";
import { IntegracaoDatasulLog } from "@/components/IntegracaoDatasulLog";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useEmpresa } from "@/hooks/useEmpresa";
import { cn } from "@/lib/utils";
type Produto = Tables<"produtos">;
type Cliente = Tables<"clientes">;

interface VendaWithItems extends Tables<"vendas"> {
  vendas_itens?: (Tables<"vendas_itens"> & {
    produtos?: Produto;
  })[];
}

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
}
export default function Vendas() {
  const navigate = useNavigate();
  const { vendas, isLoading, createVenda, addItem, updateVenda, updateItem, removeItem, aprovarVenda } = useVendas();
  const { condicoes, isLoading: isLoadingCondicoes } = useCondicoesPagamento();
  const { tipos: tiposFrete, isLoading: isLoadingTiposFrete } = useTiposFrete();
  const { tipos: tiposPedido, isLoading: isLoadingTiposPedido } = useTiposPedido();
  const { vendedores, isLoading: isLoadingVendedores } = useVendedores();
  const { ehGestor, subordinados, nivelHierarquico, podeAcessarCliente } = useHierarquia();
  const { calcularPedido, isCalculating } = useDatasulCalculaPedido();
  const { user } = useAuth();
  const { isAdmin } = useRoles();
  const { empresa } = useEmpresa();
  const { toast } = useToast();
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const { visibleColumns, toggleColumn, resetColumns } = useColumnVisibility("vendas_itens_columns", {
    precoTabela: true,
    precoUnit: true,
    desconto: true,
    total: true,
    custo: true,
    divisao: true,
    vlTotalDS: true,
    vlMercLiq: true,
    loteMult: true,
    deposito: true,
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"pipeline" | "list" | "nova">("pipeline");
  const [showProdutoSearch, setShowProdutoSearch] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [editandoVendaId, setEditandoVendaId] = useState<string | null>(null);
  const [vendaParaAprovar, setVendaParaAprovar] = useState<{ id: string; numero: string; valor: number } | null>(null);
  
  // Pagination states for items table
  const [currentItemsPage, setCurrentItemsPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchItemTerm, setSearchItemTerm] = useState("");
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">("normal");

  // Filtros state
  const [filtros, setFiltros] = useState({
    pipeline: "todos",
    responsavel: "todos",
    status: "todos",
    periodo: "mes",
    ordenacao: "recente",
  });

  // Nova venda state
  const [numeroVenda, setNumeroVenda] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteCnpj, setClienteCnpj] = useState("");
  const [status, setStatus] = useState<"rascunho" | "aprovada" | "cancelada">("rascunho");
  const [condicaoPagamentoId, setCondicaoPagamentoId] = useState<string>("");
  const [tipoFreteId, setTipoFreteId] = useState<string>("");
  const [tipoPedidoId, setTipoPedidoId] = useState<string>("");
  const [faturamentoParcial, setFaturamentoParcial] = useState<boolean>(false);
  const [observacoes, setObservacoes] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  // Novos campos do pipeline
  const [etapaPipeline, setEtapaPipeline] = useState<EtapaPipeline>("prospeccao");
  const [valorEstimado, setValorEstimado] = useState<number>(0);
  const [probabilidade, setProbabilidade] = useState<number>(50);
  const [dataFechamentoPrevista, setDataFechamentoPrevista] = useState<string>("");
  const [motivoPerda, setMotivoPerda] = useState<string>("");
  const [origemLead, setOrigemLead] = useState<string>("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [vendedorId, setVendedorId] = useState<string>("");

  // Opções de vendedor permitidas conforme RLS (eu + subordinados; níveis altos veem todos)
  const vendedorOptions = useMemo(() => {
    if ((nivelHierarquico as number) && (nivelHierarquico as number) <= 3) return vendedores;
    const ids = new Set<string>();
    if (user?.id) ids.add(user.id);
    (subordinados || []).forEach((s: any) => ids.add(s.subordinado_id));
    return vendedores.filter((v) => ids.has(v.id));
  }, [vendedores, subordinados, user?.id, nivelHierarquico]);

  // Mapa de nomes das etapas para mensagens
  const ETAPAS_LABELS: Record<EtapaPipeline, string> = {
    prospeccao: "Prospecção",
    qualificacao: "Qualificação",
    proposta: "Proposta",
    negociacao: "Negociação",
    fechamento: "Fechamento",
    ganho: "Ganho",
    perdido: "Perdido",
  };
  useEffect(() => {
    if (view === "nova" && !numeroVenda) {
      const nextNumber = `V${Date.now().toString().slice(-8)}`;
      setNumeroVenda(nextNumber);
    }
  }, [view]);
  // Lógica de filtragem otimizada com useMemo
  const filteredVendas = useMemo(() => {
    let resultado = [...vendas];

    // Filtro de busca textual
    if (searchTerm) {
      resultado = resultado.filter(
        (v) =>
          v.numero_venda.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (v.cliente_cnpj && v.cliente_cnpj.includes(searchTerm)) ||
          v.status.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filtro de status
    if (filtros.status !== "todos") {
      resultado = resultado.filter((v) => v.status === filtros.status);
    }

    // Filtro de responsável (assumindo que há um campo responsavel_id)
    if (filtros.responsavel === "eu") {
      // Aqui você deve usar o ID do usuário logado
      resultado = resultado.filter((v) => v.responsavel_id);
    } else if (filtros.responsavel === "sem") {
      resultado = resultado.filter((v) => !v.responsavel_id);
    }

    // Filtro de período
    if (filtros.periodo !== "todos") {
      const hoje = new Date();
      const dataInicio = new Date();
      switch (filtros.periodo) {
        case "hoje":
          dataInicio.setHours(0, 0, 0, 0);
          break;
        case "semana":
          dataInicio.setDate(hoje.getDate() - 7);
          break;
        case "mes":
          dataInicio.setMonth(hoje.getMonth() - 1);
          break;
        case "trimestre":
          dataInicio.setMonth(hoje.getMonth() - 3);
          break;
        case "ano":
          dataInicio.setFullYear(hoje.getFullYear() - 1);
          break;
      }
      resultado = resultado.filter((v) => {
        const dataVenda = new Date(v.data_venda || v.created_at);
        return dataVenda >= dataInicio;
      });
    }

    // Ordenação
    switch (filtros.ordenacao) {
      case "recente":
        resultado.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "antiga":
        resultado.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "valor-maior":
        resultado.sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0));
        break;
      case "valor-menor":
        resultado.sort((a, b) => (a.valor_total || 0) - (b.valor_total || 0));
        break;
      case "vencimento":
        resultado.sort((a, b) => {
          const dataA = a.data_fechamento_prevista ? new Date(a.data_fechamento_prevista).getTime() : 0;
          const dataB = b.data_fechamento_prevista ? new Date(b.data_fechamento_prevista).getTime() : 0;
          return dataA - dataB;
        });
        break;
      case "probabilidade":
        resultado.sort((a, b) => (b.probabilidade || 0) - (a.probabilidade || 0));
        break;
    }
    return resultado;
  }, [vendas, searchTerm, filtros]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "rascunho":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "aprovada":
        return "bg-success/10 text-success border-success/20";
      case "cancelada":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted";
    }
  };
  const handleAddProduto = (produto: Produto) => {
    const existingItem = carrinho.find((item) => item.produto.id === produto.id);
    if (existingItem) {
      setCarrinho(
        carrinho.map((item) =>
          item.produto.id === produto.id
            ? {
                ...item,
                quantidade: item.quantidade + 1,
                valor_total: (item.quantidade + 1) * item.produto.preco_venda * (1 - item.desconto / 100),
              }
            : item,
        ),
      );
    } else {
      setCarrinho([
        ...carrinho,
        {
          produto,
          quantidade: 1,
          desconto: 0,
          valor_total: produto.preco_venda,
        },
      ]);
    }
    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} foi adicionado ao carrinho.`,
      variant: "success",
    });
  };
  const handleUpdateQuantidade = (index: number, quantidade: number) => {
    if (quantidade <= 0) return;
    setCarrinho(
      carrinho.map((item, i) =>
        i === index
          ? {
              ...item,
              quantidade,
              valor_total: quantidade * item.produto.preco_venda * (1 - item.desconto / 100),
            }
          : item,
      ),
    );
  };
  const handleUpdateDesconto = (index: number, desconto: number) => {
    if (desconto < 0 || desconto > 100) return;
    setCarrinho(
      carrinho.map((item, i) =>
        i === index
          ? {
              ...item,
              desconto,
              valor_total: item.quantidade * item.produto.preco_venda * (1 - desconto / 100),
            }
          : item,
      ),
    );
  };
  const handleRemoveItem = (index: number) => {
    setCarrinho(carrinho.filter((_, i) => i !== index));
  };
  const calcularTotal = () => {
    return carrinho.reduce((sum, item) => sum + item.valor_total, 0);
  };
  const calcularTotalLiquido = () => {
    return carrinho.reduce((sum, item) => sum + (item.datasul_vl_merc_liq || 0), 0);
  };
  const handleSelectCliente = (cliente: Cliente) => {
    setClienteSelecionado(cliente);
    setClienteNome(cliente.nome_emit);
    setClienteCnpj(cliente.cgc);
  };

  const handleTrocarCliente = () => {
    setClienteSelecionado(null);
    setClienteNome("");
    setClienteCnpj("");
    setShowClienteSearch(true);
  };
  const handleEditarVenda = (venda: any) => {
    setEditandoVendaId(venda.id);
    setNumeroVenda(venda.numero_venda);
    setClienteNome(venda.cliente_nome);
    setClienteCnpj(venda.cliente_cnpj || "");
    setStatus(venda.status);
    setCondicaoPagamentoId(venda.condicao_pagamento_id || "");
    setTipoFreteId(venda.tipo_frete_id || "");
    setTipoPedidoId(venda.tipo_pedido_id || "");
    setFaturamentoParcial(venda.faturamento_parcial === 'YES');
    setObservacoes(venda.observacoes || "");

    // Novos campos do pipeline
    setEtapaPipeline(venda.etapa_pipeline || "prospeccao");
    setValorEstimado(venda.valor_estimado || 0);
    setProbabilidade(venda.probabilidade || 50);
    setDataFechamentoPrevista(venda.data_fechamento_prevista || "");
    setMotivoPerda(venda.motivo_perda || "");
    setOrigemLead(venda.origem_lead || "");
    setResponsavelId(venda.responsavel_id || "");
    setVendedorId(venda.vendedor_id || "");

    // Carregar itens da venda
    const itensCarrinho: ItemCarrinho[] = (venda.vendas_itens || []).map((item: any) => ({
      produto: item.produtos,
      quantidade: item.quantidade,
      desconto: item.desconto,
      valor_total: item.valor_total,
      datasul_dep_exp: item.datasul_dep_exp,
      datasul_custo: item.datasul_custo,
      datasul_divisao: item.datasul_divisao,
      datasul_vl_tot_item: item.datasul_vl_tot_item,
      datasul_vl_merc_liq: item.datasul_vl_merc_liq,
      datasul_lote_mulven: item.datasul_lote_mulven,
    }));
    setCarrinho(itensCarrinho);
    setView("nova");
  };
  const limparFormulario = () => {
    setEditandoVendaId(null);
    setNumeroVenda("");
    setClienteSelecionado(null);
    setClienteNome("");
    setClienteCnpj("");
    setStatus("rascunho");
    setCondicaoPagamentoId("");
    setTipoFreteId("");
    setTipoPedidoId("");
    setFaturamentoParcial(false);
    setObservacoes("");
    setCarrinho([]);

    // Limpar campos do pipeline
    setEtapaPipeline("prospeccao");
    setValorEstimado(0);
    setProbabilidade(50);
    setDataFechamentoPrevista("");
    setMotivoPerda("");
    setOrigemLead("");
    setResponsavelId("");
    setVendedorId("");
  };
  const handleCalcular = async () => {
    // Validar campos obrigatórios
    const camposObrigatorios = [];
    if (!tipoPedidoId) camposObrigatorios.push("Tipo de Pedido");
    if (!condicaoPagamentoId) camposObrigatorios.push("Condição de Pagamento");
    if (!vendedorId) camposObrigatorios.push("Vendedor");

    if (camposObrigatorios.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha: ${camposObrigatorios.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (!editandoVendaId) {
      toast({
        title: "Atenção",
        description: "Salve a venda antes de calcular com o Datasul.",
        variant: "destructive",
      });
      return;
    }

    const resultado = await calcularPedido(editandoVendaId);
    
    // Atualiza o carrinho com os valores calculados do Datasul
    if (resultado?.itensAtualizados) {
      const carrinhoAtualizado = resultado.itensAtualizados.map((item: any) => ({
        produto: item.produtos,
        quantidade: item.quantidade,
        desconto: item.desconto,
        // Sobrepõe o valor_total com o valor calculado pelo Datasul
        valor_total: item.datasul_vl_tot_item || item.valor_total,
        datasul_dep_exp: item.datasul_dep_exp,
        datasul_custo: item.datasul_custo,
        datasul_divisao: item.datasul_divisao,
        datasul_vl_tot_item: item.datasul_vl_tot_item,
        datasul_vl_merc_liq: item.datasul_vl_merc_liq,
        datasul_lote_mulven: item.datasul_lote_mulven,
      }));
      setCarrinho(carrinhoAtualizado);
    }
  };
  const handleCancelarProposta = () => {
    limparFormulario();
    setView("pipeline");
  };
  const handleDiretoria = () => {
    toast({
      title: "Enviar para Diretoria",
      description: "Proposta enviada para aprovação da diretoria.",
    });
  };
  const handleEfetivar = async () => {
    if (!clienteNome.trim()) {
      toast({
        title: "Erro",
        description: "Selecione ou informe o cliente",
        variant: "destructive",
      });
      return;
    }
    if (carrinho.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda",
        variant: "destructive",
      });
      return;
    }
    setStatus("aprovada");
    await handleSalvarVenda();
  };
  const handleSalvarVenda = async () => {
    // Capturar se estava editando antes de salvar
    const estaEditando = !!editandoVendaId;
    
    if (!clienteNome.trim()) {
      toast({
        title: "Erro",
        description: "Selecione ou informe o cliente",
        variant: "destructive",
      });
      return;
    }

    // Normalizar CNPJ/CPF - remover todos os caracteres não numéricos
    const clienteCnpjNormalizado = clienteCnpj?.replace(/\D/g, '') || '';

    // Validação do CNPJ/CPF normalizado
    if (!clienteCnpjNormalizado || clienteCnpjNormalizado.length < 11) {
      toast({
        title: "Erro de validação",
        description: "O CNPJ/CPF do cliente é obrigatório e deve ter no mínimo 11 dígitos.",
        variant: "destructive",
      });
      return;
    }

    // Buscar o cliente_id pelo CNPJ
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .select('id, vendedor_id')
      .eq('cgc', clienteCnpjNormalizado)
      .maybeSingle();

    if (clienteError || !clienteData) {
      console.error('❌ Cliente não encontrado:', { clienteCnpjNormalizado, clienteError });
      toast({
        title: "Erro",
        description: "Cliente não encontrado no sistema. Verifique o CNPJ/CPF.",
        variant: "destructive",
      });
      return;
    }

    const clienteId = clienteData.id;

    if (carrinho.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda",
        variant: "destructive",
      });
      return;
    }

    // Validar vínculo do cliente - SEMPRE usando o usuário logado como dono
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    // Checar se é admin para permitir bypass
    const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id);

    const isAdmin = userRoles?.some((r) => r.role === "admin");

    console.log("🔍 Validação de acesso ao cliente:", {
      currentUserId: currentUser.id,
      clienteId,
      clienteCnpjNormalizado,
      clienteNome,
      isAdmin,
      editandoVendaId,
    });

    // Para não-admins criando nova venda, valide acesso ao cliente por ID
    if (!editandoVendaId && !isAdmin) {
      const { data: acessiveis, error: erroAcessiveis } = await supabase.rpc("get_clientes_acessiveis", {
        _user_id: currentUser.id,
      });

      if (erroAcessiveis) {
        console.error("❌ Erro ao validar acesso ao cliente:", erroAcessiveis);
        toast({
          title: "Erro de validação",
          description: "Não foi possível validar o acesso ao cliente.",
          variant: "destructive",
        });
        return;
      }

      const idsPermitidos = (acessiveis || []).map((c: any) => c.cliente_id);
      const temAcesso = idsPermitidos.includes(clienteId) || clienteData.vendedor_id === currentUser.id;

      if (!temAcesso) {
        toast({
          title: "Permissão negada",
          description: "Você não tem permissão para criar vendas para este cliente.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const valorTotal = calcularTotal();
      if (editandoVendaId) {
        // Atualizar venda existente
        await updateVenda.mutateAsync({
          id: editandoVendaId,
          numero_venda: numeroVenda,
          cliente_id: clienteId, // Usar ID do cliente
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpjNormalizado,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status,
          condicao_pagamento_id: condicaoPagamentoId || null,
          tipo_frete_id: tipoFreteId || null,
          tipo_pedido_id: tipoPedidoId || null,
          faturamento_parcial: (faturamentoParcial ? 'YES' : 'NO') as Database["public"]["Enums"]["yes_no"],
          observacoes: observacoes || null,
          etapa_pipeline: etapaPipeline,
          valor_estimado: valorEstimado,
          probabilidade,
          data_fechamento_prevista: dataFechamentoPrevista || null,
          motivo_perda: motivoPerda || null,
          origem_lead: origemLead || null,
          responsavel_id: responsavelId || null,
          vendedor_id: vendedorId || null,
        });

        // Remover itens antigos e adicionar novos
        const vendaAtual = vendas.find((v) => v.id === editandoVendaId);
        if (vendaAtual?.vendas_itens) {
          for (const item of vendaAtual.vendas_itens) {
            await removeItem.mutateAsync(item.id);
          }
        }
        for (let i = 0; i < carrinho.length; i++) {
          const item = carrinho[i];
          await addItem.mutateAsync({
            venda_id: editandoVendaId,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            preco_tabela: item.produto.preco_venda, // Preço de tabela
            desconto: item.desconto,
            valor_total: item.datasul_vl_tot_item || item.valor_total, // Usa valor do Datasul se disponível
            sequencia_item: i + 1, // Adiciona sequência automática
            datasul_dep_exp: item.datasul_dep_exp || null,
            datasul_custo: item.datasul_custo || null,
            datasul_divisao: item.datasul_divisao || null,
            datasul_vl_tot_item: item.datasul_vl_tot_item || null,
            datasul_vl_merc_liq: item.datasul_vl_merc_liq || null,
            datasul_lote_mulven: item.datasul_lote_mulven || null,
          });
        }
        toast({
          title: "Venda atualizada!",
          description: "A venda foi atualizada com sucesso.",
        });
      } else {
        // Criar nova venda
        // Para não-admin: sempre usa currentUser.id (trigger irá forçar)
        // Para admin: pode escolher vendedor ou deixar vazio (trigger define)
        const finalVendedorId = isAdmin && vendedorId ? vendedorId : currentUser.id;

        // Buscar equipe do vendedor
        const { data: membroEquipe } = await supabase
          .from("membros_equipe")
          .select("equipe_id, equipes!inner(esta_ativa)")
          .eq("usuario_id", finalVendedorId)
          .eq("esta_ativo", true)
          .eq("equipes.esta_ativa", true)
          .limit(1)
          .single();

        const equipeId = membroEquipe?.equipe_id || null;

        // Verificar role do usuário para diagnóstico
        const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id);

        console.log("🚀 Criando venda:", {
          vendedorIdSelecionado: vendedorId,
          currentUserId: currentUser.id,
          currentUserEmail: currentUser.email,
          userRoles: userRoles?.map((r) => r.role),
          isAdmin,
          finalVendedorId,
          clienteCnpjOriginal: clienteCnpj,
          clienteCnpjNormalizado,
          clienteNome,
          etapaPipeline,
          status,
          nivelHierarquico,
        });
        // Verificação prévia de permissão para evitar erro de RLS
        const podeCriar = clienteId ? await podeAcessarCliente?.(clienteId) : false;
        if (!podeCriar) {
          toast({
            title: "Sem permissão",
            description: "Você não tem acesso a este cliente para criar vendas.",
            variant: "destructive",
          });
          return;
        }

        const venda = await createVenda.mutateAsync({
          numero_venda: numeroVenda,
          cliente_id: clienteId, // Usar ID do cliente
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpjNormalizado,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status,
          data_venda: new Date().toISOString(),
          condicao_pagamento_id: condicaoPagamentoId || null,
          tipo_frete_id: tipoFreteId || null,
          tipo_pedido_id: tipoPedidoId || null,
          faturamento_parcial: (faturamentoParcial ? 'YES' : 'NO') as Database["public"]["Enums"]["yes_no"],
          observacoes: observacoes || null,
          etapa_pipeline: etapaPipeline,
          valor_estimado: valorEstimado,
          probabilidade,
          data_fechamento_prevista: dataFechamentoPrevista || null,
          motivo_perda: motivoPerda || null,
          origem_lead: origemLead || null,
          responsavel_id: finalVendedorId, // Garante compatibilidade com RLS (criador é o responsável)
          vendedor_id: finalVendedorId, // Sempre tem valor: selecionado ou atual
          equipe_id: equipeId, // Equipe do vendedor
        });

          // Aguardar a invalidação do cache e adicionar itens
          if (venda && venda.id) {
            // Aguardar um pouco para garantir que a venda foi propagada
            await new Promise((resolve) => setTimeout(resolve, 100));
            for (let i = 0; i < carrinho.length; i++) {
              const item = carrinho[i];
              await addItem.mutateAsync({
                venda_id: venda.id,
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.produto.preco_venda,
                preco_tabela: item.produto.preco_venda, // Preço de tabela
                desconto: item.desconto,
                valor_total: item.datasul_vl_tot_item || item.valor_total, // Usa valor do Datasul se disponível
                sequencia_item: i + 1, // Adiciona sequência automática
                datasul_dep_exp: item.datasul_dep_exp || null,
                datasul_custo: item.datasul_custo || null,
                datasul_divisao: item.datasul_divisao || null,
                datasul_vl_tot_item: item.datasul_vl_tot_item || null,
                datasul_vl_merc_liq: item.datasul_vl_merc_liq || null,
                datasul_lote_mulven: item.datasul_lote_mulven || null,
              });
            }
          }
        toast({
          title: estaEditando ? "Venda atualizada!" : "Venda salva!",
          description: estaEditando ? "As alterações foram salvas com sucesso." : "A venda foi criada com sucesso.",
        });
      }

      // Só limpa e volta pro kanban se for uma venda nova (não estava editando)
      if (!estaEditando) {
        limparFormulario();
        setView("pipeline");
      }
    } catch (error: any) {
      console.error("❌ Erro ao salvar venda:", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        clienteCnpj,
        clienteNome,
        vendedorSelecionado: vendedorId,
      });

      // Tratamento especial para erro de RLS (Row Level Security)
      if (error?.code === "42501" || error?.message?.includes("row-level security")) {
        // Verificar novamente o acesso para diagnóstico
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: temAcesso } = await supabase.rpc("can_access_cliente_por_cgc", {
            _user_id: currentUser.id, // SEMPRE valida o usuário logado
            _cgc: clienteCnpj,
          });

          console.error("🔍 Diagnóstico RLS após erro:", {
            currentUserId: currentUser.id,
            clienteCnpj,
            clienteNome,
            temAcessoComoDono: temAcesso,
            nivelHierarquico,
          });
        }

        toast({
          title: "Permissão negada",
          description:
            "Você não é o responsável por este cliente. Apenas o vendedor responsável pode criar vendas para seus clientes.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao salvar venda",
          description: error?.message || "Não foi possível salvar a venda. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCriarVendaTeste = async () => {
    setIsCreatingTest(true);
    try {
      // Verificar se o usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Você precisa estar logado para criar uma venda de teste");
      }

      // Usar o método invoke do Supabase ao invés de fetch direto
      const { data, error } = await supabase.functions.invoke('criar-venda-teste', {
        body: {},
      });

      if (error) throw error;

      toast({
        title: "Venda de teste criada!",
        description: `${data.total_itens} itens adicionados. Valor total: R$ ${data.valor_total.toFixed(2)}`,
      });

      navigate(`/vendas/${data.venda_id}`);
    } catch (error: any) {
      console.error('Erro:', error);
      toast({
        title: "Erro ao criar venda de teste",
        description: error.message || "Não foi possível criar a venda de teste",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleDuplicarVenda = async (vendaOriginal: any) => {
    try {
      // Buscar venda completa com itens
      const { data: vendaCompleta, error: errorVenda } = await supabase
        .from("vendas")
        .select(`
          *,
          vendas_itens (
            *,
            produtos (*)
          )
        `)
        .eq("id", vendaOriginal.id)
        .single();

      if (errorVenda || !vendaCompleta) {
        throw new Error("Não foi possível carregar a venda para duplicar");
      }

      // Gerar novo número de venda
      const novoNumero = `V${Date.now().toString().slice(-8)}`;

      // Obter usuário atual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("Usuário não autenticado");

      // Buscar equipe do vendedor
      const { data: membroEquipe } = await supabase
        .from("membros_equipe")
        .select("equipe_id, equipes!inner(esta_ativa)")
        .eq("usuario_id", currentUser.id)
        .eq("esta_ativo", true)
        .eq("equipes.esta_ativa", true)
        .limit(1)
        .single();

      const equipeId = membroEquipe?.equipe_id || null;

      // Criar nova venda como duplicata
      const novaVenda = await createVenda.mutateAsync({
        numero_venda: novoNumero,
        cliente_id: vendaCompleta.cliente_id,
        cliente_nome: vendaCompleta.cliente_nome,
        cliente_cnpj: vendaCompleta.cliente_cnpj,
        valor_total: vendaCompleta.valor_total,
        desconto: vendaCompleta.desconto || 0,
        valor_final: vendaCompleta.valor_final,
        status: "rascunho" as const,
        data_venda: new Date().toISOString(),
        condicao_pagamento_id: vendaCompleta.condicao_pagamento_id,
        tipo_frete_id: vendaCompleta.tipo_frete_id,
        tipo_pedido_id: vendaCompleta.tipo_pedido_id,
        faturamento_parcial: vendaCompleta.faturamento_parcial,
        observacoes: vendaCompleta.observacoes ? `[DUPLICADO] ${vendaCompleta.observacoes}` : "[DUPLICADO]",
        etapa_pipeline: "prospeccao" as EtapaPipeline,
        valor_estimado: vendaCompleta.valor_estimado || vendaCompleta.valor_total,
        probabilidade: 50,
        data_fechamento_prevista: null,
        motivo_perda: null,
        origem_lead: `Duplicado de ${vendaCompleta.numero_venda}`,
        responsavel_id: currentUser.id,
        vendedor_id: currentUser.id,
        equipe_id: equipeId,
      });

      if (novaVenda && novaVenda.id && vendaCompleta.vendas_itens) {
        // Aguardar propagação
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Copiar todos os itens
        for (let i = 0; i < vendaCompleta.vendas_itens.length; i++) {
          const itemOriginal = vendaCompleta.vendas_itens[i];
          await addItem.mutateAsync({
            venda_id: novaVenda.id,
            produto_id: itemOriginal.produto_id,
            quantidade: itemOriginal.quantidade,
            preco_unitario: itemOriginal.preco_unitario,
            preco_tabela: itemOriginal.preco_tabela,
            desconto: itemOriginal.desconto,
            valor_total: itemOriginal.valor_total,
            sequencia_item: i + 1,
            datasul_dep_exp: itemOriginal.datasul_dep_exp,
            datasul_custo: itemOriginal.datasul_custo,
            datasul_divisao: itemOriginal.datasul_divisao,
            datasul_vl_tot_item: itemOriginal.datasul_vl_tot_item,
            datasul_vl_merc_liq: itemOriginal.datasul_vl_merc_liq,
            datasul_lote_mulven: itemOriginal.datasul_lote_mulven,
          });
        }
      }

      toast({
        title: "Proposta duplicada!",
        description: `A proposta ${novoNumero} foi criada com sucesso.`,
        variant: "success",
      });

      // Navegar para a nova venda
      navigate(`/vendas/${novaVenda.id}`);
    } catch (error: any) {
      console.error("Erro ao duplicar venda:", error);
      toast({
        title: "Erro ao duplicar",
        description: error?.message || "Não foi possível duplicar a proposta.",
        variant: "destructive",
      });
    }
  };

  const handleMoverCard = async (vendaId: string, novaEtapa: EtapaPipeline) => {
    try {
      // Validar que a etapa é um valor válido do enum
      const etapasValidas: EtapaPipeline[] = [
        "prospeccao",
        "qualificacao",
        "proposta",
        "negociacao",
        "fechamento",
        "ganho",
        "perdido",
      ];
      if (!etapasValidas.includes(novaEtapa)) {
        toast({
          title: "Erro",
          description: "Etapa inválida",
          variant: "destructive",
        });
        return;
      }
      await updateVenda.mutateAsync({
        id: vendaId,
        etapa_pipeline: novaEtapa,
      });
      toast({
        title: "Etapa atualizada!",
        description: `Venda movida para ${ETAPAS_LABELS[novaEtapa] || novaEtapa}`,
      });
    } catch (error: any) {
      console.error("Erro ao mover card:", error);
      toast({
        title: "Erro ao atualizar etapa",
        description: error?.message || "Não foi possível mover a venda",
        variant: "destructive",
      });
    }
  };

  const handleAprovarVenda = (venda: VendaWithItems) => {
    setVendaParaAprovar({
      id: venda.id,
      numero: venda.numero_venda,
      valor: venda.valor_final,
    });
  };

  const confirmarAprovacao = async () => {
    if (!vendaParaAprovar) return;

    try {
      await aprovarVenda.mutateAsync(vendaParaAprovar.id);
      setVendaParaAprovar(null);
    } catch (error) {
      console.error("Erro ao aprovar venda:", error);
    }
  };
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando vendas...</p>
        </div>
      </div>
    );
  }
  if (view === "nova") {
    return (
      <>
        <VendasActionBar
          status={status}
          onCalcular={handleCalcular}
          onCancelar={handleCancelarProposta}
          onDiretoria={handleDiretoria}
          onEfetivar={handleEfetivar}
          onSalvar={handleSalvarVenda}
          isSaving={createVenda.isPending || updateVenda.isPending}
          isCalculating={isCalculating}
          editandoVendaId={editandoVendaId}
        />

        {/* Logo da empresa - visível apenas para admins */}
        {isAdmin && empresa?.url_logo_expandido && (
          <div className="fixed top-20 left-8 z-10 bg-background/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border">
            <img 
              src={empresa.url_logo_expandido} 
              alt="Logo da empresa" 
              className="h-12 object-contain"
            />
          </div>
        )}

        <div className="pt-20 p-8 space-y-6">
          {/* Header */}

          {/* Dados do Cliente */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Dados do Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Input
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Nome do cliente"
                    readOnly
                    className="bg-muted cursor-pointer"
                    onClick={() => setShowClienteSearch(true)}
                  />
                  <Button type="button" onClick={() => setShowClienteSearch(true)}>
                    <Search size={16} />
                  </Button>
                </div>
              </div>

              <div>
                <Label>CNPJ/CPF *</Label>
                <div className="flex gap-2">
                  <Input
                    value={clienteCnpj}
                    onChange={(e) => setClienteCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    readOnly={clienteSelecionado !== null}
                    className={clienteSelecionado !== null ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {clienteSelecionado && (
                    <Button type="button" variant="outline" onClick={handleTrocarCliente} title="Trocar cliente">
                      <Edit size={16} />
                    </Button>
                  )}
                </div>
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
                    {isLoadingCondicoes ? (
                      <SelectItem value="loading" disabled>
                        Carregando...
                      </SelectItem>
                    ) : (
                      condicoes.map((cond) => (
                        <SelectItem key={cond.id} value={cond.id}>
                          {cond.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Frete</Label>
                <Select value={tipoFreteId} onValueChange={setTipoFreteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTiposFrete ? (
                      <SelectItem value="loading" disabled>
                        Carregando...
                      </SelectItem>
                    ) : (
                      tiposFrete.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </SelectItem>
                      ))
                    )}
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
                    {isLoadingTiposPedido ? (
                      <SelectItem value="loading" disabled>
                        Carregando...
                      </SelectItem>
                    ) : (
                      tiposPedido.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="faturamentoParcial"
                  checked={faturamentoParcial}
                  onChange={(e) => setFaturamentoParcial(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="faturamentoParcial" className="font-normal cursor-pointer">
                  Faturamento Parcial
                </Label>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Informações do Pipeline */}
            <h3 className="text-lg font-semibold text-primary mb-4">Informações do Pipeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Etapa do Pipeline *</Label>
                <Select value={etapaPipeline} onValueChange={(v: any) => setEtapaPipeline(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospeccao">Prospecção</SelectItem>
                    <SelectItem value="qualificacao">Qualificação</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="negociacao">Negociação</SelectItem>
                    <SelectItem value="fechamento">Fechamento</SelectItem>
                    <SelectItem value="ganho">Ganho</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor Estimado (R$)</Label>
                <Input
                  type="number"
                  value={valorEstimado}
                  onChange={(e) => setValorEstimado(Number(e.target.value))}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <Label>Probabilidade (%)</Label>
                <Input
                  type="number"
                  value={probabilidade}
                  onChange={(e) => setProbabilidade(Number(e.target.value))}
                  placeholder="50"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <Label>Data Fechamento Prevista</Label>
                <Input
                  type="date"
                  value={dataFechamentoPrevista}
                  onChange={(e) => setDataFechamentoPrevista(e.target.value)}
                />
              </div>

              <div>
                <Label>Origem do Lead</Label>
                <Input
                  value={origemLead}
                  onChange={(e) => setOrigemLead(e.target.value)}
                  placeholder="Ex: Indicação, Site, Cold Call"
                />
              </div>

              {ehGestor && (
                <div>
                  <Label className={!vendedorId ? "text-destructive" : ""}>
                    Vendedor Responsável *
                  </Label>
                  <Select
                    value={vendedorId || "current"}
                    onValueChange={(v) => setVendedorId(v === "current" ? "" : v)}
                  >
                    <SelectTrigger className={!vendedorId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="current">Eu mesmo</SelectItem>
                      {vendedorOptions.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {etapaPipeline === "perdido" && (
                <div className="md:col-span-3">
                  <Label>Motivo da Perda</Label>
                  <Input
                    value={motivoPerda}
                    onChange={(e) => setMotivoPerda(e.target.value)}
                    placeholder="Descreva por que a oportunidade foi perdida..."
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <Label>Observações</Label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre a venda..."
              />
            </div>
          </Card>

          {/* Produtos no Carrinho */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Produtos</h3>
              <div className="flex items-center gap-2">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item..."
                    value={searchItemTerm}
                    onChange={(e) => setSearchItemTerm(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>

                {/* Densidade */}
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
                
                <Button type="button" onClick={() => setShowProdutoSearch(true)}>
                  <Plus size={16} className="mr-2" />
                  Adicionar Produto
                </Button>
              </div>
            </div>

            {carrinho.length > 0 ? (
              <>
                <div className="border rounded-lg">
                  <ScrollArea className="h-[600px]">
                    <table className={cn(
                      "w-full caption-bottom text-sm",
                      density === "compact" ? "text-xs" :
                      density === "comfortable" ? "text-base" : ""
                    )}>
                      <thead className="sticky top-0 z-10 bg-background border-b">
                        <tr>
                          <th className={`w-16 text-center font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Seq</th>
                          <th className={`text-left font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Código</th>
                          <th className={`text-left font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Produto</th>
                          <th className={`text-center font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Qtd</th>
                          {visibleColumns.precoTabela && <th className={`text-right font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Preço Tabela</th>}
                          {visibleColumns.precoUnit && <th className={`text-right font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Preço Unit.</th>}
                          {visibleColumns.desconto && <th className={`text-center font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Desc. %</th>}
                          {visibleColumns.total && <th className={`text-right font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Total</th>}
                          {visibleColumns.custo && <th className={`text-right font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Custo</th>}
                          {visibleColumns.divisao && <th className={`text-right font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Divisão</th>}
                          {visibleColumns.vlTotalDS && <th className={`text-right font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>VL Total DS</th>}
                          {visibleColumns.vlMercLiq && <th className={`text-right font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>VL Merc Líq</th>}
                          {visibleColumns.loteMult && <th className={`text-center font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Lote Mult</th>}
                          {visibleColumns.deposito && <th className={`text-center font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Depósito</th>}
                          <th className={`text-center font-medium text-muted-foreground ${density === "compact" ? "py-1" : density === "comfortable" ? "py-4" : "py-2"} px-4`}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                      {carrinho
                        .filter(item => {
                          if (!searchItemTerm) return true;
                          const searchLower = searchItemTerm.toLowerCase();
                          return (
                            item.produto.nome.toLowerCase().includes(searchLower) ||
                            item.produto.referencia_interna.toLowerCase().includes(searchLower)
                          );
                        })
                        .slice((currentItemsPage - 1) * itemsPerPage, currentItemsPage * itemsPerPage)
                        .map((item, index) => {
                        const realIndex = (currentItemsPage - 1) * itemsPerPage + index;
                        const precoComDesconto = item.produto.preco_venda * (1 - item.desconto / 100);
                         const paddingClass = density === "compact" ? "py-1 px-2" : density === "comfortable" ? "py-4 px-4" : "py-2 px-3";
                        return (
                        <tr key={realIndex} className="border-b transition-colors hover:bg-muted/50">
                          <td className={`text-center font-semibold text-muted-foreground ${paddingClass}`}>{realIndex + 1}</td>
                          <td className={`font-mono ${paddingClass}`}>{item.produto.referencia_interna}</td>
                          <td className={paddingClass}>{item.produto.nome}</td>
                          <td className={`text-center ${paddingClass}`}>
                            <Input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => handleUpdateQuantidade(realIndex, Number(e.target.value))}
                              className={`w-20 text-center ${density === "compact" ? "h-7 text-xs" : density === "comfortable" ? "h-12" : ""}`}
                              min="1"
                            />
                          </td>
                          {visibleColumns.precoTabela && (
                            <td className={`text-right ${paddingClass}`}>{formatCurrency(item.produto.preco_venda)}</td>
                          )}
                          {visibleColumns.precoUnit && (
                            <td className={`text-right ${paddingClass}`}>{formatCurrency(precoComDesconto)}</td>
                          )}
                          {visibleColumns.desconto && (
                            <td className={`text-center ${paddingClass}`}>
                              <Input
                                type="number"
                                value={item.desconto}
                                onChange={(e) => handleUpdateDesconto(realIndex, Number(e.target.value))}
                                className={`w-20 text-center ${density === "compact" ? "h-7 text-xs" : density === "comfortable" ? "h-12" : ""}`}
                                min="0"
                                max="100"
                              />
                            </td>
                          )}
                          {visibleColumns.total && (
                            <td className={`text-right font-semibold ${paddingClass}`}>{formatCurrency(item.valor_total)}</td>
                          )}
                          {visibleColumns.custo && (
                            <td className={`text-right text-xs ${paddingClass}`}>
                              {item.datasul_custo ? formatCurrency(item.datasul_custo) : "-"}
                            </td>
                          )}
                          {visibleColumns.divisao && (
                            <td className={`text-right text-xs ${paddingClass}`}>
                              {item.datasul_divisao ? formatCurrency(item.datasul_divisao) : "-"}
                            </td>
                          )}
                          {visibleColumns.vlTotalDS && (
                            <td className={`text-right text-xs ${paddingClass}`}>
                              {item.datasul_vl_tot_item ? formatCurrency(item.datasul_vl_tot_item) : "-"}
                            </td>
                          )}
                          {visibleColumns.vlMercLiq && (
                            <td className={`text-right text-xs ${paddingClass}`}>
                              {item.datasul_vl_merc_liq ? formatCurrency(item.datasul_vl_merc_liq) : "-"}
                            </td>
                          )}
                          {visibleColumns.loteMult && (
                            <td className={`text-center ${paddingClass}`}>
                              {item.datasul_lote_mulven || "-"}
                            </td>
                          )}
                          {visibleColumns.deposito && (
                            <td className={`text-center ${paddingClass}`}>
                              {item.datasul_dep_exp || "-"}
                            </td>
                          )}
                          <td className={`text-center ${paddingClass}`}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(realIndex)}
                              className={density === "compact" ? "h-7 w-7" : density === "comfortable" ? "h-12 w-12" : ""}
                            >
                              <Trash2 className={density === "compact" ? "h-3 w-3" : "h-4 w-4"} />
                            </Button>
                          </td>
                        </tr>
                      );
                      })}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>

                {/* Pagination for items */}
                {carrinho.filter(item => {
                  if (!searchItemTerm) return true;
                  const searchLower = searchItemTerm.toLowerCase();
                  return (
                    item.produto.nome.toLowerCase().includes(searchLower) ||
                    item.produto.referencia_interna.toLowerCase().includes(searchLower)
                  );
                }).length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 gap-4">
                    <div className="text-sm text-muted-foreground">
                      {carrinho.filter(item => {
                        if (!searchItemTerm) return true;
                        const searchLower = searchItemTerm.toLowerCase();
                        return (
                          item.produto.nome.toLowerCase().includes(searchLower) ||
                          item.produto.referencia_interna.toLowerCase().includes(searchLower)
                        );
                      }).length} itens no total
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        value={String(itemsPerPage)} 
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentItemsPage(1);
                        }}
                      >
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
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setCurrentItemsPage(1)} 
                          disabled={currentItemsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <ChevronLeft className="h-4 w-4 -ml-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setCurrentItemsPage(currentItemsPage - 1)} 
                          disabled={currentItemsPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3">
                          Página {currentItemsPage} de {Math.ceil(carrinho.filter(item => {
                            if (!searchItemTerm) return true;
                            const searchLower = searchItemTerm.toLowerCase();
                            return (
                              item.produto.nome.toLowerCase().includes(searchLower) ||
                              item.produto.referencia_interna.toLowerCase().includes(searchLower)
                            );
                          }).length / itemsPerPage) || 1}
                        </span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setCurrentItemsPage(currentItemsPage + 1)} 
                          disabled={currentItemsPage === Math.ceil(carrinho.filter(item => {
                            if (!searchItemTerm) return true;
                            const searchLower = searchItemTerm.toLowerCase();
                            return (
                              item.produto.nome.toLowerCase().includes(searchLower) ||
                              item.produto.referencia_interna.toLowerCase().includes(searchLower)
                            );
                          }).length / itemsPerPage)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => setCurrentItemsPage(Math.ceil(carrinho.filter(item => {
                            if (!searchItemTerm) return true;
                            const searchLower = searchItemTerm.toLowerCase();
                            return (
                              item.produto.nome.toLowerCase().includes(searchLower) ||
                              item.produto.referencia_interna.toLowerCase().includes(searchLower)
                            );
                          }).length / itemsPerPage))} 
                          disabled={currentItemsPage === Math.ceil(carrinho.filter(item => {
                            if (!searchItemTerm) return true;
                            const searchLower = searchItemTerm.toLowerCase();
                            return (
                              item.produto.nome.toLowerCase().includes(searchLower) ||
                              item.produto.referencia_interna.toLowerCase().includes(searchLower)
                            );
                          }).length / itemsPerPage)}
                        >
                          <ChevronRight className="h-4 w-4" />
                          <ChevronRight className="h-4 w-4 -ml-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                <div className="flex items-center justify-end gap-8">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                    <p className="text-3xl font-bold text-success">{formatCurrency(calcularTotal())}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Total Líquido (Datasul)</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(calcularTotalLiquido())}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
              </div>
            )}
          </Card>

          <IntegracaoDatasulLog vendaId={editandoVendaId || undefined} />

          <ProdutoSearchDialog
            open={showProdutoSearch}
            onOpenChange={setShowProdutoSearch}
            onSelectProduto={handleAddProduto}
          />

          <ClienteSearchDialog
            open={showClienteSearch}
            onOpenChange={setShowClienteSearch}
            onSelectCliente={handleSelectCliente}
          />
        </div>
      </>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Filtros - Fixo */}
      <VendasFilters
        view={view as "pipeline" | "list"}
        onViewChange={(v) => setView(v)}
        onFilterChange={(newFilters) =>
          setFiltros((prev) => ({
            ...prev,
            ...newFilters,
          }))
        }
        onCriarVendaTeste={handleCriarVendaTeste}
        isCreatingTest={isCreatingTest}
        onNovaOportunidade={() => setView("nova")}
      />

      {/* Conteúdo principal - flex-1 */}
      <div className="flex-1 overflow-hidden">
        {view === "pipeline" ? (
          <PipelineKanban
            vendas={filteredVendas as any}
            onDragEnd={(result) => {
              const { source, destination, draggableId } = result;
              
              if (!destination) return;
              if (source.droppableId === destination.droppableId && source.index === destination.index) return;
              
              const novaEtapa = destination.droppableId as EtapaPipeline;
              handleMoverCard(draggableId, novaEtapa);
            }}
            onViewDetails={(venda) => {
              navigate(`/vendas/${venda.id}`);
            }}
          />
        ) : (
          <div className="h-full overflow-auto px-8 py-6">
            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  placeholder="Buscar por número, cliente, CNPJ ou status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {filteredVendas.length} {filteredVendas.length === 1 ? "venda" : "vendas"}
              </span>
            </div>

            {/* Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendas.map((venda) => (
                      <TableRow key={venda.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-success font-semibold">{venda.numero_venda}</TableCell>
                        <TableCell>{venda.cliente_nome}</TableCell>
                        <TableCell className="font-mono text-sm">{venda.cliente_cnpj || "-"}</TableCell>
                        <TableCell>{new Date(venda.data_venda).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(venda.valor_final)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusColor(venda.status)}>{venda.status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{venda.vendas_itens?.length || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/vendas/${venda.id}`)}
                              title="Editar venda"
                            >
                              <Edit size={16} />
                            </Button>
                            {venda.status === "rascunho" && !venda.aprovado_em && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-success hover:text-success hover:bg-success/10"
                                onClick={() => handleAprovarVenda(venda)}
                                title="Aprovar venda"
                              >
                                <CheckCircle size={16} />
                              </Button>
                            )}
                            {venda.aprovado_em && (
                              <Badge variant="outline" className="text-success border-success">
                                ✓ Aprovada
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ProdutoSearchDialog
        open={showProdutoSearch}
        onOpenChange={setShowProdutoSearch}
        onSelectProduto={handleAddProduto}
      />
      <ClienteSearchDialog
        open={showClienteSearch}
        onOpenChange={setShowClienteSearch}
        onSelectCliente={handleSelectCliente}
      />
      <AprovarVendaDialog
        open={!!vendaParaAprovar}
        onOpenChange={(open) => !open && setVendaParaAprovar(null)}
        onConfirm={confirmarAprovacao}
        vendaNumero={vendaParaAprovar?.numero || ""}
        vendaValor={vendaParaAprovar?.valor || 0}
        isLoading={aprovarVenda.isPending}
      />
    </div>
  );
}
