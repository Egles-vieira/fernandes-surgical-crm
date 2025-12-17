-- Adicionar coluna modo_distribuicao na tabela de filas
ALTER TABLE whatsapp_filas 
ADD COLUMN IF NOT EXISTS modo_distribuicao VARCHAR(30) DEFAULT 'round_robin';

-- Comentário explicativo
COMMENT ON COLUMN whatsapp_filas.modo_distribuicao IS 
  'Modo de distribuição: round_robin, menos_ocupado, carteira, manual (operadores resgatam)';

-- Atualizar fila "Geral" para modo manual
UPDATE whatsapp_filas 
SET modo_distribuicao = 'manual'
WHERE id = 'e2d0495c-5681-4035-8989-825e69dc3265';