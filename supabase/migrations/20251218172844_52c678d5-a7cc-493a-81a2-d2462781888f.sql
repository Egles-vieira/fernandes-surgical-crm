-- Função para calcular contadores de conversas por categoria
CREATE OR REPLACE FUNCTION fn_whatsapp_contadores_usuario(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'meus_atendimentos', (
      SELECT COUNT(*) FROM whatsapp_conversas 
      WHERE atribuida_para_id = p_user_id 
      AND status NOT IN ('fechada', 'resolvida')
    ),
    'nao_lidas', (
      SELECT COUNT(DISTINCT c.id) FROM whatsapp_conversas c
      INNER JOIN whatsapp_mensagens m ON m.conversa_id = c.id
      WHERE c.atribuida_para_id = p_user_id
      AND m.direcao = 'recebida' AND m.status_lida_em IS NULL
      AND c.status NOT IN ('fechada', 'resolvida')
    ),
    'fila_espera', (
      SELECT COUNT(*) FROM whatsapp_fila_espera 
      WHERE atendido_em IS NULL
    ),
    'chatbot', (
      SELECT COUNT(*) FROM whatsapp_conversas 
      WHERE agente_ia_ativo = true 
      AND status NOT IN ('fechada', 'resolvida')
    ),
    'todos', (
      SELECT COUNT(*) FROM whatsapp_conversas 
      WHERE status NOT IN ('fechada', 'resolvida')
    ),
    'todos_nao_lidas', (
      SELECT COUNT(DISTINCT c.id) FROM whatsapp_conversas c
      INNER JOIN whatsapp_mensagens m ON m.conversa_id = c.id
      WHERE m.direcao = 'recebida' AND m.status_lida_em IS NULL
      AND c.status NOT IN ('fechada', 'resolvida')
    )
  ) INTO resultado;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;