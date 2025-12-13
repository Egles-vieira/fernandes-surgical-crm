/**
 * WhatsApp Templates do Sistema
 * Gerencia templates de mensagens padronizadas
 */

import { supabase } from '@/integrations/supabase/client';

export type TipoTemplate = 
  | 'boas_vindas'
  | 'fora_expediente'
  | 'fila_espera'
  | 'transferencia'
  | 'encerramento'
  | 'ausencia_temporaria'
  | 'pesquisa_satisfacao'
  | 'lembrete_retorno'
  | 'confirmacao_pedido'
  | 'atualizacao_status';

export interface TemplateSistema {
  id: string;
  tipo: TipoTemplate;
  nome: string;
  conteudo: string;
  variaveis: string[];
  ativo: boolean;
  unidade_id?: string;
  empresa_id?: string;
}

export interface TemplateVariaveis {
  nome_cliente?: string;
  nome_atendente?: string;
  nome_empresa?: string;
  numero_protocolo?: string;
  posicao_fila?: number;
  tempo_espera?: string;
  horario_retorno?: string;
  motivo?: string;
  link_pesquisa?: string;
  numero_pedido?: string;
  status_pedido?: string;
  [key: string]: any;
}

class WhatsAppTemplatesManager {
  private static instance: WhatsAppTemplatesManager;
  private templatesCache: Map<string, TemplateSistema> = new Map();
  private cacheCarregado = false;

  private constructor() {}

  static getInstance(): WhatsAppTemplatesManager {
    if (!WhatsAppTemplatesManager.instance) {
      WhatsAppTemplatesManager.instance = new WhatsAppTemplatesManager();
    }
    return WhatsAppTemplatesManager.instance;
  }

  /**
   * Carrega templates do banco
   */
  async carregarTemplates(unidadeId?: string): Promise<void> {
    try {
      let query = supabase
        .from('whatsapp_templates_sistema' as any)
        .select('*')
        .eq('ativo', true);

      if (unidadeId) {
        query = query.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.templatesCache.clear();
      (data || []).forEach((template: any) => {
        this.templatesCache.set(template.tipo, template);
      });

      this.cacheCarregado = true;
      console.log('📝 Templates carregados:', this.templatesCache.size);
    } catch (error) {
      console.warn('⚠️ Usando templates padrão:', error);
      this.carregarTemplatesPadrao();
    }
  }

  /**
   * Templates padrão do sistema
   */
  private carregarTemplatesPadrao(): void {
    const templatesPadrao: Partial<TemplateSistema>[] = [
      {
        tipo: 'boas_vindas',
        nome: 'Boas-vindas',
        conteudo: 'Olá {{nome_cliente}}! 👋\n\nSeja bem-vindo(a) ao atendimento da {{nome_empresa}}.\n\nMeu nome é {{nome_atendente}} e estou aqui para ajudá-lo(a).\n\nComo posso auxiliá-lo(a) hoje?',
        variaveis: ['nome_cliente', 'nome_empresa', 'nome_atendente'],
        ativo: true
      },
      {
        tipo: 'fora_expediente',
        nome: 'Fora do Expediente',
        conteudo: 'Olá! 😊\n\nAgradecemos seu contato com a {{nome_empresa}}.\n\nNo momento estamos fora do horário de atendimento.\n\nNosso expediente é de segunda a sexta, das 08h às 18h.\n\nSua mensagem foi registrada e responderemos assim que possível.\n\nObrigado pela compreensão! 🙏',
        variaveis: ['nome_empresa'],
        ativo: true
      },
      {
        tipo: 'fila_espera',
        nome: 'Fila de Espera',
        conteudo: 'Olá {{nome_cliente}}! 👋\n\nAgradecemos seu contato!\n\nVocê está na posição {{posicao_fila}} da fila de atendimento.\n\nTempo estimado de espera: {{tempo_espera}}.\n\nEm breve um de nossos atendentes irá atendê-lo(a).\n\nAgradecemos a paciência! 🙏',
        variaveis: ['nome_cliente', 'posicao_fila', 'tempo_espera'],
        ativo: true
      },
      {
        tipo: 'transferencia',
        nome: 'Transferência',
        conteudo: 'Olá {{nome_cliente}}!\n\nSua conversa está sendo transferida para o setor {{setor_destino}}.\n\nO atendente {{nome_atendente}} continuará seu atendimento.\n\nAgradecemos a compreensão! 🙏',
        variaveis: ['nome_cliente', 'setor_destino', 'nome_atendente'],
        ativo: true
      },
      {
        tipo: 'encerramento',
        nome: 'Encerramento',
        conteudo: 'Olá {{nome_cliente}}! 😊\n\nSeu atendimento foi encerrado.\n\nProtocolo: {{numero_protocolo}}\n\nFoi um prazer atendê-lo(a)!\n\nCaso precise de algo mais, é só nos chamar.\n\nAté breve! 👋',
        variaveis: ['nome_cliente', 'numero_protocolo'],
        ativo: true
      },
      {
        tipo: 'ausencia_temporaria',
        nome: 'Ausência Temporária',
        conteudo: 'Olá {{nome_cliente}}!\n\nPreciso me ausentar por alguns minutos.\n\nRetornarei em aproximadamente {{tempo_espera}}.\n\nAguarde um momento, por favor. 🙏',
        variaveis: ['nome_cliente', 'tempo_espera'],
        ativo: true
      },
      {
        tipo: 'pesquisa_satisfacao',
        nome: 'Pesquisa de Satisfação',
        conteudo: 'Olá {{nome_cliente}}! 😊\n\nSeu atendimento foi encerrado.\n\nGostaríamos muito de saber sua opinião sobre nosso atendimento!\n\nPor favor, avalie nosso serviço clicando no link:\n{{link_pesquisa}}\n\nSua opinião é muito importante para nós! ⭐',
        variaveis: ['nome_cliente', 'link_pesquisa'],
        ativo: true
      },
      {
        tipo: 'lembrete_retorno',
        nome: 'Lembrete de Retorno',
        conteudo: 'Olá {{nome_cliente}}! 👋\n\nNotamos que você não respondeu nossa última mensagem.\n\nPrecisa de mais alguma ajuda?\n\nCaso não recebamos resposta, encerraremos o atendimento em 30 minutos.\n\nEstamos à disposição! 😊',
        variaveis: ['nome_cliente'],
        ativo: true
      },
      {
        tipo: 'confirmacao_pedido',
        nome: 'Confirmação de Pedido',
        conteudo: 'Olá {{nome_cliente}}! 🎉\n\nSeu pedido foi confirmado com sucesso!\n\nNúmero do pedido: {{numero_pedido}}\n\nVocê receberá atualizações sobre o status do seu pedido.\n\nObrigado pela preferência! 🙏',
        variaveis: ['nome_cliente', 'numero_pedido'],
        ativo: true
      },
      {
        tipo: 'atualizacao_status',
        nome: 'Atualização de Status',
        conteudo: 'Olá {{nome_cliente}}! 📦\n\nAtualização do seu pedido {{numero_pedido}}:\n\nStatus: {{status_pedido}}\n\nQualquer dúvida, estamos à disposição! 😊',
        variaveis: ['nome_cliente', 'numero_pedido', 'status_pedido'],
        ativo: true
      }
    ];

    templatesPadrao.forEach(template => {
      this.templatesCache.set(template.tipo!, template as TemplateSistema);
    });

    this.cacheCarregado = true;
  }

  /**
   * Obtém template por tipo
   */
  async getTemplate(tipo: TipoTemplate): Promise<TemplateSistema | null> {
    if (!this.cacheCarregado) {
      await this.carregarTemplates();
    }

    return this.templatesCache.get(tipo) || null;
  }

  /**
   * Processa template substituindo variáveis
   */
  async processarTemplate(tipo: TipoTemplate, variaveis: TemplateVariaveis): Promise<string> {
    const template = await this.getTemplate(tipo);
    
    if (!template) {
      console.warn(`⚠️ Template ${tipo} não encontrado`);
      return '';
    }

    let conteudo = template.conteudo;

    // Substituir todas as variáveis
    Object.entries(variaveis).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      conteudo = conteudo.replace(regex, String(value ?? ''));
    });

