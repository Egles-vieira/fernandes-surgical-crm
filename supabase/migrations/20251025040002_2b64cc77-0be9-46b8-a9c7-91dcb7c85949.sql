-- Criar bucket para logos da empresa se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-empresa', 'logos-empresa', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para logos
CREATE POLICY "Logos são publicamente acessíveis"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos-empresa');

CREATE POLICY "Admins podem fazer upload de logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos-empresa' AND
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Admins podem atualizar logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos-empresa' AND
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

CREATE POLICY "Admins podem deletar logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos-empresa' AND
  has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);

-- Inserir registro padrão de empresa se não existir
INSERT INTO empresas (nome, razao_social, cnpj, url_logo)
VALUES (
  'Cirúrgica Fernandes',
  'Cirúrgica Fernandes LTDA',
  '',
  '/logo-cfernandes.webp'
)
ON CONFLICT DO NOTHING;

-- Adicionar RLS na tabela empresas se não existir
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Política para visualização pública da empresa
DROP POLICY IF EXISTS "Todos podem visualizar empresas ativas" ON empresas;
CREATE POLICY "Todos podem visualizar empresas ativas"
ON empresas FOR SELECT
USING (esta_ativa = true);

-- Política para admins gerenciarem empresas
DROP POLICY IF EXISTS "Admins podem gerenciar empresas" ON empresas;
CREATE POLICY "Admins podem gerenciar empresas"
ON empresas FOR ALL
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));