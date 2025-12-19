-- Corrigir FK para referenciar tabela produtos ao invés de produtos_catalogo
ALTER TABLE itens_linha_oportunidade 
DROP CONSTRAINT itens_linha_oportunidade_produto_id_fkey;

ALTER TABLE itens_linha_oportunidade 
ADD CONSTRAINT itens_linha_oportunidade_produto_id_fkey 
FOREIGN KEY (produto_id) REFERENCES produtos(id);