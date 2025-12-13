import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWhatsAppContext } from '@/contexts/WhatsAppContext';

export type NivelRisco = 'baixo' | 'medio' | 'alto' | 'critico';

export interface LogAuditoria {
  id: string;
  conversa_id: string;
  usuario_id: string | null;
  acao: string;
  detalhes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  criado_em: string;
  nivel_risco: NivelRisco;
  usuario_nome?: string;
  conversa_protocolo?: string;
}

export interface FiltrosAuditoria {
  dataInicio?: string;
  dataFim?: string;
  nivelRisco?: NivelRisco;
  acao?: string;
  usuarioId?: string;
  conversaId?: string;
}

/**
 * Hook para gerenciamento de auditoria e logs do WhatsApp.
 * Permite visualizar, filtrar e analisar logs de ações do sistema.
 */
export const useWhatsAppAuditoria = () => {
  const queryClient = useQueryClient();
  const context = useWhatsAppContext();

  // Query para logs de auditoria com filtros
  const useBuscarLogs = (filtros: FiltrosAuditoria = {}, page: number = 1, pageSize: number = 50) => {
    return useQuery({
      queryKey: ['whatsapp-auditoria-logs', filtros, page],
      queryFn: async () => {
        // Usar RPC ou query genérica já que tabela pode não existir no types
        const client = supabase as any;
        let query = client
          .from('whatsapp_auditoria_log')
          .select('*', { count: 'exact' })
          .order('criado_em', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (filtros.dataInicio) query = query.gte('criado_em', filtros.dataInicio);
        if (filtros.dataFim) query = query.lte('criado_em', filtros.dataFim);
        if (filtros.nivelRisco) query = query.eq('nivel_risco', filtros.nivelRisco);
        if (filtros.acao) query = query.ilike('acao', `%${filtros.acao}%`);
        if (filtros.usuarioId) query = query.eq('usuario_id', filtros.usuarioId);
        if (filtros.conversaId) query = query.eq('conversa_id', filtros.conversaId);

        const { data, error, count } = await query;

        if (error) {
          console.warn('Tabela whatsapp_auditoria_log não disponível:', error);
          return { logs: [], total: 0, page, pageSize, totalPages: 0 };
        }

        const logs: LogAuditoria[] = (data || []).map((log: any) => ({
          id: log.id,
          conversa_id: log.conversa_id,
          usuario_id: log.usuario_id,
          acao: log.acao,
          detalhes: log.detalhes,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          criado_em: log.criado_em,
          nivel_risco: log.nivel_risco as NivelRisco,
        }));

        return {
          logs,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        };
      },
      staleTime: 30 * 1000,
      enabled: context.isSupervisor,
    });
  };

  // Query para estatísticas de risco
  const { data: estatisticasRisco, isLoading: isLoadingEstatisticas } = useQuery({
    queryKey: ['whatsapp-auditoria-estatisticas'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const client = supabase as any;
      
      const { data, error } = await client
        .from('whatsapp_auditoria_log')
        .select('nivel_risco')
        .gte('criado_em', hoje);
      
      if (error) {
        console.warn('Tabela whatsapp_auditoria_log não disponível');
        return { baixo: 0, medio: 0, alto: 0, critico: 0, total: 0 };
      }
      
      const contagem = { baixo: 0, medio: 0, alto: 0, critico: 0, total: data?.length || 0 };
      
      data?.forEach((log: any) => {
        const nivel = log.nivel_risco as NivelRisco;
        if (nivel in contagem) {
          contagem[nivel]++;
        }
      });
      
      return contagem;
    },
    staleTime: 60 * 1000,
    enabled: context.isSupervisor,
  });

  // Query para ações mais comuns
  const { data: acoesComuns } = useQuery({
    queryKey: ['whatsapp-auditoria-acoes-comuns'],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from('whatsapp_auditoria_log')
        .select('acao')
        .gte('criado_em', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) return [];
      
      const contagem: Record<string, number> = {};
      data?.forEach((log: any) => {
        contagem[log.acao] = (contagem[log.acao] || 0) + 1;
      });
      
      return Object.entries(contagem)
        .map(([acao, count]) => ({ acao, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    staleTime: 5 * 60 * 1000,
    enabled: context.isSupervisor,
  });

  // Mutation para registrar ação manual de auditoria
  const registrarAcao = useMutation({
    mutationFn: async ({
      conversaId,
      acao,
      detalhes,
      nivelRisco = 'baixo',
    }: {
      conversaId: string;
      acao: string;
      detalhes?: Record<string, any>;
      nivelRisco?: NivelRisco;
    }) => {
      const client = supabase as any;
      const { error } = await client
        .from('whatsapp_auditoria_log')
        .insert({
          conversa_id: conversaId,
          usuario_id: context.userId,
          acao,
          detalhes,
          nivel_risco: nivelRisco,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-auditoria'] });
    },
  });

  // Função para exportar logs
  const exportarLogs = async (filtros: FiltrosAuditoria = {}) => {
    try {
      const client = supabase as any;
      let query = client
        .from('whatsapp_auditoria_log')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(1000);

      if (filtros.dataInicio) query = query.gte('criado_em', filtros.dataInicio);
      if (filtros.dataFim) query = query.lte('criado_em', filtros.dataFim);
      if (filtros.nivelRisco) query = query.eq('nivel_risco', filtros.nivelRisco);

      const { data, error } = await query;
      if (error) throw error;

      const headers = ['Data/Hora', 'Usuário', 'Ação', 'Nível Risco', 'IP', 'Detalhes'];
      const rows = (data || []).map((log: any) => [
        new Date(log.criado_em).toLocaleString('pt-BR'),
        log.usuario_id || '-',
        log.acao,
        log.nivel_risco,
        log.ip_address || '-',
        JSON.stringify(log.detalhes || {}),
      ]);

      const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria-whatsapp-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Logs exportados com sucesso');
    } catch (error: any) {
      toast.error('Erro ao exportar: ' + error.message);
    }
  };

  return {
    useBuscarLogs,
    estatisticasRisco: estatisticasRisco || { baixo: 0, medio: 0, alto: 0, critico: 0, total: 0 },
    acoesComuns: acoesComuns || [],
    isLoadingEstatisticas,
    registrarAcao: registrarAcao.mutate,
    exportarLogs,
    isRegistrando: registrarAcao.isPending,
    isSupervisor: context.isSupervisor,
    isAdmin: context.isAdmin,
  };
};

export default useWhatsAppAuditoria;
