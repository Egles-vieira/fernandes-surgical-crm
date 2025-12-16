// ============================================
// Contact Details Panel Component
// ============================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  X, 
  Phone, 
  Mail, 
  Building2, 
  Tag, 
  FileText, 
  Clock,
  User,
  ExternalLink,
  Edit,
  Wallet,
  Check,
  Loader2
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useWhatsAppCarteiras } from '@/hooks/useWhatsAppCarteiras';
import { toast } from 'sonner';

interface Contato {
  id: string;
  nome_whatsapp: string;
  numero_whatsapp: string;
  foto_url?: string;
}

interface ContactDetailsPanelProps {
  contato?: Contato;
  conversaId: string | null;
  onClose: () => void;
}

export function ContactDetailsPanel({ 
  contato, 
  conversaId,
  onClose 
}: ContactDetailsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedCarteira, setSelectedCarteira] = useState<string>('');
  const { carteiras, adicionarContato, removerContato, isAdicionandoContato, isRemovendoContato } = useWhatsAppCarteiras();

  // Fetch additional contact data
  const { data: contatoCompleto } = useQuery({
    queryKey: ['whatsapp-contato-detalhe', contato?.id],
    queryFn: async () => {
      if (!contato?.id) return null;
      const { data, error } = await supabase
        .from('whatsapp_contatos')
        .select(`
          *,
          contatos (
            id,
            primeiro_nome,
            sobrenome,
            email,
            telefone,
            cargo,
            clientes (
              id,
              nome_emit,
              nome_fantasia,
              cgc
            )
          )
        `)
        .eq('id', contato.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!contato?.id,
  });

  // Check if contact is already in a carteira
  const { data: carteiraAtual, refetch: refetchCarteira } = useQuery({
    queryKey: ['whatsapp-contato-carteira', contato?.id],
    queryFn: async () => {
      if (!contato?.id) return null;
      const { data, error } = await (supabase as any)
        .from('whatsapp_carteiras_contatos')
        .select(`
          id,
          carteira_id,
          carteira:whatsapp_carteiras_v2!whatsapp_carteiras_contatos_carteira_id_fkey(
            id, nome, cor, operador:perfis_usuario!whatsapp_carteiras_v2_operador_id_fkey(nome_completo)
          )
        `)
        .eq('whatsapp_contato_id', contato.id)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar carteira do contato:', error);
        return null;
      }
      return data;
    },
    enabled: !!contato?.id,
  });

  // Fetch conversation stats
  const { data: stats } = useQuery({
    queryKey: ['whatsapp-conversa-stats', conversaId],
    queryFn: async () => {
      if (!conversaId) return null;
      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .select('id, direcao, criado_em')
        .eq('conversa_id', conversaId);

      if (error) throw error;
      
      const received = data.filter(m => m.direcao === 'recebida').length;
      const sent = data.filter(m => m.direcao === 'enviada').length;
      const firstMessage = data.length > 0 ? data[data.length - 1]?.criado_em : null;
      
      return { received, sent, total: data.length, firstMessage };
    },
    enabled: !!conversaId,
  });

  const handleCarteirizar = () => {
    if (!selectedCarteira || !contato?.id) return;
    
    adicionarContato({
      carteiraId: selectedCarteira,
      contatoId: contato.id,
    }, {
      onSuccess: () => {
        setSelectedCarteira('');
        refetchCarteira();
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas-v2'] });
      }
    });
  };

  const handleRemoverCarteira = () => {
    if (!carteiraAtual?.id) return;
    
    removerContato(carteiraAtual.id, {
      onSuccess: () => {
        refetchCarteira();
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas-v2'] });
      }
    });
  };

  if (!contato) {
    return (
      <div className="h-full flex items-center justify-center bg-card border-l">
        <p className="text-muted-foreground text-sm">Selecione uma conversa</p>
      </div>
    );
  }

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const linkedContact = contatoCompleto?.contatos;
  const linkedClient = linkedContact?.clientes;

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Detalhes do Contato</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Profile Card */}
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-3">
              <AvatarImage src={contato.foto_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(contato.nome_whatsapp || '??')}
              </AvatarFallback>
            </Avatar>
            <h4 className="font-semibold">{contato.nome_whatsapp}</h4>
            <p className="text-sm text-muted-foreground">{contato.numero_whatsapp}</p>
            
            <div className="flex justify-center gap-2 mt-3">
              <Button variant="outline" size="sm">
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Ligar
              </Button>
              <Button variant="outline" size="sm">
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
            </div>
          </div>

          <Separator />

          <Accordion type="multiple" defaultValue={['crm', 'carteira', 'stats']} className="space-y-2">
            {/* CRM Link */}
            {linkedContact ? (
              <AccordionItem value="crm" className="border rounded-lg px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="text-xs font-medium flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Contato no CRM
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {linkedContact.primeiro_nome} {linkedContact.sobrenome}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  {linkedContact.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {linkedContact.email}
                    </div>
                  )}
                  {linkedContact.cargo && (
                    <Badge variant="outline" className="text-xs">
                      {linkedContact.cargo}
                    </Badge>
                  )}
                </AccordionContent>
              </AccordionItem>
            ) : (
              <AccordionItem value="crm" className="border border-dashed rounded-lg px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="text-xs font-medium flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Contato no CRM
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    Não vinculado ao CRM
                  </p>
                  <Button variant="outline" size="sm">
                    Vincular Contato
                  </Button>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Client Info */}
            {linkedClient && (
              <AccordionItem value="empresa" className="border rounded-lg px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="text-xs font-medium flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    Empresa
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-1">
                  <p className="text-sm font-medium">
                    {linkedClient.nome_fantasia || linkedClient.nome_emit}
                  </p>
                  {linkedClient.cgc && (
                    <p className="text-xs text-muted-foreground">
                      CNPJ: {linkedClient.cgc}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Carteira */}
            <AccordionItem value="carteira" className="border rounded-lg px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-xs font-medium flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" />
                  Carteira
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                {carteiraAtual ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: carteiraAtual.carteira?.cor || '#3b82f6' }}
                      />
                      <span className="text-sm font-medium">{carteiraAtual.carteira?.nome}</span>
                    </div>
                    {carteiraAtual.carteira?.operador?.nome_completo && (
                      <p className="text-xs text-muted-foreground">
                        Operador: {carteiraAtual.carteira.operador.nome_completo}
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-destructive hover:text-destructive"
                      onClick={handleRemoverCarteira}
                      disabled={isRemovendoContato}
                    >
                      {isRemovendoContato ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Remover da Carteira
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Select value={selectedCarteira} onValueChange={setSelectedCarteira}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar carteira..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {carteiras?.map((carteira) => (
                          <SelectItem key={carteira.id} value={carteira.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: carteira.cor }}
                              />
                              {carteira.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full"
                      onClick={handleCarteirizar}
                      disabled={!selectedCarteira || isAdicionandoContato}
                    >
                      {isAdicionandoContato ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Carteirizar
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Estatísticas */}
            {stats && (
              <AccordionItem value="stats" className="border rounded-lg px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="text-xs font-medium flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Estatísticas
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold">{stats.received}</p>
                      <p className="text-[10px] text-muted-foreground">Recebidas</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-lg font-semibold">{stats.sent}</p>
                      <p className="text-[10px] text-muted-foreground">Enviadas</p>
                    </div>
                  </div>
                  {stats.firstMessage && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      Primeira mensagem: {format(new Date(stats.firstMessage), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Tags */}
            <AccordionItem value="tags" className="border rounded-lg px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-xs font-medium flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Etiquetas
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">Lead</Badge>
                  <Badge variant="outline" className="text-xs">+ Adicionar</Badge>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Documents */}
            <AccordionItem value="docs" className="border rounded-lg px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="text-xs font-medium flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Documentos Compartilhados
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum documento
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}
