import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface GEDDocumento {
  id: string;
  tipo_id: string;
  titulo: string;
  descricao: string | null;
  numero_documento: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  status_validade: string;
  versao: number;
  versao_label: string;
  documento_pai_id: string | null;
  eh_versao_atual: boolean;
  arquivo_url: string;
  arquivo_nome: string;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  metadados: Json;
  tags: string[];
  criado_por: string;
  criado_em: string;
  atualizado_por: string | null;
  atualizado_em: string;
  tipo?: {
    id: string;
    nome: string;
    icone: string;
    cor: string;
  } | null;
}

export interface GEDDocumentoInput {
  tipo_id: string;
  titulo: string;
  descricao?: string;
  numero_documento?: string;
  data_emissao?: string;
  data_validade?: string;
  arquivo_url: string;
  arquivo_nome: string;
  tamanho_bytes?: number;
  tipo_mime?: string;
  metadados?: Json;
  tags?: string[];
}

interface UseGEDDocumentosOptions {
  tipoId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useGEDDocumentos(options: UseGEDDocumentosOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tipoId, status, search, page = 1, pageSize = 20 } = options;

  const { data, isLoading, error } = useQuery({
    queryKey: ['ged-documentos', tipoId, status, search, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('ged_documentos')
        .select(`
          *,
          tipo:ged_tipos_documento(id, nome, icone, cor)
        `, { count: 'exact' })
        .eq('eh_versao_atual', true)
        .order('criado_em', { ascending: false });

      if (tipoId) {
        query = query.eq('tipo_id', tipoId);
      }

      if (status && status !== 'todos') {
        query = query.eq('status_validade', status);
      }

      if (search) {
        query = query.or(`titulo.ilike.%${search}%,numero_documento.ilike.%${search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        documentos: (data || []) as unknown as GEDDocumento[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const createDocumento = useMutation({
    mutationFn: async (input: GEDDocumentoInput) => {
      const { data, error } = await supabase
        .from('ged_documentos')
        .insert({
          tipo_id: input.tipo_id,
          titulo: input.titulo,
          descricao: input.descricao || null,
          numero_documento: input.numero_documento || null,
          data_emissao: input.data_emissao || null,
          data_validade: input.data_validade || null,
          arquivo_url: input.arquivo_url,
          arquivo_nome: input.arquivo_nome,
          tamanho_bytes: input.tamanho_bytes || null,
          tipo_mime: input.tipo_mime || null,
          metadados: input.metadados || {},
          tags: input.tags || [],
          criado_por: user!.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['ged-resumo'] });
      toast.success('Documento criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar documento: ' + error.message);
    }
  });

  const updateDocumento = useMutation({
    mutationFn: async ({ id, ...input }: Partial<GEDDocumentoInput> & { id: string }) => {
      const updateData: Record<string, unknown> = { atualizado_por: user!.id };
      if (input.titulo !== undefined) updateData.titulo = input.titulo;
      if (input.descricao !== undefined) updateData.descricao = input.descricao;
      if (input.numero_documento !== undefined) updateData.numero_documento = input.numero_documento;
      if (input.data_emissao !== undefined) updateData.data_emissao = input.data_emissao;
      if (input.data_validade !== undefined) updateData.data_validade = input.data_validade;
      if (input.metadados !== undefined) updateData.metadados = input.metadados;
      if (input.tags !== undefined) updateData.tags = input.tags;

      const { data, error } = await supabase
        .from('ged_documentos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['ged-resumo'] });
      toast.success('Documento atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar documento: ' + error.message);
    }
  });

  const deleteDocumento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ged_documentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['ged-resumo'] });
      toast.success('Documento excluído com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao excluir documento: ' + error.message);
    }
  });

  const createNovaVersao = useMutation({
    mutationFn: async ({ documentoPaiId, input }: { documentoPaiId: string; input: GEDDocumentoInput }) => {
      // Buscar documento pai para obter versão atual
      const { data: docPai, error: erroPai } = await supabase
        .from('ged_documentos')
        .select('versao, tipo_id, titulo')
        .eq('id', documentoPaiId)
        .single();

      if (erroPai) throw erroPai;

      // Marcar versão anterior como não atual
      const { error: erroUpdate } = await supabase
        .from('ged_documentos')
        .update({ eh_versao_atual: false })
        .eq('id', documentoPaiId);

      if (erroUpdate) throw erroUpdate;

      // Criar nova versão
      const novaVersao = (docPai.versao || 1) + 1;
      const { data, error } = await supabase
        .from('ged_documentos')
        .insert({
          tipo_id: docPai.tipo_id,
          titulo: input.titulo || docPai.titulo,
          descricao: input.descricao || null,
          numero_documento: input.numero_documento || null,
          data_emissao: input.data_emissao || null,
          data_validade: input.data_validade || null,
          arquivo_url: input.arquivo_url,
          arquivo_nome: input.arquivo_nome,
          tamanho_bytes: input.tamanho_bytes || null,
          tipo_mime: input.tipo_mime || null,
          documento_pai_id: documentoPaiId,
          versao: novaVersao,
          versao_label: `${novaVersao}.0`,
          eh_versao_atual: true,
          criado_por: user!.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ged-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['ged-resumo'] });
      toast.success('Nova versão criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar nova versão: ' + error.message);
    }
  });

  return {
    documentos: data?.documentos || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    createDocumento,
    updateDocumento,
    deleteDocumento,
    createNovaVersao
  };
}

export function useGEDDocumento(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ged-documento', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ged_documentos')
        .select(`
          *,
          tipo:ged_tipos_documento(id, nome, icone, cor, exige_validade)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as unknown as GEDDocumento;
    },
    enabled: !!user && !!id,
  });
}

export function useGEDResumo() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ged-resumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_ged_resumo')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGEDPorTipo() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ged-por-tipo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_ged_por_tipo')
        .select('*')
        .order('tipo_nome');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
