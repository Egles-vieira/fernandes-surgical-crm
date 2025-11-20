import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface AgenteVendasToggleProps {
  contaId: string;
  agenteAtivo: boolean;
}

const AgenteVendasToggle = ({ contaId, agenteAtivo }: AgenteVendasToggleProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ativo, setAtivo] = useState(agenteAtivo);

  const toggleMutation = useMutation({
    mutationFn: async (novoStatus: boolean) => {
      const { error } = await supabase
        .from('whatsapp_contas')
        .update({ agente_vendas_ativo: novoStatus })
        .eq('id', contaId);

      if (error) throw error;
    },
    onSuccess: (_, novoStatus) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas'] });
      toast({
        title: novoStatus ? 'Agente ativado' : 'Agente desativado',
        description: novoStatus 
          ? 'O agente de vendas responderá automaticamente às mensagens' 
          : 'O agente de vendas foi desativado',
      });
      setAtivo(novoStatus);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Agente de Vendas IA
                {ativo && (
                  <Badge variant="default" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    Ativo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Responde automaticamente buscando produtos na base
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={ativo}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
            />
            {toggleMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>✨ Respostas naturais e conversacionais</p>
          <p>🔍 Busca automática de produtos</p>
          <p>💬 Não parece um robô - fala como uma pessoa real</p>
          <p>⚡ Respostas rápidas e precisas</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgenteVendasToggle;
