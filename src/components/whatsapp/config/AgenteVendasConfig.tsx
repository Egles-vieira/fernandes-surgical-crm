import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, Loader2, Sparkles, Settings, Clock, MessageSquare, ChevronDown, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Json } from '@/integrations/supabase/types';

interface AgenteIAConfig {
  tom_voz: 'profissional' | 'amigavel' | 'tecnico' | 'casual';
  limite_respostas_por_conversa: number;
  tempo_espera_segundos: number;
  horario_funcionamento: {
    ativo: boolean;
    inicio: string;
    fim: string;
    dias_semana: number[];
  };
  regras: {
    responder_cliente_cadastrado: boolean;
    responder_com_operador_atribuido: boolean;
    responder_aguardando_cnpj: boolean;
    responder_cliente_novo_sem_operador: boolean;
  };
  mensagens: {
    fora_horario: string;
    limite_atingido: string;
  };
}

const defaultConfig: AgenteIAConfig = {
  tom_voz: 'profissional',
  limite_respostas_por_conversa: 10,
  tempo_espera_segundos: 30,
  horario_funcionamento: {
    ativo: false,
    inicio: '08:00',
    fim: '18:00',
    dias_semana: [1, 2, 3, 4, 5]
  },
  regras: {
    responder_cliente_cadastrado: false,
    responder_com_operador_atribuido: false,
    responder_aguardando_cnpj: false,
    responder_cliente_novo_sem_operador: true
  },
  mensagens: {
    fora_horario: 'Olá! Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Deixe sua mensagem que retornaremos!',
    limite_atingido: 'Para um atendimento mais personalizado, vou transferir você para um de nossos especialistas.'
  }
};

interface AgenteVendasConfigProps {
  contaId: string;
  agenteAtivo: boolean;
  config?: Json | null;
}

const diasSemana = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
];

const tonsDeVoz = [
  { value: 'profissional', label: 'Profissional', desc: 'Formal e objetivo' },
  { value: 'amigavel', label: 'Amigável', desc: 'Descontraído e próximo' },
  { value: 'tecnico', label: 'Técnico', desc: 'Detalhado e especializado' },
  { value: 'casual', label: 'Casual', desc: 'Informal e relaxado' },
];

