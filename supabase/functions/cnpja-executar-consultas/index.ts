import { corsHeaders } from "../_shared/cors.ts";

console.log("CNPJA Executar Consultas - Starting");

interface Decisoes {
  validarEndereco: { decisao: boolean };
  buscarFiliais: { decisao: boolean };
  verificarSimples: { decisao: boolean };
  validarIE: { decisao: boolean; tipoConsulta: 'sintegra' | 'ccc' | null };
  consultarSuframa: { decisao: boolean };
}

interface CacheConfig {
  strategy: string;
  maxAge: number;
  maxStale: number;
  sync: boolean;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  simples: { strategy: 'CACHE_IF_ERROR', maxAge: 30, maxStale: 365, sync: true },
  suframa: { strategy: 'CACHE_IF_ERROR', maxAge: 60, maxStale: 365, sync: true },
  sintegra: { strategy: 'CACHE_IF_ERROR', maxAge: 30, maxStale: 365, sync: true },
  ccc: { strategy: 'CACHE_IF_ERROR', maxAge: 30, maxStale: 365, sync: true },
};

function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.append(key, String(value));
    }
  });
  return query.toString();
}

function getCostFromHeaders(headers: Headers): number {
  const cost = headers.get('cnpja-request-cost');
  return cost ? parseFloat(cost) : 0;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj, decisoes, dadosOffice } = await req.json() as {
      cnpj: string;
      decisoes: Decisoes;
      dadosOffice: any;
    };

    if (!cnpj || !decisoes) {
      return new Response(
        JSON.stringify({ error: "CNPJ e decisões são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CNPJA_API_KEY = Deno.env.get("CNPJA_API_KEY");
    if (!CNPJA_API_KEY) {
      throw new Error("CNPJA_API_KEY não configurada");
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    console.log(`Executando consultas complementares para CNPJ: ${cnpjLimpo}`);

    const resultados: any = {
      office: dadosOffice,
      endereco: null,
      filiais: null,
      simples: null,
      ie: null,
      suframa: null,
    };

    const logs: any[] = [];
    const custoTotal = { valor: 0 };
    const startTime = Date.now();

    // Executar consultas em sequência (respeitando rate limit)
    
    // 1. Validar Endereço (se decidido) - ViaCEP é gratuito
    if (decisoes.validarEndereco.decisao && dadosOffice?.address?.zip) {
      const cep = dadosOffice.address.zip.replace(/\D/g, '');
      try {
        console.log(`Consultando CEP: ${cep}`);
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (response.ok) {
          resultados.endereco = await response.json();
          logs.push({ 
            tipo: 'endereco', 
            sucesso: true, 
            tempo: Date.now() - startTime,
            custoCreditos: 0,
            fonte: 'viacep'
          });
        }
      } catch (error) {
        console.error("Erro ao consultar CEP:", error);
        logs.push({ tipo: 'endereco', sucesso: false, erro: error instanceof Error ? error.message : String(error) });
      }
    }

    // 2. Buscar Filiais (se decidido) - Pode usar /company para ter filiais + sócios
    if (decisoes.buscarFiliais.decisao) {
      try {
        console.log("Buscando dados completos da empresa (company)...");
        const cacheParams = buildQueryString({
          strategy: 'CACHE_IF_ERROR',
          maxAge: 45,
          maxStale: 365,
          sync: true
        });
        
        const response = await fetch(
          `https://api.cnpja.com/company/${cnpjLimpo}?${cacheParams}`,
          { headers: { "Authorization": CNPJA_API_KEY } }
        );
        
        if (response.ok) {
          const data = await response.json();
          const custo = getCostFromHeaders(response.headers);
          custoTotal.valor += custo;
          
          resultados.filiais = data.offices || [];
          resultados.socios = data.members || [];
          
          logs.push({ 
            tipo: 'company', 
            sucesso: true, 
            tempo: Date.now() - startTime,
            custoCreditos: custo,
            totalFiliais: resultados.filiais.length,
            totalSocios: resultados.socios.length
          });
        }
        await delay(100); // Rate limit protection
      } catch (error) {
        console.error("Erro ao buscar company:", error);
        logs.push({ tipo: 'company', sucesso: false, erro: error instanceof Error ? error.message : String(error) });
      }
    }

    // 3. Verificar Simples Nacional (se decidido) - ENDPOINT CORRIGIDO
    if (decisoes.verificarSimples.decisao) {
      try {
        console.log("Verificando Simples Nacional...");
        const config = CACHE_CONFIGS.simples;
        const cacheParams = buildQueryString({
          strategy: config.strategy,
          maxAge: config.maxAge,
          maxStale: config.maxStale,
          sync: config.sync
        });
        
        const response = await fetch(
          `https://api.cnpja.com/simples?taxId=${cnpjLimpo}&${cacheParams}`,
          { headers: { "Authorization": CNPJA_API_KEY } }
        );
        
        if (response.ok) {
          resultados.simples = await response.json();
          const custo = getCostFromHeaders(response.headers);
          custoTotal.valor += custo;
          
          logs.push({ 
            tipo: 'simples', 
            sucesso: true, 
            tempo: Date.now() - startTime,
            custoCreditos: custo,
            optanteSimples: resultados.simples?.simples?.optant || false
          });
        }
        await delay(100);
      } catch (error) {
        console.error("Erro ao verificar Simples:", error);
        logs.push({ tipo: 'simples', sucesso: false, erro: error instanceof Error ? error.message : String(error) });
      }
    }

    // 4. Validar IE (se decidido) - ENDPOINT CORRIGIDO
    if (decisoes.validarIE.decisao && decisoes.validarIE.tipoConsulta) {
      const estado = dadosOffice?.address?.state;
      if (estado) {
        try {
          console.log(`Validando IE via ${decisoes.validarIE.tipoConsulta}...`);
          const tipoConsulta = decisoes.validarIE.tipoConsulta;
          const config = CACHE_CONFIGS[tipoConsulta];
          const cacheParams = buildQueryString({
            strategy: config.strategy,
            maxAge: config.maxAge,
            maxStale: config.maxStale,
            sync: config.sync
          });
          
          // Endpoints corrigidos conforme API reference
          const endpoint = tipoConsulta === 'sintegra'
            ? `https://api.cnpja.com/sintegra?state=${estado}&taxId=${cnpjLimpo}&${cacheParams}`
            : `https://api.cnpja.com/ccc?taxId=${cnpjLimpo}&${cacheParams}`;
          
          const response = await fetch(endpoint, {
            headers: { "Authorization": CNPJA_API_KEY }
          });
          
          if (response.ok) {
            resultados.ie = await response.json();
            const custo = getCostFromHeaders(response.headers);
            custoTotal.valor += custo;
            
            logs.push({ 
              tipo: 'ie', 
              sucesso: true, 
              tempo: Date.now() - startTime,
              custoCreditos: custo,
              tipoConsulta: tipoConsulta,
              estado: estado
            });
          }
          await delay(100);
        } catch (error) {
          console.error("Erro ao validar IE:", error);
          logs.push({ tipo: 'ie', sucesso: false, erro: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    // 5. Consultar Suframa (se decidido) - ENDPOINT CORRIGIDO
    if (decisoes.consultarSuframa.decisao) {
      try {
        console.log("Consultando Suframa...");
        const config = CACHE_CONFIGS.suframa;
        const cacheParams = buildQueryString({
          strategy: config.strategy,
          maxAge: config.maxAge,
          maxStale: config.maxStale,
          sync: config.sync
        });
        
        const response = await fetch(
          `https://api.cnpja.com/suframa?taxId=${cnpjLimpo}&${cacheParams}`,
          { headers: { "Authorization": CNPJA_API_KEY } }
        );
        
        if (response.ok) {
          resultados.suframa = await response.json();
          const custo = getCostFromHeaders(response.headers);
          custoTotal.valor += custo;
          
          logs.push({ 
            tipo: 'suframa', 
            sucesso: true, 
            tempo: Date.now() - startTime,
            custoCreditos: custo,
            inscricaoSuframa: resultados.suframa?.registration || null
          });
        }
        await delay(100);
      } catch (error) {
        console.error("Erro ao consultar Suframa:", error);
        logs.push({ tipo: 'suframa', sucesso: false, erro: error instanceof Error ? error.message : String(error) });
      }
    }

    const totalTime = Date.now() - startTime;
    const consultasSucesso = logs.filter(l => l.sucesso).length;
    console.log(`Consultas concluídas em ${totalTime}ms - ${consultasSucesso}/${logs.length} sucesso - Custo total: ${custoTotal.valor}₪`);

    return new Response(
      JSON.stringify({
        success: true,
        resultados,
        logs,
        metadata: {
          totalTime,
          consultasExecutadas: logs.length,
          consultasSucesso,
          custoTotalCreditos: custoTotal.valor,
          custoDetalhado: logs
            .filter(l => l.custoCreditos !== undefined)
            .map(l => ({ tipo: l.tipo, custo: l.custoCreditos }))
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro ao executar consultas:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        details: "Erro interno ao executar consultas",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
