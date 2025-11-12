import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Square, Trash2, Send, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onRecordComplete: (url: string, duration: number) => void;
  onCancel: () => void;
}

const AudioRecorder = ({ onRecordComplete, onCancel }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Erro ao acessar microfone",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    setAudioBlob(null);
    setDuration(0);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileName = `${user.id}/${Date.now()}-audio.ogg`;
      
      const { data, error } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, audioBlob, {
          contentType: 'audio/ogg',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = await supabase.storage
        .from('whatsapp-media')
        .createSignedUrl(data.path, 3600);

      if (!urlData?.signedUrl) {
        throw new Error('Erro ao gerar URL do áudio');
      }

      onRecordComplete(urlData.signedUrl, duration);

    } catch (error: any) {
      toast({
        title: "Erro ao enviar áudio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {!isRecording && !audioURL && (
            <Button
              onClick={startRecording}
              className="w-full bg-gradient-to-br from-red-500 to-red-600"
            >
              <Mic className="w-4 h-4 mr-2" />
              Iniciar Gravação
            </Button>
          )}

          {isRecording && (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">{formatTime(duration)}</span>
              </div>
              <Button
                onClick={stopRecording}
                size="icon"
                className="bg-red-500 hover:bg-red-600"
              >
                <Square className="w-4 h-4" />
              </Button>
            </div>
          )}

          {audioURL && (
            <div className="space-y-3">
              <audio src={audioURL} controls className="w-full" />
              <div className="flex gap-2">
                <Button
                  onClick={deleteRecording}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Descartar
                </Button>
                <Button
                  onClick={handleUpload}
                  size="sm"
                  className="flex-1 bg-gradient-to-br from-primary to-primary/90"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Áudio
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={onCancel}
          disabled={isRecording || uploading}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default AudioRecorder;
