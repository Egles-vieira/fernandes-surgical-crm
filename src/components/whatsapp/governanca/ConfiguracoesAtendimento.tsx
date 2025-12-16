/**
 * Configurações de Atendimento WhatsApp
 * SLA, distribuição e regras gerais
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
import { Settings, Save, Timer, Users, Zap } from "lucide-react";
import { toast } from "sonner";

interface ConfigAtendimento {
  id?: string;
  // Distribuição
  tipo_distribuicao: string;
  max_atendimentos_simultaneos: number;
  tempo_max_aceite_segundos: number;
  apenas_operadores_online: boolean;
  
  // Carteirização
  carteirizacao_ativa: boolean;
  modo_carteirizacao: string;
  
  // SLA
  sla_inatividade_horas: number;
  notificar_antes_encerramento_minutos: number;
  mensagem_encerramento_inatividade?: string;
  
  // Exibição
  exibir_nome_operador: boolean;
  formato_nome: string;
  
  // Geral
  bloquear_ao_atingir_limite: boolean;
  distribuicao_automatica_ativa: boolean;
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
    tipo_distribuicao: 'round_robin',
    max_atendimentos_simultaneos: 5,
    tempo_max_aceite_segundos: 60,
    apenas_operadores_online: true,
    carteirizacao_ativa: true,
    modo_carteirizacao: 'preferencial',
    sla_inatividade_horas: 24,
    notificar_antes_encerramento_minutos: 30,
    mensagem_encerramento_inatividade: 'Conversa encerrada por inatividade.',
    exibir_nome_operador: true,
    formato_nome: 'primeiro_nome',
    bloquear_ao_atingir_limite: true,
    distribuicao_automatica_ativa: true,
  });

  // Buscar configuração existente
  const { data: configData, isLoading } = useQuery({
    queryKey: ['whatsapp-configuracoes-atendimento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_configuracoes_atendimento')
        .select('*')
        .limit(1)
        .single();
      
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
        const { error } = await supabase
          .from('whatsapp_configuracoes_atendimento')
          .update(config)
          .eq('id', configData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_configuracoes_atendimento')
          .insert(config);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-configuracoes-atendimento'] });
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
      {/* Distribuição Automática */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Distribuição Automática
          </CardTitle>
          <CardDescription>
            Ative para distribuir conversas automaticamente aos operadores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.distribuicao_automatica_ativa}
              onCheckedChange={(v) => setConfig({ ...config, distribuicao_automatica_ativa: v })}
            />
            <Label>Distribuição automática ativa</Label>
          </div>
        </CardContent>
      </Card>

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
              value={config.tipo_distribuicao}
              onValueChange={(v) => setConfig({ ...config, tipo_distribuicao: v })}
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
              <Label>Máx. atendimentos simultâneos</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={config.max_atendimentos_simultaneos}
                onChange={(e) => setConfig({ ...config, max_atendimentos_simultaneos: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tempo máx. p/ aceitar (segundos)</Label>
              <Input
                type="number"
                min={10}
                max={300}
                value={config.tempo_max_aceite_segundos}
                onChange={(e) => setConfig({ ...config, tempo_max_aceite_segundos: parseInt(e.target.value) || 60 })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={config.apenas_operadores_online}
              onCheckedChange={(v) => setConfig({ ...config, apenas_operadores_online: v })}
            />
            <Label>Distribuir apenas para operadores online</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={config.bloquear_ao_atingir_limite}
              onCheckedChange={(v) => setConfig({ ...config, bloquear_ao_atingir_limite: v })}
            />
            <Label>Bloquear ao atingir limite de atendimentos</Label>
          </div>
        </CardContent>
      </Card>

      {/* Carteirização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Carteirização
          </CardTitle>
          <CardDescription>
            Configure como os clientes são vinculados a operadores específicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.carteirizacao_ativa}
              onCheckedChange={(v) => setConfig({ ...config, carteirizacao_ativa: v })}
            />
            <Label>Carteirização ativa</Label>
          </div>

          {config.carteirizacao_ativa && (
            <div className="space-y-2 pl-6 border-l-2 border-primary/20">
              <Label>Modo de Carteirização</Label>
              <Select
                value={config.modo_carteirizacao}
                onValueChange={(v) => setConfig({ ...config, modo_carteirizacao: v })}
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
          )}
        </CardContent>
      </Card>

      {/* SLA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="h-5 w-5" />
            Encerramento por Inatividade
          </CardTitle>
          <CardDescription>
            Configure o tempo máximo de inatividade antes de encerrar conversa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inatividade p/ encerrar (horas)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={config.sla_inatividade_horas}
                onChange={(e) => setConfig({ ...config, sla_inatividade_horas: parseInt(e.target.value) || 24 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notificar antes (minutos)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                value={config.notificar_antes_encerramento_minutos}
                onChange={(e) => setConfig({ ...config, notificar_antes_encerramento_minutos: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mensagem de encerramento</Label>
            <Input
              value={config.mensagem_encerramento_inatividade || ''}
              onChange={(e) => setConfig({ ...config, mensagem_encerramento_inatividade: e.target.value })}
              placeholder="Mensagem enviada ao encerrar por inatividade"
            />
          </div>
        </CardContent>
      </Card>

      {/* Exibição */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Configurações de Exibição
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.exibir_nome_operador}
              onCheckedChange={(v) => setConfig({ ...config, exibir_nome_operador: v })}
            />
            <Label>Exibir nome do operador para o cliente</Label>
          </div>

          {config.exibir_nome_operador && (
            <div className="space-y-2 pl-6 border-l-2 border-primary/20">
              <Label>Formato do nome</Label>
              <Select
                value={config.formato_nome}
                onValueChange={(v) => setConfig({ ...config, formato_nome: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primeiro_nome">Primeiro nome</SelectItem>
                  <SelectItem value="nome_completo">Nome completo</SelectItem>
                  <SelectItem value="apelido">Apelido/Nome fantasia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
