import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Building2, User, Phone, Mail, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface ClienteConsultaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
}

export default function ClienteConsultaDialog({ open, onOpenChange, contaId }: ClienteConsultaDialogProps) {
  const [busca, setBusca] = useState("");
  const [clienteExpandido, setClienteExpandido] = useState<string | null>(null);

  // Buscar clientes
  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes-whatsapp', busca],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('*')
        .order('nome_abrev', { ascending: true });

      if (busca) {
        query = query.or(`nome_abrev.ilike.%${busca}%,cgc.ilike.%${busca}%,e_mail.ilike.%${busca}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Buscar contatos de um cliente específico
  const { data: contatos } = useQuery({
    queryKey: ['contatos-cliente', clienteExpandido],
    queryFn: async () => {
      if (!clienteExpandido) return [];
      
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .eq('cliente_id', clienteExpandido)
        .eq('esta_ativo', true)
        .is('excluido_em', null)
        .order('nome_completo', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!clienteExpandido,
  });

  const iniciarConversaComContato = async (contato: any) => {
    const numeroWhatsApp = contato.celular || contato.telefone;
    
    if (!numeroWhatsApp) {
      toast.error("Contato não possui número de telefone cadastrado");
      return;
    }

    // Verificar se já existe um contato WhatsApp
    const { data: contatoWhatsApp, error: errorContato } = await supabase
      .from('whatsapp_contatos')
      .select('id')
      .eq('numero_whatsapp', numeroWhatsApp)
      .eq('whatsapp_conta_id', contaId)
      .maybeSingle();

    let contatoWhatsAppId = contatoWhatsApp?.id;

    // Se não existe, criar o contato WhatsApp
    if (!contatoWhatsAppId) {
      const { data: novoContato, error: errorNovoContato } = await supabase
        .from('whatsapp_contatos')
        .insert({
          whatsapp_conta_id: contaId,
          contato_id: contato.id,
          numero_whatsapp: numeroWhatsApp,
          nome_whatsapp: contato.nome_completo || contato.primeiro_nome,
        })
        .select()
        .single();

      if (errorNovoContato) {
        toast.error("Erro ao criar contato WhatsApp");
        console.error(errorNovoContato);
        return;
      }

      contatoWhatsAppId = novoContato.id;
    }

    // Verificar se já existe uma conversa
    const { data: conversaExistente } = await supabase
      .from('whatsapp_conversas')
      .select('id')
      .eq('whatsapp_contato_id', contatoWhatsAppId)
      .eq('whatsapp_conta_id', contaId)
      .maybeSingle();

    if (conversaExistente) {
      toast.success("Conversa já existe!");
      onOpenChange(false);
      // Aqui você pode adicionar lógica para selecionar a conversa existente
      return;
    }

    // Criar nova conversa
    const { data: novaConversa, error: errorConversa } = await supabase
      .from('whatsapp_conversas')
      .insert({
        whatsapp_conta_id: contaId,
        whatsapp_contato_id: contatoWhatsAppId,
        contato_id: contato.id,
        titulo: contato.nome_completo || contato.primeiro_nome,
        status: 'aberta',
        atribuida_para_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (errorConversa) {
      toast.error("Erro ao criar conversa");
      console.error(errorConversa);
      return;
    }

    toast.success("Conversa criada com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Consultar Clientes e Contatos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de Clientes */}
          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando clientes...
              </div>
            ) : clientes && clientes.length > 0 ? (
              <div className="space-y-2">
                {clientes.map((cliente) => (
                  <Collapsible
                    key={cliente.id}
                    open={clienteExpandido === cliente.id}
                    onOpenChange={(isOpen) => setClienteExpandido(isOpen ? cliente.id : null)}
                  >
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors">
                          <Building2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{cliente.nome_abrev}</h3>
                              {cliente.identific && (
                                <Badge variant="outline" className="text-xs">
                                  {cliente.identific}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              {cliente.cgc && (
                                <p className="flex items-center gap-2">
                                  <span className="font-medium">CNPJ/CPF:</span>
                                  {cliente.cgc}
                                </p>
                              )}
                              {cliente.e_mail && (
                                <p className="flex items-center gap-2">
                                  <Mail className="w-3 h-3" />
                                  {cliente.e_mail}
                                </p>
                              )}
                              {cliente.atividade && (
                                <p className="text-xs">
                                  <span className="font-medium">Atividade:</span> {cliente.atividade}
                                </p>
                              )}
                            </div>
                          </div>

                          {clienteExpandido === cliente.id ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 p-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Contatos
                          </h4>
                          
                          {contatos && contatos.length > 0 ? (
                            <div className="space-y-2">
                              {contatos.map((contato) => (
                                <Card key={contato.id} className="p-3 bg-background">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 space-y-1">
                                      <p className="font-medium">
                                        {contato.nome_completo}
                                      </p>
                                      
                                      <div className="text-sm text-muted-foreground space-y-0.5">
                                        {contato.cargo && (
                                          <p className="flex items-center gap-1">
                                            <span className="font-medium text-xs">Cargo:</span>
                                            {contato.cargo}
                                          </p>
                                        )}
                                        {contato.celular && (
                                          <p className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {contato.celular}
                                          </p>
                                        )}
                                        {contato.email && (
                                          <p className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {contato.email}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      onClick={() => iniciarConversaComContato(contato)}
                                      className="flex-shrink-0"
                                      disabled={!contato.celular && !contato.telefone}
                                    >
                                      <MessageSquare className="w-4 h-4 mr-1" />
                                      Conversar
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Nenhum contato encontrado para este cliente
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cliente encontrado</p>
                <p className="text-sm mt-1">Tente buscar por nome, CNPJ ou email</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
