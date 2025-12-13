import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NovaContaSheet } from "./NovaContaSheet";
import AgenteVendasToggle from "./AgenteVendasToggle";

const ContasWhatsAppList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contaParaEditar, setContaParaEditar] = useState<any>(null);
  const [contaParaDeletar, setContaParaDeletar] = useState<string | null>(null);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);

  const { data: contas, isLoading } = useQuery({
    queryKey: ['whatsapp-contas-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('*')
        .is('excluido_em', null)
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deletarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_contas')
        .update({ excluido_em: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas-admin'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas'] });
      toast({
        title: "Conta removida",
        description: "Conta WhatsApp removida com sucesso",
      });
      setContaParaDeletar(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover conta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditar = (conta: any) => {
    setContaParaEditar(conta);
    setDialogEditarOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogEditarOpen(false);
    setContaParaEditar(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ativo: { variant: "default" as const, label: "Ativo", icon: CheckCircle2 },
      suspenso: { variant: "secondary" as const, label: "Suspenso", icon: Clock },
      desconectado: { variant: "destructive" as const, label: "Desconectado", icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ativo;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getProviderLabel = (provider: string) => {
    const providers: Record<string, string> = {
      meta: "Meta (Facebook)",
      twilio: "Twilio",
      "360dialog": "360Dialog",
      messagebird: "MessageBird",
    };
    return providers[provider] || provider;
  };

  if (isLoading) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Carregando contas...</p>
      </Card>
    );
  }

  if (!contas || contas.length === 0) {
    return (
      <Card className="p-12 text-center">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma conta configurada</h3>
        <p className="text-sm text-muted-foreground">
          Clique em "Nova Conta" para adicionar uma conta WhatsApp Business
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {contas.map((conta) => (
          <Card key={conta.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{conta.nome_conta}</h3>
                        {getStatusBadge(conta.status)}
                        <Badge variant={conta.provedor === 'gupshup' ? 'default' : 'secondary'}>
                          {conta.provedor === 'gupshup' ? '🏢 Gupshup' : '🔌 W-API'}
                        </Badge>
                        {conta.verificada && (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            Verificada
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {conta.numero_whatsapp}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Provider</p>
                        <p className="text-sm font-medium">{getProviderLabel(conta.provider)}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mensagens Enviadas</p>
                        <p className="text-sm font-medium">{conta.total_mensagens_enviadas}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mensagens Recebidas</p>
                        <p className="text-sm font-medium">{conta.total_mensagens_recebidas}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Conversas</p>
                        <p className="text-sm font-medium">{conta.total_conversas}</p>
                      </div>
                    </div>

                    {conta.nome_exibicao && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Nome de Exibição</p>
                        <p className="text-sm">{conta.nome_exibicao}</p>
                      </div>
                    )}

                    {conta.descricao_negocio && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                        <p className="text-sm">{conta.descricao_negocio}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Criada em {format(new Date(conta.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {conta.ultima_sincronizacao_em && (
                        <span>
                          Última sincronização: {format(new Date(conta.ultima_sincronizacao_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>

                    {/* Agente de Vendas */}
                    <div className="mt-4">
                      <AgenteVendasToggle 
                        contaId={conta.id} 
                        agenteAtivo={conta.agente_vendas_ativo || false}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEditar(conta)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setContaParaDeletar(conta.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <NovaContaSheet
        open={dialogEditarOpen}
        onOpenChange={handleCloseDialog}
        conta={contaParaEditar}
      />

      <AlertDialog open={!!contaParaDeletar} onOpenChange={() => setContaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conta será marcada como excluída
              e não aparecerá mais nas listagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contaParaDeletar && deletarMutation.mutate(contaParaDeletar)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContasWhatsAppList;
