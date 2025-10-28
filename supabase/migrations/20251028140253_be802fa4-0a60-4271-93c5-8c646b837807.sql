-- ============================================
-- PARTE 1: ADICIONAR NOVOS ROLES AO ENUM
-- ============================================

-- Adicionar 'lider' ao enum se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lider' AND enumtypid = 'public.app_role'::regtype) THEN
        ALTER TYPE public.app_role ADD VALUE 'lider';
    END IF;
END $$;

-- Adicionar 'backoffice' ao enum se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'backoffice' AND enumtypid = 'public.app_role'::regtype) THEN
        ALTER TYPE public.app_role ADD VALUE 'backoffice';
    END IF;
END $$;

COMMENT ON TYPE public.app_role IS 'Enum de roles: admin, manager, sales, warehouse, support, lider, backoffice';