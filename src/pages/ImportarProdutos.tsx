import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { produtoImportSchema } from "@/lib/validations/produto";

interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorDetails: string[];
}

export default function ImportarProdutos() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV ou Excel (.xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      let produtos: any[] = [];

      if (isExcel) {
        // Process Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
          raw: false,
          defval: ''
        });

        // Transform headers to match expected format
        produtos = jsonData.map((row: any) => {
          const transformedRow: any = {};
          Object.keys(row).forEach(key => {
            const transformedKey = key
              .trim()
              .toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/[^\w]+/g, '_');
            transformedRow[transformedKey] = row[key];
          });
          return transformedRow;
        });
      } else {
        // Process CSV file
        const text = await file.text();
        
        // Detect separator (tab or semicolon)
        const firstLine = text.split('\n')[0];
        const delimiter = firstLine.includes('\t') ? '\t' : ';';
        
        // Parse CSV with PapaParse
        const parseResult = Papa.parse(text, {
          header: true,
          delimiter,
          skipEmptyLines: 'greedy',
          transformHeader: (h: string) =>
            h.replace(/^\uFEFF/, '') // Remove BOM
             .trim()
             .toLowerCase()
             .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
             .replace(/[^\w]+/g, '_'), // Replace non-word chars with underscore
        });

        produtos = parseResult.data as any[];
      }

      const total = produtos.length;
      let success = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < produtos.length; i += batchSize) {
        const batch = produtos.slice(i, i + batchSize);
        
        // Helper to convert Brazilian decimal format (1.234,56) to US format (1234.56)
        const parseDecimal = (value: string) => {
          if (!value || value === '') return 0;
          // Remove thousand separators (dots) and replace comma with dot
          const cleaned = value.replace(/\./g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          // Return 0 for invalid numbers (NaN) or negative values
          return isNaN(parsed) || parsed < 0 ? 0 : parsed;
        };

        // Helper to parse array field
        const parseArray = (value: string) => {
          if (!value || value === '') return [];
          return value.split(',').map(v => v.trim()).filter(Boolean);
        };

        // Helper to convert Brazilian date format (DD/MM/YYYY) to ISO (YYYY-MM-DD)
        const parseDate = (value: string) => {
          if (!value || value === '') return null;
          const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (!match) return null;
          const [, day, month, year] = match;
          return `${year}-${month}-${day}`;
        };

        const produtosFormatted = batch.map((p, idx) => {
          const produtoData = {
            referencia_interna: p.referencia_interna || p.codigo,
            nome: p.nome,
            unidade_medida: p.unidade_medida || p.unidade || 'UN',
            ncm: p.ncm || '00000000',
            preco_venda: parseDecimal(p.preco_venda || p.precoVenda || '0'),
            custo: parseDecimal(p.custo || p.precoCusto || '0'),
            quantidade_em_maos: parseDecimal(p.quantidade_em_maos || p.estoqueAtual || '0'),
            dtr: parseDecimal(p.dtr || p.estoqueMinimo || '0'),
            marcadores_produto: parseArray(p.marcadores_produto),
            narrativa: p.narrativa || [p.fabricante, p.marca, p.procedencia, p.descricao].filter(Boolean).join(' | '),
            cod_trib_icms: p.cod_trib_icms || 'Tributado',
            aliquota_ipi: parseDecimal(p.aliquota_ipi || '0'),
            qtd_cr: parseDecimal(p.qtd_cr || '0'),
            grupo_estoque: parseDecimal(p.grupo_estoque || '0'),
            quantidade_prevista: parseDecimal(p.quantidade_prevista || '0'),
            lote_multiplo: parseDecimal(p.lote_multiplo || '1'),
            icms_sp_percent: parseDecimal(p.icms_sp_percent || '0'),
            responsavel: p.responsavel || null,
            previsao_chegada: parseDate(p.previsao_chegada),
          };
          
          // Validate with Zod schema
          try {
            produtoImportSchema.parse(produtoData);
          } catch (validationError: any) {
            console.error(`Validation error on row ${i + idx + 1}:`, validationError.errors);
            errorDetails.push(`Linha ${i + idx + 1}: ${validationError.errors.map((e: any) => e.message).join(', ')}`);
            throw new Error('Validation failed');
          }
          
          return produtoData;
        });

        const { data, error } = await supabase
          .from('produtos')
          .insert(produtosFormatted)
          .select();

        if (error) {
          errors += batch.length;
          errorDetails.push(`Lote ${i / batchSize + 1}: ${error.message}`);
        } else {
          success += data?.length || 0;
          
          // Create initial stock records
          if (data) {
            const estoqueRecords = data.map(produto => ({
              produto_id: produto.id,
              tipo_movimentacao: 'entrada',
              quantidade: produto.quantidade_em_maos,
              quantidade_anterior: 0,
              quantidade_atual: produto.quantidade_em_maos,
              documento: 'IMPORTACAO_INICIAL',
              responsavel: 'Sistema',
              observacao: 'Estoque inicial importado'
            }));

            await supabase.from('estoque').insert(estoqueRecords);
          }
        }

        setProgress(Math.round(((i + batch.length) / total) * 100));
      }

      setResult({ success, errors, total, errorDetails });

      if (errors === 0) {
        toast({
          title: "Importação concluída!",
          description: `${success} produtos importados com sucesso.`,
        });
      } else {
        toast({
          title: "Importação concluída com erros",
          description: `${success} sucessos, ${errors} erros.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Importar Produtos</h1>
        <p className="text-muted-foreground">Importe produtos em lote via arquivo CSV ou Excel</p>
      </div>

      <Card className="p-8 shadow-elegant">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="text-primary" size={40} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Formato do Arquivo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aceita CSV, XLS e XLSX com as seguintes colunas:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg text-left max-w-2xl mx-auto">
              <p className="text-xs mb-2 font-semibold">Aceita separadores: ponto-e-vírgula (;) ou tabulação (TAB)</p>
              <code className="text-xs block mb-2">
                referencia_interna;nome;unidade_medida;ncm;preco_venda;custo;quantidade_em_maos;dtr;marcadores_produto;narrativa;cod_trib_icms;aliquota_ipi;qtd_cr;icms_sp_percent;grupo_estoque;quantidade_prevista;lote_multiplo;responsavel;previsao_chegada
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                ✅ Decimais com vírgula (formato BR: 1.234,56)<br/>
                ✅ Campos vazios são permitidos<br/>
                ✅ Texto entre aspas preservado<br/>
                ✅ Remove BOM automaticamente<br/>
                ✅ Normaliza acentos nos nomes das colunas
              </p>
            </div>
          </div>

          {!importing && !result && (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground mb-4">
                Arraste e solte seu arquivo CSV ou Excel aqui ou clique para selecionar
              </p>
              <label htmlFor="file-upload">
                <Button asChild>
                  <span>
                    <Upload size={16} className="mr-2" />
                    Selecionar Arquivo (CSV/Excel)
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {importing && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Importando produtos...</h3>
                <p className="text-muted-foreground">Por favor, aguarde</p>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">{progress}% concluído</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </Card>
                <Card className="p-4 text-center bg-success/10">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="text-success" size={20} />
                    <p className="text-2xl font-bold text-success">{result.success}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Sucessos</p>
                </Card>
                <Card className="p-4 text-center bg-destructive/10">
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="text-destructive" size={20} />
                    <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </Card>
              </div>

              {result.errorDetails.length > 0 && (
                <Card className="p-4 bg-destructive/5">
                  <h4 className="font-semibold mb-2">Detalhes dos erros:</h4>
                  <ul className="text-sm space-y-1">
                    {result.errorDetails.map((error, index) => (
                      <li key={index} className="text-destructive">• {error}</li>
                    ))}
                  </ul>
                </Card>
              )}

              <Button
                onClick={() => {
                  setResult(null);
                  setProgress(0);
                }}
                className="w-full"
              >
                Importar Mais Produtos
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
