// ============================================
// WhatsApp Service Types - Meta Cloud API Only
// ============================================

// Constantes da API
export const META_API_VERSION = 'v21.0';
export const META_GRAPH_URL = 'https://graph.facebook.com';

// Status de conexão
export interface ConnectionStatus {
  connected: boolean;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  businessName: string | null;
}

// Configuração da conta WhatsApp
export interface WhatsAppConfig {
  id: string;
  nome_conta: string;
  phone_number_id: string | null;
  meta_phone_number_id: string | null;
  waba_id: string | null;
  meta_waba_id: string | null;
  access_token: string | null;
  meta_access_token: string | null;
  status: string;
  verificada: boolean;
  token_expira_em: string | null;
  provedor: string;
}

// Parâmetros para envio de mensagem
export interface SendMessageParams {
  conversaId: string;
  contaId: string;
  contatoId: string;
  tipo: 'texto' | 'imagem' | 'video' | 'audio' | 'documento' | 'template' | 'botoes';
  corpo?: string;
  urlMidia?: string;
  nomeArquivo?: string;
  mimeType?: string;
  duracaoAudio?: number;
  templateName?: string;
  templateVariables?: Record<string, string>;
  botoesInterativos?: any;
}

// Parâmetros para envio de template
export interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: TemplateComponent[];
  contaId: string;
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

// Resultado do envio
export interface SendResult {
  success: boolean;
  messageId?: string;
  whatsappMessageId?: string;
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
}

// Business Profile
export interface BusinessProfile {
  about: string;
  address: string;
  description: string;
  email: string;
  profilePictureUrl: string;
  websites: string[];
  vertical: string;
}

// Templates
export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: string;
  language: string;
  components: any[];
}

// Erros da Meta API
export interface MetaAPIError {
  code: number;
  subcode?: number;
  message: string;
  type: string;
  fbtrace_id?: string;
}

// Erro amigável para o usuário
export interface UserFriendlyError {
  type: 'configuration' | 'auth' | 'rate_limit' | 'validation' | 'unknown';
  title: string;
  message: string;
  action?: 'settings' | 'renew_token' | 'retry' | 'contact_support';
  originalError?: MetaAPIError;
}

// Webhook Log
export interface WebhookLog {
  id: string;
  tipo_evento: string;
  payload: any;
  processado: boolean;
  erro?: string;
  criado_em: string;
}

// Configuração Global
export interface WhatsAppGlobalConfig {
  id: string;
  modo_api: 'oficial' | 'nao_oficial';
  provedor_ativo: 'meta_cloud_api';
  ativo: boolean;
  configurado_em: string;
  observacoes?: string;
}
