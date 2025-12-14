// ============================================
// WABA Configuration Page
// Configuração e status do WhatsApp Business Account
// ============================================

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Building2,
  Webhook,
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Key,
  Zap,
  Signal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWABAInfo, useTokenInfo, useSubscriptionActions } from '@/hooks/whatsapp/useWABAInfo';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PhoneNumbersCard } from '@/components/whatsapp/PhoneNumbersCard';

export default function WABAConfig() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Buscar conta ativa
  const { data: conta, isLoading: isLoadingConta } = useQuery({
    queryKey: ['whatsapp-conta-ativa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('*')
        .eq('provedor', 'meta_cloud_api')
        .is('excluido_em', null)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const contaId = conta?.id;

  // Buscar informações do WABA
  const { data: wabaData, isLoading: isLoadingWaba, refetch: refetchWaba } = useWABAInfo(contaId);

  // Buscar informações do token
  const { data: tokenInfo, isLoading: isLoadingToken, refetch: refetchToken } = useTokenInfo(contaId);

  // Actions de subscription
  const { subscribe, unsubscribe } = useSubscriptionActions();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchWaba(), refetchToken()]);
      toast.success('Dados atualizados');
    } catch (error) {
      toast.error('Erro ao atualizar');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Verificado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'not_verified':
        return <Badge className="bg-red-500/20 text-red-500"><XCircle className="h-3 w-3 mr-1" />Não Verificado</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Desconhecido'}</Badge>;
    }
  };

  const getSubscriptionBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500"><Zap className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'inactive':
        return <Badge className="bg-red-500/20 text-red-500"><XCircle className="h-3 w-3 mr-1" />Inativo</Badge>;
      default:
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Desconhecido</Badge>;
    }
  };

  if (isLoadingConta) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!conta) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Nenhuma conta configurada</h2>
              <p className="text-muted-foreground mb-4">
                Configure uma conta WhatsApp Meta Cloud API para continuar
              </p>
              <Button asChild>
                <Link to="/whatsapp/settings">Ir para Configurações</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/whatsapp/settings">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Configuração WABA
                </h1>
                <p className="text-sm text-muted-foreground">
                  WhatsApp Business Account - Meta Cloud API
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* WABA Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Informações do WABA
              </CardTitle>
              <CardDescription>
                Dados da conta WhatsApp Business Account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWaba ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : wabaData?.waba ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">WABA ID</p>
                    <p className="font-mono text-sm">{wabaData.waba.id}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Nome</p>
                    <p className="text-sm font-medium">{wabaData.waba.name}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Status da Conta</p>
                    {getVerificationBadge(wabaData.waba.account_review_status)}
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Verificação do Negócio</p>
                    {getVerificationBadge(wabaData.waba.business_verification_status)}
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Moeda</p>
                    <p className="text-sm">{wabaData.waba.currency}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Tipo de Propriedade</p>
                    <p className="text-sm">{wabaData.waba.ownership_type}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>Não foi possível carregar informações do WABA</p>
                  <Button variant="link" onClick={handleRefresh}>Tentar novamente</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Phone Numbers Card - Novo componente com semáforos */}
          <PhoneNumbersCard contaId={conta.id} />

          {/* Webhook Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Subscription do Webhook
              </CardTitle>
              <CardDescription>
                Status da inscrição para receber eventos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingWaba ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Signal className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Status da Subscription</p>
                        <p className="text-sm text-muted-foreground">
                          {wabaData?.subscription?.subscribedFields?.join(', ') || 'Nenhum campo inscrito'}
                        </p>
                      </div>
                    </div>
                    {getSubscriptionBadge(wabaData?.subscription?.status)}
                  </div>

                  <div className="flex gap-2">
                    {wabaData?.subscription?.status !== 'active' ? (
                      <Button
                        onClick={() => subscribe.mutate({ contaId: conta.id })}
                        disabled={subscribe.isPending}
                        className="flex-1"
                      >
                        {subscribe.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        Inscrever Webhook
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => unsubscribe.mutate(conta.id)}
                        disabled={unsubscribe.isPending}
                        className="flex-1"
                      >
                        {unsubscribe.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Desinscrever Webhook
                      </Button>
                    )}
                  </div>

                  {conta.subscription_verificado_em && (
                    <p className="text-xs text-muted-foreground text-center">
                      Última verificação: {formatDistanceToNow(new Date(conta.subscription_verificado_em), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Token Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Status do Token
              </CardTitle>
              <CardDescription>
                Validade e permissões do Access Token
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingToken ? (
                <Skeleton className="h-20 w-full" />
              ) : tokenInfo ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      {tokenInfo.tokenValid ? (
                        <Badge className="bg-green-500/20 text-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Válido
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inválido
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Expiração</p>
                      {tokenInfo.neverExpires ? (
                        <Badge className="bg-blue-500/20 text-blue-500">
                          <Shield className="h-3 w-3 mr-1" />
                          Permanente
                        </Badge>
                      ) : tokenInfo.daysRemaining !== null ? (
                        <p className={`text-sm font-medium ${
                          tokenInfo.daysRemaining <= 7 ? 'text-red-500' : 
                          tokenInfo.daysRemaining <= 30 ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {tokenInfo.daysRemaining} dias restantes
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Desconhecido</p>
                      )}
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                      <p className="text-sm">{tokenInfo.type || 'Desconhecido'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">App ID</p>
                      <p className="font-mono text-sm">{tokenInfo.appId || '-'}</p>
                    </div>
                  </div>

                  {tokenInfo.scopes && tokenInfo.scopes.length > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">Permissões (Scopes)</p>
                      <div className="flex flex-wrap gap-1">
                        {tokenInfo.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {tokenInfo.daysRemaining !== null && tokenInfo.daysRemaining <= 7 && !tokenInfo.neverExpires && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <p className="text-sm text-destructive">
                        Token expirando em breve! Renove no Meta Developer Console.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Não foi possível verificar o token</p>
                  <Button variant="link" onClick={() => refetchToken()}>Tentar novamente</Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
