/**
 * Configurações centralizadas de regras WhatsApp
 * Tipos, constantes e enums para distribuição e carteiras
 */
import { z } from 'zod';

// ============================================
// ENUMS E TIPOS
// ============================================

export type ModoDistribuicao = 'round_robin' | 'menos_ocupado' | 'carteira' | 'manual';
export type ModoCarteirizacao = 'preferencial' | 'forcar';
export type StatusOperador = 'online' | 'ocupado' | 'pausado' | 'offline';
export type PrioridadeConversa = 'baixa' | 'normal' | 'alta' | 'urgente';
export type TipoContato = 'lead' | 'cliente_novo' | 'cliente_regular' | 'cliente_vip';

// ============================================
// CONSTANTES DE DISTRIBUIÇÃO
// ============================================

export const MODOS_DISTRIBUICAO = [
  { 
    value: 'round_robin' as ModoDistribuicao, 
    label: 'Round Robin', 
    desc: 'Distribui igualmente entre operadores disponíveis',
    icone: '🔄'
  },
  { 
    value: 'menos_ocupado' as ModoDistribuicao, 
    label: 'Menos Ocupado', 
    desc: 'Prioriza operador com menos atendimentos ativos',
    icone: '📊'
  },
  { 
    value: 'carteira' as ModoDistribuicao, 
    label: 'Carteira (Sticky)', 
    desc: 'Mantém cliente com mesmo operador sempre que possível',
    icone: '🔗'
  },
  { 
    value: 'manual' as ModoDistribuicao, 
    label: 'Manual', 
    desc: 'Supervisores distribuem manualmente via BAM',
    icone: '👤'
  },
] as const;

export const MODOS_CARTEIRIZACAO = [
  { 
    value: 'preferencial' as ModoCarteirizacao, 
    label: 'Preferencial', 
    desc: 'Se operador da carteira indisponível, redistribui para outro'
  },
  { 
    value: 'forcar' as ModoCarteirizacao, 
    label: 'Forçar', 
    desc: 'SEMPRE vai para operador da carteira, aguarda na fila se offline'
  },
] as const;

export const PRIORIDADES_CONVERSA = [
  { value: 'baixa' as PrioridadeConversa, label: 'Baixa', cor: '#6B7280' },
  { value: 'normal' as PrioridadeConversa, label: 'Normal', cor: '#3B82F6' },
  { value: 'alta' as PrioridadeConversa, label: 'Alta', cor: '#F59E0B' },
  { value: 'urgente' as PrioridadeConversa, label: 'Urgente', cor: '#EF4444' },
] as const;

export const STATUS_OPERADOR = [
  { value: 'online' as StatusOperador, label: 'Online', cor: '#22C55E' },
  { value: 'ocupado' as StatusOperador, label: 'Ocupado', cor: '#F59E0B' },
  { value: 'pausado' as StatusOperador, label: 'Pausado', cor: '#6B7280' },
  { value: 'offline' as StatusOperador, label: 'Offline', cor: '#EF4444' },
] as const;

// ============================================
// SCHEMAS DE VALIDAÇÃO (ZOD)
// ============================================

export const ConfigAtendimentoSchema = z.object({
  id: z.string().uuid().optional(),
  
  // Distribuição
  modo_distribuicao: z.enum(['round_robin', 'menos_ocupado', 'carteira', 'manual']).default('round_robin'),
  max_atendimentos_por_operador: z.number().min(1).max(20).default(5),
  tempo_inatividade_redistribuir_min: z.number().min(5).max(120).default(30),
  
  // Carteirização
  carteirizacao_ativa: z.boolean().default(true),
  modo_carteirizacao: z.enum(['preferencial', 'forcar']).default('preferencial'),
  priorizar_carteira: z.boolean().default(true),
  
  // SLA
  sla_primeira_resposta_min: z.number().min(1).max(60).default(5),
  sla_tempo_medio_resposta_min: z.number().min(1).max(60).default(10),
  sla_tempo_resolucao_min: z.number().min(5).max(480).default(60),
  
  // Throttling
  throttle_habilitado: z.boolean().default(true),
  throttle_msgs_por_minuto: z.number().min(1).max(100).default(30),
  throttle_msgs_por_hora: z.number().min(10).max(1000).default(200),
  
  // Fila
  max_fila_espera: z.number().min(5).max(500).default(50),
  tempo_max_fila_min: z.number().min(1).max(60).default(15),
  mensagem_fila_cheia: z.string().optional(),
  
  // Geral
  horario_atendimento_habilitado: z.boolean().default(true),
  feriados_habilitado: z.boolean().default(true),
  transferencia_entre_unidades: z.boolean().default(true),
  distribuicao_automatica: z.boolean().default(true),
  esta_ativa: z.boolean().default(true),
});

export const CarteiraSchema = z.object({
  id: z.string().uuid().optional(),
  whatsapp_contato_id: z.string().uuid(),
  operador_id: z.string().uuid(),
  motivo_transferencia: z.string().optional(),
  esta_ativo: z.boolean().default(true),
});

export const TransferirCarteiraSchema = z.object({
  carteiraId: z.string().uuid(),
  novoOperadorId: z.string().uuid(),
  motivo: z.string().min(3, 'Motivo deve ter pelo menos 3 caracteres'),
});

// ============================================
// TYPES INFERIDOS
// ============================================

export type ConfigAtendimento = z.infer<typeof ConfigAtendimentoSchema>;
export type Carteira = z.infer<typeof CarteiraSchema>;
export type TransferirCarteira = z.infer<typeof TransferirCarteiraSchema>;

// ============================================
// HELPERS
// ============================================

export function getModoDistribuicaoLabel(modo: ModoDistribuicao): string {
  return MODOS_DISTRIBUICAO.find(m => m.value === modo)?.label || modo;
}

export function getModoCarteirizacaoLabel(modo: ModoCarteirizacao): string {
  return MODOS_CARTEIRIZACAO.find(m => m.value === modo)?.label || modo;
}

export function getStatusOperadorCor(status: StatusOperador): string {
  return STATUS_OPERADOR.find(s => s.value === status)?.cor || '#6B7280';
}

export function getPrioridadeCor(prioridade: PrioridadeConversa): string {
  return PRIORIDADES_CONVERSA.find(p => p.value === prioridade)?.cor || '#3B82F6';
}

// ============================================
// REGRAS DE NEGÓCIO
// ============================================

/**
 * Determina se um operador pode receber nova conversa
 */
export function operadorPodeReceber(
  statusOperador: StatusOperador,
  atendimentosAtivos: number,
  maxAtendimentos: number
): boolean {
  if (statusOperador !== 'online') return false;
  if (atendimentosAtivos >= maxAtendimentos) return false;
  return true;
}

/**
 * Determina a ação baseada no modo de carteirização
 */
export function getAcaoCarteira(
  temCarteira: boolean,
  operadorDisponivel: boolean,
  modoCarteirizacao: ModoCarteirizacao
): 'atribuir_carteira' | 'redistribuir' | 'aguardar_fila' {
  if (!temCarteira) return 'redistribuir';
  
  if (operadorDisponivel) return 'atribuir_carteira';
  
  if (modoCarteirizacao === 'forcar') return 'aguardar_fila';
  
  return 'redistribuir';
}
