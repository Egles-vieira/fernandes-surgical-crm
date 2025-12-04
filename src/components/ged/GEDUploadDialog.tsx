import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGEDTipos } from "@/hooks/useGEDTipos";
import { useGEDDocumentos, GEDDocumentoInput } from "@/hooks/useGEDDocumentos";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileIcon, X } from "lucide-react";
import { toast } from "sonner";

interface GEDUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoPreSelecionado?: string;
}

export function GEDUploadDialog({ open, onOpenChange, tipoPreSelecionado }: GEDUploadDialogProps) {
  const { tiposAtivos } = useGEDTipos();
  const { createDocumento } = useGEDDocumentos();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tipoId, setTipoId] = useState(tipoPreSelecionado || "");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const tipoSelecionado = tiposAtivos.find(t => t.id === tipoId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (tipoSelecionado) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!tipoSelecionado.extensoes_permitidas.includes(ext || '')) {
        toast.error(`Extensão não permitida. Permitidas: ${tipoSelecionado.extensoes_permitidas.join(', ')}`);
        return;
      }
    }

    setArquivo(file);
    if (!titulo) {
      setTitulo(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async () => {
    if (!tipoId || !titulo || !arquivo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (tipoSelecionado?.exige_validade && !dataValidade) {
      toast.error("Este tipo de documento exige data de validade");
      return;
    }

    setUploading(true);
    try {
      // Upload do arquivo
      const fileExt = arquivo.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `documentos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ged-documentos')
        .upload(filePath, arquivo);

      if (uploadError) throw uploadError;

      // Criar documento
      const input: GEDDocumentoInput = {
        tipo_id: tipoId,
        titulo,
        descricao: descricao || undefined,
        numero_documento: numeroDocumento || undefined,
        data_emissao: dataEmissao || undefined,
        data_validade: dataValidade || undefined,
        arquivo_url: filePath,
        arquivo_nome: arquivo.name,
        tamanho_bytes: arquivo.size,
        tipo_mime: arquivo.type
      };

      await createDocumento.mutateAsync(input);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTipoId(tipoPreSelecionado || "");
    setTitulo("");
    setDescricao("");
    setNumeroDocumento("");
    setDataEmissao("");
    setDataValidade("");
    setArquivo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Documento */}
          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {tiposAtivos.map(tipo => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: tipo.cor }}
                      />
                      {tipo.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <Label>Arquivo *</Label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept={tipoSelecionado?.extensoes_permitidas.map(e => `.${e}`).join(',')}
              className="hidden"
            />
            {arquivo ? (
              <div className="flex items-center gap-3 p-3 border border-border/50 rounded-lg bg-muted/30">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{arquivo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setArquivo(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-muted-foreground">Clique para selecionar arquivo</span>
                  {tipoSelecionado && (
                    <span className="text-xs text-muted-foreground">
                      Formatos: {tipoSelecionado.extensoes_permitidas.join(', ')}
                    </span>
                  )}
                </div>
              </Button>
            )}
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome do documento"
            />
          </div>

          {/* Número do Documento */}
          <div className="space-y-2">
            <Label>Número/Código</Label>
            <Input
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="Ex: CND-2024-001"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Emissão</Label>
              <Input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Data de Validade
                {tipoSelecionado?.exige_validade && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Observações sobre o documento"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}