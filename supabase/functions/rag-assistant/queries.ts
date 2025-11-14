import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { IntencaoClassificada } from "./classifier.ts";

export interface DadosContexto {
  tipo: string;
  dados: any[];
  resumo: string;
  metadados?: Record<string, any>;
}

export async function executarQueries(
  intencao: IntencaoClassificada,
  contextoUrl: any,
  supabase: SupabaseClient
): Promise<DadosContexto[]> {
  console.log("🔎 Executando queries para tipo:", intencao.tipo);

  const resultados: DadosContexto[] = [];

  try {
    switch (intencao.tipo) {
      case 'clientes':
        resultados.push(...await queriesClientes(intencao, contextoUrl, supabase));
        break;
      case 'vendas':
        resultados.push(...await queriesVendas(intencao, contextoUrl, supabase));
        break;
      case 'tickets':
        resultados.push(...await queriesTickets(intencao, contextoUrl, supabase));
        break;
      case 'equipes':
        resultados.push(...await queriesEquipes(intencao, contextoUrl, supabase));
        break;
      case 'produtos':
        resultados.push(...await queriesProdutos(intencao, contextoUrl, supabase));
        break;
      default:
        // Pergunta geral, sem busca de dados
        break;
    }

    console.log(`✅ ${resultados.length} conjuntos de dados recuperados`);
    return resultados;
  } catch (error) {
    console.error("❌ Erro ao executar queries:", error);
    return [];
  }
}

async function queriesClientes(
  intencao: IntencaoClassificada,
  contextoUrl: any,
  supabase: SupabaseClient
): Promise<DadosContexto[]> {
  const resultados: DadosContexto[] = [];

  // Se está na página de detalhes de um cliente específico
  if (contextoUrl.tipo === 'cliente' && contextoUrl.id) {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', contextoUrl.id)
      .single();

    if (cliente && !error) {
      resultados.push({
        tipo: 'cliente_detalhes',
        dados: [cliente],
        resumo: `Cliente: ${cliente.nome_abrev || cliente.nome_fantasia}`,
        metadados: { cliente_id: cliente.id }
      });

      // Buscar vendas do cliente
      const { data: vendas } = await supabase
        .from('vendas')
        .select('*')
        .eq('cliente_id', contextoUrl.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (vendas && vendas.length > 0) {
        resultados.push({
          tipo: 'vendas_cliente',
          dados: vendas,
          resumo: `${vendas.length} vendas encontradas`,
          metadados: { total: vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0) }
        });
      }

      // Tickets por cliente indisponível nesta base (sem coluna cliente_id).
    }
  } 
  // Busca geral de clientes
  else {
    let query = supabase
      .from('clientes')
      .select('id, nome_abrev, nome_fantasia, cgc, created_at, vendedor_id, equipe_id')
      .order('created_at', { ascending: false })
      .limit(20);

    // Aplicar filtros
    if (intencao.filtros.ativo === false) {
      // Clientes inativos: sem vendas nos últimos 90 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 90);
      
      const { data: clientesComVendas } = await supabase
        .from('vendas')
        .select('cliente_id')
        .gte('created_at', dataLimite.toISOString());

      const idsAtivos = clientesComVendas?.map(v => v.cliente_id).filter(Boolean) || [];
      if (idsAtivos.length > 0) {
        const list = `(${idsAtivos.map((id: string) => `'${id}'`).join(",")})`;
        query = query.not('id', 'in', list);
      }
    }

    if (intencao.entidades.nomes && intencao.entidades.nomes.length > 0) {
      const nome = intencao.entidades.nomes[0];
      query = query.or(`nome_abrev.ilike.%${nome}%,nome_fantasia.ilike.%${nome}%`);
    }

    const { data: clientes, error } = await query;

    if (clientes && !error) {
      resultados.push({
        tipo: 'lista_clientes',
        dados: clientes,
        resumo: `${clientes.length} clientes encontrados`
      });
    }
  }

  return resultados;
}

