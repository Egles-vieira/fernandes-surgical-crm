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
  updated?: string;
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
    latitude?: number;      // Coordenadas geográficas
    longitude?: number;     // Coordenadas geográficas
  };
  phones?: Array<{
    type?: string;
    area: string;
    number: string;
  }>;
  emails?: Array<{
    ownership?: string;
    address: string;
    domain: string;
  }>;
  mainActivity?: {
    id: number;
    text: string;
  };
  sideActivities?: Array<{
    id: number;
    text: string;
  }>;
  registrations?: Array<{
    number: string;
    state: string;
    enabled: boolean;
    statusDate?: string;
    status?: {
      id: number;
      text: string;
    };
    type?: {
      id: number;
      text: string;
    };
  }>;
  company?: {
    id: string;
    name: string;
    equity?: number;
    nature?: {
      id: number;
      text: string;
    };
    size?: {
      id: number;
      acronym: string;
      text: string;
    };
    members?: Array<{
      since: string;
      role: {
        id: number;
        text: string;
      };
      person: {
        id: string;
        name: string;
        type: string;
        taxId: string;
        age?: string;
      };
    }>;
    simei?: {
      optant: boolean;
      since?: string;
    };
    simples?: {
      optant: boolean;
      since?: string;
    };
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

export interface IncentivoCNPJ {
  tribute: string;       // IPI, ICMS, PIS, COFINS, etc.
  benefit: string;       // Isenção, Redução, etc.
  purpose: string;       // Finalidade do incentivo
  basis: string;         // Base legal
}

export interface DadosSuframa {
  number: string;                    // Inscrição Suframa
  since: string;                     // Data de cadastro
  approved: boolean;                 // Se está aprovada
  approvalDate: string | null;       // Data de aprovação
  status: {
    id: number;
    text: string;
  };
  incentives: IncentivoCNPJ[];       // Array de incentivos fiscais
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
  socios?: any[] | null;
  simples?: DadosSimples | null;
  ie?: DadosIE | null;
  suframa?: DadosSuframa[] | null;  // Array de registros Suframa
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
