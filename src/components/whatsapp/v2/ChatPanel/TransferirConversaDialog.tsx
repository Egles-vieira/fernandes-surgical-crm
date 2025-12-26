import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRightLeft, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Operador {
  id: string;
  primeiro_nome: string;
  sobrenome: string;
  url_avatar?: string;
  status_atendimento_whatsapp?: string;
}

interface TransferirConversaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversaId: string;
  contatoNome: string;
  operadorAtualId?: string | null;
}

export function TransferirConversaDialog({
  open,
  onOpenChange,
  conversaId,
  contatoNome,
  operadorAtualId,
}: TransferirConversaDialogProps) {
  const [novoOperador, setNovoOperador] = useState("");
  const [motivo, setMotivo] = useState("");
  const queryClient = useQueryClient();

  // Buscar operadores disponíveis
  const { data: operadores = [], isLoading: isLoadingOperadores } = useQuery({
    queryKey: ["whatsapp_operadores_transferencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_usuario")
        .select("id, primeiro_nome, sobrenome, url_avatar, status_atendimento_whatsapp")
        .order("primeiro_nome", { ascending: true });

      if (error) throw error;
      return (data || []) as Operador[];
    },
    enabled: open,
  });

  // Filtrar para não mostrar o operador atual
  const operadoresDisponiveis = operadores.filter(op => op.id !== operadorAtualId);

  // Mutation para transferir conversa
  const transferirConversa = useMutation({
    mutationFn: async ({ conversaId, novoOperadorId, motivo }: { 
      conversaId: string; 
      novoOperadorId: string; 
      motivo?: string 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const operadorNovo = operadores.find(op => op.id === novoOperadorId);
      const nomeNovoOperador = operadorNovo 
        ? `${operadorNovo.primeiro_nome} ${operadorNovo.sobrenome}`.trim() 
        : "Operador";

      // 1. Atualizar a conversa com o novo operador
      const { error: updateError } = await supabase
        .from("whatsapp_conversas")
        .update({
          atribuida_para_id: novoOperadorId,
          atribuida_em: new Date().toISOString(),
        } as any)
        .eq("id", conversaId);

      if (updateError) throw updateError;

      // 2. Registrar na auditoria (usando schema correto)
      await supabase.from("whatsapp_auditoria").insert({
        usuario_id: user.id,
        acao: "transferencia_conversa",
        categoria: "atendimento",
        descricao: `Conversa transferida para ${nomeNovoOperador}${motivo ? `: ${motivo}` : ""}`,
        entidade_tipo: "whatsapp_conversas",
        entidade_id: conversaId,
        dados_anteriores: { operador_id: operadorAtualId },
        dados_novos: { operador_id: novoOperadorId, motivo: motivo || null },
      });

      // 3. Criar notificação para o novo operador
      await supabase.from("notificacoes").insert({
        usuario_id: novoOperadorId,
        tipo: "transferencia_conversa",
        titulo: "Nova conversa transferida",
        descricao: `Conversa com ${contatoNome} foi transferida para você${motivo ? `: ${motivo}` : ""}`,
        lida: false,
        entidade_tipo: "whatsapp_conversas",
        entidade_id: conversaId,
        metadata: {
          contato_nome: contatoNome,
          transferido_por: user.id,
        },
      });

      return { conversaId, novoOperadorId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-bam-metricas"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversas-v2"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversa-info"] });
      toast.success("Conversa transferida com sucesso!");
      onOpenChange(false);
      setNovoOperador("");
      setMotivo("");
    },
    onError: (error: any) => {
      console.error("Erro ao transferir:", error);
      toast.error("Erro ao transferir: " + error.message);
    },
  });

  const handleTransferir = async () => {
    if (!novoOperador) {
      toast.error("Selecione um operador");
      return;
    }

    await transferirConversa.mutateAsync({
      conversaId,
      novoOperadorId: novoOperador,
      motivo,
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "ocupado": return "bg-amber-500";
      case "pausa": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "online": return "Online";
      case "ocupado": return "Ocupado";
      case "pausa": return "Em pausa";
      default: return "Offline";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transferir Conversa
          </DialogTitle>
          <DialogDescription>
            Transferir atendimento de <strong>{contatoNome}</strong> para outro operador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Novo Operador *</Label>
            <Select value={novoOperador} onValueChange={setNovoOperador} disabled={isLoadingOperadores}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingOperadores ? "Carregando..." : "Selecione um operador"} />
              </SelectTrigger>
              <SelectContent>
                {operadoresDisponiveis.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Nenhum operador disponível
                  </div>
                ) : (
                  operadoresDisponiveis.map((operador) => (
                    <SelectItem key={operador.id} value={operador.id}>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={operador.url_avatar} />
                            <AvatarFallback className="text-xs">
                              {operador.primeiro_nome?.charAt(0)}
                              {operador.sobrenome?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span 
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusColor(operador.status_atendimento_whatsapp)}`} 
                          />
                        </div>
                        <span>{operador.primeiro_nome} {operador.sobrenome}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {getStatusLabel(operador.status_atendimento_whatsapp)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo da Transferência (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente solicitou especialista em vendas, necessita suporte técnico..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransferir}
              disabled={!novoOperador || transferirConversa.isPending}
            >
              {transferirConversa.isPending ? "Transferindo..." : "Transferir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
