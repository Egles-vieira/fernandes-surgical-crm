-- Preenche automaticamente itens_linha_oportunidade.nome_produto a partir de produtos.nome quando vier nulo/vazio

CREATE OR REPLACE FUNCTION public.itens_linha_oportunidade_fill_nome_produto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.produto_id IS NOT NULL AND (NEW.nome_produto IS NULL OR btrim(NEW.nome_produto) = '') THEN
    SELECT p.nome
      INTO NEW.nome_produto
    FROM public.produtos p
    WHERE p.id = NEW.produto_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_itens_linha_oportunidade_fill_nome_produto ON public.itens_linha_oportunidade;

CREATE TRIGGER trg_itens_linha_oportunidade_fill_nome_produto
BEFORE INSERT OR UPDATE OF produto_id, nome_produto
ON public.itens_linha_oportunidade
FOR EACH ROW
EXECUTE FUNCTION public.itens_linha_oportunidade_fill_nome_produto();

-- Backfill dos itens já existentes
UPDATE public.itens_linha_oportunidade ili
SET nome_produto = p.nome
FROM public.produtos p
WHERE ili.produto_id = p.id
  AND (ili.nome_produto IS NULL OR btrim(ili.nome_produto) = '');
