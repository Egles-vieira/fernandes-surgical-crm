import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  StatusConsulta,
  ContextoConsulta,
  ResultadoConsulta,
  Decisoes,
  DadosConsolidados,
  DadosOffice,
} from "@/types/cnpja";
import { validarCNPJ, limparCNPJ } from "@/lib/cnpja-utils";

export function useCNPJA() {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusConsulta>('idle');
  const [progresso, setProgresso] = useState(0);
  const [decisoes, setDecisoes] = useState<Decisoes | null>(null);
  const [dadosColetados, setDadosColetados] = useState<DadosConsolidados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const consultarCNPJ = async (
    cnpj: string,
    contexto?: ContextoConsulta
  ): Promise<ResultadoConsulta | null> => {
    const startTime = Date.now();
    
    try {
      // 1. VALIDAR CNPJ
      setStatus('validando');
      setProgresso(10);
      setErro(null);
      
      if (!validarCNPJ(cnpj)) {
        throw new Error("CNPJ inválido");
      }

      const cnpjLimpo = limparCNPJ(cnpj);
      console.log(`Iniciando consulta para CNPJ: ${cnpjLimpo}`);

      // 2. CONSULTAR /office (base obrigatória)
      setStatus('consultando');
      setProgresso(25);
      
      const { data: officeData, error: officeError } = await supabase.functions.invoke(
        'cnpja-consultar-office',
        {
          body: { cnpj: cnpjLimpo, useCache: true },
        }
      );

      if (officeError) {
        throw new Error(`Erro ao consultar dados base: ${officeError.message}`);
      }

      if (!officeData.success) {
        throw new Error(officeData.error || "Erro ao consultar CNPJ");
      }

      const dadosOffice: DadosOffice = officeData.data;
      console.log("Dados /office obtidos:", {
        nome: dadosOffice.name,
        cnpj: dadosOffice.taxId,
        cidade: dadosOffice.address?.city,
        estado: dadosOffice.address?.state
      });

      // 3. ANÁLISE INTELIGENTE (decisões)
      setStatus('decidindo');
      setProgresso(45);
      
      const { data: decisoesData, error: decisoesError } = await supabase.functions.invoke(
        'cnpja-decisoes-inteligentes',
        {
          body: { 
            dadosOffice, 
            contexto: contexto || {},
          },
        }
      );

      if (decisoesError) {
        throw new Error(`Erro ao processar decisões: ${decisoesError.message}`);
      }

      if (!decisoesData.success) {
        throw new Error(decisoesData.error || "Erro ao processar decisões");
      }

      const decisoesTomadas: Decisoes = decisoesData.decisoes;
      setDecisoes(decisoesTomadas);
      
      console.log("Decisões tomadas:", decisoesTomadas);
      console.log("Custo estimado:", decisoesData.resumo.custoTotalCreditos, "créditos");

      // 4. EXECUTAR CONSULTAS COMPLEMENTARES
      setStatus('executando');
      setProgresso(65);

      const { data: consultasData, error: consultasError } = await supabase.functions.invoke(
        'cnpja-executar-consultas',
        {
          body: {
            cnpj: cnpjLimpo,
            decisoes: decisoesTomadas,
            dadosOffice,
          },
        }
      );

      if (consultasError) {
        console.error("Erro ao executar consultas complementares:", consultasError);
        // Não falhar completamente, continuar com dados parciais
      }

      // 5. CONSOLIDAR DADOS
      setStatus('consolidando');
      setProgresso(85);

      // Garantir que suframa seja sempre array
      let suframaArray = null;
      if (consultasData?.resultados?.suframa) {
        const suframaData = consultasData.resultados.suframa;
        suframaArray = Array.isArray(suframaData) ? suframaData : [suframaData];
      }

      const dadosFinais: DadosConsolidados = {
        office: dadosOffice,
        endereco: consultasData?.resultados?.endereco || null,
        filiais: consultasData?.resultados?.filiais || null,
        simples: consultasData?.resultados?.simples || null,
        ie: consultasData?.resultados?.ie || null,
        suframa: suframaArray,
      };

      console.log("Dados consolidados:", {
        temOffice: !!dadosFinais.office,
        temEndereco: !!dadosFinais.endereco,
        temSuframa: !!dadosFinais.suframa,
        suframaLength: dadosFinais.suframa?.length || 0
      });

      setDadosColetados(dadosFinais);

      // 6. CALCULAR MÉTRICAS
      const totalTime = Date.now() - startTime;
      const logs = consultasData?.logs || [];
      const consultasSucesso = logs.filter((l: any) => l.sucesso).length;
      const taxaSucesso = logs.length > 0 
        ? Math.round((consultasSucesso / logs.length) * 100) 
        : 100;

      const resultado: ResultadoConsulta = {
        sucesso: true,
        dados: dadosFinais,
        decisoes: decisoesTomadas,
        metricas: {
          custoTotal: decisoesData.resumo.custoTotalCreditos,
          tempoTotal: totalTime,
          consultasExecutadas: decisoesData.resumo.consultasExecutadas,
          taxaSucesso,
        },
        logs,
      };

      setStatus('concluido');
      setProgresso(100);

      toast({
        title: "Consulta concluída!",
        description: `Dados coletados com sucesso em ${(totalTime / 1000).toFixed(1)}s`,
      });

      return resultado;

    } catch (error: any) {
      console.error("Erro ao consultar CNPJ:", error);
      setStatus('erro');
      setErro(error.message);
      
      toast({
        title: "Erro na consulta",
        description: error.message,
        variant: "destructive",
      });

      return null;
    }
  };

  const resetar = () => {
    setStatus('idle');
    setProgresso(0);
    setDecisoes(null);
    setDadosColetados(null);
    setErro(null);
  };

  return {
    consultarCNPJ,
    resetar,
    status,
    progresso,
    decisoes,
    dadosColetados,
    erro,
  };
}
