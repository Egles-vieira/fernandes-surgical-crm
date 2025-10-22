import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { useVendas } from "@/hooks/useVendas";
import { useFilasAtendimento } from "@/hooks/useFilasAtendimento";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, Sparkles, Loader2, Users } from "lucide-react";
import ChatAssistenteCriacao from "@/components/tickets/ChatAssistenteCriacao";
import ContatoClienteDialog from "@/components/tickets/ContatoClienteDialog";

type TipoTicket = Tables<"tickets">["tipo"];
type PrioridadeTicket = Tables<"tickets">["prioridade"];

interface SugestaoIA {
  titulo_sugerido?: string;
  descricao_completa?: string;
  prioridade_sugerida?: 'baixa' | 'normal' | 'alta' | 'urgente';
  fila_sugerida?: string;
  justificativa?: string;
  perguntas_pendentes?: string[];
}

export default function NovoTicket() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { clientes } = useClientes();
  const { produtos } = useProdutos();
  const { vendas } = useVendas();
  const { filas } = useFilasAtendimento();

  const [isClassificando, setIsClassificando] = useState(false);
  const [sugestoesIA, setSugestoesIA] = useState<SugestaoIA | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [mensagensCriacao, setMensagensCriacao] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [clienteSelecionadoContaId, setClienteSelecionadoContaId] = useState<string>("");
  const [clienteSelecionadoNome, setClienteSelecionadoNome] = useState<string>("");
  const [mostrarContatosDialog, setMostrarContatosDialog] = useState(false);
  
  const [formData, setFormData] = useState<{
    titulo: string;
    descricao: string;
    tipo: TipoTicket;
    prioridade: PrioridadeTicket;
    cliente_nome: string;
    cliente_email: string;
    cliente_telefone: string;
    venda_id: string;
    produto_id: string;
    fila_id: string;
  }>({
    titulo: "",
    descricao: "",
    tipo: "reclamacao",
    prioridade: "normal",
    cliente_nome: "",
    cliente_email: "",
    cliente_telefone: "",
    venda_id: "",
    produto_id: "",
    fila_id: "",
  });

  // Contexto para o chat
  const [contextoChat, setContextoChat] = useState({
    titulo: formData.titulo,
    descricao: formData.descricao,
    cliente: formData.cliente_nome
  });

  useEffect(() => {
    setContextoChat({
      titulo: formData.titulo,
      descricao: formData.descricao,
      cliente: formData.cliente_nome
    });
  }, [formData.titulo, formData.descricao, formData.cliente_nome]);

  const createTicket = useMutation({
    mutationFn: async ({ 
      ticketData, 
      classificacaoIA,
      mensagens 
    }: { 
      ticketData: any;
      classificacaoIA?: { prioridade: string; fila_nome: string };
      mensagens?: Array<{ role: 'user' | 'assistant'; content: string }>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData: any = {
        ...ticketData,
        aberto_por: userData.user?.id,
      };

      const { data, error } = await supabase
        .from("tickets")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("tickets_interacoes").insert({
        ticket_id: data.id,
        tipo_interacao: "abertura",
        mensagem: "Ticket aberto",
        criado_por: userData.user?.id,
        mensagem_interna: true,
      });

      if (classificacaoIA) {
        await supabase.from("tickets_interacoes").insert({
          ticket_id: data.id,
          tipo_interacao: "alteracao_status",
          mensagem: `Classificação automática via IA: Prioridade definida como "${classificacaoIA.prioridade}" e atribuído à fila "${classificacaoIA.fila_nome}"`,
          criado_por: userData.user?.id,
          mensagem_interna: true,
        });
      }

      // Salvar histórico do chat de criação, se houver
      if (mensagens && mensagens.length > 1) { // >1 porque tem a mensagem inicial do assistente
        const mensagensParaSalvar = mensagens.map(msg => ({
          ticket_id: data.id,
          role: msg.role,
          content: msg.content,
        }));

        const { error: errorMensagens } = await supabase
          .from('chat_assistente_mensagens')
          .insert(mensagensParaSalvar);

        if (errorMensagens) {
          console.error('Erro ao salvar mensagens do chat:', errorMensagens);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({
        title: "Ticket criado com sucesso!",
        description: "O ticket foi criado e classificado automaticamente.",
      });
      navigate("/tickets");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const classificarCriticidade = async () => {
    if (!formData.titulo || !formData.descricao) {
      toast({
        title: "Preencha os campos",
        description: "Título e descrição são necessários para classificação automática",
        variant: "destructive",
      });
      return;
    }

    setIsClassificando(true);
    try {
      const { data, error } = await supabase.functions.invoke('classificar-criticidade-ticket', {
        body: {
          titulo: formData.titulo,
          descricao: formData.descricao,
          tipo: formData.tipo,
        },
      });

      if (error) throw error;

      const { data: filaData } = await supabase
        .from('filas_atendimento')
        .select('id')
        .eq('nome', data.fila_nome)
        .single();

      setFormData((prev) => ({
        ...prev,
        prioridade: data.prioridade,
        fila_id: filaData?.id || prev.fila_id,
      }));

      toast({
        title: "Ticket classificado automaticamente",
        description: `Prioridade: ${data.prioridade.toUpperCase()} | Fila: ${data.fila_nome}`,
      });
    } catch (error) {
      console.error('Erro ao classificar:', error);
      toast({
        title: "Erro na classificação",
        description: "Não foi possível classificar automaticamente. Por favor, selecione manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsClassificando(false);
    }
  };

  const aplicarSugestoesIA = () => {
    if (!sugestoesIA) return;
    
    setFormData(prev => ({
      ...prev,
      titulo: sugestoesIA.titulo_sugerido || prev.titulo,
      descricao: sugestoesIA.descricao_completa || prev.descricao,
      prioridade: sugestoesIA.prioridade_sugerida || prev.prioridade,
    }));
    
    if (sugestoesIA.fila_sugerida) {
      const filaSugerida = filas?.find(f => 
        f.nome.toLowerCase().includes(sugestoesIA.fila_sugerida!.toLowerCase())
      );
      if (filaSugerida) {
        setFormData(prev => ({ ...prev, fila_id: filaSugerida.id }));
      }
    }
    
    toast({
      title: "Sugestões aplicadas!",
      description: "Os campos do formulário foram atualizados com as sugestões da IA",
    });
    setMostrarSugestoes(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsClassificando(true);
    try {
      const { data, error } = await supabase.functions.invoke('classificar-criticidade-ticket', {
        body: {
          titulo: formData.titulo,
          descricao: formData.descricao,
          tipo: formData.tipo,
        },
      });

      if (!error && data) {
        const { data: filaData } = await supabase
          .from('filas_atendimento')
          .select('id')
          .eq('nome', data.fila_nome)
          .single();

        const dadosClassificados = {
          ...formData,
          prioridade: data.prioridade,
          fila_id: filaData?.id || formData.fila_id,
          venda_id: formData.venda_id || null,
          produto_id: formData.produto_id || null,
        };

        await createTicket.mutateAsync({
          ticketData: dadosClassificados,
          classificacaoIA: {
            prioridade: data.prioridade,
            fila_nome: data.fila_nome,
          },
          mensagens: mensagensCriacao,
        });
      } else {
        await createTicket.mutateAsync({
          ticketData: {
            ...formData,
            venda_id: formData.venda_id || null,
            produto_id: formData.produto_id || null,
          },
          mensagens: mensagensCriacao,
        });
      }
    } catch (error) {
      console.error('Erro ao classificar:', error);
      await createTicket.mutateAsync({
        ticketData: {
          ...formData,
          venda_id: formData.venda_id || null,
          produto_id: formData.produto_id || null,
        },
        mensagens: mensagensCriacao,
      });
    } finally {
      setIsClassificando(false);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      setClienteSelecionadoContaId(cliente.conta_id || "");
      setClienteSelecionadoNome(cliente.nome_emit || cliente.nome_abrev || "");
      
      // Abrir diálogo de contatos se o cliente tem conta_id
      if (cliente.conta_id) {
        setMostrarContatosDialog(true);
      } else {
        // Se não tem conta_id, preenche com dados básicos do cliente
        setFormData((prev) => ({
          ...prev,
          cliente_nome: cliente.nome_emit || cliente.nome_abrev || "",
          cliente_email: cliente.e_mail || "",
          cliente_telefone: cliente.telefone1 || "",
        }));
      }
    }
  };

  const handleContatoSelecionado = (contato: { nome: string; email: string; telefone: string }) => {
    setFormData((prev) => ({
      ...prev,
      cliente_nome: contato.nome,
      cliente_email: contato.email,
      cliente_telefone: contato.telefone,
    }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Novo Ticket SAC</h1>
          <p className="text-muted-foreground">Abra um novo ticket com auxílio da IA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda: Formulário */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Classificação</CardTitle>
                <CardDescription>Tipo e prioridade do ticket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de Ticket</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo: value as TipoTicket }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reclamacao">Reclamação</SelectItem>
                        <SelectItem value="duvida">Dúvida</SelectItem>
                        <SelectItem value="sugestao">Sugestão</SelectItem>
                        <SelectItem value="elogio">Elogio</SelectItem>
                        <SelectItem value="garantia">Garantia</SelectItem>
                        <SelectItem value="troca">Troca</SelectItem>
                        <SelectItem value="devolucao">Devolução</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prioridade">Prioridade</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={classificarCriticidade}
                        disabled={isClassificando || !formData.titulo || !formData.descricao}
                        className="h-auto py-1 px-2"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {isClassificando ? "Classificando..." : "Auto"}
                      </Button>
                    </div>
                    <Select
                      value={formData.prioridade}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, prioridade: value as PrioridadeTicket }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fila">Fila de Atendimento</Label>
                  <Select
                    value={formData.fila_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, fila_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma fila" />
                    </SelectTrigger>
                    <SelectContent>
                      {filas.map((fila) => (
                        <SelectItem key={fila.id} value={fila.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: fila.cor }}
                            />
                            {fila.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados do Cliente</CardTitle>
                <CardDescription>Informações do cliente que abriu o ticket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cliente">Cliente Cadastrado</Label>
                    {clienteSelecionadoContaId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMostrarContatosDialog(true)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Ver Contatos
                      </Button>
                    )}
                  </div>
                  <Select onValueChange={handleClienteChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_emit || cliente.nome_abrev}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente_nome">Nome do Cliente *</Label>
                    <Input
                      id="cliente_nome"
                      value={formData.cliente_nome}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cliente_nome: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cliente_email">Email</Label>
                    <Input
                      id="cliente_email"
                      type="email"
                      value={formData.cliente_email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cliente_email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cliente_telefone">Telefone</Label>
                    <Input
                      id="cliente_telefone"
                      value={formData.cliente_telefone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cliente_telefone: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Ticket</CardTitle>
                <CardDescription>Descrição completa do problema ou solicitação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                    required
                    placeholder="Descreva resumidamente o problema"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                    required
                    rows={6}
                    placeholder="Descreva detalhadamente o problema ou solicitação"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações Adicionais</CardTitle>
                <CardDescription>Vincule uma venda ou produto (opcional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venda">Proposta/Venda</Label>
                    <Select
                      value={formData.venda_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, venda_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma venda" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendas.map((venda) => (
                          <SelectItem key={venda.id} value={venda.id}>
                            {venda.numero_venda} - {venda.cliente_nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="produto">Produto</Label>
                    <Select
                      value={formData.produto_id}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, produto_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((produto) => (
                          <SelectItem key={produto.id} value={produto.id}>
                            {produto.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {mostrarSugestoes && sugestoesIA && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Sugestões da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sugestoesIA.titulo_sugerido && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Título Sugerido</Label>
                      <p className="text-sm font-medium">{sugestoesIA.titulo_sugerido}</p>
                    </div>
                  )}
                  {sugestoesIA.descricao_completa && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Descrição Completa</Label>
                      <p className="text-sm whitespace-pre-wrap">{sugestoesIA.descricao_completa}</p>
                    </div>
                  )}
                  {sugestoesIA.prioridade_sugerida && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Prioridade</Label>
                      <Badge variant="outline">{sugestoesIA.prioridade_sugerida}</Badge>
                    </div>
                  )}
                  {sugestoesIA.justificativa && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Justificativa</Label>
                      <p className="text-sm text-muted-foreground">{sugestoesIA.justificativa}</p>
                    </div>
                  )}
                  <Button onClick={aplicarSugestoesIA} className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Aplicar Sugestões ao Formulário
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/tickets")}
                disabled={createTicket.isPending || isClassificando}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createTicket.isPending || isClassificando}
              >
                {isClassificando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Classificando com IA...
                  </>
                ) : createTicket.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Criar Ticket
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Coluna Direita: Chat Assistente IA */}
        <div className="lg:sticky lg:top-6 h-[calc(100vh-12rem)]">
          <ChatAssistenteCriacao
            contextoInicial={contextoChat}
            onSugestoesRecebidas={(sugestoes) => {
              setSugestoesIA(sugestoes);
              setMostrarSugestoes(true);
              toast({
                title: "✨ IA gerou sugestões!",
                description: "Confira o card de sugestões e clique em 'Aplicar' para preencher o formulário"
              });
            }}
            onMensagensChange={setMensagensCriacao}
          />
        </div>
      </div>

      {/* Diálogo de Contatos */}
      <ContatoClienteDialog
        open={mostrarContatosDialog}
        onOpenChange={setMostrarContatosDialog}
        contaId={clienteSelecionadoContaId}
        clienteNome={clienteSelecionadoNome}
        onContatoSelecionado={handleContatoSelecionado}
      />
    </div>
  );
}
