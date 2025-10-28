import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from 'papaparse';
import { clienteImportSchema } from "@/lib/validations/cliente";

interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorDetails: string[];
}

export default function ImportarClientes() {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

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

      const clientes = parseResult.data as any[];

      const total = clientes.length;
      let success = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < clientes.length; i += batchSize) {
        const batch = clientes.slice(i, i + batchSize);
        
        // Helper to parse decimal
        const parseDecimal = (value: string) => {
          if (!value || value === '') return 0;
          const cleaned = value.replace(/\./g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) || parsed < 0 ? 0 : parsed;
        };

        // Helper to parse integer
        const parseInteger = (value: string) => {
          if (!value || value === '') return 0;
          const parsed = parseInt(value);
          return isNaN(parsed) ? 0 : parsed;
        };

        const clientesFormatted = batch.map((c, idx) => {
          const clienteData = {
            nome_emit: c.nome_emit || c.razao_social || '',
            nome_abrev: c.nome_abrev || c.nome_abreviado || '',
            cgc: c.cgc || c.cnpj || c.cpf || '',
            cod_emitente: parseInteger(c.cod_emitente || c.codigo || '0'),
            identific: c.identific || 'Cliente',
            natureza: c.natureza || 'Juridica',
            ins_estadual: c.ins_estadual || c.inscricao_estadual || null,
            cod_suframa: c.cod_suframa || null,
            telefone1: c.telefone1 || c.telefone || null,
            e_mail: c.e_mail || c.email || null,
            email_xml: c.email_xml || null,
            email_financeiro: c.email_financeiro || null,
            nat_operacao: c.nat_operacao || c.natureza_operacao || null,
            atividade: c.atividade || null,
            coligada: c.coligada || null,
            cod_gr_cli: parseInteger(c.cod_gr_cli || c.grupo_cliente || '0'),
            cod_rep: parseInteger(c.cod_rep || c.codigo_representante || '0'),
            lim_credito: parseDecimal(c.lim_credito || c.limite_credito || '0'),
            limite_disponivel: parseDecimal(c.limite_disponivel || c.credito_disponivel || '0'),
            ind_cre_cli: c.ind_cre_cli || c.indicador_credito || 'Normal',
            cod_cond_pag: parseInteger(c.cod_cond_pag || c.condicao_pagamento || '0'),
            cond_pag_fixa: c.cond_pag_fixa || 'NO',
            equipevendas: c.equipevendas || c.equipe_vendas || null,
            observacoes: c.observacoes || null,
          };
          
          // Validate with Zod schema
          try {
            clienteImportSchema.parse(clienteData);
          } catch (validationError: any) {
            console.error(`Validation error on row ${i + idx + 1}:`, validationError.errors);
            errorDetails.push(`Linha ${i + idx + 1}: ${validationError.errors.map((e: any) => e.message).join(', ')}`);
            throw new Error('Validation failed');
          }
          
          return {
            user_id: user.id,
            ...clienteData
          };
        });

        const { data, error } = await supabase
          .from('clientes')
          .insert(clientesFormatted)
          .select();

        if (error) {
          errors += batch.length;
          errorDetails.push(`Lote ${i / batchSize + 1}: ${error.message}`);
        } else {
          success += data?.length || 0;
        }

        setProgress(Math.round(((i + batch.length) / total) * 100));
      }

      setResult({ success, errors, total, errorDetails });

      if (errors === 0) {
        toast({
          title: "Importação concluída!",
          description: `${success} clientes importados com sucesso.`,
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
        <h1 className="text-3xl font-bold text-primary">Importar Clientes</h1>
        <p className="text-muted-foreground">Importe clientes em lote via arquivo CSV</p>
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
              <p className="text-xs mb-2 font-semibold">Aceita separadores: ponto-e-vírgula (;) ou tabulação (TAB)</p>
              <code className="text-xs block mb-2">
                nome_emit;nome_abrev;cgc;cod_emitente;identific;natureza;ins_estadual;telefone1;e_mail;lim_credito;limite_disponivel;cod_cond_pag
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                ✅ Campos opcionais: todos (para testes)<br/>
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
                <h3 className="text-lg font-semibold mb-2">Importando clientes...</h3>
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
                Importar Mais Clientes
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}