/**
 * Configurações de Atendimento WhatsApp
 * SLA, throttling, distribuição e regras gerais
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Timer, Users, MessageSquare, Shield } from "lucide-react";
import { toast } from "sonner";

interface ConfigAtendimento {
  id?: string;
  // Distribuição
  modo_distribuicao: string;
  max_atendimentos_por_operador: number;
  tempo_inatividade_redistribuir_min: number;
  priorizar_carteira: boolean;
  
  // Carteirização
  carteirizacao_ativa: boolean;
  modo_carteirizacao: 'preferencial' | 'forcar';
  
  // SLA
  sla_primeira_resposta_min: number;
  sla_tempo_medio_resposta_min: number;
  sla_tempo_resolucao_min: number;
  
  // Throttling
  throttle_msgs_por_minuto: number;
  throttle_msgs_por_hora: number;
  throttle_habilitado: boolean;
  
  // Fila
  max_fila_espera: number;
  tempo_max_fila_min: number;
  mensagem_fila_cheia?: string;
  
  // Geral
  horario_atendimento_habilitado: boolean;
  feriados_habilitado: boolean;
  transferencia_entre_unidades: boolean;
  distribuicao_automatica: boolean;
}

const MODOS_DISTRIBUICAO = [
  { value: 'round_robin', label: 'Round Robin', desc: 'Distribui igualmente entre operadores' },
  { value: 'menos_ocupado', label: 'Menos Ocupado', desc: 'Prioriza operador com menos atendimentos' },
  { value: 'carteira', label: 'Carteira (Sticky)', desc: 'Mantém cliente com mesmo operador' },
  { value: 'manual', label: 'Manual', desc: 'Supervisores distribuem manualmente' },
];

const MODOS_CARTEIRIZACAO = [
  { value: 'preferencial', label: 'Preferencial', desc: 'Se operador indisponível, redistribui para outro' },
  { value: 'forcar', label: 'Forçar', desc: 'SEMPRE vai para operador da carteira, aguarda se offline' },
];

export function ConfiguracoesAtendimento() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ConfigAtendimento>({
    modo_distribuicao: 'round_robin',
    max_atendimentos_por_operador: 5,
    tempo_inatividade_redistribuir_min: 30,
    priorizar_carteira: true,
    carteirizacao_ativa: true,
    modo_carteirizacao: 'preferencial',
    sla_primeira_resposta_min: 5,
    sla_tempo_medio_resposta_min: 10,
    sla_tempo_resolucao_min: 60,
    throttle_msgs_por_minuto: 30,
    throttle_msgs_por_hora: 200,
    throttle_habilitado: true,
    max_fila_espera: 50,
    tempo_max_fila_min: 15,
    mensagem_fila_cheia: 'No momento todos os atendentes estão ocupados. Tente novamente em alguns minutos.',
    horario_atendimento_habilitado: true,
    feriados_habilitado: true,
    transferencia_entre_unidades: true,
    distribuicao_automatica: true,
  });

  // Buscar configuração existente
  const { data: configData, isLoading } = useQuery({
    queryKey: ['whatsapp-config-atendimento'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('whatsapp_config_atendimento' as any)
        .select('*')
        .limit(1)
        .single() as any);
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as ConfigAtendimento | null;
    }
  });

  // Atualizar state quando dados carregarem
  useEffect(() => {
    if (configData) {
      setConfig(prev => ({ ...prev, ...configData }));
    }
  }, [configData]);

  // Salvar configuração
  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (configData?.id) {
        const { error } = await (supabase
          .from('whatsapp_config_atendimento' as any)
          .update(config)
          .eq('id', configData.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('whatsapp_config_atendimento' as any)
          .insert(config) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config-atendimento'] });
      toast.success('Configurações salvas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando configurações...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Distribuição */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Distribuição de Atendimentos
          </CardTitle>
          <CardDescription>
            Configure como as conversas são distribuídas entre operadores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modo de Distribuição</Label>
            <Select
              value={config.modo_distribuicao}
              onValueChange={(v) => setConfig({ ...config, modo_distribuicao: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODOS_DISTRIBUICAO.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máx. atendimentos por operador</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={config.max_atendimentos_por_operador}
                onChange={(e) => setConfig({ ...config, max_atendimentos_por_operador: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo inatividade p/ redistribuir (min)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={config.tempo_inatividade_redistribuir_min}
                onChange={(e) => setConfig({ ...config, tempo_inatividade_redistribuir_min: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={config.priorizar_carteira}
              onCheckedChange={(v) => setConfig({ ...config, priorizar_carteira: v })}
            />
            <Label>Priorizar carteira (sticky agent)</Label>
          </div>

          {config.priorizar_carteira && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.carteirizacao_ativa}
                  onCheckedChange={(v) => setConfig({ ...config, carteirizacao_ativa: v })}
                />
                <Label>Carteirização ativa</Label>
              </div>

              <div className="space-y-2">
                <Label>Modo de Carteirização</Label>
                <Select
                  value={config.modo_carteirizacao}
                  onValueChange={(v: 'preferencial' | 'forcar') => setConfig({ ...config, modo_carteirizacao: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODOS_CARTEIRIZACAO.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div>
                          <div className="font-medium">{m.label}</div>
                          <div className="text-xs text-muted-foreground">{m.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-5 w-5" />
            SLA (Níveis de Serviço)
          </CardTitle>
          <CardDescription>
            Configure os tempos máximos para cada etapa do atendimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>1ª Resposta (min)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={config.sla_primeira_resposta_min}
                onChange={(e) => setConfig({ ...config, sla_primeira_resposta_min: parseInt(e.target.value) || 5 })}
              />
              <p className="text-xs text-muted-foreground">Tempo máximo para primeira resposta</p>
            </div>
            <div className="space-y-2">
              <Label>Tempo Médio Resposta (min)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={config.sla_tempo_medio_resposta_min}
                onChange={(e) => setConfig({ ...config, sla_tempo_medio_resposta_min: parseInt(e.target.value) || 10 })}
              />
              <p className="text-xs text-muted-foreground">TMA durante a conversa</p>
            </div>
            <div className="space-y-2">
              <Label>Tempo Resolução (min)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={config.sla_tempo_resolucao_min}
                onChange={(e) => setConfig({ ...config, sla_tempo_resolucao_min: parseInt(e.target.value) || 60 })}
              />
              <p className="text-xs text-muted-foreground">Tempo total do atendimento</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Throttling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Throttling (Limites de Envio)
          </CardTitle>
          <CardDescription>
            Proteja sua conta contra bloqueios do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.throttle_habilitado}
              onCheckedChange={(v) => setConfig({ ...config, throttle_habilitado: v })}
            />
            <Label>Habilitar throttling</Label>
          </div>

          {config.throttle_habilitado && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mensagens por minuto</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={config.throttle_msgs_por_minuto}
                  onChange={(e) => setConfig({ ...config, throttle_msgs_por_minuto: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagens por hora</Label>
                <Input
                  type="number"
                  min={10}
                  max={1000}
                  value={config.throttle_msgs_por_hora}
                  onChange={(e) => setConfig({ ...config, throttle_msgs_por_hora: parseInt(e.target.value) || 200 })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fila de Espera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Fila de Espera
          </CardTitle>
          <CardDescription>
            Configure o comportamento da fila de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tamanho máximo da fila</Label>
              <Input
                type="number"
                min={5}
                max={500}
                value={config.max_fila_espera}
                onChange={(e) => setConfig({ ...config, max_fila_espera: parseInt(e.target.value) || 50 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo máximo na fila (min)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={config.tempo_max_fila_min}
                onChange={(e) => setConfig({ ...config, tempo_max_fila_min: parseInt(e.target.value) || 15 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mensagem quando fila cheia</Label>
            <Input
              value={config.mensagem_fila_cheia || ''}
              onChange={(e) => setConfig({ ...config, mensagem_fila_cheia: e.target.value })}
              placeholder="Mensagem exibida quando não há mais vagas"
            />
          </div>
        </CardContent>
      </Card>

      {/* Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.horario_atendimento_habilitado}
              onCheckedChange={(v) => setConfig({ ...config, horario_atendimento_habilitado: v })}
            />
            <Label>Respeitar horário de expediente</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={config.feriados_habilitado}
              onCheckedChange={(v) => setConfig({ ...config, feriados_habilitado: v })}
            />
            <Label>Respeitar feriados cadastrados</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={config.transferencia_entre_unidades}
              onCheckedChange={(v) => setConfig({ ...config, transferencia_entre_unidades: v })}
            />
            <Label>Permitir transferência entre unidades</Label>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={() => salvarMutation.mutate()}
          disabled={salvarMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {salvarMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}

export default ConfiguracoesAtendimento;
