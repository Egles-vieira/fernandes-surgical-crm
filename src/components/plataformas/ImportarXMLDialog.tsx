import { useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ImportarXMLDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plataformaId: string;
  tipoPlataforma?: string;
}

export default function ImportarXMLDialog({
  open,
  onOpenChange,
  plataformaId,
  tipoPlataforma = "bionexo",
}: ImportarXMLDialogProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xml')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo XML",
          variant: "destructive",
        });
        return;
      }
      setArquivo(file);
      setResultado(null);
    }
  };

  const handleImportar = async () => {
    if (!arquivo) return;

    setProcessando(true);
    setProgresso(10);

    try {
      // Ler conteúdo do arquivo
      const conteudoXML = await arquivo.text();
      setProgresso(30);

      // Chamar edge function
      const { data, error } = await supabase.functions.invoke(
        "edi-importar-xml",
        {
          body: {
            xml_conteudo: conteudoXML,
            plataforma_id: plataformaId,
            tipo_plataforma: tipoPlataforma,
          },
        }
      );

      setProgresso(80);

      if (error) throw error;

      setProgresso(100);
      setResultado(data);

      // Invalidar cache de cotações
      queryClient.invalidateQueries({ queryKey: ["edi-cotacoes"] });

      toast({
        title: "Importação concluída",
        description: `${data.resultados.sucesso} cotação(ões) importada(s) com sucesso`,
      });

      // Fechar dialog após 3 segundos
      setTimeout(() => {
        onOpenChange(false);
        setArquivo(null);
        setResultado(null);
        setProgresso(0);
      }, 3000);
    } catch (error) {
      console.error("Erro ao importar XML:", error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const handleClose = () => {
    if (!processando) {
      onOpenChange(false);
      setArquivo(null);
      setResultado(null);
      setProgresso(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar XML Manual
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo XML para importar cotações manualmente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <Label htmlFor="xml-file">Arquivo XML</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById("xml-file")?.click()}
                disabled={processando}
              >
                <FileText className="h-4 w-4 mr-2" />
                {arquivo ? arquivo.name : "Selecionar arquivo..."}
              </Button>
              {arquivo && !processando && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setArquivo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <input
              id="xml-file"
              type="file"
              accept=".xml"
              className="hidden"
              onChange={handleFileChange}
              disabled={processando}
            />
            <p className="text-xs text-muted-foreground">
              Arquivos XML de cotações da {tipoPlataforma}
            </p>
          </div>

          {/* Informações sobre o formato */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              O sistema irá:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Extrair todas as cotações do XML</li>
                <li>Verificar duplicatas automaticamente</li>
                <li>Vincular produtos já cadastrados no DE-PARA</li>
                <li>Criar cotações com status "Nova"</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Progresso */}
          {processando && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processando XML...</span>
                <span className="text-muted-foreground">{progresso}%</span>
              </div>
              <Progress value={progresso} />
            </div>
          )}

          {/* Resultado */}
          {resultado && !processando && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Importação concluída:</p>
                  <ul className="text-sm space-y-1">
                    <li className="text-green-600">
                      ✓ {resultado.resultados.sucesso} cotação(ões) importada(s)
                    </li>
                    {resultado.resultados.duplicadas > 0 && (
                      <li className="text-yellow-600">
                        ⚠ {resultado.resultados.duplicadas} duplicada(s)
                      </li>
                    )}
                    {resultado.resultados.erros > 0 && (
                      <li className="text-red-600">
                        ✗ {resultado.resultados.erros} erro(s)
                      </li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={processando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!arquivo || processando}
          >
            {processando ? "Importando..." : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
