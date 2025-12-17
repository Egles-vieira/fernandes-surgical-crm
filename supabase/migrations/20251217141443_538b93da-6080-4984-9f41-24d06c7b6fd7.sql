-- Adicionar coluna de configurações avançadas do Agente IA
ALTER TABLE whatsapp_contas ADD COLUMN IF NOT EXISTS agente_ia_config JSONB DEFAULT '{
  "tom_voz": "profissional",
  "limite_respostas_por_conversa": 10,
  "tempo_espera_segundos": 30,
  "horario_funcionamento": {
    "ativo": false,
    "inicio": "08:00",
    "fim": "18:00",
    "dias_semana": [1, 2, 3, 4, 5]
  },
  "regras": {
    "responder_cliente_cadastrado": false,
    "responder_com_operador_atribuido": false,
    "responder_aguardando_cnpj": false,
    "responder_cliente_novo_sem_operador": true
  },
  "mensagens": {
    "fora_horario": "Olá! Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Deixe sua mensagem que retornaremos!",
    "limite_atingido": "Para um atendimento mais personalizado, vou transferir você para um de nossos especialistas."
  }
}'::jsonb;

COMMENT ON COLUMN whatsapp_contas.agente_ia_config IS 'Configurações avançadas do agente de vendas IA: tom de voz, limites, horários e regras de acionamento';

-- Criar índice GIN para consultas JSONB eficientes
CREATE INDEX IF NOT EXISTS idx_whatsapp_contas_agente_ia_config ON whatsapp_contas USING GIN (agente_ia_config);