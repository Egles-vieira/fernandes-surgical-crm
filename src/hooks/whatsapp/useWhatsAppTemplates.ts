import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppTemplate {
  id: string;
  whatsapp_conta_id: string;
  nome_template: string;
  template_externo_id: string | null;
  meta_template_id: string | null;
  status_aprovacao: string | null;
  categoria: string | null;
  subcategoria: string | null;
  idioma: string | null;
  titulo: string | null;
  corpo: string | null;
  rodape: string | null;
  tem_botoes: boolean | null;
  botoes: any | null;
  parametros: any | null;
  numero_parametros: number | null;
  tipo_midia_header: string | null;
  url_midia_exemplo: string | null;
  components_meta: any | null;
  quality_score: { score?: string; date?: string } | null;
  quality_score_date: string | null;
  sincronizado_com_meta: boolean | null;
  ultima_sincronizacao_em: string | null;
  total_enviados: number | null;
  total_entregues: number | null;
  total_lidos: number | null;
  total_respondidos: number | null;
  taxa_conversao: number | null;
  ultimo_envio_em: string | null;
  ativo: boolean | null;
  permite_personalizar: boolean | null;
  requer_aprovacao_envio: boolean | null;
  tags: string[] | null;
  aprovado_em: string | null;
  rejeitado_em: string | null;
  motivo_rejeicao: string | null;
  criado_em: string;
  atualizado_em: string | null;
  excluido_em: string | null;
  criado_por: string | null;
}

export interface TemplateHistorico {
  id: string;
  template_id: string;
  status_anterior: string | null;
  status_novo: string;
  motivo_rejeicao: string | null;
  quality_score: any | null;
  sincronizado_em: string;
  dados_meta: any | null;
  criado_em: string;
}

interface TemplatesQueryParams {
  contaId: string | null;
  page?: number;
  pageSize?: number;
  search?: string;
}

interface TemplatesPaginatedResult {
  templates: WhatsAppTemplate[];
  total: number;
  totalPages: number;
}

interface CreateTemplateParams {
  contaId: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: any[];
}

// Hook para buscar templates com paginação server-side
export function useWhatsAppTemplates({ contaId, page = 1, pageSize = 20, search = '' }: TemplatesQueryParams) {
  return useQuery({
    queryKey: ['whatsapp-templates', contaId, page, pageSize, search],
    queryFn: async (): Promise<TemplatesPaginatedResult> => {
      if (!contaId) {
        return { templates: [], total: 0, totalPages: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('whatsapp_templates')
        .select('*', { count: 'exact' })
        .eq('whatsapp_conta_id', contaId)
        .is('excluido_em', null)
        .order('criado_em', { ascending: false })
        .range(from, to);

      if (search) {
        query = query.ilike('nome_template', `%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        templates: (data || []) as unknown as WhatsAppTemplate[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    enabled: !!contaId,
    staleTime: 30000, // 30 segundos
  });
}

// Hook para buscar histórico de um template
export function useTemplateHistorico(templateId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-template-historico', templateId],
    queryFn: async (): Promise<TemplateHistorico[]> => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from('whatsapp_templates_historico')
        .select('*')
        .eq('template_id', templateId)
        .order('sincronizado_em', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TemplateHistorico[];
    },
    enabled: !!templateId,
  });
}

// Mutation para sincronizar templates com Meta
export function useSyncTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contaId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-api-sync-templates', {
        body: { contaId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, contaId) => {
      const resultado = data?.resultados?.[0];
      if (resultado?.sucesso) {
        toast.success(`Sincronização concluída: ${resultado.total} templates, ${resultado.novos} novos, ${resultado.atualizados} atualizados`);
      } else {
        toast.warning(resultado?.erro || 'Sincronização com avisos');
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', contaId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });
}

// Mutation para criar template na Meta
export function useCreateTemplateMeta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTemplateParams) => {
      const { data, error } = await supabase.functions.invoke('meta-api-create-template', {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('Template enviado para aprovação da Meta');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', variables.contaId] });
    },
    onError: (error: Error) => {
      // Verifica se é erro de template duplicado
      if (error.message.includes('2388024') || error.message.includes('Já existe conteúdo')) {
        toast.error('Template com este nome já existe na Meta. Use um nome diferente ou sincronize os templates.');
      } else {
        toast.error(`Erro ao criar template: ${error.message}`);
      }
    },
  });
}

// Mutation para deletar template na Meta
export function useDeleteTemplateMeta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contaId, templateName, templateId }: { contaId: string; templateName: string; templateId?: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-api-delete-template', {
        body: { contaId, templateName, templateId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('Template excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates', variables.contaId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir template: ${error.message}`);
    },
  });
}

// Interface para enviar template do chat
interface SendTemplateFromChatParams {
  contaId: string;
  conversaId: string;
  contatoId: string;
  numeroDestino: string;
  templateName: string;
  languageCode: string;
  components?: any[];
}

// Mutation para enviar template a partir do chat (quando janela 24h expirada)
export function useSendTemplateFromChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendTemplateFromChatParams) => {
      const { data, error } = await supabase.functions.invoke('meta-api-enviar-template', {
        body: {
          contaId: params.contaId,
          numeroDestino: params.numeroDestino,
          templateName: params.templateName,
          languageCode: params.languageCode,
          components: params.components,
          conversaId: params.conversaId,
          contatoId: params.contatoId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('Template enviado para processamento. Aguardando confirmação de entrega.');
      // Invalidar queries de mensagens e janela
      queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', variables.conversaId] });
      queryClient.invalidateQueries({ queryKey: ['janela-24h', variables.conversaId] });
    },
    onError: (error: Error) => {
      // Tratar erros específicos da Meta
      if (error.message.includes('131047')) {
        toast.error('Janela de 24h expirada. Use um template aprovado.');
      } else if (error.message.includes('132000')) {
        toast.error('Número de telefone inválido ou não registrado no WhatsApp.');
      } else {
        toast.error(`Erro ao enviar template: ${error.message}`);
      }
    },
  });
}
