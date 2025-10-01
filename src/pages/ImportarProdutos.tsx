import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const produtos = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      });

      const total = produtos.length;
      let success = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < produtos.length; i += batchSize) {
        const batch = produtos.slice(i, i + batchSize);
        
        const produtosFormatted = batch.map(p => ({
          referencia_interna: p.codigo || p.referencia_interna,
          nome: p.nome,
          unidade_medida: p.unidade || p.unidade_medida || 'UN',
          ncm: p.ncm || '00000000',
          preco_venda: parseFloat(p.precoVenda || p.preco_venda || '0'),
          custo: parseFloat(p.precoCusto || p.custo || '0'),
          quantidade_em_maos: parseFloat(p.estoqueAtual || p.quantidade_em_maos || '0'),
          dtr: parseFloat(p.estoqueMinimo || p.dtr || '0'),
          marcadores_produto: [p.grupo, p.familia].filter(Boolean),
          narrativa: [p.fabricante, p.marca, p.procedencia, p.descricao].filter(Boolean).join(' | '),
          cod_trib_icms: 'Tributado',
          aliquota_ipi: 0,
          qtd_cr: 0,
          grupo_estoque: 0,
          quantidade_prevista: 0,
          lote_multiplo: 1,
          icms_sp_percent: 0,
        }));

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
        <p className="text-muted-foreground">Importe produtos em lote via arquivo CSV</p>
      </div>

      <Card className="p-8 shadow-elegant">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="text-primary" size={40} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Formato do CSV</h3>
            <p className="text-sm text-muted-foreground mb-4">
              O arquivo deve conter as seguintes colunas:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg text-left max-w-2xl mx-auto">
              <code className="text-xs">
                codigo,nome,unidade,ncm,precoVenda,precoCusto,estoqueAtual,estoqueMinimo,grupo,familia,fabricante,marca,procedencia,descricao
              </code>
            </div>
          </div>

          {!importing && !result && (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground mb-4">
                Arraste e solte seu arquivo CSV aqui ou clique para selecionar
              </p>
              <label htmlFor="file-upload">
                <Button asChild>
                  <span>
                    <Upload size={16} className="mr-2" />
                    Selecionar Arquivo CSV
                  </span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
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
