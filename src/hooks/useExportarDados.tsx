import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DadosExportacao {
  kpis?: any;
  vendedores?: any[];
  distribuicao?: any[];
  pacing?: any[];
  funil?: any[];
}

export function useExportarDados() {
  const { toast } = useToast();

  const exportarExcel = (dados: DadosExportacao, filtros?: any) => {
    try {
      const workbook = XLSX.utils.book_new();

      // Aba 1: KPIs Gerais
      if (dados.kpis) {
        const kpisData = [
          ["Métrica", "Valor"],
          ["Total Meta", `R$ ${dados.kpis.total_meta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`],
          ["Total Realizado", `R$ ${dados.kpis.total_realizado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`],
          ["% Atingimento", `${dados.kpis.percentual_atingimento?.toFixed(1) || '0'}%`],
          ["Pacing", `${dados.kpis.pacing?.toFixed(1) || '0'}%`],
          ["Nº Equipes", dados.kpis.numero_equipes || 0],
        ];
        const wsKpis = XLSX.utils.aoa_to_sheet(kpisData);
        XLSX.utils.book_append_sheet(workbook, wsKpis, "KPIs Gerais");
      }

      // Aba 2: Performance Vendedores
      if (dados.vendedores && dados.vendedores.length > 0) {
        const vendedoresData = [
          [
            "Vendedor",
            "Equipe",
            "Meta",
            "Realizado",
            "% Atingimento",
            "Total Vendas",
            "Vendas Ganhas",
            "Vendas Perdidas",
            "Valor Vendido",
            "Ticket Médio",
            "Taxa Conversão",
            "Margem Média",
          ],
          ...dados.vendedores.map((v) => [
            v.nome_vendedor,
            v.equipe_nome || "Sem equipe",
            v.meta_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            v.realizado_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            `${v.percentual_atingimento?.toFixed(1)}%`,
            v.total_vendas,
            v.vendas_ganhas,
            v.vendas_perdidas,
            v.valor_vendido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            v.ticket_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            `${v.taxa_conversao?.toFixed(1)}%`,
            `${v.margem_media?.toFixed(1)}%`,
          ]),
        ];
        const wsVendedores = XLSX.utils.aoa_to_sheet(vendedoresData);
        XLSX.utils.book_append_sheet(workbook, wsVendedores, "Vendedores");
      }

      // Aba 3: Distribuição de Metas
      if (dados.distribuicao && dados.distribuicao.length > 0) {
        const distribuicaoData = [
          ["Equipe", "Meta", "Realizado", "% Atingimento"],
          ...dados.distribuicao.map((d) => [
            d.equipe_nome,
            d.valor_objetivo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            d.valor_atual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            `${d.percentual?.toFixed(1)}%`,
          ]),
        ];
        const wsDistribuicao = XLSX.utils.aoa_to_sheet(distribuicaoData);
        XLSX.utils.book_append_sheet(workbook, wsDistribuicao, "Distribuição Metas");
      }

      // Aba 4: Pacing Semanal
      if (dados.pacing && dados.pacing.length > 0) {
        const pacingData = [
          ["Semana", "Data", "Meta", "Realizado", "Projeção"],
          ...dados.pacing.map((p) => [
            p.semana,
            p.data_semana,
            p.meta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            p.realizado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            p.projecao?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          ]),
        ];
        const wsPacing = XLSX.utils.aoa_to_sheet(pacingData);
        XLSX.utils.book_append_sheet(workbook, wsPacing, "Pacing Semanal");
      }

      // Aba 5: Funil de Vendas
      if (dados.funil && dados.funil.length > 0) {
        const funilData = [
          ["Etapa", "Quantidade", "Valor Total"],
          ...dados.funil.map((f) => [
            f.etapa,
            f.quantidade,
            f.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          ]),
        ];
        const wsFunil = XLSX.utils.aoa_to_sheet(funilData);
        XLSX.utils.book_append_sheet(workbook, wsFunil, "Funil Vendas");
      }

      // Gerar arquivo
      const dataAtual = format(new Date(), "dd-MM-yyyy_HH-mm", { locale: ptBR });
      const nomeArquivo = `dashboard-equipes_${dataAtual}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);

      toast.success("Exportação concluída", {
        description: `Arquivo ${nomeArquivo} baixado com sucesso!`,
      });
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar", {
        description: "Não foi possível gerar o arquivo Excel.",
      });
    }
  };

  const exportarPDF = async (dados: DadosExportacao, filtros?: any) => {
    try {
      // Criar HTML para impressão
      const htmlContent = gerarHTMLRelatorio(dados, filtros);
      
      // Abrir janela de impressão
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("Não foi possível abrir janela de impressão");
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Aguardar carregamento e imprimir
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      toast.success("Abrindo visualização de impressão", {
        description: "Use a opção 'Salvar como PDF' na janela de impressão.",
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar", {
        description: "Não foi possível gerar o PDF.",
      });
    }
  };

  return {
    exportarExcel,
    exportarPDF,
  };
}

function gerarHTMLRelatorio(dados: DadosExportacao, filtros?: any): string {
  const dataAtual = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório Dashboard Equipes</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #1e40af;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 10px;
        }
        h2 {
          color: #3b82f6;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .info-box {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background: #3b82f6;
          color: white;
          padding: 12px;
          text-align: left;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        tr:hover {
          background: #f9fafb;
        }
        .metric {
          display: inline-block;
          margin: 10px 20px 10px 0;
        }
        .metric-label {
          font-weight: bold;
          color: #6b7280;
        }
        .metric-value {
          font-size: 1.2em;
          color: #1e40af;
        }
        @media print {
          body { padding: 0; }
          .page-break { page-break-after: always; }
        }
      </style>
    </head>
    <body>
      <h1>Relatório Dashboard de Equipes</h1>
      <div class="header">
        <div>
          <strong>Data de Geração:</strong> ${dataAtual}
        </div>
      </div>

      ${dados.kpis ? `
        <h2>KPIs Gerais</h2>
        <div class="info-box">
          <div class="metric">
            <div class="metric-label">Total Meta</div>
            <div class="metric-value">R$ ${dados.kpis.total_meta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Realizado</div>
            <div class="metric-value">R$ ${dados.kpis.total_realizado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</div>
          </div>
          <div class="metric">
            <div class="metric-label">% Atingimento</div>
            <div class="metric-value">${dados.kpis.percentual_atingimento?.toFixed(1) || '0'}%</div>
          </div>
          <div class="metric">
            <div class="metric-label">Pacing</div>
            <div class="metric-value">${dados.kpis.pacing?.toFixed(1) || '0'}%</div>
          </div>
          <div class="metric">
            <div class="metric-label">Nº Equipes</div>
            <div class="metric-value">${dados.kpis.numero_equipes || 0}</div>
          </div>
        </div>
      ` : ''}

      ${dados.vendedores && dados.vendedores.length > 0 ? `
        <div class="page-break"></div>
        <h2>Performance de Vendedores</h2>
        <table>
          <thead>
            <tr>
              <th>Vendedor</th>
              <th>Equipe</th>
              <th>Meta</th>
              <th>Realizado</th>
              <th>% Atingimento</th>
              <th>Vendas Ganhas</th>
              <th>Taxa Conversão</th>
            </tr>
          </thead>
          <tbody>
            ${dados.vendedores.map((v) => `
              <tr>
                <td>${v.nome_vendedor}</td>
                <td>${v.equipe_nome || 'Sem equipe'}</td>
                <td>R$ ${v.meta_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</td>
                <td>R$ ${v.realizado_valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</td>
                <td>${v.percentual_atingimento?.toFixed(1) || '0'}%</td>
                <td>${v.vendas_ganhas || 0}</td>
                <td>${v.taxa_conversao?.toFixed(1) || '0'}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${dados.distribuicao && dados.distribuicao.length > 0 ? `
        <h2>Distribuição de Metas por Equipe</h2>
        <table>
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Meta</th>
              <th>Realizado</th>
              <th>% Atingimento</th>
            </tr>
          </thead>
          <tbody>
            ${dados.distribuicao.map((d) => `
              <tr>
                <td>${d.equipe_nome}</td>
                <td>R$ ${d.valor_objetivo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</td>
                <td>R$ ${d.valor_atual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</td>
                <td>${d.percentual?.toFixed(1) || '0'}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </body>
    </html>
  `;
}
