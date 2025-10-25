import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Edit, UserPlus, FileText, DollarSign, Users, Calendar, Briefcase, TrendingUp, CheckCircle2, Clock, MessageSquare, Target, Package, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import NovoContatoDialog from "@/components/cliente/NovoContatoDialog";
import NovaOportunidadeDialog from "@/components/cliente/NovaOportunidadeDialog";
import WhatsAppChat from "@/components/cliente/WhatsAppChat";
import HistoricoProdutos from "@/components/cliente/HistoricoProdutos";
export default function ClienteDetalhes() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [novoContatoOpen, setNovoContatoOpen] = useState(false);
  const [novaOportunidadeOpen, setNovaOportunidadeOpen] = useState(false);
  const [whatsappChatOpen, setWhatsappChatOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [historicoProdutosOpen, setHistoricoProdutosOpen] = useState(false);
  const [filtroContatos, setFiltroContatos] = useState("");
  const [iniciandoLigacao, setIniciandoLigacao] = useState(false);
  const {
    data: cliente,
    isLoading
  } = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const {
        data: clienteData,
        error: clienteError
      } = await supabase.from("clientes").select(`
          *,
          conta:contas(*)
        `).eq("id", id).single();
      if (clienteError) throw clienteError;

      // Buscar contatos relacionados
      const {
        data: contatos,
        error: contatosError
      } = await supabase.from("contatos").select("*").eq("cliente_id", id);
      if (contatosError) throw contatosError;

      // Buscar endereços do cliente
      const {
        data: enderecos,
        error: enderecosError
      } = await supabase.from("enderecos_clientes").select("*").eq("cliente_id", id);
      if (enderecosError) throw enderecosError;
      return {
        ...clienteData,
        contatos: contatos || [],
        enderecos: enderecos || []
      };
    },
    enabled: !!id
  });

  // Buscar estatísticas de vendas
  const {
    data: stats
  } = useQuery({
    queryKey: ["cliente-stats", id],
    queryFn: async () => {
      // Buscar vendas pelo CNPJ do cliente
      const {
        data: vendas
      } = await supabase.from("vendas").select("*").eq("cliente_cnpj", cliente?.cgc);

      // Vendas em aberto (não concluídas/perdidas)
      const vendasAbertas = vendas?.filter(v => v.status !== 'concluida' && v.status !== 'perdida' && v.status !== 'cancelada') || [];

      // Última venda
      const ultimaVenda = vendas?.sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime())[0];

      // Último contato (usando data de criação dos contatos como proxy)
      const ultimoContato = cliente?.contatos?.sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
      return {
        totalOportunidades: vendas?.length || 0,
        oportunidadesAbertas: vendasAbertas.length,
        valorTotalOportunidades: vendas?.reduce((sum, v) => sum + (v.valor_total || 0), 0) || 0,
        ultimaVenda,
        ultimoContato
      };
    },
    enabled: !!cliente?.cgc
  });
  if (isLoading) {
    return <div className="px-4 py-6 space-y-6 max-w-full">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>;
  }
  if (!cliente) {
    return <div className="px-4 py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Cliente não encontrado</p>
          <Button onClick={() => navigate("/clientes")} className="mt-4">
            Voltar para Clientes
          </Button>
        </div>
      </div>;
  }
  const enderecoPrincipal = cliente.enderecos?.find((e: any) => e.is_principal) || cliente.enderecos?.[0];

  // Calcular preenchimento do perfil
  const calcularPreenchimento = () => {
    const campos = [{
      campo: 'nome_abrev',
      peso: 1
    }, {
      campo: 'cgc',
      peso: 1
    }, {
      campo: 'e_mail',
      peso: 1
    }, {
      campo: 'telefone1',
      peso: 1
    }, {
      campo: 'ins_estadual',
      peso: 1
    }, {
      campo: 'lim_credito',
      peso: 1,
      validacao: (val: any) => val > 0
    }, {
      campo: 'atividade',
      peso: 1
    }, {
      campo: 'enderecos',
      peso: 1.5,
      validacao: (val: any) => val && val.length > 0
    }, {
      campo: 'contatos',
      peso: 1.5,
      validacao: (val: any) => val && val.length > 0
    }];
    let preenchidos = 0;
    let total = 0;
    campos.forEach(({
      campo,
      peso,
      validacao
    }) => {
      total += peso;
      const valor = cliente[campo as keyof typeof cliente];
      if (validacao) {
        if (validacao(valor)) preenchidos += peso;
      } else {
        if (valor && valor !== '' && valor !== 0) preenchidos += peso;
      }
    });
    return Math.round(preenchidos / total * 100);
  };
  const preenchimento = calcularPreenchimento();
  
  const iniciarLigacao = async (telefone: string, nomeContato?: string, contatoId?: string) => {
    if (!telefone) {
      toast({
        title: "Número não disponível",
        description: "Este contato não possui número de telefone cadastrado",
        variant: "destructive"
      });
      return;
    }

    setIniciandoLigacao(true);
    try {
      const { data, error } = await supabase.functions.invoke('zenvia-iniciar-ligacao', {
        body: {
          numero_destino: telefone,
          nome_cliente: nomeContato || cliente?.nome_abrev || 'Cliente',
          cliente_id: id,
          contato_id: contatoId
        }
      });

      if (error) throw error;

      toast({
        title: "Ligação iniciada",
        description: `Chamada para ${telefone} em andamento`,
      });
      
      // Recarregar histórico de ligações
      queryClient.invalidateQueries({ queryKey: ["historico-ligacoes", id] });
    } catch (error) {
      console.error('Erro ao iniciar ligação:', error);
      toast({
        title: "Erro ao iniciar ligação",
        description: error.message || "Não foi possível iniciar a ligação",
        variant: "destructive"
      });
    } finally {
      setIniciandoLigacao(false);
    }
  };
  
  // Buscar histórico de ligações
  const {
    data: historicoLigacoes = []
  } = useQuery({
    queryKey: ["historico-ligacoes", id],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("historico_ligacoes").select("*").eq("cliente_id", id).order("iniciada_em", {
        ascending: false
      });
      if (error) throw error;
      
      // Buscar nomes dos usuários separadamente se necessário
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(l => l.iniciada_por).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: perfis } = await supabase
            .from("perfis_usuario")
            .select("id, nome_completo")
            .in("id", userIds);
          
          if (perfis) {
            return data.map(ligacao => ({
              ...ligacao,
              iniciada_por_perfil: perfis.find(p => p.id === ligacao.iniciada_por)
            }));
          }
        }
      }
      
      return data || [];
    },
    enabled: !!id
  });

  const getPreenchimentoColor = (percentual: number) => {
    if (percentual >= 80) return 'text-success';
    if (percentual >= 50) return 'text-secondary';
    return 'text-destructive';
  };
  const getPreenchimentoStatus = (percentual: number) => {
    if (percentual >= 80) return 'Excelente';
    if (percentual >= 50) return 'Bom';
    return 'Incompleto';
  };
  return <div className="px-4 py-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              {cliente.nome_abrev?.substring(0, 2).toUpperCase() || "CL"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{cliente.nome_abrev || cliente.nome_emit}</h1>
                <Badge variant="secondary" className="text-xs">Normal</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Código: {cliente.cod_emitente || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setHistoricoProdutosOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Produtos Comprados
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setNovaOportunidadeOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Nova Oportunidade
          </Button>
          <Button variant="default" size="sm" className="bg-primary">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/vendas?cliente=${cliente.cgc}`)}>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total de Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold">{stats?.totalOportunidades || 0}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              R$ {(stats?.valorTotalOportunidades || 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/vendas?cliente=${cliente.cgc}&status=abertas`)}>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold text-secondary">{stats?.oportunidadesAbertas || 0}</div>
            <p className="text-xs text-secondary mt-0.5">Oportunidades ativas</p>
          </CardContent>
        </Card>

        <Card className="border-tertiary/20">
          <CardHeader className="pb-1 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-tertiary" />
                Preenchimento do Perfil
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-tertiary/10 text-tertiary border-tertiary/20">
                {preenchimento >= 80 ? 'Bom' : 'Médio'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl font-bold mb-1">{preenchimento}%</div>
            <Progress value={preenchimento} className="h-2 mb-1" />
            <p className="text-xs text-muted-foreground">completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pb-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Limite Disponível</span>
              <span className="font-medium">R$ {(cliente.limite_disponivel || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Limite de Crédito</span>
              <span className="font-medium">R$ {(cliente.lim_credito || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Condição de Pagamento</span>
              <span className="font-medium">Variável</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Sobre & Informações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sobre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome da Conta</label>
                <p className="mt-1 text-sm">{cliente.nome_abrev || cliente.nome_emit}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Razão Social</label>
                <p className="mt-1 text-sm">{cliente.nome_emit || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">CNPJ/CPF</label>
                <p className="mt-1 text-sm">{cliente.cgc || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Inscrição Estadual</label>
                <p className="mt-1 text-sm">{cliente.ins_estadual || "-"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <p className="mt-1 text-sm">{cliente.identific || "Cliente"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Natureza</label>
                <p className="mt-1 text-sm">{cliente.natureza || "Jurídica"}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Setor/Atividade</label>
                <p className="mt-1 text-sm">{cliente.atividade || "CONS. FINAL"}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">SUFRAMA</label>
                <p className="mt-1 text-sm">{cliente.cod_suframa || "-"}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Equipe de Vendas</label>
                <p className="mt-1 text-sm">{cliente.equipevendas || "-"}</p>
              </div>
            </div>
          </CardContent>

          <Separator className="my-0" />

          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Informações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                  <p className="mt-1 text-sm">{cliente.telefone1 || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <p className="mt-1 text-sm break-all">{cliente.e_mail || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Email Financeiro</label>
                  <p className="mt-1 text-sm break-all">{cliente.email_financeiro || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Email XML</label>
                  <p className="mt-1 text-sm break-all">{cliente.email_xml || "-"}</p>
                </div>
              </div>
            </div>

            {enderecoPrincipal && <>
                <Separator className="my-2" />
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Endereço Principal</label>
                    <p className="mt-1 text-sm">
                      {enderecoPrincipal.endereco}
                      {enderecoPrincipal.bairro && `, ${enderecoPrincipal.bairro}`}
                    </p>
                  </div>
                </div>
              </>}
          </CardContent>

          <Separator className="my-0" />

          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereços ({cliente.enderecos?.length || 0})
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">Ver Todos</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {cliente.enderecos && cliente.enderecos.length > 0 ? cliente.enderecos.slice(0, 4).map((endereco: any) => <div key={endereco.id} className="p-3 rounded-lg border space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-xs">{endereco.tipo || "principal"}</p>
                    {endereco.is_principal && <Badge variant="secondary" className="text-xs bg-tertiary/10 text-tertiary border-tertiary/20">Principal</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {endereco.endereco}
                    {endereco.bairro && `, ${endereco.bairro}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {endereco.cidade} - {endereco.estado}, {endereco.cep}
                  </p>
                </div>) : <div className="text-center py-6 text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum endereço cadastrado</p>
              </div>}
          </CardContent>
        </Card>

        {/* Middle Column - Contatos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contatos ({cliente.contatos?.length || 0})
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setNovoContatoOpen(true)}>
              <UserPlus className="h-3 w-3 mr-1" />
              Novo
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filtro de Contatos */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contatos..." value={filtroContatos} onChange={e => setFiltroContatos(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>

            {cliente.contatos && cliente.contatos.length > 0 ? cliente.contatos.filter((contato: any) => {
            const searchTerm = filtroContatos.toLowerCase();
            return contato.nome_completo?.toLowerCase().includes(searchTerm) || contato.email?.toLowerCase().includes(searchTerm) || contato.cargo?.toLowerCase().includes(searchTerm) || contato.departamento?.toLowerCase().includes(searchTerm) || contato.telefone?.includes(searchTerm) || contato.celular?.includes(searchTerm);
          }).map((contato: any) => <div key={contato.id} className="p-3 rounded-lg border space-y-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-medium text-sm flex-shrink-0">
                        {contato.primeiro_nome?.charAt(0)}{contato.sobrenome?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{contato.nome_completo}</p>
                          {contato.esta_ativo && <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                              Ativo
                            </Badge>}
                        </div>
                        
                        {contato.cargo && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            <span className="truncate">{contato.cargo}</span>
                          </div>}
                        
                        {contato.departamento && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{contato.departamento}</span>
                          </div>}
                        
                        {contato.email && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{contato.email}</span>
                          </div>}
                        
                        {contato.telefone && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{contato.telefone}</span>
                          </div>}

                        {contato.celular && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            <span>{contato.celular}</span>
                          </div>}

                        {(contato.status_lead || contato.origem_lead) && <div className="flex gap-2 pt-1">
                            {contato.status_lead && <Badge variant="secondary" className="text-xs">
                                {contato.status_lead}
                              </Badge>}
                            {contato.origem_lead && <Badge variant="outline" className="text-xs">
                                {contato.origem_lead}
                              </Badge>}
                          </div>}
                      </div>
                    </div>
                    
                    {/* Ações de CRM */}
                    <div className="flex gap-2">
                      {contato.telefone && <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 h-8 text-xs" 
                          onClick={() => iniciarLigacao(contato.telefone, contato.nome_completo, contato.id)}
                          disabled={iniciandoLigacao}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          {iniciandoLigacao ? 'Ligando...' : 'Ligar'}
                        </Button>}
                      {contato.email && <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => window.open(`mailto:${contato.email}`, '_blank')}>
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>}
                      {contato.celular && <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => {
                setSelectedContact(contato);
                setWhatsappChatOpen(true);
              }}>
                          <MessageSquare className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>}
                    </div>
                  </div>) : <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhum contato cadastrado</p>
              </div>}
          </CardContent>
        </Card>

        {/* Right Column - Histórico de Ligações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Histórico de Ligações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historicoLigacoes.length === 0 ? <div className="text-center py-6 text-muted-foreground">
                <Phone className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma ligação registrada</p>
              </div> : <div className="space-y-3">
                {historicoLigacoes.map((ligacao: any) => <div key={ligacao.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${ligacao.status === 'atendida' ? 'bg-success/10 text-success' : ligacao.status === 'nao_atendida' ? 'bg-secondary/10 text-secondary' : ligacao.status === 'erro' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                      <Phone className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {ligacao.nome_contato || 'Sem nome'}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(ligacao.iniciada_em).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {ligacao.numero_destino}
                      </p>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${ligacao.status === 'atendida' ? 'bg-success/10 text-success' : ligacao.status === 'nao_atendida' ? 'bg-secondary/10 text-secondary' : ligacao.status === 'erro' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                          {ligacao.status === 'atendida' ? 'Atendida' : ligacao.status === 'nao_atendida' ? 'Não atendida' : ligacao.status === 'erro' ? 'Erro' : ligacao.status === 'ocupado' ? 'Ocupado' : 'Chamando'}
                        </span>
                        {ligacao.duracao_segundos && <span className="text-muted-foreground">
                            {Math.floor(ligacao.duracao_segundos / 60)}m {ligacao.duracao_segundos % 60}s
                          </span>}
                        {ligacao.iniciada_por_perfil?.nome_completo && <span className="text-muted-foreground truncate">
                            por {ligacao.iniciada_por_perfil.nome_completo}
                          </span>}
                      </div>
                      {ligacao.motivo_falha && <p className="text-xs text-destructive truncate">
                          {ligacao.motivo_falha}
                        </p>}
                    </div>
                  </div>)}
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <NovoContatoDialog open={novoContatoOpen} onOpenChange={setNovoContatoOpen} clienteId={id!} contaId={cliente.conta_id} />

      <NovaOportunidadeDialog open={novaOportunidadeOpen} onOpenChange={setNovaOportunidadeOpen} clienteId={id!} contaId={cliente.conta_id} />

      {selectedContact && <WhatsAppChat open={whatsappChatOpen} onOpenChange={setWhatsappChatOpen} contactName={selectedContact.nome_completo} contactInitials={`${selectedContact.primeiro_nome?.charAt(0) || ''}${selectedContact.sobrenome?.charAt(0) || ''}`} phoneNumber={selectedContact.celular} contactId={selectedContact.id} />}

      <HistoricoProdutos open={historicoProdutosOpen} onOpenChange={setHistoricoProdutosOpen} clienteCnpj={cliente.cgc} clienteNome={cliente.nome_abrev || cliente.nome_emit} />
    </div>;
}