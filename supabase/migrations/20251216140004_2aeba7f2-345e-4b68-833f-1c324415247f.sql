
-- =============================================
-- REESTRUTURAÇÃO DE CARTEIRAS v2
-- Modelo: CARTEIRA (entidade) -> CONTATOS (N:N)
-- =============================================

-- 1. Criar tabela principal de carteiras (entidade)
CREATE TABLE IF NOT EXISTS public.whatsapp_carteiras_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  operador_id UUID NOT NULL REFERENCES public.perfis_usuario(id),
  
  -- Configurações
  max_contatos INTEGER DEFAULT 50,
  recebe_novos_contatos BOOLEAN DEFAULT true,
  cor VARCHAR(20) DEFAULT '#3b82f6',
  
  -- Controle
  esta_ativa BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES public.perfis_usuario(id),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  
  -- Métricas agregadas (atualizadas via trigger)
  total_contatos INTEGER DEFAULT 0,
  total_atendimentos INTEGER DEFAULT 0,
  ultimo_atendimento_em TIMESTAMPTZ
);

-- 2. Criar tabela de vínculo carteira <-> contatos
CREATE TABLE IF NOT EXISTS public.whatsapp_carteiras_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carteira_id UUID NOT NULL REFERENCES public.whatsapp_carteiras_v2(id) ON DELETE CASCADE,
  whatsapp_contato_id UUID NOT NULL REFERENCES public.whatsapp_contatos(id) ON DELETE CASCADE,
  
  -- Controle
  vinculado_em TIMESTAMPTZ DEFAULT now(),
  vinculado_por UUID REFERENCES public.perfis_usuario(id),
  motivo_vinculo TEXT,
  
  -- Garantir que um contato só pode estar em uma carteira
  UNIQUE(whatsapp_contato_id)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_carteiras_v2_operador ON public.whatsapp_carteiras_v2(operador_id);
CREATE INDEX IF NOT EXISTS idx_carteiras_v2_ativa ON public.whatsapp_carteiras_v2(esta_ativa);
CREATE INDEX IF NOT EXISTS idx_carteiras_contatos_carteira ON public.whatsapp_carteiras_contatos(carteira_id);
CREATE INDEX IF NOT EXISTS idx_carteiras_contatos_contato ON public.whatsapp_carteiras_contatos(whatsapp_contato_id);

-- 4. Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION public.atualizar_carteira_v2_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_carteira_v2_updated ON public.whatsapp_carteiras_v2;
CREATE TRIGGER trg_carteira_v2_updated
  BEFORE UPDATE ON public.whatsapp_carteiras_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_carteira_v2_timestamp();

-- 5. Trigger para atualizar contador de contatos
CREATE OR REPLACE FUNCTION public.atualizar_contador_contatos_carteira()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.whatsapp_carteiras_v2 
    SET total_contatos = total_contatos + 1 
    WHERE id = NEW.carteira_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.whatsapp_carteiras_v2 
    SET total_contatos = GREATEST(total_contatos - 1, 0) 
    WHERE id = OLD.carteira_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_contador_contatos ON public.whatsapp_carteiras_contatos;
CREATE TRIGGER trg_contador_contatos
  AFTER INSERT OR DELETE ON public.whatsapp_carteiras_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_contador_contatos_carteira();

-- 6. RLS
ALTER TABLE public.whatsapp_carteiras_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_carteiras_contatos ENABLE ROW LEVEL SECURITY;

-- Políticas para carteiras_v2
DROP POLICY IF EXISTS "carteiras_v2_select" ON public.whatsapp_carteiras_v2;
CREATE POLICY "carteiras_v2_select" ON public.whatsapp_carteiras_v2
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "carteiras_v2_insert" ON public.whatsapp_carteiras_v2;
CREATE POLICY "carteiras_v2_insert" ON public.whatsapp_carteiras_v2
  FOR INSERT TO authenticated WITH CHECK (
    auth_is_admin() OR auth_is_manager()
  );

DROP POLICY IF EXISTS "carteiras_v2_update" ON public.whatsapp_carteiras_v2;
CREATE POLICY "carteiras_v2_update" ON public.whatsapp_carteiras_v2
  FOR UPDATE TO authenticated USING (
    auth_is_admin() OR auth_is_manager() OR operador_id = auth.uid()
  );

DROP POLICY IF EXISTS "carteiras_v2_delete" ON public.whatsapp_carteiras_v2;
CREATE POLICY "carteiras_v2_delete" ON public.whatsapp_carteiras_v2
  FOR DELETE TO authenticated USING (
    auth_is_admin() OR auth_is_manager()
  );

-- Políticas para carteiras_contatos
DROP POLICY IF EXISTS "carteiras_contatos_select" ON public.whatsapp_carteiras_contatos;
CREATE POLICY "carteiras_contatos_select" ON public.whatsapp_carteiras_contatos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "carteiras_contatos_insert" ON public.whatsapp_carteiras_contatos;
CREATE POLICY "carteiras_contatos_insert" ON public.whatsapp_carteiras_contatos
  FOR INSERT TO authenticated WITH CHECK (
    auth_is_admin() OR auth_is_manager()
  );

DROP POLICY IF EXISTS "carteiras_contatos_delete" ON public.whatsapp_carteiras_contatos;
CREATE POLICY "carteiras_contatos_delete" ON public.whatsapp_carteiras_contatos
  FOR DELETE TO authenticated USING (
    auth_is_admin() OR auth_is_manager()
  );

-- 7. Função para buscar operador responsável por contato
CREATE OR REPLACE FUNCTION public.buscar_operador_carteira(p_contato_id UUID)
RETURNS UUID AS $$
DECLARE
  v_operador_id UUID;
BEGIN
  SELECT cv.operador_id INTO v_operador_id
  FROM public.whatsapp_carteiras_contatos cc
  JOIN public.whatsapp_carteiras_v2 cv ON cv.id = cc.carteira_id
  WHERE cc.whatsapp_contato_id = p_contato_id
    AND cv.esta_ativa = true
  LIMIT 1;
  
  RETURN v_operador_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions
GRANT SELECT ON public.whatsapp_carteiras_v2 TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.whatsapp_carteiras_v2 TO authenticated;
GRANT SELECT ON public.whatsapp_carteiras_contatos TO authenticated;
GRANT INSERT, DELETE ON public.whatsapp_carteiras_contatos TO authenticated;
