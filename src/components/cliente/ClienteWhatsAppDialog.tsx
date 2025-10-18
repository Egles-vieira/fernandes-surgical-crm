import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, MessageCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClienteWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contato: {
    id: string;
    nome_completo: string;
    celular: string;
    cliente_id?: string;
  } | null;
}

const ClienteWhatsAppDialog = ({ open, onOpenChange, contato }: ClienteWhatsAppDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { contas, isLoadingContas } = useWhatsApp();
  const [selectedConta, setSelectedConta] = useState<string | null>(null);

  // Buscar contato WhatsApp e conversas existentes
  const { data: whatsappData, isLoading: isLoadingWhatsapp } = useQuery({
    queryKey: ['whatsapp-contato-conversas', contato?.celular],
    queryFn: async () => {
      if (!contato?.celular) return null;

      // Formatar número
      const numeroFormatado = contato.celular.replace(/\D/g, '');
      const numeroCompleto = numeroFormatado.startsWith('55') 
        ? `+${numeroFormatado}` 
        : `+55${numeroFormatado}`;

      // Buscar contato WhatsApp
      const { data: whatsappContato } = await supabase
        .from('whatsapp_contatos')
        .select('id, whatsapp_conta_id')
        .eq('numero_whatsapp', numeroCompleto)
        .maybeSingle();

      if (!whatsappContato) return { contato: null, conversas: [] };

      // Buscar conversas ativas
      const { data: conversas } = await supabase
        .from('whatsapp_conversas')
        .select(`
          id,
          titulo,
          status,
          ultima_mensagem_em,
          whatsapp_conta_id,
          whatsapp_contas (nome_conta)
        `)
        .eq('whatsapp_contato_id', whatsappContato.id)
        .neq('status', 'fechada')
        .order('ultima_mensagem_em', { ascending: false });

      return { contato: whatsappContato, conversas: conversas || [] };
    },
    enabled: !!contato?.celular && open,
  });

  // Selecionar primeira conta ativa automaticamente
  useEffect(() => {
    if (contas && contas.length > 0 && !selectedConta) {
      setSelectedConta(contas[0].id);
    }
  }, [contas, selectedConta]);

  const criarConversaMutation = useMutation({
    mutationFn: async () => {
      if (!contato || !selectedConta) throw new Error("Dados inválidos");

      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      const numeroFormatado = contato.celular.replace(/\D/g, '');
      const numeroCompleto = numeroFormatado.startsWith('55') 
        ? `+${numeroFormatado}` 
        : `+55${numeroFormatado}`;

      let whatsappContatoId: string;

      // Verificar/criar contato WhatsApp
      if (whatsappData?.contato) {
        whatsappContatoId = whatsappData.contato.id;
      } else {
        // Criar contato WhatsApp vinculado ao contato existente
        const { data: novoContatoWhatsApp, error: contatoWhatsAppError } = await supabase
          .from('whatsapp_contatos')
          .insert({
            contato_id: contato.id,
            numero_whatsapp: numeroCompleto,
            nome_whatsapp: contato.nome_completo,
            whatsapp_conta_id: selectedConta,
          })
          .select('id')
          .single();

        if (contatoWhatsAppError) throw contatoWhatsAppError;
        whatsappContatoId = novoContatoWhatsApp.id;
      }

      // Criar nova conversa
      const { data: novaConversa, error: conversaError } = await supabase
        .from('whatsapp_conversas')
        .insert({
          whatsapp_conta_id: selectedConta,
          whatsapp_contato_id: whatsappContatoId,
          contato_id: contato.id,
          titulo: `${contato.nome_completo}`,
          status: 'aberta',
          atribuida_para_id: user.data.user.id,
        })
        .select('id')
        .single();

      if (conversaError) throw conversaError;
      return novaConversa.id;
    },
    onSuccess: (conversaId) => {
      toast({
        title: "Conversa criada",
        description: "Redirecionando para o WhatsApp...",
      });
      onOpenChange(false);
      navigate(`/whatsapp?conversa=${conversaId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAbrirConversa = (conversaId: string) => {
    onOpenChange(false);
    navigate(`/whatsapp?conversa=${conversaId}`);
  };

  const handleNovaConversa = () => {
    criarConversaMutation.mutate();
  };

  if (!contato) return null;

  const isLoading = isLoadingContas || isLoadingWhatsapp;
  const temConversas = whatsappData?.conversas && whatsappData.conversas.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            WhatsApp - {contato.nome_completo}
          </DialogTitle>
          <DialogDescription>
            {temConversas 
              ? "Conversas existentes ou inicie uma nova" 
              : "Iniciar conversa no WhatsApp"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conversas Existentes */}
            {temConversas && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Conversas Ativas</h4>
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  <div className="space-y-2">
                    {whatsappData.conversas.map((conversa: any) => (
                      <button
                        key={conversa.id}
                        onClick={() => handleAbrirConversa(conversa.id)}
                        className="w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {conversa.titulo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {conversa.whatsapp_contas?.nome_conta}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {conversa.status}
                            </Badge>
                            <MessageCircle className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        {conversa.ultima_mensagem_em && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Última msg: {new Date(conversa.ultima_mensagem_em).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Nova Conversa */}
            <div className="space-y-3">
              {temConversas && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
              )}

              {!contas || contas.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma conta WhatsApp configurada</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleNovaConversa}
                    disabled={criarConversaMutation.isPending}
                    className="flex-1"
                  >
                    {criarConversaMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Conversa
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Número:</strong> {contato.celular}
              </p>
              {contas && contas.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Conta:</strong> {contas.find(c => c.id === selectedConta)?.nome_conta}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClienteWhatsAppDialog;
