import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AjusteInput {
  padrao_descricao?: string;
  padrao_codigo?: string;
  produto_id: string;
  cnpj_cliente?: string;
  plataforma_id?: string;
  ajuste_score: number;
  observacoes?: string;
  ativo: boolean;
}

export function useIAScoreAdjustment() {
  const [isLoading, setIsLoading] = useState(false);

  const criarAjuste = useCallback(async (ajuste: AjusteInput) => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('ia_score_ajustes')
        .insert({
          padrao_descricao: ajuste.padrao_descricao,
          padrao_codigo: ajuste.padrao_codigo,
          produto_id: ajuste.produto_id,
          cnpj_cliente: ajuste.cnpj_cliente,
          plataforma_id: ajuste.plataforma_id,
          ajuste_score: ajuste.ajuste_score,
          observacoes: ajuste.observacoes,
          ativo: ajuste.ativo,
          criado_por: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Ajuste de score criado com sucesso');
      return data;
    } catch (err: any) {
      console.error('❌ Erro ao criar ajuste:', err);
      toast.error('Erro ao criar ajuste de score');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const atualizarAjuste = useCallback(async (id: string, updates: Partial<AjusteInput>) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('ia_score_ajustes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Ajuste de score atualizado');
      return data;
    } catch (err: any) {
      console.error('❌ Erro ao atualizar ajuste:', err);
      toast.error('Erro ao atualizar ajuste');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const desativarAjuste = useCallback(async (id: string) => {
    return atualizarAjuste(id, { ativo: false });
  }, [atualizarAjuste]);

  const buscarAjustes = useCallback(async (filters?: { 
    descricao?: string; 
    produto_id?: string;
    cnpj_cliente?: string;
    plataforma_id?: string;
    ativo?: boolean;
  }) => {
    setIsLoading(true);

    try {
      let query: any = supabase
        .from('ia_score_ajustes')
        .select('*')
        .order('criado_em', { ascending: false });

      if (filters?.descricao) {
        query = query.ilike('padrao_descricao', `%${filters.descricao}%`);
      }
      if (filters?.produto_id) {
        query = query.eq('produto_id', filters.produto_id);
      }
      if (filters?.cnpj_cliente) {
        query = query.eq('cnpj_cliente', filters.cnpj_cliente);
      }
      if (filters?.plataforma_id) {
        query = query.eq('plataforma_id', filters.plataforma_id);
      }
      if (filters?.ativo !== undefined) {
        query = query.eq('ativo', filters.ativo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('❌ Erro ao buscar ajustes:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    criarAjuste,
    atualizarAjuste,
    desativarAjuste,
    buscarAjustes,
  };
}
