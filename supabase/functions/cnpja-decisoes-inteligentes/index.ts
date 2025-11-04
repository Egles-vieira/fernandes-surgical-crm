import { corsHeaders } from "../_shared/cors.ts";

console.log("CNPJA Decisões Inteligentes - Starting");

interface DadosOffice {
  taxId: string;
  name: string;
  alias?: string;
  founded?: string;
  head: boolean;
  statusDate?: string;
  status?: { id: number; text: string };
  address?: {
    zip?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    details?: string;
    municipality?: number;
  };
  phones?: Array<{ area: string; number: string }>;
  emails?: Array<{ address: string; domain: string }>;
}

interface ContextoConsulta {
  tipoCliente?: 'lead' | 'comum' | 'estrategico';
  valorContrato?: number;
  emiteNF?: boolean;
  exigeCompliance?: boolean;
  trabalhaComICMS?: boolean;
  operacoesInterestaduais?: boolean;
  sempreValidarCEP?: boolean;
}

interface Decisoes {
  validarEndereco: { decisao: boolean; motivo: string; custoCreditos: number };
  buscarFiliais: { decisao: boolean; motivo: string; custoCreditos: number };
  verificarSimples: { decisao: boolean; motivo: string; custoCreditos: number };
  validarIE: { decisao: boolean; motivo: string; tipoConsulta: 'sintegra' | 'ccc' | null; custoCreditos: number };
  consultarSuframa: { decisao: boolean; motivo: string; custoCreditos: number };
  gerarComprovantes: {
    cnpj: { decisao: boolean; motivo: string };
    suframa: { decisao: boolean; motivo: string };
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dadosOffice, contexto = {} } = await req.json() as {
      dadosOffice: DadosOffice;
      contexto: ContextoConsulta;
    };

