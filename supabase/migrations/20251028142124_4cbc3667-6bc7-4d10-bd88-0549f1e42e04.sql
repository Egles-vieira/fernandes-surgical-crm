-- Adicionar novos campos à tabela de perfis_usuario (se não existirem)
DO $$ 
BEGIN
  -- Adicionar campos de perfil
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='perfis_usuario' AND column_name='foto_perfil_url') THEN
    ALTER TABLE public.perfis_usuario ADD COLUMN foto_perfil_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='perfis_usuario' AND column_name='numero_celular') THEN
    ALTER TABLE public.perfis_usuario ADD COLUMN numero_celular varchar(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='perfis_usuario' AND column_name='telefone') THEN
    ALTER TABLE public.perfis_usuario ADD COLUMN telefone varchar(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='perfis_usuario' AND column_name='ramal') THEN
    ALTER TABLE public.perfis_usuario ADD COLUMN ramal varchar(10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='perfis_usuario' AND column_name='codigo_vendedor') THEN
    ALTER TABLE public.perfis_usuario ADD COLUMN codigo_vendedor varchar(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='perfis_usuario' AND column_name='cargo') THEN
    ALTER TABLE public.perfis_usuario ADD COLUMN cargo varchar(100);
  END IF;
END $$;

-- Adicionar vendedor_vinculado_id e equipe_id à tabela user_roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_roles' AND column_name='vendedor_vinculado_id') THEN
    ALTER TABLE public.user_roles ADD COLUMN vendedor_vinculado_id uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_roles' AND column_name='equipe_id') THEN
    ALTER TABLE public.user_roles ADD COLUMN equipe_id uuid REFERENCES equipes(id);
  END IF;
END $$;