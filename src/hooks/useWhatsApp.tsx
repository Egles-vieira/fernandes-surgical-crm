import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useWhatsApp = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar contas WhatsApp
  const { data: contas, isLoading: isLoadingContas } = useQuery({
    queryKey: ['whatsapp-contas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('*')
        .is('excluido_em', null)
        .eq('status', 'ativo')
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Query para buscar conversas
  const useConversas = (contaId?: string) => {
    return useQuery({
      queryKey: ['whatsapp-conversas', contaId],
      queryFn: async () => {
        if (!contaId) return [];
        
        const { data, error } = await supabase
          .from('whatsapp_conversas')
          .select(`
            *,
            whatsapp_contatos (
              numero_whatsapp,
              nome_whatsapp,
              foto_perfil_url,
              contato_id,
              contatos (
                nome_completo,
                primeiro_nome
              )
            )
          `)
          .eq('whatsapp_conta_id', contaId)
          .order('ultima_mensagem_em', { ascending: false });
        
        if (error) throw error;
        return data;
      },
      enabled: !!contaId,
    });
  };

  // Query para buscar mensagens de uma conversa
  const useMensagens = (conversaId?: string) => {
    return useQuery({
      queryKey: ['whatsapp-mensagens', conversaId],
      queryFn: async () => {
        if (!conversaId) return [];
        
        const { data, error } = await supabase
          .from('whatsapp_mensagens')
          .select('*')
          .eq('conversa_id', conversaId)
          .order('criado_em', { ascending: true });
        
        if (error) throw error;
        return data;
      },
      enabled: !!conversaId,
    });
  };

  // Mutation para enviar mensagem
  const enviarMensagem = useMutation({
    mutationFn: async (params: {
      conversaId: string;
      contaId: string;
      contatoId: string;
      corpo: string;
    }) => {
      const user = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: params.conversaId,
          whatsapp_conta_id: params.contaId,
          whatsapp_contato_id: params.contatoId,
          corpo: params.corpo,
          direcao: 'enviada',
          tipo_mensagem: 'texto',
          status: 'pendente',
          enviada_por_usuario_id: user.data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', variables.conversaId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para criar nova conversa
  const criarConversa = useMutation({
    mutationFn: async (params: {
      contaId: string;
      contatoId: string;
      titulo?: string;
    }) => {
      const user = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .insert({
          whatsapp_conta_id: params.contaId,
          whatsapp_contato_id: params.contatoId,
          titulo: params.titulo,
          status: 'aberta',
          atribuida_para_id: user.data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      
      toast({
        title: "Conversa criada",
        description: "Nova conversa iniciada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar status da conversa
  const atualizarConversa = useMutation({
    mutationFn: async (params: {
      conversaId: string;
      status?: string;
      prioridade?: string;
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .update({
          status: params.status,
          prioridade: params.prioridade,
        })
        .eq('id', params.conversaId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      
      toast({
        title: "Conversa atualizada",
        description: "Status da conversa atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    contas,
    isLoadingContas,
    useConversas,
    useMensagens,
    enviarMensagem,
    criarConversa,
    atualizarConversa,
  };
};