    if (!dadosOffice) {
      return new Response(
        JSON.stringify({ error: "Dados do /office são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analisando decisões para: ${dadosOffice.name}`);

    const decisoes: Decisoes = {
      validarEndereco: analisarValidacaoEndereco(dadosOffice, contexto),
      buscarFiliais: analisarBuscaFiliais(dadosOffice, contexto),
      verificarSimples: analisarVerificacaoSimples(dadosOffice, contexto),
      validarIE: analisarValidacaoIE(dadosOffice, contexto),
      consultarSuframa: analisarConsultaSuframa(dadosOffice, contexto),
      gerarComprovantes: analisarGeracaoComprovantes(dadosOffice, contexto),
    };

    const custoTotal = calcularCustoTotal(decisoes);
    const consultasExecutadas = contarConsultasExecutadas(decisoes);

    console.log(`Decisões tomadas: ${consultasExecutadas} consultas, custo estimado: ${custoTotal} créditos`);

    return new Response(
      JSON.stringify({
        success: true,
        decisoes,
        resumo: {
          consultasExecutadas,
          custoTotalCreditos: custoTotal,
          economia: `${Math.round((1 - custoTotal / 12) * 100)}%`,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro ao processar decisões:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Erro interno ao processar decisões",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// DECISÃO 1: Validar Endereço via CEP
function analisarValidacaoEndereco(dados: DadosOffice, contexto: ContextoConsulta) {
  const cep = dados.address?.zip;
  const sempreValidar = contexto.sempreValidarCEP ?? true;

  if (!cep) {
    return {
      decisao: false,
      motivo: "CEP não disponível nos dados base",
      custoCreditos: 0,
    };
  }

  if (sempreValidar) {
    return {
      decisao: true,
      motivo: "Validação automática configurada para todos os cadastros",
      custoCreditos: 0,
    };
  }

  return {
    decisao: true,
    motivo: "Validação recomendada para garantir precisão do endereço",
    custoCreditos: 0,
  };
}

// DECISÃO 2: Buscar Filiais
function analisarBuscaFiliais(dados: DadosOffice, contexto: ContextoConsulta) {
  const ehMatriz = dados.head === true;
  const valorAlto = (contexto.valorContrato ?? 0) > 50000;
  const clienteEstrategico = contexto.tipoCliente === 'estrategico';

  if (!ehMatriz) {
    return {
      decisao: false,
      motivo: "Empresa não é matriz, não possui filiais",
      custoCreditos: 0,
    };
  }

  if (valorAlto || clienteEstrategico) {
    return {
      decisao: true,
      motivo: "Cliente de alto valor ou estratégico - importante mapear todas as unidades",
      custoCreditos: 1,
    };
  }

  return {
    decisao: false,
    motivo: "Cliente comum e matriz - busca de filiais opcional",
    custoCreditos: 0,
  };
}

// DECISÃO 3: Verificar Simples Nacional
function analisarVerificacaoSimples(dados: DadosOffice, contexto: ContextoConsulta) {
  const emiteNF = contexto.emiteNF ?? true;
  const exigeCompliance = contexto.exigeCompliance ?? false;

  if (emiteNF || exigeCompliance) {
    return {
      decisao: true,
      motivo: emiteNF 
        ? "Empresa emite NF - verificar regime tributário é essencial"
        : "Compliance exigido - verificar situação fiscal",
      custoCreditos: 1,
    };
  }

  return {
    decisao: false,
    motivo: "Não emite NF e não requer compliance - verificação opcional",
    custoCreditos: 0,
  };
}

// DECISÃO 4: Validar Inscrição Estadual
function analisarValidacaoIE(dados: DadosOffice, contexto: ContextoConsulta) {
  const trabalhaComICMS = contexto.trabalhaComICMS ?? true;
  const operacoesInterestaduais = contexto.operacoesInterestaduais ?? true;
  const estado = dados.address?.state;

  if (!trabalhaComICMS) {
    return {
      decisao: false,
      motivo: "Empresa não trabalha com ICMS",
      tipoConsulta: null,
      custoCreditos: 0,
    };
  }

  if (!estado) {
    return {
      decisao: false,
      motivo: "Estado não identificado nos dados base",
      tipoConsulta: null,
      custoCreditos: 0,
    };
  }

  // Estados com Sintegra gratuito: SP, RJ, MG, RS, PR, SC, BA, PE, CE
  const estadosComSintegraGratuito = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE'];
  
  if (operacoesInterestaduais) {
    if (estadosComSintegraGratuito.includes(estado)) {
      return {
        decisao: true,
        motivo: `Operações interestaduais - validação via Sintegra (gratuito para ${estado})`,
        tipoConsulta: 'sintegra' as const,
        custoCreditos: 0,
      };
    } else {
      return {
        decisao: true,
        motivo: `Operações interestaduais - validação via CCC (${estado} não tem Sintegra gratuito)`,
        tipoConsulta: 'ccc' as const,
        custoCreditos: 2,
      };
    }
  }

  return {
    decisao: false,
    motivo: "Apenas operações locais - validação IE opcional",
    tipoConsulta: null,
    custoCreditos: 0,
  };
}

// DECISÃO 5: Consultar Suframa
function analisarConsultaSuframa(dados: DadosOffice, contexto: ContextoConsulta) {
  const estadosZonaFranca = ['AM', 'RR', 'RO', 'AC'];
  const estado = dados.address?.state;
  const emiteNF = contexto.emiteNF ?? true;

  if (!estado) {
    return {
      decisao: false,
      motivo: "Estado não identificado",
      custoCreditos: 0,
    };
  }

  if (estadosZonaFranca.includes(estado) && emiteNF) {
    return {
      decisao: true,
      motivo: `Empresa localizada em ${estado} (Zona Franca) e emite NF - inscrição Suframa relevante`,
      custoCreditos: 2,
    };
  }

  return {
    decisao: false,
    motivo: "Empresa fora da Zona Franca ou não emite NF",
    custoCreditos: 0,
  };
}

// DECISÃO 6: Gerar Comprovantes
function analisarGeracaoComprovantes(dados: DadosOffice, contexto: ContextoConsulta) {
  const gerarAutomatico = contexto.exigeCompliance ?? false;

  return {
    cnpj: {
      decisao: gerarAutomatico,
      motivo: gerarAutomatico 
        ? "Compliance ativo - gerar comprovante automaticamente"
        : "Comprovante pode ser gerado sob demanda",
    },
    suframa: {
      decisao: false,
      motivo: "Comprovante Suframa gerado apenas se consulta for executada",
    },
  };
}

function calcularCustoTotal(decisoes: Decisoes): number {
  let total = 0;
  
  if (decisoes.validarEndereco.decisao) total += decisoes.validarEndereco.custoCreditos;
  if (decisoes.buscarFiliais.decisao) total += decisoes.buscarFiliais.custoCreditos;
  if (decisoes.verificarSimples.decisao) total += decisoes.verificarSimples.custoCreditos;
  if (decisoes.validarIE.decisao) total += decisoes.validarIE.custoCreditos;
  if (decisoes.consultarSuframa.decisao) total += decisoes.consultarSuframa.custoCreditos;
  
  return total;
}

function contarConsultasExecutadas(decisoes: Decisoes): number {
  let count = 1; // /office sempre é executado
  
  if (decisoes.validarEndereco.decisao) count++;
  if (decisoes.buscarFiliais.decisao) count++;
  if (decisoes.verificarSimples.decisao) count++;
  if (decisoes.validarIE.decisao) count++;
  if (decisoes.consultarSuframa.decisao) count++;
  
  return count;
}
