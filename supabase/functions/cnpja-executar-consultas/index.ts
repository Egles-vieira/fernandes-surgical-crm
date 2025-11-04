import { corsHeaders } from "../_shared/cors.ts";

console.log("CNPJA Executar Consultas - Starting");

interface Decisoes {
  validarEndereco: { decisao: boolean };
  buscarFiliais: { decisao: boolean };
  verificarSimples: { decisao: boolean };
  validarIE: { decisao: boolean; tipoConsulta: 'sintegra' | 'ccc' | null };
  consultarSuframa: { decisao: boolean };
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
    const startTime = Date.now();

    // Executar consultas em sequência (respeitando rate limit)
    
    // 1. Validar Endereço (se decidido)
    if (decisoes.validarEndereco.decisao && dadosOffice?.address?.zip) {
      const cep = dadosOffice.address.zip.replace(/\D/g, '');
      try {
        console.log(`Consultando CEP: ${cep}`);
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (response.ok) {
          resultados.endereco = await response.json();
          logs.push({ tipo: 'endereco', sucesso: true, tempo: Date.now() - startTime });
        }
      } catch (error) {
        console.error("Erro ao consultar CEP:", error);
        logs.push({ tipo: 'endereco', sucesso: false, erro: error.message });
      }
    }

    // 2. Buscar Filiais (se decidido)
    if (decisoes.buscarFiliais.decisao) {
      try {
        console.log("Buscando filiais...");
        const response = await fetch(
          `https://api.cnpja.com/office/${cnpjLimpo}/branches`,
          { headers: { "Authorization": CNPJA_API_KEY } }
        );
        if (response.ok) {
          resultados.filiais = await response.json();
          logs.push({ tipo: 'filiais', sucesso: true, tempo: Date.now() - startTime });
        }
        await delay(100); // Rate limit protection
      } catch (error) {
        console.error("Erro ao buscar filiais:", error);
        logs.push({ tipo: 'filiais', sucesso: false, erro: error.message });
      }
    }

    // 3. Verificar Simples Nacional (se decidido)
    if (decisoes.verificarSimples.decisao) {
      try {
        console.log("Verificando Simples Nacional...");
        const response = await fetch(
          `https://api.cnpja.com/office/${cnpjLimpo}/simples`,
          { headers: { "Authorization": CNPJA_API_KEY } }
        );
        if (response.ok) {
          resultados.simples = await response.json();
          logs.push({ tipo: 'simples', sucesso: true, tempo: Date.now() - startTime });
        }
        await delay(100);
      } catch (error) {
        console.error("Erro ao verificar Simples:", error);
        logs.push({ tipo: 'simples', sucesso: false, erro: error.message });
      }
    }

    // 4. Validar IE (se decidido)
    if (decisoes.validarIE.decisao && decisoes.validarIE.tipoConsulta) {
      const estado = dadosOffice?.address?.state;
      if (estado) {
        try {
          console.log(`Validando IE via ${decisoes.validarIE.tipoConsulta}...`);
          const endpoint = decisoes.validarIE.tipoConsulta === 'sintegra'
            ? `sintegra/${estado}/${cnpjLimpo}`
            : `ccc/${cnpjLimpo}`;
          
          const response = await fetch(
            `https://api.cnpja.com/${endpoint}`,
            { headers: { "Authorization": CNPJA_API_KEY } }
          );
          if (response.ok) {
            resultados.ie = await response.json();
            logs.push({ tipo: 'ie', sucesso: true, tempo: Date.now() - startTime });
          }
          await delay(100);
        } catch (error) {
          console.error("Erro ao validar IE:", error);
          logs.push({ tipo: 'ie', sucesso: false, erro: error.message });
        }
      }
    }

    // 5. Consultar Suframa (se decidido)
    if (decisoes.consultarSuframa.decisao) {
      try {
        console.log("Consultando Suframa...");
        const response = await fetch(
          `https://api.cnpja.com/office/${cnpjLimpo}/suframa`,
          { headers: { "Authorization": CNPJA_API_KEY } }
        );
        if (response.ok) {
          resultados.suframa = await response.json();
          logs.push({ tipo: 'suframa', sucesso: true, tempo: Date.now() - startTime });
        }
        await delay(100);
      } catch (error) {
        console.error("Erro ao consultar Suframa:", error);
        logs.push({ tipo: 'suframa', sucesso: false, erro: error.message });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`Consultas concluídas em ${totalTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        resultados,
        logs,
        metadata: {
          totalTime,
          consultasExecutadas: logs.length,
          consultasSucesso: logs.filter(l => l.sucesso).length,
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
        error: error.message,
        details: "Erro interno ao executar consultas",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
