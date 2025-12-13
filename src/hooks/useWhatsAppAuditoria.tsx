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
  const buscarLogs = (filtros: FiltrosAuditoria = {}, page: number = 1, pageSize: number = 50) => {
    return useQuery({
      queryKey: ['whatsapp-auditoria-logs', filtros, page],
      queryFn: async () => {
        let query = supabase
          .from('whatsapp_auditoria_log')
          .select(`
            id,
            conversa_id,
            usuario_id,
            acao,
            detalhes,
            ip_address,
            user_agent,
            criado_em,
            nivel_risco,
            perfis_usuario(nome_completo),
            whatsapp_conversas(numero_protocolo)
          `, { count: 'exact' })
          .order('criado_em', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        // Aplicar filtros
        if (filtros.dataInicio) {
          query = query.gte('criado_em', filtros.dataInicio);
        }
        if (filtros.dataFim) {
          query = query.lte('criado_em', filtros.dataFim);
        }
        if (filtros.nivelRisco) {
          query = query.eq('nivel_risco', filtros.nivelRisco);
        }
        if (filtros.acao) {
          query = query.ilike('acao', `%${filtros.acao}%`);
        }
        if (filtros.usuarioId) {
          query = query.eq('usuario_id', filtros.usuarioId);
        }
        if (filtros.conversaId) {
          query = query.eq('conversa_id', filtros.conversaId);
        }

        const { data, error, count } = await query;

        if (error) throw error;

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
          usuario_nome: log.perfis_usuario?.nome_completo,
          conversa_protocolo: log.whatsapp_conversas?.numero_protocolo,
        }));

        return {
          logs,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        };
      },
      staleTime: 30 * 1000, // 30 segundos
      enabled: context.isSupervisor,
    });
  };

  // Query para estatísticas de risco
  const { data: estatisticasRisco, isLoading: isLoadingEstatisticas } = useQuery({
    queryKey: ['whatsapp-auditoria-estatisticas'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      
      // Contar por nível de risco (hoje)
      const { data, error } = await supabase
        .from('whatsapp_auditoria_log')
        .select('nivel_risco')
        .gte('criado_em', hoje);
      
      if (error) throw error;
      
      const contagem = {
        baixo: 0,
        medio: 0,
        alto: 0,
        critico: 0,
        total: data?.length || 0,
      };
      
      data?.forEach((log: any) => {
        const nivel = log.nivel_risco as NivelRisco;
        if (nivel in contagem) {
          contagem[nivel]++;
        }
      });
      
      return contagem;
    },
    staleTime: 60 * 1000, // 1 minuto
    enabled: context.isSupervisor,
  });

  // Query para ações mais comuns
  const { data: acoesComuns } = useQuery({
    queryKey: ['whatsapp-auditoria-acoes-comuns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_auditoria_log')
        .select('acao')
        .gte('criado_em', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      // Contar ocorrências de cada ação
      const contagem: Record<string, number> = {};
      data?.forEach((log: any) => {
        contagem[log.acao] = (contagem[log.acao] || 0) + 1;
      });
      
      // Ordenar por frequência
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
      const { error } = await supabase
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
    onError: (error: any) => {
      console.error('Erro ao registrar auditoria:', error);
    },
  });

  // Função para exportar logs
  const exportarLogs = async (filtros: FiltrosAuditoria = {}) => {
    try {
      let query = supabase
        .from('whatsapp_auditoria_log')
        .select(`
          id,
          conversa_id,
          usuario_id,
          acao,
          detalhes,
          ip_address,
          user_agent,
          criado_em,
          nivel_risco,
          perfis_usuario(nome_completo),
          whatsapp_conversas(numero_protocolo)
        `)
        .order('criado_em', { ascending: false })
        .limit(1000);

      if (filtros.dataInicio) query = query.gte('criado_em', filtros.dataInicio);
      if (filtros.dataFim) query = query.lte('criado_em', filtros.dataFim);
      if (filtros.nivelRisco) query = query.eq('nivel_risco', filtros.nivelRisco);

      const { data, error } = await query;
      if (error) throw error;

      // Converter para CSV
      const headers = ['Data/Hora', 'Protocolo', 'Usuário', 'Ação', 'Nível Risco', 'IP', 'Detalhes'];
      const rows = (data || []).map((log: any) => [
        new Date(log.criado_em).toLocaleString('pt-BR'),
        log.whatsapp_conversas?.numero_protocolo || '-',
        log.perfis_usuario?.nome_completo || '-',
        log.acao,
        log.nivel_risco,
        log.ip_address || '-',
        JSON.stringify(log.detalhes || {}),
      ]);

      const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
      
      // Download
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
    // Query function
    buscarLogs,
    
    // Estatísticas
    estatisticasRisco: estatisticasRisco || {
      baixo: 0,
      medio: 0,
      alto: 0,
      critico: 0,
      total: 0,
    },
    acoesComuns: acoesComuns || [],
    isLoadingEstatisticas,
    
    // Actions
    registrarAcao: registrarAcao.mutate,
    exportarLogs,
    
    // Pending states
    isRegistrando: registrarAcao.isPending,
    
    // Flags
    isSupervisor: context.isSupervisor,
    isAdmin: context.isAdmin,
  };
};

export default useWhatsAppAuditoria;
