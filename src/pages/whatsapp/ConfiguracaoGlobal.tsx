import { useState } from 'react';
import { useWhatsAppConfig } from '@/hooks/useWhatsAppConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ConfiguracaoGlobal = () => {
  const navigate = useNavigate();
  const { config, isLoading, isOficial, isGupshup, isWAPI, atualizarConfig, isAtualizando } = useWhatsAppConfig();
  
  const [modoSelecionado, setModoSelecionado] = useState<'oficial' | 'nao_oficial'>(
    config?.modo_api || 'oficial'
  );
  const [provedorSelecionado, setProvedorSelecionado] = useState<'gupshup' | 'w_api'>(
    config?.provedor_ativo || 'gupshup'
  );
  const [observacoes, setObservacoes] = useState<string>(config?.observacoes || '');

  const handleSalvar = () => {
    atualizarConfig({
      modo_api: modoSelecionado,
      provedor_ativo: provedorSelecionado,
      observacoes: observacoes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/whatsapp/configuracoes')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configuração Global WhatsApp</h1>
            <p className="text-muted-foreground mt-1">
              Escolha qual provedor de API o sistema deve utilizar
            </p>
          </div>
        </div>
        
        {config && (
          <Badge 
            variant={isOficial ? 'default' : 'secondary'}
            className="text-sm px-3 py-1"
          >
            {isOficial ? '🏢 Oficial' : '🔌 Não Oficial'} - {isGupshup ? 'Gupshup' : 'W-API'}
          </Badge>
        )}
      </div>

      {/* Alerta */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esta configuração afeta <strong>todo o sistema</strong>. Ao mudar o provedor, 
          os webhooks e lógica de envio serão alterados automaticamente.
        </AlertDescription>
      </Alert>

      {/* Config Atual */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Configuração Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Modo:</span>
              <span className="text-sm">{isOficial ? 'API Oficial' : 'API Não Oficial'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Provedor:</span>
              <span className="text-sm capitalize">{isGupshup ? 'Gupshup' : 'W-API'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Configurado em:</span>
              <span className="text-sm">
                {format(new Date(config.configurado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seleção de Modo */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de API</CardTitle>
          <CardDescription>Selecione qual tipo de integração utilizar</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={modoSelecionado} 
            onValueChange={(value) => setModoSelecionado(value as 'oficial' | 'nao_oficial')}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
              <RadioGroupItem value="oficial" id="oficial" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="oficial" className="font-semibold text-base cursor-pointer">
                  🏢 API Oficial
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Utiliza provedores homologados para envio de mensagens WhatsApp Business. 
                  Mais estável e com suporte oficial.
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">Estável</Badge>
                  <Badge variant="outline" className="text-xs">Suporte</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
              <RadioGroupItem value="nao_oficial" id="nao_oficial" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="nao_oficial" className="font-semibold text-base cursor-pointer">
                  🔌 API Não Oficial
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Utiliza APIs alternativas como W-API. Setup mais rápido, 
                  mas depende de disponibilidade de terceiros.
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">Setup Rápido</Badge>
                  <Badge variant="outline" className="text-xs">Flexível</Badge>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Seleção de Provedor */}
      <Card>
        <CardHeader>
          <CardTitle>Provedor Ativo</CardTitle>
          <CardDescription>
            Escolha qual provedor será utilizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={provedorSelecionado} onValueChange={(value) => setProvedorSelecionado(value as 'gupshup' | 'w_api')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gupshup">
                <div className="flex items-center gap-2">
                  <span>Gupshup</span>
                  {isGupshup && <Badge variant="secondary" className="text-xs">Atual</Badge>}
                </div>
              </SelectItem>
              <SelectItem value="w_api">
                <div className="flex items-center gap-2">
                  <span>W-API</span>
                  {isWAPI && <Badge variant="secondary" className="text-xs">Atual</Badge>}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            Certifique-se de ter as credenciais configuradas para o provedor escolhido
          </p>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Adicione notas sobre esta configuração (opcional)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: Migrando para W-API para testes..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/whatsapp/configuracoes')}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSalvar} 
          disabled={isAtualizando}
          size="lg"
        >
          {isAtualizando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar e Aplicar
        </Button>
      </div>

      {/* Aviso de recarga */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> Ao salvar, a página será recarregada automaticamente 
          para aplicar as novas configurações.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ConfiguracaoGlobal;
