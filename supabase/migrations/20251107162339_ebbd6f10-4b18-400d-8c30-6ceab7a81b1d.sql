-- Adicionar colunas que faltam na tabela empresas
ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS nome_empresa VARCHAR(200),
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18),
  ADD COLUMN IF NOT EXISTS razao_social VARCHAR(300),
  ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(200),
  ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(50),
  ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS endereco VARCHAR(300),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
  ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estado VARCHAR(2),
  ADD COLUMN IF NOT EXISTS cep VARCHAR(9),
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS celular VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS site VARCHAR(255),
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT now();

-- Atualizar nome_empresa para empresas existentes sem nome
UPDATE public.empresas 
SET nome_empresa = 'Minha Empresa' 
WHERE nome_empresa IS NULL;

-- Tornar nome_empresa NOT NULL após atualizar valores nulos
ALTER TABLE public.empresas 
  ALTER COLUMN nome_empresa SET NOT NULL;

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "Usuários podem visualizar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins podem atualizar empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins podem criar empresas" ON public.empresas;

-- Políticas: Todos usuários autenticados podem ler
CREATE POLICY "Usuários podem visualizar empresas"
  ON public.empresas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas admins e managers podem atualizar
CREATE POLICY "Admins podem atualizar empresas"
  ON public.empresas
  FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Apenas admins podem inserir
CREATE POLICY "Admins podem criar empresas"
  ON public.empresas
  FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role]));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_empresas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_empresas_updated_at_trigger ON public.empresas;
CREATE TRIGGER update_empresas_updated_at_trigger
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION update_empresas_updated_at();