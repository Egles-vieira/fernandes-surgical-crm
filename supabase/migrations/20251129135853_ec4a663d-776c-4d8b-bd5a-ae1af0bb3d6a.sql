-- Campos para controle de cálculo de frete na tabela vendas
ALTER TABLE public.vendas
ADD COLUMN IF NOT EXISTS frete_calculado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS frete_calculado_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS frete_valor numeric(12,2) DEFAULT 0;

-- Tabela de log de integração de cálculo de frete
CREATE TABLE public.integracoes_totvs_calcula_frete (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id uuid REFERENCES vendas(id) ON DELETE CASCADE,
  numero_venda text NOT NULL,
  request_payload text NOT NULL,
  response_payload text,
  status text NOT NULL DEFAULT 'pendente',
  error_message text,
  tempo_resposta_ms integer,
  tempo_preparacao_dados_ms integer,
  tempo_api_ms integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX idx_integracao_frete_venda ON public.integracoes_totvs_calcula_frete(venda_id);

-- RLS
ALTER TABLE public.integracoes_totvs_calcula_frete ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ver logs de frete" ON public.integracoes_totvs_calcula_frete
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Manager pode ver logs de frete" ON public.integracoes_totvs_calcula_frete
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Função que invalida o cálculo de frete quando itens são alterados
CREATE OR REPLACE FUNCTION public.invalidar_calculo_frete()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar a venda para indicar que frete precisa ser recalculado
  UPDATE vendas 
  SET frete_calculado = false,
      updated_at = now()
  WHERE id = COALESCE(NEW.venda_id, OLD.venda_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger em vendas_itens para invalidar frete
CREATE TRIGGER trigger_invalidar_frete_item
AFTER INSERT OR UPDATE OR DELETE ON public.vendas_itens
FOR EACH ROW
EXECUTE FUNCTION public.invalidar_calculo_frete();

-- Função que invalida frete quando campos críticos da venda são alterados
CREATE OR REPLACE FUNCTION public.invalidar_frete_venda()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.tipo_frete_id IS DISTINCT FROM OLD.tipo_frete_id OR
      NEW.endereco_entrega_id IS DISTINCT FROM OLD.endereco_entrega_id OR
      NEW.cliente_id IS DISTINCT FROM OLD.cliente_id) THEN
    NEW.frete_calculado = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger em vendas para campos que afetam frete
CREATE TRIGGER trigger_invalidar_frete_venda
BEFORE UPDATE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION public.invalidar_frete_venda();