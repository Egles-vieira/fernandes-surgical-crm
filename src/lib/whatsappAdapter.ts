/**
 * WhatsApp Adapter - Unificado para Meta Cloud API
 * Centraliza todas as operações de envio de mensagens
 */

import { supabase } from '@/integrations/supabase/client';

export type TipoMensagem = 'texto' | 'imagem' | 'video' | 'audio' | 'documento' | 'template' | 'botoes' | 'localizacao';

export interface EnviarMensagemParams {
  mensagemId: string;
}

export interface EnviarTemplateParams {
  contaId: string;
  numeroDestino: string;
  templateName: string;
  templateLanguage?: string;
  templateComponents?: any[];
  conversaId?: string;
  contatoId?: string;
}

export interface ConfiguracaoWhatsApp {
  provedor: 'meta_cloud_api';
  modoApi: 'oficial';
  configCarregada: boolean;
}

class WhatsAppAdapterClass {
  private static instance: WhatsAppAdapterClass;
  private config: ConfiguracaoWhatsApp = {
    provedor: 'meta_cloud_api',
    modoApi: 'oficial',
    configCarregada: false
  };

  private constructor() {}

  static getInstance(): WhatsAppAdapterClass {
    if (!WhatsAppAdapterClass.instance) {
      WhatsAppAdapterClass.instance = new WhatsAppAdapterClass();
    }
    return WhatsAppAdapterClass.instance;
  }

  /**
   * Carrega configuração global do WhatsApp
   */
  async loadConfig(): Promise<void> {
    if (this.config.configCarregada) return;

    try {
      const { data } = await (supabase
        .from('whatsapp_configuracao_global' as any)
        .select('modo_api, provedor_ativo')
        .eq('esta_ativo', true)
        .single() as any);

      if (data) {
        this.config.modoApi = data.modo_api || 'oficial';
        this.config.provedor = data.provedor_ativo || 'meta_cloud_api';
        this.config.configCarregada = true;
        console.log('📡 WhatsApp Config carregada:', this.config);
      }
    } catch (error) {
      console.warn('⚠️ Usando configuração padrão Meta Cloud API');
      this.config.configCarregada = true;
    }
  }

  /**
   * Envia mensagem via Meta Cloud API
   */
  async enviarMensagem(mensagemId: string): Promise<any> {
    await this.loadConfig();

    // Buscar dados da mensagem
    const { data: mensagem, error: msgError } = await supabase
      .from('whatsapp_mensagens')
      .select(`
        *,
        whatsapp_contatos (numero_whatsapp),
        whatsapp_contas (id, meta_phone_number_id, meta_access_token)
      `)
      .eq('id', mensagemId)
      .single();

    if (msgError || !mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    const tipoMensagem = mensagem.tipo_mensagem || 'texto';
    
    // Determinar edge function baseado no tipo
    const functionName = this.getFunctionName(tipoMensagem);

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { mensagemId }
      });

      if (error) throw error;
      
