// ============================================
// WhatsApp Settings Page - Unified Configuration
// ============================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Settings, 
  Key, 
  Phone, 
  Send, 
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Webhook,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useWhatsAppService } from '@/services/whatsapp/hooks/useWhatsAppService';
import { whatsAppService } from '@/services/whatsapp';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function WhatsAppSettings() {
  const queryClient = useQueryClient();
  const { connectionStatus, isConnected, testConnection, isTesting } = useWhatsAppService();
  const [showToken, setShowToken] = useState(false);
  const [testNumber, setTestNumber] = useState('');

  // Fetch current config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('*')
        .eq('provedor', 'meta_cloud_api')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch webhook logs
  const { data: webhookLogs = [] } = useQuery({
    queryKey: ['whatsapp-webhook-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_webhooks_log')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Update config mutation
  const updateConfig = useMutation({
    mutationFn: async (updates: any) => {
      if (!config?.id) throw new Error('Configuração não encontrada');
      const { error } = await supabase
        .from('whatsapp_contas')
        .update(updates)
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      toast.success('Configuração atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar', { description: error.message });
    },
  });

  // Test connection handler
  const handleTestConnection = async () => {
    if (!testNumber) {
      toast.error('Informe um número para teste');
      return;
    }

    try {
      await testConnection(testNumber);
      toast.success('Mensagem de teste enviada!');
    } catch (error) {
      toast.error('Falha no envio', {
        description: error instanceof Error ? error.message : 'Verifique as configurações',
      });
    }
  };

  const getQualityColor = (rating?: string) => {
    switch (rating) {
      case 'GREEN': return 'text-green-500';
      case 'YELLOW': return 'text-yellow-500';
      case 'RED': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const maskToken = (token?: string) => {
    if (!token) return '';
    return showToken ? token : `${token.slice(0, 20)}...${token.slice(-10)}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/whatsapp">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações WhatsApp
                </h1>
                <p className="text-sm text-muted-foreground">
                  Meta Cloud API v21.0
                </p>
              </div>
            </div>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Desconectado
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Status da Conexão
              </CardTitle>
              <CardDescription>
                Estado atual da integração com Meta Cloud API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Phone Number ID</p>
                  <p className="font-mono text-sm">
                    {connectionStatus?.phoneNumberId || 'Não configurado'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Qualidade</p>
                  <p className={`text-sm font-medium ${getQualityColor(connectionStatus?.qualityRating)}`}>
                    {connectionStatus?.qualityRating || 'Desconhecido'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Nome do Negócio</p>
                  <p className="text-sm">
                    {connectionStatus?.businessName || '-'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Número</p>
                  <p className="text-sm">
                    {connectionStatus?.displayPhoneNumber || '-'}
                  </p>
                </div>
              </div>

              {connectionStatus?.tokenExpired && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive">
                    Token expirado! Renove o token no Meta Developer Console.
                  </p>
                </div>
              )}

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] })}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Conexão
              </Button>
            </CardContent>
          </Card>

          {/* Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Credenciais
              </CardTitle>
              <CardDescription>
                Tokens e IDs para integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone_number_id"
                    value={config?.meta_phone_number_id || config?.phone_number_id || ''}
                    placeholder="Informe o Phone Number ID"
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(config?.meta_phone_number_id || '', 'Phone Number ID')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Use o Phone Number ID, não o WABA ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access_token">Access Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="access_token"
                    value={maskToken(config?.meta_access_token)}
                    placeholder="Token de acesso"
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waba_id">WABA ID</Label>
                <Input
                  id="waba_id"
                  value={config?.meta_waba_id || config?.waba_id || ''}
                  placeholder="WhatsApp Business Account ID"
                  readOnly
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Area */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                Área de Teste
              </CardTitle>
              <CardDescription>
                Envie uma mensagem de teste para validar a conexão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test_number">Número de Teste</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 border rounded-l-md bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="ml-2 text-sm">+55</span>
                  </div>
                  <Input
                    id="test_number"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="11999999999"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <Button 
                className="w-full"
                onClick={handleTestConnection}
                disabled={isTesting || !testNumber}
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Hello World
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Enviará o template padrão "hello_world" para o número informado
              </p>
            </CardContent>
          </Card>

          {/* Webhook Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Logs de Webhook
              </CardTitle>
              <CardDescription>
                Últimas notificações recebidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {webhookLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum log recebido</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {webhookLogs.map((log: any) => (
                      <div 
                        key={log.id} 
                        className="p-2 rounded-lg bg-muted/50 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px]">
                            {log.tipo_evento}
                          </Badge>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.criado_em), 'HH:mm:ss', { locale: ptBR })}
                          </span>
                        </div>
                        <pre className="text-[10px] text-muted-foreground overflow-hidden text-ellipsis">
                          {JSON.stringify(log.payload, null, 0).slice(0, 100)}...
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
