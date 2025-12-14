// ============================================
// Hook: usePhoneNumbers
// Gerencia phone numbers da Meta Cloud API
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PhoneNumber {
  id: string;
  conta_id: string;
  phone_number_id: string;
  display_phone_number: string;
  verified_name: string | null;
  quality_rating: 'GREEN' | 'YELLOW' | 'RED' | null;
  name_status: 'APPROVED' | 'PENDING' | 'DECLINED' | 'NONE' | null;
  code_verification_status: string | null;
  platform_type: string | null;
  throughput_level: string | null;
  is_registered: boolean;
  is_principal: boolean;
  ultima_sincronizacao_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

// Query para buscar phone numbers de uma conta
export function usePhoneNumbers(contaId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-phone-numbers', contaId],
    queryFn: async () => {
      if (!contaId) return [];

      const { data, error } = await supabase
        .from('whatsapp_phone_numbers')
        .select('*')
        .eq('conta_id', contaId)
        .order('criado_em', { ascending: true });

      if (error) throw error;
      return data as PhoneNumber[];
    },
    enabled: !!contaId,
    staleTime: 1000 * 60 * 2 // 2 minutos
  });
}

// Mutation para sincronizar números
export function useSyncPhoneNumbers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contaId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-api-phone-numbers', {
        body: { action: 'sync', contaId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, contaId) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-phone-numbers', contaId] });
      toast.success(data?.message || 'Números sincronizados com sucesso');
    },
    onError: (error: Error) => {
      console.error('[useSyncPhoneNumbers] Erro:', error);
      toast.error(`Erro ao sincronizar: ${error.message}`);
    }
  });
}

// Mutation para registrar número
export function useRegisterPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contaId, phoneNumberId, pin }: { contaId: string; phoneNumberId: string; pin: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-api-phone-numbers', {
        body: { action: 'register', contaId, phoneNumberId, pin }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-phone-numbers', variables.contaId] });
      toast.success('Número registrado com sucesso');
    },
    onError: (error: Error) => {
      console.error('[useRegisterPhone] Erro:', error);
      toast.error(`Erro ao registrar: ${error.message}`);
    }
  });
}

// Mutation para desregistrar número
export function useDeregisterPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contaId, phoneNumberId }: { contaId: string; phoneNumberId: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-api-phone-numbers', {
        body: { action: 'deregister', contaId, phoneNumberId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-phone-numbers', variables.contaId] });
      toast.success('Número desregistrado com sucesso');
    },
    onError: (error: Error) => {
      console.error('[useDeregisterPhone] Erro:', error);
      toast.error(`Erro ao desregistrar: ${error.message}`);
    }
  });
}

// Mutation para definir número principal
export function useSetPrincipalPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contaId, phoneNumberId }: { contaId: string; phoneNumberId: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-api-phone-numbers', {
        body: { action: 'set_principal', contaId, phoneNumberId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-phone-numbers', variables.contaId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contas'] });
      toast.success('Número principal atualizado');
    },
    onError: (error: Error) => {
      console.error('[useSetPrincipalPhone] Erro:', error);
      toast.error(`Erro ao definir principal: ${error.message}`);
    }
  });
}
