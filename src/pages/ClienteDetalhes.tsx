import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Edit,
  UserPlus,
  FileText,
  DollarSign,
  Users,
  Calendar,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  MessageSquare
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NovoContatoDialog from "@/components/cliente/NovoContatoDialog";
import NovaOportunidadeDialog from "@/components/cliente/NovaOportunidadeDialog";

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [novoContatoOpen, setNovoContatoOpen] = useState(false);
  const [novaOportunidadeOpen, setNovaOportunidadeOpen] = useState(false);

  const { data: cliente, isLoading } = useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select(`
          *,
          conta:contas(*)
        `)
        .eq("id", id)
        .single();

      if (clienteError) throw clienteError;

      // Buscar contatos relacionados
      const { data: contatos, error: contatosError } = await supabase
        .from("contatos")
        .select("*")
        .eq("cliente_id", id);

      if (contatosError) throw contatosError;

      // Buscar endereços do cliente
      const { data: enderecos, error: enderecosError } = await supabase
        .from("enderecos_clientes")
        .select("*")
        .eq("cliente_id", id);

      if (enderecosError) throw enderecosError;

      return {
        ...clienteData,
        contatos: contatos || [],
        enderecos: enderecos || []
      };
    },
    enabled: !!id,
  });

  // Buscar estatísticas de oportunidades
  const { data: stats } = useQuery({
    queryKey: ["cliente-stats", id],
    queryFn: async () => {
      // Total de oportunidades
      const { data: oportunidades } = await supabase
        .from("oportunidades")
        .select("*")
        .eq("conta_id", cliente?.conta_id);

      // Oportunidades em aberto
      const oportunidadesAbertas = oportunidades?.filter(o => !o.esta_fechada) || [];
      
      // Última oportunidade
      const ultimaOportunidade = oportunidades?.sort((a, b) => 
        new Date(b.criado_em!).getTime() - new Date(a.criado_em!).getTime()
      )[0];

      // Última venda (oportunidade ganha)
      const ultimaVenda = oportunidades?.filter(o => o.foi_ganha)
        .sort((a, b) => 
          new Date(b.fechada_em!).getTime() - new Date(a.fechada_em!).getTime()
        )[0];

      // Último contato (usando data de criação dos contatos como proxy)
      const ultimoContato = cliente?.contatos?.sort((a: any, b: any) => 
        new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
      )[0];

      return {
        totalOportunidades: oportunidades?.length || 0,
        oportunidadesAbertas: oportunidadesAbertas.length,
        valorTotalOportunidades: oportunidades?.reduce((sum, o) => sum + (o.valor || 0), 0) || 0,
        ultimaOportunidade,
        ultimaVenda,
        ultimoContato,
      };
    },
    enabled: !!cliente?.conta_id,
  });

  if (isLoading) {
    return (
    <div className="px-4 py-6 space-y-6 max-w-full">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="px-4 py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Cliente não encontrado</p>
          <Button onClick={() => navigate("/clientes")} className="mt-4">
            Voltar para Clientes
          </Button>
        </div>
      </div>
    );
  }

  const enderecoPrincipal = cliente.enderecos?.find((e: any) => e.is_principal) || cliente.enderecos?.[0];

  return (
    <div className="px-4 py-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/clientes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {cliente.nome_abrev?.substring(0, 2).toUpperCase() || "CL"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{cliente.nome_abrev || cliente.nome_emit}</h1>
                {cliente.ind_cre_cli && (
                  <Badge variant="secondary">{cliente.ind_cre_cli}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Código: {cliente.cod_emitente || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNovoContatoOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Contato
          </Button>
          <Button variant="outline" onClick={() => setNovaOportunidadeOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Nova Oportunidade
          </Button>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Oportunidades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOportunidades || 0}</div>
            <p className="text-xs text-muted-foreground">
              R$ {(stats?.valorTotalOportunidades || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.oportunidadesAbertas || 0}</div>
            <p className="text-xs text-muted-foreground">Oportunidades ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Proposta</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.ultimaOportunidade ? (
              <>
                <div className="text-sm font-medium truncate">
                  {stats.ultimaOportunidade.nome_oportunidade}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(stats.ultimaOportunidade.criado_em!).toLocaleDateString('pt-BR')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma proposta</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Venda</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.ultimaVenda ? (
              <>
                <div className="text-sm font-medium truncate">
                  R$ {(stats.ultimaVenda.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(stats.ultimaVenda.fechada_em!).toLocaleDateString('pt-BR')}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma venda</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Sobre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome da Conta</label>
                  <p className="mt-1">{cliente.conta?.nome_conta || cliente.nome_abrev}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                  <p className="mt-1">{cliente.nome_emit || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNPJ/CPF</label>
                  <p className="mt-1">{cliente.cgc || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Inscrição Estadual</label>
                  <p className="mt-1">{cliente.ins_estadual || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p className="mt-1">{cliente.identific || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Natureza</label>
                  <p className="mt-1">{cliente.natureza || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Setor/Atividade</label>
                  <p className="mt-1">{cliente.atividade || cliente.conta?.setor || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Coligada</label>
                  <p className="mt-1">{cliente.coligada || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SUFRAMA</label>
                  <p className="mt-1">{cliente.cod_suframa || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Equipe de Vendas</label>
                  <p className="mt-1">{cliente.equipevendas || "-"}</p>
                </div>
              </div>

              {cliente.observacoes && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações</label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{cliente.observacoes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contato Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                    <p className="mt-1">{cliente.telefone1 || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="mt-1 break-all">{cliente.e_mail || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Financeiro</label>
                    <p className="mt-1 break-all">{cliente.email_financeiro || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email XML</label>
                    <p className="mt-1 break-all">{cliente.email_xml || "-"}</p>
                  </div>
                </div>
              </div>

              {enderecoPrincipal && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-muted-foreground">Endereço Principal</label>
                      <p className="mt-1">
                        {enderecoPrincipal.endereco}, {enderecoPrincipal.bairro}
                        <br />
                        {enderecoPrincipal.cidade} - {enderecoPrincipal.estado}, {enderecoPrincipal.cep}
                        {enderecoPrincipal.pais && <><br />{enderecoPrincipal.pais}</>}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Financial Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informações Financeiras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Limite de Crédito</label>
                  <p className="mt-1 text-lg font-semibold">
                    R$ {cliente.lim_credito?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Limite Disponível</label>
                  <p className="mt-1 text-lg font-semibold">
                    R$ {cliente.limite_disponivel?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Condição de Pagamento</label>
                  <p className="mt-1">{cliente.cond_pag_fixa === 'YES' ? 'Fixa' : 'Variável'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Indicador de Crédito</label>
                  <p className="mt-1">{cliente.ind_cre_cli || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Related Records */}
        <div className="space-y-6">
          {/* Contacts Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contatos ({cliente.contatos?.length || 0})
              </CardTitle>
              <Button variant="ghost" size="sm">Ver Todos</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {cliente.contatos && cliente.contatos.length > 0 ? (
                cliente.contatos.slice(0, 3).map((contato: any) => (
                  <div key={contato.id} className="p-3 rounded-lg border space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-secondary">
                          {contato.primeiro_nome?.charAt(0)}{contato.sobrenome?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contato.nome_completo}</p>
                        {contato.cargo && (
                          <p className="text-sm text-muted-foreground truncate">{contato.cargo}</p>
                        )}
                        {contato.email && (
                          <p className="text-xs text-muted-foreground truncate">{contato.email}</p>
                        )}
                        {contato.telefone && (
                          <p className="text-xs text-muted-foreground">{contato.telefone}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Ações de CRM */}
                    <div className="flex gap-2">
                      {contato.telefone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(`tel:${contato.telefone}`, '_self')}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Ligar
                        </Button>
                      )}
                      {contato.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(`mailto:${contato.email}`, '_blank')}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      )}
                      {contato.celular && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(`https://wa.me/${contato.celular.replace(/\D/g, '')}`, '_blank')}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum contato cadastrado</p>
                  <Button variant="link" size="sm" className="mt-2">
                    Adicionar Contato
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addresses Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereços ({cliente.enderecos?.length || 0})
              </CardTitle>
              <Button variant="ghost" size="sm">Ver Todos</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {cliente.enderecos && cliente.enderecos.length > 0 ? (
                cliente.enderecos.slice(0, 2).map((endereco: any) => (
                  <div key={endereco.id} className="p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{endereco.tipo || "Endereço"}</p>
                      {endereco.is_principal && (
                        <Badge variant="secondary" className="text-xs">Principal</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {endereco.endereco}
                      {endereco.bairro && `, ${endereco.bairro}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {endereco.cidade} - {endereco.estado}, {endereco.cep}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum endereço cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nenhuma atividade registrada</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <NovoContatoDialog
        open={novoContatoOpen}
        onOpenChange={setNovoContatoOpen}
        clienteId={id!}
        contaId={cliente.conta_id}
      />

      <NovaOportunidadeDialog
        open={novaOportunidadeOpen}
        onOpenChange={setNovaOportunidadeOpen}
        clienteId={id!}
        contaId={cliente.conta_id}
      />
    </div>
  );
}
