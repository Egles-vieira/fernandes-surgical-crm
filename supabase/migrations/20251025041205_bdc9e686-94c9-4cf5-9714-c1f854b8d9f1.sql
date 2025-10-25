-- Adicionar campo para logo do menu aberto
ALTER TABLE empresas 
ADD COLUMN IF NOT EXISTS url_logo_expandido TEXT;

-- Comentários para documentar os campos
COMMENT ON COLUMN empresas.url_logo IS 'Logo exibido quando o menu está fechado (ícone pequeno)';
COMMENT ON COLUMN empresas.url_logo_expandido IS 'Logo exibido quando o menu está aberto (logo completo)';