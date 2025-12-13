import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const ConfiguracaoGlobal = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Buscar configuração atual
  const { data: config, isLoading } = useQuery({
    queryKey: ['whatsapp-config-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_configuracao_global')
        .select('*')
        .eq('esta_ativo', true)
        .order('configurado_em', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });
  
  const [modoSelecionado, setModoSelecionado] = useState<'oficial' | 'nao_oficial'>('oficial');
  const [observacoes, setObservacoes] = useState<string>('');

  // Mutation para atualizar configuração
  const atualizarMutation = useMutation({
    mutationFn: async (data: { modo_api: string; observacoes?: string }) => {
      // Desativar configuração anterior
      await supabase
        .from('whatsapp_configuracao_global')
        .update({ esta_ativo: false })
        .eq('esta_ativo', true);

      // Criar nova configuração - usar insert com array
      const { error } = await supabase
        .from('whatsapp_configuracao_global')
        .insert([{
          modo_api: data.modo_api,
          provedor_ativo: 'meta_cloud_api',
          esta_ativo: true,
          observacoes: data.observacoes || null,
          configurado_por: (await supabase.auth.getUser()).data.user?.id || '',
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config-global'] });
      toast({
        title: 'Configuração salva',
        description: 'A configuração foi atualizada com sucesso',
      });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    },
  });

  const handleSalvar = () => {
    atualizarMutation.mutate({
      modo_api: modoSelecionado,
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

  const isMetaCloudAPI = config?.provedor_ativo === 'meta_cloud_api';

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
              Configuração da integração com Meta Cloud API
            </p>
          </div>
        </div>
        
        {config && (
          <Badge variant="default" className="text-sm px-3 py-1">
            🏢 Meta Cloud API (Oficial)
          </Badge>
        )}
      </div>

      {/* Alerta */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este sistema utiliza exclusivamente a <strong>Meta Cloud API Oficial</strong>. 
          APIs não-oficiais foram removidas para garantir estabilidade e conformidade.
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
              <span className="text-sm font-medium">Provedor:</span>
              <span className="text-sm">Meta Cloud API</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Modo:</span>
              <span className="text-sm">API Oficial</span>
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
          <CardTitle>Modo de Operação</CardTitle>
          <CardDescription>O sistema opera exclusivamente com Meta Cloud API</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={modoSelecionado} 
            onValueChange={(value) => setModoSelecionado(value as 'oficial' | 'nao_oficial')}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg bg-accent/50">
              <RadioGroupItem value="oficial" id="oficial" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="oficial" className="font-semibold text-base cursor-pointer">
                  🏢 Meta Cloud API (Recomendado)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Integração oficial com a API do Meta/Facebook. 
                  Estável, com suporte oficial e em conformidade com as políticas.
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">Oficial</Badge>
                  <Badge variant="outline" className="text-xs">Estável</Badge>
                  <Badge variant="outline" className="text-xs">Suporte</Badge>
                </div>
              </div>
            </div>
          </RadioGroup>
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
            placeholder="Ex: Configuração inicial da Meta Cloud API..."
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
          disabled={atualizarMutation.isPending}
          size="lg"
        >
          {atualizarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configuração
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