const AgenteVendasConfig = ({ contaId, agenteAtivo, config }: AgenteVendasConfigProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ativo, setAtivo] = useState(agenteAtivo);
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<AgenteIAConfig>(() => {
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      return { ...defaultConfig, ...(config as unknown as Partial<AgenteIAConfig>) };
    }
    return defaultConfig;
  });

  useEffect(() => {
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      setLocalConfig({ ...defaultConfig, ...(config as unknown as Partial<AgenteIAConfig>) });
    }
  }, [config]);

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
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas-admin'] });
      toast({
        title: novoStatus ? 'Agente ativado' : 'Agente desativado',
        description: novoStatus 
          ? 'O agente de vendas responderá automaticamente às mensagens' 
          : 'O agente de vendas foi desativado'
      });
      setAtivo(novoStatus);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('whatsapp_contas')
        .update({ agente_ia_config: localConfig as unknown as Json })
        .eq('id', contaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas-admin'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do agente foram atualizadas com sucesso'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    }
  });

  const updateConfig = <K extends keyof AgenteIAConfig>(key: K, value: AgenteIAConfig[K]) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateRegra = (regra: keyof AgenteIAConfig['regras'], value: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      regras: { ...prev.regras, [regra]: value }
    }));
  };

  const updateHorario = <K extends keyof AgenteIAConfig['horario_funcionamento']>(
    key: K, 
    value: AgenteIAConfig['horario_funcionamento'][K]
  ) => {
    setLocalConfig(prev => ({
      ...prev,
      horario_funcionamento: { ...prev.horario_funcionamento, [key]: value }
    }));
  };

  const toggleDiaSemana = (dia: number) => {
    setLocalConfig(prev => {
      const dias = prev.horario_funcionamento.dias_semana;
      const novoDias = dias.includes(dia) 
        ? dias.filter(d => d !== dia)
        : [...dias, dia].sort();
      return {
        ...prev,
        horario_funcionamento: { ...prev.horario_funcionamento, dias_semana: novoDias }
      };
    });
  };

  const updateMensagem = (tipo: keyof AgenteIAConfig['mensagens'], value: string) => {
    setLocalConfig(prev => ({
      ...prev,
      mensagens: { ...prev.mensagens, [tipo]: value }
    }));
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4" />
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
            {toggleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <Settings className="w-3 h-3" />
                Configurações Avançadas
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-6 pt-4">
            {/* Tom de Voz e Limites */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Configurações Gerais
              </h4>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Tom de Voz</Label>
                  <Select 
                    value={localConfig.tom_voz} 
                    onValueChange={(v) => updateConfig('tom_voz', v as AgenteIAConfig['tom_voz'])}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tonsDeVoz.map(tom => (
                        <SelectItem key={tom.value} value={tom.value}>
                          <div>
                            <span className="font-medium">{tom.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">({tom.desc})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Limite de respostas por conversa</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={50}
                    value={localConfig.limite_respostas_por_conversa}
                    onChange={(e) => updateConfig('limite_respostas_por_conversa', parseInt(e.target.value) || 10)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Horário de Funcionamento */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário de Funcionamento
              </h4>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="horario-ativo"
                  checked={localConfig.horario_funcionamento.ativo}
                  onCheckedChange={(checked) => updateHorario('ativo', checked)}
                />
                <Label htmlFor="horario-ativo" className="text-xs">
                  Respeitar horário de funcionamento
                </Label>
              </div>
              
              {localConfig.horario_funcionamento.ativo && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Início</Label>
                      <Input 
                        type="time"
                        value={localConfig.horario_funcionamento.inicio}
                        onChange={(e) => updateHorario('inicio', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Fim</Label>
                      <Input 
                        type="time"
                        value={localConfig.horario_funcionamento.fim}
                        onChange={(e) => updateHorario('fim', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Dias da Semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {diasSemana.map(dia => (
                        <div key={dia.id} className="flex items-center space-x-1">
                          <Checkbox
                            id={`dia-${dia.id}`}
                            checked={localConfig.horario_funcionamento.dias_semana.includes(dia.id)}
                            onCheckedChange={() => toggleDiaSemana(dia.id)}
                          />
                          <Label htmlFor={`dia-${dia.id}`} className="text-xs cursor-pointer">
                            {dia.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Mensagem fora do horário</Label>
                    <Textarea 
                      value={localConfig.mensagens.fora_horario}
                      onChange={(e) => updateMensagem('fora_horario', e.target.value)}
                      className="min-h-[60px] text-xs"
                      placeholder="Mensagem enviada fora do expediente..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Regras de Acionamento */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Regras de Acionamento
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                  <Switch 
                    id="regra-cadastrado"
                    checked={localConfig.regras.responder_cliente_cadastrado}
                    onCheckedChange={(checked) => updateRegra('responder_cliente_cadastrado', checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="regra-cadastrado" className="text-sm font-medium cursor-pointer">
                      Cliente cadastrado (tem CNPJ)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Responder automaticamente clientes que já possuem CNPJ vinculado no CRM
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                  <Switch 
                    id="regra-operador"
                    checked={localConfig.regras.responder_com_operador_atribuido}
                    onCheckedChange={(checked) => updateRegra('responder_com_operador_atribuido', checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="regra-operador" className="text-sm font-medium cursor-pointer">
                      Operador já atribuído
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Responder mesmo quando já existe um operador humano atribuído à conversa
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                  <Switch 
                    id="regra-cnpj"
                    checked={localConfig.regras.responder_aguardando_cnpj}
                    onCheckedChange={(checked) => updateRegra('responder_aguardando_cnpj', checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="regra-cnpj" className="text-sm font-medium cursor-pointer">
                      Aguardando resposta de CNPJ
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Responder durante o processo de triagem enquanto aguarda CNPJ do cliente
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 border border-primary/20">
                  <Switch 
                    id="regra-novo"
                    checked={localConfig.regras.responder_cliente_novo_sem_operador}
                    onCheckedChange={(checked) => updateRegra('responder_cliente_novo_sem_operador', checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="regra-novo" className="text-sm font-medium cursor-pointer">
                      Cliente novo + sem operador
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Responder clientes novos que ainda não têm operador atribuído (recomendado)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mensagem Limite */}
            <div className="space-y-2">
              <Label className="text-xs">Mensagem quando limite de respostas atingido</Label>
              <Textarea 
                value={localConfig.mensagens.limite_atingido}
                onChange={(e) => updateMensagem('limite_atingido', e.target.value)}
                className="min-h-[60px] text-xs"
                placeholder="Mensagem quando o agente atingir o limite..."
              />
            </div>

            {/* Botão Salvar */}
            <Button 
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              className="w-full"
            >
              {saveConfigMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default AgenteVendasConfig;