async function queriesVendas(
  intencao: IntencaoClassificada,
  contextoUrl: any,
  supabase: SupabaseClient
): Promise<DadosContexto[]> {
  const resultados: DadosContexto[] = [];

  // Definir período
  let dataInicio: Date;
  const dataFim = new Date();

  if (intencao.filtros.periodo === 'mes_atual') {
    dataInicio = new Date(dataFim.getFullYear(), dataFim.getMonth(), 1);
  } else if (intencao.filtros.periodo === 'ultimos_30_dias') {
    dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);
  } else {
    dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - 3); // Últimos 3 meses por padrão
  }

  // Vendas do período
  const { data: vendas, error } = await supabase
    .from('vendas')
    .select('*')
    .gte('created_at', dataInicio.toISOString())
    .lte('created_at', dataFim.toISOString())
    .order('created_at', { ascending: false });

  if (vendas && !error) {
    const totalVendas = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
    const vendasGanhas = vendas.filter(v => v.status === 'aprovada' || v.etapa_pipeline === 'ganho');
    const ticketMedio = vendasGanhas.length > 0 ? totalVendas / vendasGanhas.length : 0;

    resultados.push({
      tipo: 'vendas_periodo',
      dados: vendas.slice(0, 20), // Limitar para não sobrecarregar
      resumo: `${vendas.length} vendas no período`,
      metadados: {
        total: totalVendas,
        ganhas: vendasGanhas.length,
        ticket_medio: ticketMedio,
        periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() }
      }
    });

    // Análise por etapa do pipeline
    const porEtapa = vendas.reduce((acc, v) => {
      const etapa = v.etapa_pipeline || 'indefinido';
      acc[etapa] = (acc[etapa] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    resultados.push({
      tipo: 'vendas_por_etapa',
      dados: Object.entries(porEtapa).map(([etapa, count]) => ({ etapa, count })),
      resumo: 'Distribuição por etapa do pipeline'
    });
  }

  return resultados;
}

async function queriesTickets(
  intencao: IntencaoClassificada,
  contextoUrl: any,
  supabase: SupabaseClient
): Promise<DadosContexto[]> {
  const resultados: DadosContexto[] = [];

  let query = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // Filtros
  if (intencao.filtros.status) {
    query = query.in('status', Array.isArray(intencao.filtros.status) ? intencao.filtros.status : [intencao.filtros.status]);
  } else {
    // Por padrão, mostrar apenas tickets abertos/pendentes
    query = query.in('status', ['aberto', 'pendente', 'em_andamento']);
  }

  const { data: tickets, error } = await query;

  if (tickets && !error) {
    resultados.push({
      tipo: 'tickets_lista',
      dados: tickets,
      resumo: `${tickets.length} tickets encontrados`,
      metadados: {
        por_status: tickets.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  }

  return resultados;
}

async function queriesEquipes(
  intencao: IntencaoClassificada,
  contextoUrl: any,
  supabase: SupabaseClient
): Promise<DadosContexto[]> {
  const resultados: DadosContexto[] = [];

  // Buscar equipes e suas metas
  const { data: equipes, error } = await supabase
    .from('equipes')
    .select('*')
    .eq('esta_ativa', true);

  if (equipes && !error) {
    resultados.push({
      tipo: 'equipes_lista',
      dados: equipes,
      resumo: `${equipes.length} equipes ativas`
    });

    // Buscar performance via view
    const { data: performance } = await supabase
      .from('vw_performance_vendedor')
      .select('*')
      .limit(20);

    if (performance) {
      resultados.push({
        tipo: 'performance_vendedores',
        dados: performance,
        resumo: 'Performance dos vendedores'
      });
    }
  }

  return resultados;
}

async function queriesProdutos(
  intencao: IntencaoClassificada,
  contextoUrl: any,
  supabase: SupabaseClient
): Promise<DadosContexto[]> {
  const resultados: DadosContexto[] = [];

  let query = supabase
    .from('produtos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (intencao.entidades.nomes && intencao.entidades.nomes.length > 0) {
    const nome = intencao.entidades.nomes[0];
    query = query.ilike('nome', `%${nome}%`);
  }

  const { data: produtos, error } = await query;

  if (produtos && !error) {
    resultados.push({
      tipo: 'produtos_lista',
      dados: produtos,
      resumo: `${produtos.length} produtos encontrados`
    });
  }

  return resultados;
}
