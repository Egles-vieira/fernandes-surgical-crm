// ============================================
// TIPOS PARA SISTEMA INTELIGENTE DE CADASTRO VIA CNPJ
// ============================================

export interface DadosOffice {
  taxId: string;
  name: string;
  alias?: string;
  founded?: string;
  head: boolean;
  statusDate?: string;
  status?: {
    id: number;
    text: string;
  };
  address?: {
    zip?: string;
    street?: string;
    number?: string;
    details?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: {
      id: string;
      name: string;
    };
    municipality?: number;
  };
  phones?: Array<{
    area: string;
    number: string;
  }>;
  emails?: Array<{
    address: string;
    domain: string;
  }>;
  company?: {
    id: string;
    name: string;
  };
}

export interface DadosEndereco {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
}

export interface DadosFilial {
  taxId: string;
  alias?: string;
  name: string;
  status?: {
    id: number;
    text: string;
  };
  address?: {
    city: string;
    state: string;
  };
}

export interface DadosSimples {
  simples?: {
    optant: boolean;
    included?: string;
    excluded?: string;
  };
  simplesNacional?: {
    optante: boolean;
    dataOpcao?: string;
    dataExclusao?: string;
  };
  mei?: {
    optant: boolean;
  };
}

export interface DadosIE {
  taxId: string;
  stateRegistration?: string;
  status?: string;
  situation?: string;
}

export interface DadosSuframa {
  taxId: string;
  registration?: string;
  status?: string;
  situation?: string;
}

export interface Decisao {
  decisao: boolean;
  motivo: string;
  custoCreditos?: number;
  tipoConsulta?: 'sintegra' | 'ccc' | null;
}

export interface Decisoes {
  validarEndereco: Decisao;
  buscarFiliais: Decisao;
  verificarSimples: Decisao;
  validarIE: Decisao & { tipoConsulta: 'sintegra' | 'ccc' | null };
  consultarSuframa: Decisao;
  gerarComprovantes: {
    cnpj: Omit<Decisao, 'custoCreditos'>;
    suframa: Omit<Decisao, 'custoCreditos'>;
  };
}

export interface ContextoConsulta {
  tipoCliente?: 'lead' | 'comum' | 'estrategico';
  valorContrato?: number;
  emiteNF?: boolean;
  exigeCompliance?: boolean;
  trabalhaComICMS?: boolean;
  operacoesInterestaduais?: boolean;
  sempreValidarCEP?: boolean;
}

export interface DadosConsolidados {
  office: DadosOffice;
  endereco?: DadosEndereco | null;
  filiais?: DadosFilial[] | null;
  simples?: DadosSimples | null;
  ie?: DadosIE | null;
  suframa?: DadosSuframa | null;
}

export interface ResultadoConsulta {
  sucesso: boolean;
  clienteId?: string;
  dados: DadosConsolidados;
  decisoes: Decisoes;
  metricas: {
    custoTotal: number;
    tempoTotal: number;
    consultasExecutadas: number;
    taxaSucesso: number;
  };
  logs: LogConsulta[];
}

export interface LogConsulta {
  tipo: string;
  sucesso: boolean;
  tempo?: number;
  erro?: string;
  custoCreditos?: number;
}

export interface ConfiguracoesCNPJA {
  id?: string;
  user_id: string;
  sempre_validar_cep: boolean;
  trabalha_com_icms: boolean;
  operacoes_interestaduais: boolean;
  emite_nf: boolean;
  gerar_comprovantes_automaticamente: boolean;
  tempo_cache_office_dias: number;
  tempo_cache_company_dias: number;
  tempo_cache_simples_dias: number;
  tempo_cache_sintegra_dias: number;
  tempo_cache_suframa_dias: number;
  limite_consultas_simultaneas: number;
  configs_extras?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export type StatusConsulta = 
  | 'idle' 
  | 'validando' 
  | 'consultando' 
  | 'decidindo' 
  | 'executando' 
  | 'consolidando' 
  | 'concluido' 
  | 'erro';
