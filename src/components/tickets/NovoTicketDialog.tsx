import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTickets } from "@/hooks/useTickets";
import { useClientes } from "@/hooks/useClientes";
import { useProdutos } from "@/hooks/useProdutos";
import { useVendas } from "@/hooks/useVendas";
import { useFilasAtendimento } from "@/hooks/useFilasAtendimento";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

type TipoTicket = Tables<"tickets">["tipo"];
type PrioridadeTicket = Tables<"tickets">["prioridade"];

interface NovoTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NovoTicketDialog({ open, onOpenChange }: NovoTicketDialogProps) {
  const { createTicket } = useTickets();
  const { clientes } = useClientes();
  const { produtos } = useProdutos();
  const { vendas } = useVendas();
  const { filas } = useFilasAtendimento();
  const { toast } = useToast();

  const [isClassificando, setIsClassificando] = useState(false);
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

      // Buscar ID da fila pelo nome
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTicket.mutateAsync({
      ...formData,
      venda_id: formData.venda_id || null,
      produto_id: formData.produto_id || null,
    });

    onOpenChange(false);
    setFormData({
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
  };

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      setFormData((prev) => ({
        ...prev,
        cliente_nome: cliente.nome_emit || cliente.nome_abrev || "",
        cliente_email: cliente.e_mail || "",
        cliente_telefone: cliente.telefone1 || "",
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ticket SAC</DialogTitle>
          <DialogDescription>Abra um novo ticket de atendimento ao cliente</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="cliente">Cliente</Label>
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
              <Label htmlFor="cliente_nome">Nome do Cliente</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venda">Proposta/Venda (opcional)</Label>
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
              <Label htmlFor="produto">Produto (opcional)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
              required
              placeholder="Descreva resumidamente o problema"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
              required
              rows={5}
              placeholder="Descreva detalhadamente o problema ou solicitação"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? "Criando..." : "Criar Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
