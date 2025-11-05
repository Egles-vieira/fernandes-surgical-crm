-- Tornar função genérica e segura para tabelas com updated_at ou atualizado_em
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a coluna updated_at existir, atualiza
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = now();
    RETURN NEW;
  END IF;

  -- Caso contrário, se existir atualizado_em, atualiza
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'atualizado_em'
  ) THEN
    NEW.atualizado_em = now();
    RETURN NEW;
  END IF;

  -- Se nenhuma das colunas existir, apenas retorna NEW sem erro
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;