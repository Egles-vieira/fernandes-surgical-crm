// ============================================
// WhatsApp Error Handling - Meta Cloud API
// ============================================

import { MetaAPIError, UserFriendlyError } from './types';

/**
 * Códigos de erro específicos da Meta Cloud API
 */
export const META_ERROR_CODES = {
  // Erros de configuração
  INVALID_PHONE_NUMBER_ID: { code: 100, subcode: 33 },
  INVALID_PARAMETER: { code: 100 },
  
  // Erros de autenticação
  TOKEN_EXPIRED: { code: 190 },
  INVALID_TOKEN: { code: 190, subcode: 463 },
  
  // Erros de rate limit
  RATE_LIMITED: { code: 80007 },
  THROTTLED: { code: 130429 },
  
  // Erros de template
  TEMPLATE_NOT_FOUND: { code: 132000 },
  TEMPLATE_PAUSED: { code: 132001 },
  TEMPLATE_DISABLED: { code: 132002 },
  
  // Erros de janela de mensagem
  MESSAGE_OUTSIDE_WINDOW: { code: 131047 },
  REENGAGEMENT_MESSAGE: { code: 131048 },
  
  // Erros de mídia
  MEDIA_DOWNLOAD_FAILED: { code: 131052 },
  MEDIA_UPLOAD_FAILED: { code: 131053 },
  
  // Erros de número
  RECIPIENT_NOT_ON_WHATSAPP: { code: 131026 },
  PHONE_NUMBER_NOT_REGISTERED: { code: 131030 },
};

/**
 * Converte erro da Meta API em mensagem amigável para o usuário
 */
export function handleMetaError(error: MetaAPIError | any): UserFriendlyError {
  // Se não for um erro da Meta, retornar erro genérico
  if (!error?.code) {
    return {
      type: 'unknown',
      title: 'Erro Desconhecido',
      message: error?.message || 'Ocorreu um erro inesperado. Tente novamente.',
      action: 'retry',
    };
  }

  const { code, subcode, message } = error;

  // Erro 100/33 - Phone Number ID inválido (CRÍTICO)
  if (code === 100 && subcode === 33) {
    return {
      type: 'configuration',
      title: 'Erro de Configuração',
      message: 'Verifique se você está usando o Phone Number ID correto (não o WABA ID) e se o token possui as permissões necessárias.',
      action: 'settings',
      originalError: error,
    };
  }

  // Erro 100 genérico - Parâmetro inválido
  if (code === 100) {
    return {
      type: 'configuration',
      title: 'Parâmetro Inválido',
      message: `Erro na requisição: ${message}. Verifique as configurações.`,
      action: 'settings',
      originalError: error,
    };
  }

  // Erro 190 - Token expirado/inválido
  if (code === 190) {
    return {
      type: 'auth',
      title: 'Token Expirado',
      message: 'O token de acesso expirou ou é inválido. Renove o token no Meta Business Suite.',
      action: 'renew_token',
      originalError: error,
    };
  }

  // Rate limit
  if (code === 80007 || code === 130429) {
    return {
      type: 'rate_limit',
      title: 'Limite de Requisições',
      message: 'Muitas mensagens enviadas em pouco tempo. Aguarde alguns minutos e tente novamente.',
      action: 'retry',
      originalError: error,
    };
  }

  // Template não encontrado
  if (code === 132000) {
    return {
      type: 'validation',
      title: 'Template Não Encontrado',
      message: 'O template de mensagem não foi encontrado ou não está aprovado.',
      action: 'settings',
      originalError: error,
    };
  }

  // Fora da janela de 24h
  if (code === 131047 || code === 131048) {
    return {
      type: 'validation',
      title: 'Janela de 24h Expirada',
      message: 'Não é possível enviar mensagem pois a janela de 24 horas expirou. Use um template aprovado.',
      action: 'settings',
      originalError: error,
    };
  }

  // Número não está no WhatsApp
  if (code === 131026 || code === 131030) {
    return {
      type: 'validation',
      title: 'Número Inválido',
      message: 'Este número não está registrado no WhatsApp ou é inválido.',
      originalError: error,
    };
  }

  // Erro de mídia
  if (code === 131052 || code === 131053) {
    return {
      type: 'validation',
      title: 'Erro de Mídia',
      message: 'Não foi possível processar o arquivo de mídia. Verifique o formato e tamanho.',
      action: 'retry',
      originalError: error,
    };
  }

  // Erro genérico
  return {
    type: 'unknown',
    title: 'Erro na API do WhatsApp',
    message: message || 'Ocorreu um erro ao processar a requisição.',
    action: 'retry',
    originalError: error,
  };
}

/**
 * Verifica se o erro é recuperável (pode tentar novamente)
 */
export function isRetryableError(error: MetaAPIError): boolean {
  const retryableCodes = [80007, 130429, 131052];
  return retryableCodes.includes(error.code);
}

/**
 * Verifica se o erro requer ação do usuário nas configurações
 */
export function requiresSettingsAction(error: MetaAPIError): boolean {
  const settingsCodes = [100, 190, 132000, 131047];
  return settingsCodes.includes(error.code);
}
