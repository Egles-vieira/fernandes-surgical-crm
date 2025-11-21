export type ErrorCategory = 'validacao' | 'negocio' | 'tecnico' | 'rede';

export interface ParsedError {
  categoria: ErrorCategory;
  titulo: string;
  mensagem: string;
  codigoErro?: string;
  sugestoes: string[];
  detalhes?: any;
}

// Mapa de erros conhecidos do Datasul
const DATASUL_ERRORS: Record<string, { titulo: string; sugestoes: string[] }> = {
  '5178': {
    titulo: 'Cliente suspenso para faturamento',
    sugestoes: [
      'Verificar situação financeira do cliente no Datasul',
      'Contatar o setor de crédito para desbloquear o cliente',
      'Regularizar pendências financeiras antes de continuar',
    ],
  },
  '5179': {
    titulo: 'Cliente com crédito insuficiente',
    sugestoes: [
      'Solicitar aumento de limite de crédito',
      'Verificar pagamentos pendentes',
      'Reduzir o valor do pedido',
    ],
  },
  '5180': {
    titulo: 'Produto inativo ou bloqueado',
    sugestoes: [
      'Verificar cadastro do produto no Datasul',
      'Substituir por produto ativo similar',
      'Contatar o departamento comercial',
    ],
  },
  'TIMEOUT': {
    titulo: 'Tempo de resposta excedido',
    sugestoes: [
      'Tentar novamente em alguns instantes',
      'Reduzir o número de itens no pedido',
      'Verificar conexão com o servidor',
    ],
  },
  'NETWORK': {
    titulo: 'Erro de conexão',
    sugestoes: [
      'Verificar sua conexão com a internet',
      'Tentar novamente em alguns instantes',
      'Contatar o suporte técnico se o problema persistir',
    ],
  },
  'INVALID_DATA': {
    titulo: 'Dados inválidos',
    sugestoes: [
      'Verificar se todos os campos obrigatórios estão preenchidos',
      'Conferir valores de quantidade e preço',
      'Verificar se o cliente está corretamente cadastrado',
    ],
  },
};

export function parseError(error: any): ParsedError {
  // Extrair informações básicas do erro
  const errorMessage = error?.message || error?.error || String(error);
  const errorDetails = error?.details || error?.error_details || null;
  const errorCode = error?.error_code || error?.code || null;

  // Detectar categoria do erro
  let categoria: ErrorCategory = 'tecnico';
  let titulo = 'Erro no cálculo do pedido';
  let mensagem = errorMessage;
  let sugestoes: string[] = ['Tentar novamente', 'Verificar os dados do pedido'];

  // Erro de negócio do Datasul (ex: "Datasul: Cliente suspenso (Código: 5178)")
  const datasulMatch = errorMessage.match(/Datasul: (.+?) \(Código: (\d+)\)/);
  if (datasulMatch) {
    categoria = 'negocio';
    const codigoErro = datasulMatch[2];
    const errorInfo = DATASUL_ERRORS[codigoErro];
    
    if (errorInfo) {
      titulo = errorInfo.titulo;
      sugestoes = errorInfo.sugestoes;
    } else {
      titulo = datasulMatch[1];
      sugestoes = [
        'Verificar a configuração no sistema Datasul',
        'Contatar o suporte técnico com o código do erro',
      ];
    }
    
    mensagem = `${titulo}. ${datasulMatch[1]}`;
    
    return {
      categoria,
      titulo,
      mensagem,
      codigoErro,
      sugestoes,
      detalhes: errorDetails,
    };
  }

  // Erro de validação
  if (
    errorMessage.includes('obrigatório') ||
    errorMessage.includes('inválido') ||
    errorMessage.includes('necessário') ||
    errorMessage.includes('campo') ||
    errorMessage.includes('preencher')
  ) {
    categoria = 'validacao';
    titulo = 'Dados incompletos ou inválidos';
    sugestoes = DATASUL_ERRORS['INVALID_DATA'].sugestoes;
    return { categoria, titulo, mensagem, sugestoes, detalhes: errorDetails };
  }

  // Erro de rede/timeout
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('network') ||
    errorMessage.includes('fetch failed')
  ) {
    categoria = 'rede';
    const errorInfo = errorMessage.includes('timeout') 
      ? DATASUL_ERRORS['TIMEOUT'] 
      : DATASUL_ERRORS['NETWORK'];
    titulo = errorInfo.titulo;
    sugestoes = errorInfo.sugestoes;
    mensagem = `Não foi possível conectar ao servidor Datasul. ${errorMessage}`;
    return { categoria, titulo, mensagem, sugestoes, detalhes: errorDetails };
  }

  // Erro técnico genérico
  sugestoes = [
    'Verificar o log completo para mais detalhes',
    'Tentar novamente',
    'Contatar o suporte técnico se o problema persistir',
  ];

  return {
    categoria,
    titulo,
    mensagem,
    codigoErro: errorCode,
    sugestoes,
    detalhes: errorDetails,
  };
}

export function getCategoryLabel(categoria: ErrorCategory): string {
  switch (categoria) {
    case 'validacao':
      return 'Validação';
    case 'negocio':
      return 'Erro de Negócio';
    case 'tecnico':
      return 'Erro Técnico';
    case 'rede':
      return 'Erro de Conexão';
    default:
      return 'Erro';
  }
}

export function getCategoryColor(categoria: ErrorCategory): string {
  switch (categoria) {
    case 'validacao':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    case 'negocio':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'tecnico':
      return 'bg-muted text-muted-foreground border-border';
    case 'rede':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    default:
      return 'bg-destructive/10 text-destructive border-destructive/20';
  }
}
