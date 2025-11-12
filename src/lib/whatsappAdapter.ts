import { supabase } from '@/integrations/supabase/client';

export class WhatsAppAdapter {
  private static instance: WhatsAppAdapter;
  private modoAtual: 'oficial' | 'nao_oficial' | null = null;
  private provedorAtivo: 'gupshup' | 'w_api' | null = null;
  private configCarregada = false;

  private constructor() {}

  static getInstance(): WhatsAppAdapter {
    if (!WhatsAppAdapter.instance) {
      WhatsAppAdapter.instance = new WhatsAppAdapter();
    }
    return WhatsAppAdapter.instance;
  }

  async loadConfig() {
    if (this.configCarregada) return;

    const { data } = await supabase
      .from('whatsapp_configuracao_global')
      .select('modo_api, provedor_ativo')
      .eq('esta_ativo', true)
      .single();

    if (data) {
      this.modoAtual = data.modo_api as 'oficial' | 'nao_oficial';
      this.provedorAtivo = data.provedor_ativo as 'gupshup' | 'w_api';
      this.configCarregada = true;
      console.log('📡 Config WhatsApp carregada:', { 
        modo: this.modoAtual, 
        provedor: this.provedorAtivo 
      });
    }
  }

  async enviarMensagem(mensagemId: string) {
    await this.loadConfig();

    if (this.provedorAtivo === 'gupshup') {
      return this.enviarViaGupshup(mensagemId);
    } else if (this.provedorAtivo === 'w_api') {
      return this.enviarViaWAPI(mensagemId);
    } else {
      throw new Error('Provedor WhatsApp não configurado');
    }
  }

  private async enviarViaGupshup(mensagemId: string) {
    console.log('📤 Enviando via Gupshup...');

    const { data, error } = await supabase.functions.invoke('gupshup-enviar-mensagem', {
      body: { mensagemId }
    });

    if (error) throw error;
    console.log('✅ Mensagem Gupshup enviada:', data);
    return data;
  }

  private async enviarViaWAPI(mensagemId: string) {
    console.log('📤 Enviando via W-API...');

    const { data, error } = await supabase.functions.invoke('w-api-enviar-mensagem', {
      body: { mensagemId }
    });

    if (error) throw error;
    console.log('✅ Mensagem W-API enviada:', data);
    return data;
  }

  getModoAtual() {
    return this.modoAtual;
  }

  getProvedorAtivo() {
    return this.provedorAtivo;
  }

  resetConfig() {
    this.configCarregada = false;
    this.modoAtual = null;
    this.provedorAtivo = null;
  }
}

// Export singleton
export const whatsappAdapter = WhatsAppAdapter.getInstance();
