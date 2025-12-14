import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { X, Image, Video, FileText, Music, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MediaUploaderProps {
  onUploadComplete: (url: string, type: 'image' | 'video' | 'audio' | 'document', fileName?: string, mimeType?: string) => void;
  onCancel: () => void;
  acceptedTypes?: string;
  maxSizeMB?: number;
}

const MediaUploader = ({ 
  onUploadComplete, 
  onCancel, 
  acceptedTypes = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar",
  maxSizeMB = 50 
}: MediaUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'document'>('document');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'image': return <Image className="w-12 h-12 text-primary" />;
      case 'video': return <Video className="w-12 h-12 text-primary" />;
      case 'audio': return <Music className="w-12 h-12 text-primary" />;
      default: return <FileText className="w-12 h-12 text-primary" />;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo deve ter no máximo ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    const type = getFileType(file);
    setFileType(type);
    setSelectedFile(file);

    // Preview para imagens e vídeos
    if (type === 'image' || type === 'video') {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Gerar nome único para o arquivo
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Simular progresso durante upload
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      // Obter URL pública permanente (bucket é público)
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(data.path);

      if (!urlData?.publicUrl) {
        throw new Error('Erro ao gerar URL do arquivo');
      }

      toast({
        title: "Upload concluído",
        description: "Arquivo pronto para envio",
      });

      onUploadComplete(urlData.publicUrl, fileType, selectedFile.name, selectedFile.type);

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            Clique para selecionar um arquivo
          </p>
          <p className="text-xs text-muted-foreground">
            Imagens, vídeos, áudios ou documentos (máx. {maxSizeMB}MB)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative bg-muted rounded-lg p-4 flex items-center gap-4">
            {preview && fileType === 'image' ? (
              <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded" />
            ) : preview && fileType === 'video' ? (
              <video src={preview} className="w-24 h-24 object-cover rounded" />
            ) : (
              getFileIcon()
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
              }}
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Enviando... {progress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1 bg-gradient-to-br from-primary to-primary/90"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Arquivo'
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MediaUploader;
