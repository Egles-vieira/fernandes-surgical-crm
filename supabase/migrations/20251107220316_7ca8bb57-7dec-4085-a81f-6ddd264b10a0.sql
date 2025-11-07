-- ============================================
-- FASE 1.1: ADICIONAR NOVOS ROLES AO ENUM
-- ============================================

-- Adicionar novos roles comerciais ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretor_comercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente_comercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador_comercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor_equipe';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'representante_comercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'executivo_contas';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'consultor_vendas';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'backoffice';