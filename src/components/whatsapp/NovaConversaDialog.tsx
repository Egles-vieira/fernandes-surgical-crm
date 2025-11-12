import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Loader2 } from "lucide-react";

interface NovaConversaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  onConversaCriada?: (conversaId: string) => void;
}

const NovaConversaDialog = ({ 
  open, 
  onOpenChange, 
  contaId,
  onConversaCriada 
}: NovaConversaDialogProps) => {
  const [numeroWhatsApp, setNumeroWhatsApp] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const criarConversaMutation = useMutation({
    mutationFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      // Formatar número (remover espaços e caracteres especiais)
      const numeroFormatado = numeroWhatsApp.replace(/\D/g, '');
      
      // Adicionar +55 se não tiver código do país
      const numeroCompleto = numeroFormatado.startsWith('55') 
        ? `+${numeroFormatado}` 
        : `+55${numeroFormatado}`;

      // 1. Verificar se já existe contato com esse número
      let { data: contatoExistente } = await supabase
        .from('whatsapp_contatos')
        .select('id')
        .eq('numero_whatsapp', numeroCompleto)
        .eq('whatsapp_conta_id', contaId)
        .single();

      let contatoWhatsAppId: string;

      if (!contatoExistente) {
        // 2. Criar contato na tabela contatos primeiro (obrigatório)
        const { data: novoContatoBase, error: contatoBaseError } = await supabase
          .from('contatos')
          .insert({
            primeiro_nome: nomeContato || 'Cliente',
            sobrenome: 'WhatsApp',
            celular: numeroCompleto,
            esta_ativo: true,
          })
          .select('id')
          .single();

        if (contatoBaseError) throw contatoBaseError;

        // 3. Criar contato WhatsApp vinculado
        const { data: novoContatoWhatsApp, error: contatoWhatsAppError } = await supabase
          .from('whatsapp_contatos')
          .insert({
            contato_id: novoContatoBase.id,
            numero_whatsapp: numeroCompleto,
            nome_whatsapp: nomeContato || numeroCompleto,
            whatsapp_conta_id: contaId,
          })
          .select('id')
          .single();

        if (contatoWhatsAppError) throw contatoWhatsAppError;
        contatoWhatsAppId = novoContatoWhatsApp.id;
      } else {
        contatoWhatsAppId = contatoExistente.id;
      }

      // 4. Verificar se já existe conversa ativa
      const { data: conversaExistente } = await supabase
        .from('whatsapp_conversas')
        .select('id')
        .eq('whatsapp_conta_id', contaId)
        .eq('whatsapp_contato_id', contatoWhatsAppId)
        .neq('status', 'fechada')
        .single();

      if (conversaExistente) {
        return { conversaId: conversaExistente.id, nova: false };
      }

      // 5. Criar nova conversa COM janela de 24h ativa
      const agora = new Date();
      const janela24hFim = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // +24 horas

      const { data: novaConversa, error: conversaError } = await supabase
        .from('whatsapp_conversas')
        .insert({
          whatsapp_conta_id: contaId,
          whatsapp_contato_id: contatoWhatsAppId,
          titulo: nomeContato || `Conversa com ${numeroCompleto}`,
          status: 'aberta',
          atribuida_para_id: user.data.user.id,
          janela_24h_ativa: true,
          janela_aberta_em: agora.toISOString(),
          janela_fecha_em: janela24hFim.toISOString(),
          ultima_mensagem_em: agora.toISOString(),
        })
        .select('id')
        .single();

      if (conversaError) throw conversaError;
      return { conversaId: novaConversa.id, nova: true };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contatos'] });
      
      toast({
        title: data.nova ? "Conversa criada" : "Conversa encontrada",
        description: data.nova 
          ? "Nova conversa iniciada com sucesso" 
          : "Já existe uma conversa ativa com este número",
      });

      onConversaCriada?.(data.conversaId);
      onOpenChange(false);
      setNumeroWhatsApp("");
      setNomeContato("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroWhatsApp.trim()) {
      toast({
        title: "Número obrigatório",
        description: "Por favor, insira um número de WhatsApp",
        variant: "destructive",
      });
      return;
    }
    criarConversaMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            Inicie uma nova conversa com um número de WhatsApp
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numero">Número WhatsApp *</Label>
            <Input
              id="numero"
              type="tel"
              placeholder="11987654321 ou +5511987654321"
              value={numeroWhatsApp}
              onChange={(e) => setNumeroWhatsApp(e.target.value)}
              disabled={criarConversaMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Informe o número com DDD (ex: 11987654321)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Contato (opcional)</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Nome do contato"
              value={nomeContato}
              onChange={(e) => setNomeContato(e.target.value)}
              disabled={criarConversaMutation.isPending}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={criarConversaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={criarConversaMutation.isPending}
            >
              {criarConversaMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <MessageSquarePlus className="w-4 h-4 mr-2" />
                  Iniciar Conversa
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovaConversaDialog;
