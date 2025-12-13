// ============================================
// WhatsApp Service - Centralized Meta Cloud API
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { 
  ConnectionStatus, 
  WhatsAppConfig, 
  SendTemplateParams,
  SendResult,
  BusinessProfile,
  WhatsAppTemplate,
  WhatsAppGlobalConfig,
} from './types';
import { handleMetaError } from './errors';

/**
 * Classe singleton para gerenciar todas as operações do WhatsApp
 * REGRA CRÍTICA: Todas as chamadas passam pelas Edge Functions, nunca direto para a Meta API
 */
class WhatsAppServiceClass {
  private static instance: WhatsAppServiceClass;
  private config: WhatsAppGlobalConfig | null = null;
  private activeAccount: WhatsAppConfig | null = null;

  private constructor() {}

  static getInstance(): WhatsAppServiceClass {
    if (!WhatsAppServiceClass.instance) {
      WhatsAppServiceClass.instance = new WhatsAppServiceClass();
    }
    return WhatsAppServiceClass.instance;
  }

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  /**
   * Carrega a configuração global do WhatsApp
   */
  async loadGlobalConfig(): Promise<WhatsAppGlobalConfig | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_configuracao_global')
        .select('*')
        .eq('esta_ativo', true)
        .order('configurado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Configuração global não encontrada:', error);
        return null;
      }

      if (!data) return null;

      // Mapear campos do banco para interface
      this.config = {
        id: data.id,
        modo_api: data.modo_api as 'oficial' | 'nao_oficial',
        provedor_ativo: 'meta_cloud_api',
        ativo: data.esta_ativo ?? true,
        configurado_em: data.configurado_em,
        observacoes: data.observacoes ?? undefined,
      };
      
      return this.config;
    } catch (error) {
      console.error('❌ Erro ao carregar config global:', error);
      return null;
    }
  }

  /**
   * Carrega a conta WhatsApp ativa
   */
  async loadActiveAccount(): Promise<WhatsAppConfig | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('*')
        .eq('status', 'ativo')
        .is('excluido_em', null)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Conta WhatsApp não encontrada:', error);
        return null;
      }

      if (!data) return null;

      // Mapear campos do banco para interface
      this.activeAccount = {
        id: data.id,
        nome_conta: data.nome_conta,
        phone_number_id: data.phone_number_id,
        meta_phone_number_id: data.meta_phone_number_id,
        waba_id: data.waba_id,
        meta_waba_id: data.meta_waba_id,
        access_token: data.meta_access_token ?? null,
        meta_access_token: data.meta_access_token,
        status: data.status,
        verificada: data.verificada ?? false,
        token_expira_em: data.token_expira_em,
        provedor: data.provedor,
      };
      
      return this.activeAccount;
    } catch (error) {
      console.error('❌ Erro ao carregar conta ativa:', error);
      return null;
    }
  }

  /**
   * Retorna o Phone Number ID correto (prioriza meta_phone_number_id)
   * REGRA CRÍTICA: Sempre usar Phone Number ID, nunca WABA ID para envios
   */
  getPhoneNumberId(): string | null {
    if (!this.activeAccount) return null;
    return this.activeAccount.meta_phone_number_id || this.activeAccount.phone_number_id;
  }

  /**
   * Verifica o status da conexão com a Meta API
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    const account = await this.loadActiveAccount();
    
    if (!account) {
      return {
        connected: false,
        phoneNumberId: null,
        displayPhoneNumber: null,
        qualityRating: 'UNKNOWN',
        tokenExpiresAt: null,
        tokenExpired: true,
        businessName: null,
      };
    }

    const tokenExpired = account.token_expira_em 
      ? new Date(account.token_expira_em) < new Date() 
      : false;

    return {
      connected: account.status === 'ativo' && account.verificada && !tokenExpired,
      phoneNumberId: this.getPhoneNumberId(),
      displayPhoneNumber: null,
      qualityRating: 'UNKNOWN',
      tokenExpiresAt: account.token_expira_em,
      tokenExpired,
      businessName: account.nome_conta,
    };
  }

  // ============================================
  // ENVIO DE MENSAGENS
  // ============================================

  /**
   * Envia uma mensagem via Edge Function
   * NUNCA chama a Meta API diretamente
   */
  async sendMessage(mensagemId: string): Promise<SendResult> {
    try {
      console.log('📤 Enviando mensagem via Edge Function:', mensagemId);

      // Usar a Edge Function Meta API
      const { data, error } = await supabase.functions.invoke('meta-api-enviar-mensagem', {
        body: { mensagemId }
      });

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        const friendlyError = handleMetaError(error);
        return {
          success: false,
          error: friendlyError.message,
          errorCode: (error as any).code,
        };
      }

      if (!data?.success) {
        const apiError = data?.error || data?.details;
        const friendlyError = handleMetaError(apiError);
        return {
          success: false,
          error: friendlyError.message,
          errorCode: apiError?.code,
          errorSubcode: apiError?.subcode,
        };
      }

      console.log('✅ Mensagem enviada com sucesso:', data);
      return {
        success: true,
        messageId: mensagemId,
        whatsappMessageId: data.whatsappMessageId,
      };
    } catch (error: any) {
      console.error('❌ Erro ao enviar mensagem:', error);
      const friendlyError = handleMetaError(error);
      return {
        success: false,
        error: friendlyError.message,
      };
    }
  }

  /**
   * Envia um template de mensagem
   */
  async sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    try {
      console.log('📤 Enviando template:', params.templateName);

      const { data, error } = await supabase.functions.invoke('meta-api-enviar-template', {
        body: {
          to: params.to,
          templateName: params.templateName,
          languageCode: params.languageCode || 'pt_BR',
          components: params.components,
          contaId: params.contaId,
        }
      });

      if (error) {
        console.error('❌ Erro ao enviar template:', error);
        const friendlyError = handleMetaError(error);
        return {
          success: false,
          error: friendlyError.message,
        };
      }

      if (!data?.success) {
        const friendlyError = handleMetaError(data?.error);
        return {
          success: false,
          error: friendlyError.message,
        };
      }

      return {
        success: true,
        whatsappMessageId: data.messageId,
      };
    } catch (error: any) {
      console.error('❌ Erro ao enviar template:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envia mensagem de texto simples (cria no banco e envia)
   */
  async sendTextMessage(
    conversaId: string, 
    texto: string, 
    contaId: string,
    contatoId: string,
    userId: string
  ): Promise<SendResult> {
    try {
      // 1. Criar mensagem no banco como pendente
      const { data: mensagem, error: insertError } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          conversa_id: conversaId,
          whatsapp_conta_id: contaId,
          whatsapp_contato_id: contatoId,
          corpo: texto,
          direcao: 'enviada',
          tipo_mensagem: 'texto',
          status: 'pendente',
          enviada_por_usuario_id: userId,
        })
        .select()
        .single();

      if (insertError || !mensagem) {
        throw new Error('Erro ao criar mensagem: ' + insertError?.message);
      }

      // 2. Enviar via Edge Function
      const result = await this.sendMessage(mensagem.id);

      // 3. Atualizar status no banco
      if (!result.success) {
        await supabase
          .from('whatsapp_mensagens')
          .update({
            status: 'erro',
            erro_mensagem: result.error,
            status_falhou_em: new Date().toISOString(),
          })
          .eq('id', mensagem.id);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao enviar texto:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================
  // BUSINESS PROFILE
  // ============================================

  /**
   * Obtém o perfil comercial do WhatsApp Business
   */
  async getBusinessProfile(): Promise<BusinessProfile | null> {
    try {
      const account = await this.loadActiveAccount();
      if (!account) return null;

      return {
        about: '',
        address: '',
        description: account.nome_conta || '',
        email: '',
        profilePictureUrl: '',
        websites: [],
        vertical: 'OTHER',
      };
    } catch (error) {
      console.error('❌ Erro ao buscar business profile:', error);
      return null;
    }
  }

  // ============================================
  // TEMPLATES
  // ============================================

  /**
   * Lista templates de mensagem disponíveis
   */
  async listTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('ativo', true)
        .order('nome_template', { ascending: true });

      if (error) {
        console.error('❌ Erro ao listar templates:', error);
        return [];
      }

      return (data || []).map(t => ({
        id: t.id,
        name: t.nome_template || '',
        status: 'APPROVED' as const,
        category: t.categoria || 'UTILITY',
        language: t.idioma || 'pt_BR',
        components: [],
      }));
    } catch (error) {
      console.error('❌ Erro ao listar templates:', error);
      return [];
    }
  }

  // ============================================
  // TESTES
  // ============================================

  /**
   * Testa a conexão enviando uma mensagem hello_world
   */
  async testConnection(phoneNumber: string): Promise<SendResult> {
    const account = await this.loadActiveAccount();
    if (!account) {
      return {
        success: false,
        error: 'Nenhuma conta WhatsApp configurada',
      };
    }

    return this.sendTemplate({
      to: phoneNumber,
      templateName: 'hello_world',
      languageCode: 'en_US',
      contaId: account.id,
    });
  }

  // ============================================
  // GETTERS
  // ============================================

  getConfig(): WhatsAppGlobalConfig | null {
    return this.config;
  }

  getActiveAccount(): WhatsAppConfig | null {
    return this.activeAccount;
  }

  isConfigLoaded(): boolean {
    return this.config !== null;
  }

  resetConfig(): void {
    this.config = null;
    this.activeAccount = null;
  }
}

// Exportar instância singleton
export const whatsAppService = WhatsAppServiceClass.getInstance();
