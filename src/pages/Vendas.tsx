import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Eye, Trash2, ShoppingCart, Save, Users, Edit, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useVendas } from "@/hooks/useVendas";
import { useCondicoesPagamento } from "@/hooks/useCondicoesPagamento";
import { useTiposFrete } from "@/hooks/useTiposFrete";
import { useTiposPedido } from "@/hooks/useTiposPedido";
import { useVendedores } from "@/hooks/useVendedores";
import { useHierarquia } from "@/hooks/useHierarquia";
import { ProdutoSearchDialog } from "@/components/ProdutoSearchDialog";
import { ClienteSearchDialog } from "@/components/ClienteSearchDialog";
import { VendasActionBar } from "@/components/VendasActionBar";
import { VendasFilters } from "@/components/vendas/VendasFilters";
import { PipelineKanban, EtapaPipeline } from "@/components/vendas/PipelineKanban";
import { AprovarVendaDialog } from "@/components/vendas/AprovarVendaDialog";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
}
export default function Vendas() {
  const {
    vendas,
    isLoading,
    createVenda,
    addItem,
    updateVenda,
    updateItem,
    removeItem,
    aprovarVenda
  } = useVendas();
  const {
    condicoes,
    isLoading: isLoadingCondicoes
  } = useCondicoesPagamento();
  const {
    tipos: tiposFrete,
    isLoading: isLoadingTiposFrete
  } = useTiposFrete();
  const {
    tipos: tiposPedido,
    isLoading: isLoadingTiposPedido
  } = useTiposPedido();
  const { vendedores, isLoading: isLoadingVendedores } = useVendedores();
  const { ehGestor, subordinados, nivelHierarquico } = useHierarquia();
  const { user } = useAuth();
  const {
    toast
  } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"pipeline" | "list" | "nova">("pipeline");
  const [showProdutoSearch, setShowProdutoSearch] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [editandoVendaId, setEditandoVendaId] = useState<string | null>(null);
  const [vendaParaAprovar, setVendaParaAprovar] = useState<{ id: string; numero: string; valor: number } | null>(null);

  // Filtros state
  const [filtros, setFiltros] = useState({
    pipeline: "todos",
    responsavel: "todos",
    status: "todos",
    periodo: "mes",
    ordenacao: "recente"
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
    return vendedores.filter(v => ids.has(v.id));
  }, [vendedores, subordinados, user?.id, nivelHierarquico]);

  // Mapa de nomes das etapas para mensagens
  const ETAPAS_LABELS: Record<EtapaPipeline, string> = {
    prospeccao: "Prospecção",
    qualificacao: "Qualificação",
    proposta: "Proposta",
    negociacao: "Negociação",
    fechamento: "Fechamento",
    ganho: "Ganho",
    perdido: "Perdido"
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
      resultado = resultado.filter(v => v.numero_venda.toLowerCase().includes(searchTerm.toLowerCase()) || v.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) || v.cliente_cnpj && v.cliente_cnpj.includes(searchTerm) || v.status.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Filtro de status
    if (filtros.status !== "todos") {
      resultado = resultado.filter(v => v.status === filtros.status);
    }

    // Filtro de responsável (assumindo que há um campo responsavel_id)
    if (filtros.responsavel === "eu") {
      // Aqui você deve usar o ID do usuário logado
      resultado = resultado.filter(v => v.responsavel_id);
    } else if (filtros.responsavel === "sem") {
      resultado = resultado.filter(v => !v.responsavel_id);
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
      resultado = resultado.filter(v => {
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
      currency: "BRL"
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
    const existingItem = carrinho.find(item => item.produto.id === produto.id);
    if (existingItem) {
      setCarrinho(carrinho.map(item => item.produto.id === produto.id ? {
        ...item,
        quantidade: item.quantidade + 1,
        valor_total: (item.quantidade + 1) * item.produto.preco_venda * (1 - item.desconto / 100)
      } : item));
    } else {
      setCarrinho([...carrinho, {
        produto,
        quantidade: 1,
        desconto: 0,
        valor_total: produto.preco_venda
      }]);
    }
    toast({
      title: "Produto adicionado!",
      description: `${produto.nome} foi adicionado ao carrinho.`,
      variant: "success"
    });
  };
  const handleUpdateQuantidade = (index: number, quantidade: number) => {
    if (quantidade <= 0) return;
    setCarrinho(carrinho.map((item, i) => i === index ? {
      ...item,
      quantidade,
      valor_total: quantidade * item.produto.preco_venda * (1 - item.desconto / 100)
    } : item));
  };
  const handleUpdateDesconto = (index: number, desconto: number) => {
    if (desconto < 0 || desconto > 100) return;
    setCarrinho(carrinho.map((item, i) => i === index ? {
      ...item,
      desconto,
      valor_total: item.quantidade * item.produto.preco_venda * (1 - desconto / 100)
    } : item));
  };
  const handleRemoveItem = (index: number) => {
    setCarrinho(carrinho.filter((_, i) => i !== index));
  };
  const calcularTotal = () => {
    return carrinho.reduce((sum, item) => sum + item.valor_total, 0);
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
      valor_total: item.valor_total
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
  const handleCalcular = () => {
    toast({
      title: "Calculando proposta",
      description: "Valores atualizados com sucesso."
    });
  };
  const handleCancelarProposta = () => {
    limparFormulario();
    setView("pipeline");
  };
  const handleDiretoria = () => {
    toast({
      title: "Enviar para Diretoria",
      description: "Proposta enviada para aprovação da diretoria."
    });
  };
  const handleEfetivar = async () => {
    if (!clienteNome.trim()) {
      toast({
        title: "Erro",
        description: "Selecione ou informe o cliente",
        variant: "destructive"
      });
      return;
    }
    if (carrinho.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda",
        variant: "destructive"
      });
      return;
    }
    setStatus("aprovada");
    await handleSalvarVenda();
  };
  const handleSalvarVenda = async () => {
    if (!clienteNome.trim()) {
      toast({
        title: "Erro",
        description: "Selecione ou informe o cliente",
        variant: "destructive"
      });
      return;
    }
    
    // Validação do CNPJ/CPF
    if (!clienteCnpj || clienteCnpj.trim() === "") {
      toast({
        title: "Erro",
        description: "Selecione um cliente com CNPJ/CPF válido",
        variant: "destructive"
      });
      return;
    }
    
    if (carrinho.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda",
        variant: "destructive"
      });
      return;
    }

    // Validar vínculo do cliente - SEMPRE usando o usuário logado como dono
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    // Checar se é admin para permitir bypass
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin');

    console.log('📋 Contexto completo antes da validação:', {
      currentUserId: currentUser.id,
      currentUserEmail: currentUser.email,
      userRoles: userRoles?.map(r => r.role) || [],
      isAdmin,
      editandoVendaId,
      clienteNome,
      clienteCnpj,
      clienteCnpjLength: clienteCnpj.length,
      clienteCnpjTipo: typeof clienteCnpj,
      nivelHierarquico
    });

    // Se não for edição E não for admin, validar que o usuário logado é dono do cliente
    if (!editandoVendaId && !isAdmin) {
      const { data: temAcesso, error: erroAcesso } = await supabase.rpc('can_access_cliente_por_cgc', {
        _user_id: currentUser.id, // SEMPRE valida auth.uid()
        _cgc: clienteCnpj
      });

      console.log('🔍 Resultado validação de dono:', {
        temAcessoComoDono: temAcesso,
        erroAcesso,
        clienteCnpjPassado: clienteCnpj
      });

      if (erroAcesso) {
        console.error('❌ Erro ao validar vínculo:', erroAcesso);
      }

      if (!temAcesso) {
        toast({
          title: "Permissão negada",
          description: "Você não é o responsável (dono) por este cliente. Selecione um cliente que esteja vinculado a você.",
          variant: "destructive"
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
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpj || null,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status,
          condicao_pagamento_id: condicaoPagamentoId || null,
          tipo_frete_id: tipoFreteId || null,
          tipo_pedido_id: tipoPedidoId || null,
          observacoes: observacoes || null,
          etapa_pipeline: etapaPipeline,
          valor_estimado: valorEstimado,
          probabilidade,
          data_fechamento_prevista: dataFechamentoPrevista || null,
          motivo_perda: motivoPerda || null,
          origem_lead: origemLead || null,
          responsavel_id: responsavelId || null,
          vendedor_id: vendedorId || null
        });

        // Remover itens antigos e adicionar novos
        const vendaAtual = vendas.find(v => v.id === editandoVendaId);
        if (vendaAtual?.vendas_itens) {
          for (const item of vendaAtual.vendas_itens) {
            await removeItem.mutateAsync(item.id);
          }
        }
        for (const item of carrinho) {
          await addItem.mutateAsync({
            venda_id: editandoVendaId,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            desconto: item.desconto,
            valor_total: item.valor_total
          });
        }
        toast({
          title: "Venda atualizada!",
          description: "A venda foi atualizada com sucesso."
        });
      } else {
        // Criar nova venda
        // Para não-admin: sempre usa currentUser.id (trigger irá forçar)
        // Para admin: pode escolher vendedor ou deixar vazio (trigger define)
        const finalVendedorId = isAdmin && vendedorId ? vendedorId : currentUser.id;
        
        // Buscar equipe do vendedor
        const { data: membroEquipe } = await supabase
          .from('membros_equipe')
          .select('equipe_id, equipes!inner(esta_ativa)')
          .eq('usuario_id', finalVendedorId)
          .eq('esta_ativo', true)
          .eq('equipes.esta_ativa', true)
          .limit(1)
          .single();
        
        const equipeId = membroEquipe?.equipe_id || null;
        
        // Verificar role do usuário para diagnóstico
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);
        
        console.log('🚀 Criando venda:', {
          vendedorIdSelecionado: vendedorId,
          currentUserId: currentUser.id,
          currentUserEmail: currentUser.email,
          userRoles: userRoles?.map(r => r.role),
          isAdmin,
          finalVendedorId,
          clienteCnpj,
          clienteNome,
          etapaPipeline,
          status,
          nivelHierarquico
        });
        
        const venda = await createVenda.mutateAsync({
          numero_venda: numeroVenda,
          cliente_nome: clienteNome,
          cliente_cnpj: clienteCnpj || null,
          valor_total: valorTotal,
          desconto: 0,
          valor_final: valorTotal,
          status,
          data_venda: new Date().toISOString(),
          condicao_pagamento_id: condicaoPagamentoId || null,
          tipo_frete_id: tipoFreteId || null,
          tipo_pedido_id: tipoPedidoId || null,
          observacoes: observacoes || null,
          etapa_pipeline: etapaPipeline,
          valor_estimado: valorEstimado,
          probabilidade,
          data_fechamento_prevista: dataFechamentoPrevista || null,
          motivo_perda: motivoPerda || null,
          origem_lead: origemLead || null,
          responsavel_id: responsavelId || null,
          vendedor_id: finalVendedorId, // Sempre tem valor: selecionado ou atual
          equipe_id: equipeId, // Equipe do vendedor
        });

        // Aguardar a invalidação do cache e adicionar itens
        if (venda && venda.id) {
          // Aguardar um pouco para garantir que a venda foi propagada
          await new Promise(resolve => setTimeout(resolve, 100));
          for (const item of carrinho) {
            await addItem.mutateAsync({
              venda_id: venda.id,
              produto_id: item.produto.id,
              quantidade: item.quantidade,
              preco_unitario: item.produto.preco_venda,
              desconto: item.desconto,
              valor_total: item.valor_total
            });
          }
        }
        toast({
          title: "Venda salva!",
          description: "A venda foi criada com sucesso."
        });
      }
      limparFormulario();
      setView("pipeline");
    } catch (error: any) {
      console.error("❌ Erro ao salvar venda:", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        clienteCnpj,
        clienteNome,
        vendedorSelecionado: vendedorId
      });
      
      // Tratamento especial para erro de RLS (Row Level Security)
      if (error?.code === '42501' || error?.message?.includes('row-level security')) {
        // Verificar novamente o acesso para diagnóstico
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: temAcesso } = await supabase.rpc('can_access_cliente_por_cgc', {
            _user_id: currentUser.id, // SEMPRE valida o usuário logado
            _cgc: clienteCnpj
          });
          
          console.error("🔍 Diagnóstico RLS após erro:", {
            currentUserId: currentUser.id,
            clienteCnpj,
            clienteNome,
            temAcessoComoDono: temAcesso,
            nivelHierarquico
          });
        }
        
        toast({
          title: "Permissão negada",
          description: "Você não é o responsável (dono) por este cliente. Apenas o vendedor responsável pode criar vendas para seus clientes.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao salvar venda",
          description: error?.message || "Não foi possível salvar a venda. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };
  const handleMoverCard = async (vendaId: string, novaEtapa: EtapaPipeline) => {
    try {
      // Validar que a etapa é um valor válido do enum
      const etapasValidas: EtapaPipeline[] = ["prospeccao", "qualificacao", "proposta", "negociacao", "fechamento", "ganho", "perdido"];
      if (!etapasValidas.includes(novaEtapa)) {
        toast({
          title: "Erro",
          description: "Etapa inválida",
          variant: "destructive"
        });
        return;
      }
      await updateVenda.mutateAsync({
        id: vendaId,
        etapa_pipeline: novaEtapa
      });
      toast({
        title: "Etapa atualizada!",
        description: `Venda movida para ${ETAPAS_LABELS[novaEtapa] || novaEtapa}`
      });
    } catch (error: any) {
      console.error("Erro ao mover card:", error);
      toast({
        title: "Erro ao atualizar etapa",
        description: error?.message || "Não foi possível mover a venda",
        variant: "destructive"
      });
    }
  };

  const handleAprovarVenda = (venda: VendaWithItems) => {
    setVendaParaAprovar({
      id: venda.id,
      numero: venda.numero_venda,
      valor: venda.valor_final
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
    return <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando vendas...</p>
        </div>
      </div>;
  }
  if (view === "nova") {
    return <>
        <VendasActionBar status={status} onCalcular={handleCalcular} onCancelar={handleCancelarProposta} onDiretoria={handleDiretoria} onEfetivar={handleEfetivar} onSalvar={handleSalvarVenda} isSaving={createVenda.isPending || updateVenda.isPending} editandoVendaId={editandoVendaId} />
        
        <div className="pt-20 p-8 space-y-6">
          {/* Header */}
          

          {/* Dados do Cliente */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Dados do Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome do cliente" readOnly className="bg-muted cursor-pointer" onClick={() => setShowClienteSearch(true)} />
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
                    onChange={e => setClienteCnpj(e.target.value)} 
                    placeholder="00.000.000/0000-00"
                    readOnly={clienteSelecionado !== null}
                    className={clienteSelecionado !== null ? "bg-muted cursor-not-allowed" : ""}
                  />
                  {clienteSelecionado && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleTrocarCliente}
                      title="Trocar cliente"
                    >
                      <Edit size={16} />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label>Condição de Pagamento</Label>
                <Select value={condicaoPagamentoId} onValueChange={setCondicaoPagamentoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingCondicoes ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : condicoes.map(cond => <SelectItem key={cond.id} value={cond.id}>
                          {cond.nome}
                        </SelectItem>)}
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
                    {isLoadingTiposFrete ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : tiposFrete.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Pedido</Label>
                <Select value={tipoPedidoId} onValueChange={setTipoPedidoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTiposPedido ? <SelectItem value="loading" disabled>Carregando...</SelectItem> : tiposPedido.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </SelectItem>)}
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
                <Input type="number" value={valorEstimado} onChange={e => setValorEstimado(Number(e.target.value))} placeholder="0.00" step="0.01" min="0" />
              </div>

              <div>
                <Label>Probabilidade (%)</Label>
                <Input type="number" value={probabilidade} onChange={e => setProbabilidade(Number(e.target.value))} placeholder="50" min="0" max="100" />
              </div>

              <div>
                <Label>Data Fechamento Prevista</Label>
                <Input type="date" value={dataFechamentoPrevista} onChange={e => setDataFechamentoPrevista(e.target.value)} />
              </div>

              <div>
                <Label>Origem do Lead</Label>
                <Input value={origemLead} onChange={e => setOrigemLead(e.target.value)} placeholder="Ex: Indicação, Site, Cold Call" />
              </div>

              {ehGestor && (
                <div>
                  <Label>Vendedor Responsável</Label>
                  <Select value={vendedorId || "current"} onValueChange={(v) => setVendedorId(v === "current" ? "" : v)}>
                    <SelectTrigger>
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

              {etapaPipeline === "perdido" && <div className="md:col-span-3">
                  <Label>Motivo da Perda</Label>
                  <Input value={motivoPerda} onChange={e => setMotivoPerda(e.target.value)} placeholder="Descreva por que a oportunidade foi perdida..." />
                </div>}
            </div>

            <div className="mt-4">
              <Label>Observações</Label>
              <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações sobre a venda..." />
            </div>
          </Card>

          {/* Produtos no Carrinho */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Produtos</h3>
              <Button type="button" onClick={() => setShowProdutoSearch(true)}>
                <Plus size={16} className="mr-2" />
                Adicionar Produto
              </Button>
            </div>

            {carrinho.length > 0 ? <>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-center">Desc. %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carrinho.map((item, index) => <TableRow key={index}>
                          <TableCell className="font-mono">
                            {item.produto.referencia_interna}
                          </TableCell>
                          <TableCell>{item.produto.nome}</TableCell>
                          <TableCell className="text-center">
                            <Input type="number" value={item.quantidade} onChange={e => handleUpdateQuantidade(index, Number(e.target.value))} className="w-20 text-center" min="1" />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.produto.preco_venda)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input type="number" value={item.desconto} onChange={e => handleUpdateDesconto(index, Number(e.target.value))} className="w-20 text-center" min="0" max="100" />
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.valor_total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)}>
                              <Trash2 size={16} className="text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">
                      Valor Total
                    </p>
                    <p className="text-3xl font-bold text-success">
                      {formatCurrency(calcularTotal())}
                    </p>
                  </div>
                </div>
              </> : <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.
              </div>}
          </Card>

          <ProdutoSearchDialog open={showProdutoSearch} onOpenChange={setShowProdutoSearch} onSelectProduto={handleAddProduto} />
          
          <ClienteSearchDialog open={showClienteSearch} onOpenChange={setShowClienteSearch} onSelectCliente={handleSelectCliente} />
        </div>
      </>;
  }

  // Pipeline / List Views
  return <div className="p-8">
      {/* Filtros com toggle de view */}
      <VendasFilters view={view as "pipeline" | "list"} onViewChange={v => setView(v)} onFilterChange={newFilters => setFiltros(prev => ({
      ...prev,
      ...newFilters
    }))} />

      <div className="pt-6">
        {view === "pipeline" ? <PipelineKanban vendas={filteredVendas.map(v => ({
        id: v.id,
        numero_venda: v.numero_venda,
        cliente_nome: v.cliente_nome,
        valor_estimado: (v as any).valor_estimado || 0,
        valor_total: v.valor_total,
        probabilidade: (v as any).probabilidade || 50,
        etapa_pipeline: (v as any).etapa_pipeline || 'prospeccao',
        data_fechamento_prevista: (v as any).data_fechamento_prevista,
        responsavel_id: (v as any).responsavel_id
      }))} onMoverCard={handleMoverCard} onEditarVenda={venda => {
        const vendaCompleta = vendas.find(v => v.id === venda.id);
        if (vendaCompleta) handleEditarVenda(vendaCompleta);
      }} onNovaVenda={() => setView("nova")} /> : <>
            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input placeholder="Buscar por número, cliente, CNPJ ou status..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
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
                  {filteredVendas.length === 0 ? <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma venda encontrada
                      </TableCell>
                    </TableRow> : filteredVendas.map(venda => <TableRow key={venda.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-success font-semibold">
                          {venda.numero_venda}
                        </TableCell>
                        <TableCell>{venda.cliente_nome}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {venda.cliente_cnpj || "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(venda.data_venda).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(venda.valor_final)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusColor(venda.status)}>
                            {venda.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {venda.vendas_itens?.length || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditarVenda(venda)}
                              title="Editar venda"
                            >
                              <Edit size={16} />
                            </Button>
                            {venda.status === 'rascunho' && !venda.aprovado_em && (
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
                      </TableRow>)}
                </TableBody>
              </Table>
            </Card>
          </>}
      </div>

      {/* Dialogs */}
      <ProdutoSearchDialog open={showProdutoSearch} onOpenChange={setShowProdutoSearch} onSelectProduto={handleAddProduto} />
      <ClienteSearchDialog open={showClienteSearch} onOpenChange={setShowClienteSearch} onSelectCliente={handleSelectCliente} />
      <AprovarVendaDialog
        open={!!vendaParaAprovar}
        onOpenChange={(open) => !open && setVendaParaAprovar(null)}
        onConfirm={confirmarAprovacao}
        vendaNumero={vendaParaAprovar?.numero || ""}
        vendaValor={vendaParaAprovar?.valor || 0}
        isLoading={aprovarVenda.isPending}
      />
    </div>;
}