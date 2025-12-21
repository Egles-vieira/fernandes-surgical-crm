-- PASSO 1: Remover trigger dependente
DROP TRIGGER IF EXISTS trigger_itens_linha_oportunidade_updated_at ON public.itens_linha_oportunidade;

-- PASSO 2: Remover coluna gerada preco_total
ALTER TABLE public.itens_linha_oportunidade DROP COLUMN IF EXISTS preco_total;

-- PASSO 3: Alterar precisão de preco_unitario para 5 casas decimais
ALTER TABLE public.itens_linha_oportunidade 
ALTER COLUMN preco_unitario TYPE NUMERIC(15,5);

-- PASSO 4: Alterar precisão de valor_desconto para 5 casas decimais
ALTER TABLE public.itens_linha_oportunidade 
ALTER COLUMN valor_desconto TYPE NUMERIC(15,5);

-- PASSO 5: Recriar preco_total com precisão de 5 casas decimais
ALTER TABLE public.itens_linha_oportunidade 
ADD COLUMN preco_total NUMERIC(15,5) 
GENERATED ALWAYS AS ((quantidade * preco_unitario) - COALESCE(valor_desconto, 0) + COALESCE(valor_imposto, 0)) STORED;

-- PASSO 6: Recriar trigger para updated_at
CREATE TRIGGER trigger_itens_linha_oportunidade_updated_at
BEFORE UPDATE ON public.itens_linha_oportunidade
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();