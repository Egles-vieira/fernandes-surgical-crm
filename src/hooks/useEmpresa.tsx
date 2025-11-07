import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEmpresa() {
  const queryClient = useQueryClient();

  const { data: empresa, isLoading } = useQuery({
    queryKey: ["empresa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("esta_ativa", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async ({ file, tipo }: { file: File; tipo: 'fechado' | 'aberto' }) => {
      // Validar tipo de arquivo
      if (!file.type.startsWith("image/")) {
        throw new Error("Por favor, selecione um arquivo de imagem");
      }

      // Validar tamanho (máx 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("O arquivo deve ter no máximo 2MB");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${tipo}-${Date.now()}.${fileExt}`;

      // Fazer upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from("logos-empresa")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("logos-empresa")
        .getPublicUrl(fileName);

      return { publicUrl, tipo };
    },
    onSuccess: ({ publicUrl, tipo }) => {
      // Atualizar URL do logo no banco
      updateLogo.mutate({ logoUrl: publicUrl, tipo });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao fazer upload do logo");
    },
  });

  const updateLogo = useMutation({
    mutationFn: async ({ logoUrl, tipo }: { logoUrl: string; tipo: 'fechado' | 'aberto' }) => {
      const campo = tipo === 'fechado' ? 'url_logo' : 'url_logo_expandido';
      const { error } = await supabase
        .from("empresas")
        .update({ [campo]: logoUrl, atualizado_em: new Date().toISOString() })
        .eq("esta_ativa", true);

      if (error) throw error;
      return { logoUrl, tipo };
    },
    onSuccess: ({ logoUrl, tipo }) => {
      queryClient.invalidateQueries({ queryKey: ["empresa"] });
      const tipoTexto = tipo === 'fechado' ? 'ícone' : 'logo expandido';
      toast.success(`${tipoTexto} atualizado com sucesso!`);
      
      // Atualizar favicon dinamicamente se for o logo fechado
      if (tipo === 'fechado') {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) {
          link.href = logoUrl;
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar logo");
    },
  });

  return {
    empresa,
    isLoading,
    uploadLogo: uploadLogo.mutate,
    isUploading: uploadLogo.isPending || updateLogo.isPending,
  };
}
