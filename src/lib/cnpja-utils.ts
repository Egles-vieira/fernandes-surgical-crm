// ============================================
// UTILIDADES PARA SISTEMA CNPJA
// ============================================

/**
 * Remove caracteres não numéricos de um CNPJ
 */
export function limparCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata CNPJ com máscara XX.XXX.XXX/XXXX-XX
 */
export function formatarCNPJ(cnpj: string): string {
  const limpo = limparCNPJ(cnpj);
  
  if (limpo.length !== 14) {
    return cnpj;
  }
  
  return limpo.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Valida CNPJ usando algoritmo de dígitos verificadores
 */
export function validarCNPJ(cnpj: string): boolean {
  const limpo = limparCNPJ(cnpj);
  
  if (limpo.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(limpo)) {
    return false;
  }
  
  // Valida dígitos verificadores
  let tamanho = limpo.length - 2;
  let numeros = limpo.substring(0, tamanho);
  const digitos = limpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  
  if (resultado !== parseInt(digitos.charAt(0))) {
    return false;
  }
  
  tamanho = tamanho + 1;
  numeros = limpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  
  return resultado === parseInt(digitos.charAt(1));
}

/**
 * Formata CEP com máscara XXXXX-XXX
 */
export function formatarCEP(cep: string): string {
  const limpo = cep.replace(/\D/g, '');
  
  if (limpo.length !== 8) {
    return cep;
  }
  
  return limpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/**
 * Formata telefone com DDD
 */
export function formatarTelefone(ddd: string, numero: string): string {
  const numeroLimpo = numero.replace(/\D/g, '');
  
  if (numeroLimpo.length === 9) {
    return `(${ddd}) ${numeroLimpo.substring(0, 5)}-${numeroLimpo.substring(5)}`;
  } else if (numeroLimpo.length === 8) {
    return `(${ddd}) ${numeroLimpo.substring(0, 4)}-${numeroLimpo.substring(4)}`;
  }
  
  return `(${ddd}) ${numero}`;
}

/**
 * Extrai números de um texto (útil para códigos, etc)
 */
export function extrairNumeros(texto: string): string[] {
  const regex = /\d+/g;
  return texto.match(regex) || [];
}

/**
 * Calcula a porcentagem de um valor
 */
export function calcularPorcentagem(parte: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((parte / total) * 100);
}

/**
 * Formata valor monetário em BRL
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata capital social com precisão
 */
export function formatarCapitalSocial(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

/**
 * Formata código CNAE com máscara
 */
export function formatarCNAE(id: number): string {
  const codigo = id.toString().padStart(7, '0');
  return `${codigo.slice(0, 4)}-${codigo.slice(4, 5)}/${codigo.slice(5, 7)}`;
}

/**
 * Formata data no formato brasileiro
 */
export function formatarData(data: string | Date): string {
  if (!data) return '-';
  
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  
  return new Intl.DateTimeFormat('pt-BR').format(dataObj);
}

/**
 * Calcula tempo decorrido em formato legível
 */
export function formatarTempoDecorrido(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    return `${minutos}min ${segundos}s`;
  }
}

/**
 * Gera cor baseada em um texto (para badges, avatars, etc)
 */
export function gerarCorDeTexto(texto: string): string {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Trunca texto com reticências
 */
export function truncarTexto(texto: string, maxLength: number): string {
  if (texto.length <= maxLength) {
    return texto;
  }
  
  return texto.substring(0, maxLength - 3) + '...';
}

/**
 * Determina o porte da empresa baseado no porte retornado pela API
 */
export function obterPorteEmpresa(porte?: string): string {
  const portes: Record<string, string> = {
    '00': 'Não informado',
    '01': 'Microempresa',
    '03': 'Empresa de Pequeno Porte',
    '05': 'Demais',
  };
  
  return porte ? portes[porte] || porte : 'Não informado';
}

/**
 * Determina a situação cadastral da empresa
 */
export function obterSituacaoCadastral(codigo?: number): {
  texto: string;
  cor: 'success' | 'warning' | 'destructive';
} {
  switch (codigo) {
    case 2:
      return { texto: 'Ativa', cor: 'success' };
    case 3:
      return { texto: 'Suspensa', cor: 'warning' };
    case 4:
      return { texto: 'Inapta', cor: 'destructive' };
    case 8:
      return { texto: 'Baixada', cor: 'destructive' };
    default:
      return { texto: 'Desconhecida', cor: 'warning' };
  }
}