      console.log(`✅ Mensagem ${tipoMensagem} enviada via Meta API:`, data);
      return data;
    } catch (err) {
      console.error(`❌ Erro ao enviar ${tipoMensagem}:`, err);
      
      // Fallback via fetch direto
      return this.fallbackEnvio(functionName, { mensagemId });
    }
  }

  /**
   * Envia template de mensagem via Meta API
   */
  async enviarTemplate(params: EnviarTemplateParams): Promise<any> {
    await this.loadConfig();

    try {
      const { data, error } = await supabase.functions.invoke('meta-api-enviar-template', {
        body: params
      });

      if (error) throw error;
      
      console.log('✅ Template enviado via Meta API:', data);
      return data;
    } catch (err) {
      console.error('❌ Erro ao enviar template:', err);
      return this.fallbackEnvio('meta-api-enviar-template', params);
    }
  }

  /**
   * Envia mensagem de texto simples
   */
  async enviarTexto(conversaId: string, texto: string, contaId: string): Promise<any> {
    // Buscar dados do contato
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('whatsapp_contato_id')
      .eq('id', conversaId)
      .single();

    if (!conversa) {
      throw new Error('Conversa não encontrada');
    }

    // Criar mensagem no banco
    const { data: novaMensagem, error } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        conversa_id: conversaId,
        whatsapp_conta_id: contaId,
        whatsapp_contato_id: conversa.whatsapp_contato_id,
        corpo: texto,
        direcao: 'enviada',
        tipo_mensagem: 'texto',
        status: 'pendente'
      })
      .select()
      .single();

    if (error) throw error;

    // Enviar via API
    return this.enviarMensagem(novaMensagem.id);
  }

  /**
   * Envia mídia (imagem, vídeo, áudio, documento)
   */
  async enviarMidia(
    conversaId: string,
    contaId: string,
    tipoMidia: 'imagem' | 'video' | 'audio' | 'documento',
    urlMidia: string,
    caption?: string,
    nomeArquivo?: string,
    mimeType?: string
  ): Promise<any> {
    const { data: conversa } = await supabase
      .from('whatsapp_conversas')
      .select('whatsapp_contato_id')
      .eq('id', conversaId)
      .single();

    if (!conversa) {
      throw new Error('Conversa não encontrada');
    }

    const { data: novaMensagem, error } = await supabase
      .from('whatsapp_mensagens')
      .insert({
        conversa_id: conversaId,
        whatsapp_conta_id: contaId,
        whatsapp_contato_id: conversa.whatsapp_contato_id,
        corpo: caption || '',
        direcao: 'enviada',
        tipo_mensagem: tipoMidia,
        tem_midia: true,
        tipo_midia: tipoMidia,
        url_midia: urlMidia,
        nome_arquivo: nomeArquivo,
        mime_type: mimeType,
        status: 'pendente'
      })
      .select()
      .single();

    if (error) throw error;

    return this.enviarMensagem(novaMensagem.id);
  }

  /**
   * Verifica status da conexão WhatsApp
   */
  async verificarStatus(contaId: string): Promise<{ conectado: boolean; status: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('meta-api-verificar-status', {
        body: { contaId }
      });

      if (error) throw error;
      
      return {
        conectado: data?.status === 'connected',
        status: data?.status || 'unknown'
      };
    } catch (err) {
      console.error('❌ Erro ao verificar status:', err);
      return { conectado: false, status: 'error' };
    }
  }

  /**
   * Retorna nome da edge function baseado no tipo de mensagem
   */
  private getFunctionName(tipoMensagem: string): string {
    const functionMap: Record<string, string> = {
      texto: 'meta-api-enviar-mensagem',
      imagem: 'meta-api-enviar-mensagem',
      video: 'meta-api-enviar-mensagem',
      audio: 'meta-api-enviar-mensagem',
      documento: 'meta-api-enviar-mensagem',
      template: 'meta-api-enviar-template',
      botoes: 'meta-api-enviar-mensagem',
      localizacao: 'meta-api-enviar-mensagem'
    };

    return functionMap[tipoMensagem] || 'meta-api-enviar-mensagem';
  }

  /**
   * Fallback: envio direto via fetch quando supabase.functions falha
   */
  private async fallbackEnvio(functionName: string, body: any): Promise<any> {
    console.warn(`⚠️ Usando fallback HTTP para ${functionName}`);
    
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
    const { data: session } = await supabase.auth.getSession();
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session?.access_token ?? ''}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status} - ${txt}`);
    }

    return res.json();
  }

  /**
   * Getters de configuração
   */
  getProvedor() {
    return this.config.provedor;
  }

  getModoApi() {
    return this.config.modoApi;
  }

  isConfigCarregada() {
    return this.config.configCarregada;
  }

  /**
   * Reset configuração (útil para testes)
   */
  resetConfig() {
    this.config.configCarregada = false;
  }
}

// Singleton export
export const whatsappAdapter = WhatsAppAdapterClass.getInstance();
export default whatsappAdapter;
