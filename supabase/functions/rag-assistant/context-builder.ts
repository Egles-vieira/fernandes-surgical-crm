import { DadosContexto } from "./queries.ts";
import { IntencaoClassificada } from "./classifier.ts";

export function construirContexto(
  intencao: IntencaoClassificada,
  dadosContexto: DadosContexto[],
  contextoUrl: any
): string {
  console.log("🏗️ Construindo contexto estruturado");

  let contexto = `Você é um assistente inteligente do sistema ConvertIA CRM.

CONTEXTO DA TELA ATUAL:
- Tipo: ${contextoUrl.tipo || 'geral'}
- Rota: ${contextoUrl.rota || '/'}
${contextoUrl.id ? `- ID do recurso: ${contextoUrl.id}` : ''}

INTENÇÃO DETECTADA:
- Tipo: ${intencao.tipo}
- Subtipo: ${intencao.subtipo || 'geral'}
- Confiança: ${(intencao.confianca * 100).toFixed(0)}%

`;

  if (dadosContexto.length === 0) {
    contexto += `
DADOS: Nenhum dado específico foi encontrado para esta consulta.

SUAS RESPONSABILIDADES:
1. Responder com base no conhecimento geral do sistema
2. Sugerir onde o usuário pode encontrar as informações
3. Oferecer ajuda para navegar até a tela correta
4. Ser conciso e objetivo
`;
    return contexto;
  }

  contexto += "DADOS RELEVANTES ENCONTRADOS:\n\n";

  dadosContexto.forEach((conjunto, index) => {
    contexto += `=== ${conjunto.tipo.toUpperCase()} ===\n`;
    contexto += `${conjunto.resumo}\n`;

    if (conjunto.metadados) {
      contexto += `Metadados: ${JSON.stringify(conjunto.metadados, null, 2)}\n`;
    }

    // Formatar dados de forma legível
    if (conjunto.dados.length > 0) {
      contexto += `Dados (${conjunto.dados.length} registros):\n`;
      
      // Limitar quantidade de dados para não sobrecarregar
      const dadosLimitados = conjunto.dados.slice(0, 10);
      
      dadosLimitados.forEach((item, i) => {
        contexto += formatarItem(conjunto.tipo, item, i + 1);
      });

      if (conjunto.dados.length > 10) {
        contexto += `... e mais ${conjunto.dados.length - 10} registros\n`;
      }
    }

    contexto += "\n";
  });

  contexto += `
DIRETRIZES DE RESPOSTA:
1. Seja conciso e direto ao ponto
2. Use os dados fornecidos para embasar suas respostas
3. Destaque insights e padrões importantes
4. Use formatação markdown para melhor legibilidade:
   - **Negrito** para destaques
   - Listas para enumerar itens
   - Tabelas quando apropriado
5. Se os dados não forem suficientes, seja honesto
6. Sugira próximos passos ou ações quando relevante
7. Adapte seu tom ao contexto (formal para análises, casual para orientações)

IMPORTANTE: Baseie-se EXCLUSIVAMENTE nos dados fornecidos acima. Não invente informações.
`;

  return contexto;
}

function formatarItem(tipo: string, item: any, index: number): string {
  switch (tipo) {
    case 'cliente_detalhes':
      return `
📋 **Cliente**
- Nome: ${item.nome_abrev || item.nome_fantasia}
- CNPJ: ${item.cgc || 'Não informado'}
- Vendedor ID: ${item.vendedor_id || 'Não atribuído'}
- Equipe ID: ${item.equipe_id || 'Sem equipe'}
- Limite de crédito: ${formatarMoeda(item.lim_credito)}
- Cadastrado em: ${formatarData(item.created_at)}

`;

    case 'lista_clientes':
      return `${index}. **${item.nome_abrev || item.nome_fantasia || 'Cliente'}**
   - CNPJ: ${item.cgc || 'N/A'}
   - Vendedor ID: ${item.vendedor_id || 'N/A'}
   - Equipe ID: ${item.equipe_id || 'N/A'}
   
`;

    case 'vendas_periodo':
    case 'vendas_cliente':
      return `${index}. Venda #${item.numero_venda || item.id.slice(0, 8)}
   - Cliente: ${item.cliente?.nome_abrev || item.cliente?.nome_fantasia || item.cliente_nome}
   - Valor: ${formatarMoeda(item.valor_total)}
   - Status: ${item.status}
   - Etapa: ${item.etapa_pipeline || 'N/A'}
   - Data: ${formatarData(item.created_at)}
   
`;

    case 'tickets_lista':
    case 'tickets_cliente':
      return `${index}. Ticket #${item.numero_ticket || (item.id ? item.id.slice(0, 8) : 'N/A')}
   - Título: ${item.titulo || 'N/A'}
   - Status: ${item.status || 'N/A'}
   - Prioridade: ${item.prioridade || 'N/A'}
   - Cliente: ${item.cliente_nome || 'N/A'}
   - Atribuído para: ${item.atribuido_para || 'Não atribuído'}
   - Fila: ${item.fila_id || 'N/A'}
   - Criado: ${formatarData(item.created_at || item.data_abertura)}
   
`;

    case 'equipes_lista':
      return `${index}. **${item.nome}**
   - Líder: ${item.lider?.nome || 'Sem líder'}
   - Membros: ${item.membros?.length || 0}
   - Descrição: ${item.descricao || 'Sem descrição'}
   
`;

    case 'performance_vendedores':
      return `${index}. **${item.nome_vendedor}**
   - Meta: ${formatarMoeda(item.meta_valor)}
   - Realizado: ${formatarMoeda(item.realizado_valor)}
   - Atingimento: ${item.percentual_atingimento?.toFixed(1)}%
   - Vendas ganhas: ${item.vendas_ganhas}/${item.total_vendas}
   - Taxa conversão: ${item.taxa_conversao?.toFixed(1)}%
   - Ticket médio: ${formatarMoeda(item.ticket_medio)}
   
`;

    case 'produtos_lista':
      return `${index}. **${item.nome}**
   - Referência: ${item.referencia_interna || 'N/A'}
   - Preço: ${formatarMoeda(item.preco_venda)}
   - Em mãos: ${item.quantidade_em_maos ?? 'N/A'}
   
`;

    default:
      // Formato genérico
      return `${index}. ${JSON.stringify(item, null, 2)}\n\n`;
  }
}

function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function formatarData(data: string | null | undefined): string {
  if (!data) return 'N/A';
  const date = new Date(data);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
