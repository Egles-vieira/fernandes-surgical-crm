// ============================================
// WhatsApp Service - Public API
// ============================================

// Serviço principal
export { whatsAppService } from './WhatsAppService';

// Types
export type {
  ConnectionStatus,
  WhatsAppConfig,
  SendMessageParams,
  SendTemplateParams,
  SendResult,
  BusinessProfile,
  WhatsAppTemplate,
  WhatsAppGlobalConfig,
  MetaAPIError,
  UserFriendlyError,
  WebhookLog,
} from './types';

export { META_API_VERSION, META_GRAPH_URL } from './types';

// Error handling
export { 
  handleMetaError, 
  isRetryableError, 
  requiresSettingsAction,
  META_ERROR_CODES,
} from './errors';
