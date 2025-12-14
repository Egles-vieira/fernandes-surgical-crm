// ============================================
// Hook para gerenciamento de WABA via Meta API
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WABAInfo {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
  message_template_namespace: string;
  account_review_status: string;
  business_verification_status: string;
  ownership_type: string;
  on_behalf_of_business_info?: {
    name: string;
    id: string;
  };
}

interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  code_verification_status: string;
  name_status: string;
  platform_type?: string;
  throughput?: {
    level: string;
  };
}

interface SubscriptionInfo {
  status: 'active' | 'inactive' | 'unknown';
  apps: any[];
  subscribedFields: string[];
}

interface WABAData {
  waba: WABAInfo;
  phoneNumbers: PhoneNumberInfo[];
  subscription: SubscriptionInfo;
}

interface TokenInfo {
  tokenValid: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  neverExpires: boolean;
  appId: string;
  type: string;
  scopes: string[];
}

export function useWABAInfo(contaId: string | null) {
  return useQuery({
    queryKey: ['waba-info', contaId],
    queryFn: async (): Promise<WABAData | null> => {
      if (!contaId) return null;

      const { data, error } = await supabase.functions.invoke('meta-api-get-waba', {
        body: { contaId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar WABA');

      return {
        waba: data.waba,
        phoneNumbers: data.phoneNumbers,
        subscription: data.subscription,
      };
    },
    enabled: !!contaId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTokenInfo(contaId: string | null) {
  return useQuery({
    queryKey: ['token-info', contaId],
    queryFn: async (): Promise<TokenInfo | null> => {
      if (!contaId) return null;

      const { data, error } = await supabase.functions.invoke('meta-api-verificar-token', {
        body: { contaId },
      });

      if (error) throw error;
      
      return {
        tokenValid: data?.tokenValid ?? false,
        expiresAt: data?.expiresAt ?? null,
        daysRemaining: data?.daysRemaining ?? null,
        neverExpires: data?.neverExpires ?? false,
        appId: data?.appId ?? '',
        type: data?.type ?? '',
        scopes: data?.scopes ?? [],
      };
    },
    enabled: !!contaId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubscriptionActions() {
  const queryClient = useQueryClient();

  const subscribe = useMutation({
    mutationFn: async ({ contaId, fields }: { contaId: string; fields?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('meta-api-subscribe-waba', {
        body: { contaId, action: 'subscribe', fields },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao inscrever webhook');

      return data;
    },
    onSuccess: (_, { contaId }) => {
      queryClient.invalidateQueries({ queryKey: ['waba-info', contaId] });
      toast.success('Webhook inscrito com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao inscrever webhook', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    },
  });

  const unsubscribe = useMutation({
    mutationFn: async (contaId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-api-subscribe-waba', {
        body: { contaId, action: 'unsubscribe' },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao desinscrever webhook');

      return data;
    },
    onSuccess: (_, contaId) => {
      queryClient.invalidateQueries({ queryKey: ['waba-info', contaId] });
      toast.success('Webhook desinscrito');
    },
    onError: (error) => {
      toast.error('Erro ao desinscrever webhook', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    },
  });

  return { subscribe, unsubscribe };
}
