import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, Image as ImageIcon, Search } from "lucide-react";
import { useEmpresa } from "@/hooks/useEmpresa";
import { useCNPJA } from "@/hooks/useCNPJA";
import { limparCNPJ, formatarCNPJ } from "@/lib/cnpja-utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const empresaSchema = z.object({
  nome_empresa: z.string().min(1, "Nome da empresa é obrigatório").max(200),
  cnpj: z.string().optional(),
  razao_social: z.string().optional(),
  nome_fantasia: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
  cep: z.string().optional(),
  telefone: z.string().optional(),
  celular: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  site: z.string().optional(),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

export function EmpresaConfig() {
  const { empresa, isLoading, uploadLogo, isUploading } = useEmpresa();
  const { consultarCNPJ, status: cnpjaStatus, dadosColetados } = useCNPJA();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
  });

  const cnpjValue = watch("cnpj");

  useEffect(() => {
    if (empresa) {
      reset({
        nome_empresa: empresa.nome_empresa || "",
        cnpj: empresa.cnpj || "",
        razao_social: empresa.razao_social || "",
        nome_fantasia: empresa.nome_fantasia || "",
        inscricao_estadual: empresa.inscricao_estadual || "",
        inscricao_municipal: empresa.inscricao_municipal || "",
        endereco: empresa.endereco || "",
        numero: empresa.numero || "",
        complemento: empresa.complemento || "",
        bairro: empresa.bairro || "",
        cidade: empresa.cidade || "",
        estado: empresa.estado || "",
        cep: empresa.cep || "",
        telefone: empresa.telefone || "",
        celular: empresa.celular || "",
        email: empresa.email || "",
        site: empresa.site || "",
      });
    }
  }, [empresa, reset]);

  const onSubmit = async (data: EmpresaFormData) => {
    if (!empresa?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          ...data,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", empresa.id);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      reset(data);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>, tipo: 'fechado' | 'aberto') => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo({ file, tipo });
    }
  };

  const handleBuscarCNPJ = async () => {
    if (!cnpjValue) {
      toast.error("Digite um CNPJ para buscar");
      return;
    }

    const cnpjLimpo = limparCNPJ(cnpjValue);
    if (cnpjLimpo.length !== 14) {
      toast.error("CNPJ inválido");
      return;
    }

    // Consultar com contexto completo igual ao cadastro de clientes
    const resultado = await consultarCNPJ(cnpjLimpo, {
      tipoCliente: 'comum',
      emiteNF: true,
      trabalhaComICMS: true,
      operacoesInterestaduais: true,
      sempreValidarCEP: true
    });
    
    if (resultado?.dados) {
      const { office, ie, endereco } = resultado.dados;
      
      // Preencher CNPJ formatado
      setValue("cnpj", formatarCNPJ(cnpjLimpo), { shouldDirty: true });
      
      // Preencher campos básicos
      setValue("razao_social", office.company?.name || office.name || "", { shouldDirty: true });
      setValue("nome_fantasia", office.alias || "", { shouldDirty: true });
      
      // Preencher inscrições
      if (ie?.stateRegistration) {
        setValue("inscricao_estadual", ie.stateRegistration, { shouldDirty: true });
      }
      
      // Usar endereço detalhado (ViaCEP) se disponível
      if (endereco) {
        setValue("endereco", endereco.logradouro || "", { shouldDirty: true });
        setValue("complemento", endereco.complemento || "", { shouldDirty: true });
        setValue("bairro", endereco.bairro || "", { shouldDirty: true });
        setValue("cidade", endereco.localidade || "", { shouldDirty: true });
        setValue("estado", endereco.uf || "", { shouldDirty: true });
        setValue("cep", endereco.cep || "", { shouldDirty: true });
        // Número vem do office.address
        if (office.address?.number) {
          setValue("numero", office.address.number, { shouldDirty: true });
        }
      } else if (office.address) {
        // Fallback para endereço do office
        setValue("endereco", office.address.street || "", { shouldDirty: true });
        setValue("numero", office.address.number || "", { shouldDirty: true });
        setValue("complemento", office.address.details || "", { shouldDirty: true });
        setValue("bairro", office.address.district || "", { shouldDirty: true });
        setValue("cidade", office.address.city || "", { shouldDirty: true });
        setValue("estado", office.address.state || "", { shouldDirty: true });
        setValue("cep", office.address.zip || "", { shouldDirty: true });
      }

      // Preencher contatos
      if (office.phones && office.phones.length > 0) {
        const mainPhone = office.phones.find(p => !p.area || p.area.length === 2) || office.phones[0];
        const cellPhone = office.phones.find(p => p.number?.length === 9) || office.phones[1];
        
        setValue("telefone", mainPhone ? `(${mainPhone.area}) ${mainPhone.number}` : "", { shouldDirty: true });
        if (cellPhone && cellPhone !== mainPhone) {
          setValue("celular", `(${cellPhone.area}) ${cellPhone.number}`, { shouldDirty: true });
        }
      }

      if (office.emails && office.emails.length > 0) {
        setValue("email", office.emails[0].address || "", { shouldDirty: true });
      }

      toast.success("Dados da empresa preenchidos com sucesso!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Logos */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Identidade Visual</h3>
          <p className="text-sm text-muted-foreground">
            Configure os logos da sua empresa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Ícone */}
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Logo Ícone (Menu Fechado)</Label>
              <p className="text-xs text-muted-foreground">
                Formato quadrado, ideal 64x64px
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {empresa?.url_logo ? (
                <img
                  src={empresa.url_logo}
                  alt="Logo ícone"
                  className="h-16 w-16 object-contain rounded-lg border bg-background"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'fechado')}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* Logo Expandido */}
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Logo Expandido (Menu Aberto)</Label>
              <p className="text-xs text-muted-foreground">
                Formato horizontal, ideal 200x64px
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {empresa?.url_logo_expandido ? (
                <img
                  src={empresa.url_logo_expandido}
                  alt="Logo expandido"
                  className="h-16 w-auto max-w-[200px] object-contain rounded-lg border bg-background"
                />
              ) : (
                <div className="h-16 w-32 rounded-lg border bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, 'aberto')}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Dados Básicos */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Dados Básicos</h3>
          <p className="text-sm text-muted-foreground">
            Informações principais da empresa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
            <Input
              id="nome_empresa"
              {...register("nome_empresa")}
              placeholder="Nome da empresa"
            />
            {errors.nome_empresa && (
              <p className="text-sm text-destructive">{errors.nome_empresa.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <div className="flex gap-2">
              <Input
                id="cnpj"
                {...register("cnpj")}
                placeholder="00.000.000/0000-00"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBuscarCNPJ}
                disabled={cnpjaStatus === 'consultando' || cnpjaStatus === 'decidindo' || cnpjaStatus === 'executando'}
                title="Buscar dados do CNPJ"
              >
                {cnpjaStatus === 'consultando' || cnpjaStatus === 'decidindo' || cnpjaStatus === 'executando' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="razao_social">Razão Social</Label>
            <Input
              id="razao_social"
              {...register("razao_social")}
              placeholder="Razão social completa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
            <Input
              id="nome_fantasia"
              {...register("nome_fantasia")}
              placeholder="Nome fantasia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
            <Input
              id="inscricao_estadual"
              {...register("inscricao_estadual")}
              placeholder="IE"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
            <Input
              id="inscricao_municipal"
              {...register("inscricao_municipal")}
              placeholder="IM"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Endereço */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Endereço</h3>
          <p className="text-sm text-muted-foreground">
            Localização da empresa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              {...register("endereco")}
              placeholder="Rua, Avenida, etc"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              {...register("numero")}
              placeholder="Nº"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              {...register("complemento")}
              placeholder="Sala, Andar, etc"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              {...register("bairro")}
              placeholder="Bairro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              {...register("cidade")}
              placeholder="Cidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado (UF)</Label>
            <Input
              id="estado"
              {...register("estado")}
              placeholder="UF"
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              {...register("cep")}
              placeholder="00000-000"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contato */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Contato</h3>
          <p className="text-sm text-muted-foreground">
            Canais de comunicação
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              {...register("telefone")}
              placeholder="(00) 0000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input
              id="celular"
              {...register("celular")}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="contato@empresa.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="site">Site</Label>
            <Input
              id="site"
              {...register("site")}
              placeholder="https://www.empresa.com"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={!isDirty || isSaving || isUploading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || isSaving || isUploading}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </div>
    </form>
  );
}