    // Remover variáveis não preenchidas
    conteudo = conteudo.replace(/\{\{[^}]+\}\}/g, '');

    return conteudo;
  }

  /**
   * Lista todos os templates disponíveis
   */
  async listarTemplates(): Promise<TemplateSistema[]> {
    if (!this.cacheCarregado) {
      await this.carregarTemplates();
    }

    return Array.from(this.templatesCache.values());
  }

  /**
   * Gera mensagem de boas-vindas
   */
  async gerarBoasVindas(nomeCliente: string, nomeAtendente: string, nomeEmpresa: string): Promise<string> {
    return this.processarTemplate('boas_vindas', {
      nome_cliente: nomeCliente,
      nome_atendente: nomeAtendente,
      nome_empresa: nomeEmpresa
    });
  }

  /**
   * Gera mensagem de fora do expediente
   */
  async gerarForaExpediente(nomeEmpresa: string): Promise<string> {
    return this.processarTemplate('fora_expediente', {
      nome_empresa: nomeEmpresa
    });
  }

  /**
   * Gera mensagem de fila de espera
   */
  async gerarFilaEspera(nomeCliente: string, posicaoFila: number, tempoEspera: string): Promise<string> {
    return this.processarTemplate('fila_espera', {
      nome_cliente: nomeCliente,
      posicao_fila: posicaoFila,
      tempo_espera: tempoEspera
    });
  }

  /**
   * Gera mensagem de encerramento
   */
  async gerarEncerramento(nomeCliente: string, numeroProtocolo: string): Promise<string> {
    return this.processarTemplate('encerramento', {
      nome_cliente: nomeCliente,
      numero_protocolo: numeroProtocolo
    });
  }

  /**
   * Gera mensagem de pesquisa de satisfação
   */
  async gerarPesquisaSatisfacao(nomeCliente: string, linkPesquisa: string): Promise<string> {
    return this.processarTemplate('pesquisa_satisfacao', {
      nome_cliente: nomeCliente,
      link_pesquisa: linkPesquisa
    });
  }

  /**
   * Reset cache
   */
  resetCache(): void {
    this.templatesCache.clear();
    this.cacheCarregado = false;
  }
}

// Singleton export
export const whatsappTemplates = WhatsAppTemplatesManager.getInstance();
export default whatsappTemplates;
