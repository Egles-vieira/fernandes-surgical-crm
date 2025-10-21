import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { URA } from "@/hooks/useURAs";
import { Volume2, Hash, PhoneForwarded, Phone, List } from "lucide-react";

interface TestarURADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ura: URA | null;
  opcoes?: any[];
}

export function TestarURADialog({ open, onOpenChange, ura, opcoes = [] }: TestarURADialogProps) {
  if (!ura) return null;

  const getTipoAcaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      transferir_ramal: "Transferir para Ramal",
      transferir_numero: "Transferir para Número",
      submenu: "Abrir Submenu",
      reproduzir_audio: "Reproduzir Áudio",
      desligar: "Desligar"
    };
    return labels[tipo] || tipo;
  };

  const getTipoAcaoIcon = (tipo: string) => {
    const icons: Record<string, any> = {
      transferir_ramal: PhoneForwarded,
      transferir_numero: Phone,
      submenu: List,
      reproduzir_audio: Volume2
    };
    const Icon = icons[tipo] || Hash;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Simulação de Fluxo - {ura.nome}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Informações Básicas */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Informações da URA
              </h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nome:</span>
                  <span className="text-sm font-medium">{ura.nome}</span>
                </div>
                {ura.numero_telefone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Número (DID):</span>
                    <span className="text-sm font-medium">{ura.numero_telefone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={ura.ativo ? "default" : "secondary"}>
                    {ura.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tempo de Espera:</span>
                  <span className="text-sm font-medium">{ura.tempo_espera_digito || 5}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Máx. Tentativas:</span>
                  <span className="text-sm font-medium">{ura.max_tentativas_invalidas || 3}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Mensagem de Boas-vindas */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Mensagem de Boas-vindas
              </h3>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline">
                    {ura.tipo_mensagem_boas_vindas === "audio" ? "Áudio" : "TTS"}
                  </Badge>
                  <div className="flex-1">
                    {ura.tipo_mensagem_boas_vindas === "audio" ? (
                      <div>
                        <p className="text-sm font-medium">Arquivo de áudio</p>
                        {ura.url_audio_boas_vindas && (
                          <p className="text-xs text-muted-foreground">{ura.url_audio_boas_vindas}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm">{ura.mensagem_boas_vindas}</p>
                        {ura.voz_tts && (
                          <p className="text-xs text-muted-foreground mt-1">Voz: {ura.voz_tts}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Opções do Menu */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Opções do Menu ({opcoes.length})
              </h3>
              {opcoes.length === 0 ? (
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma opção configurada ainda
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acesse o editor de fluxo para adicionar opções
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {opcoes
                    .sort((a, b) => (a.numero_opcao || 0) - (b.numero_opcao || 0))
                    .map((opcao) => (
                      <div key={opcao.id} className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="w-8 h-8 flex items-center justify-center">
                              {opcao.numero_opcao}
                            </Badge>
                            <span className="font-medium">{opcao.titulo}</span>
                          </div>
                          <Badge variant={opcao.ativo ? "default" : "secondary"}>
                            {opcao.ativo ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          {getTipoAcaoIcon(opcao.tipo_acao)}
                          <span className="text-muted-foreground">
                            {getTipoAcaoLabel(opcao.tipo_acao)}
                          </span>
                        </div>

                        {/* Detalhes da ação */}
                        <div className="text-sm space-y-1">
                          {opcao.tipo_acao === "transferir_ramal" && opcao.ramal_destino && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">Ramal:</span>
                              <span className="font-mono">{opcao.ramal_destino}</span>
                            </div>
                          )}
                          {opcao.tipo_acao === "transferir_numero" && opcao.numero_destino && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">Número:</span>
                              <span className="font-mono">{opcao.numero_destino}</span>
                            </div>
                          )}
                          {opcao.tipo_acao === "submenu" && opcao.ura_submenu_id && (
                            <div className="flex gap-2">
                              <span className="text-muted-foreground">Submenu ID:</span>
                              <span className="font-mono text-xs">{opcao.ura_submenu_id}</span>
                            </div>
                          )}
                          {opcao.mensagem_antes_acao && (
                            <div className="mt-2 p-2 bg-background rounded">
                              <p className="text-xs text-muted-foreground">Mensagem antes:</p>
                              <p className="text-xs">{opcao.mensagem_antes_acao}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Tratamento de Erros */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Tratamento de Erros</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                {ura.opcao_invalida_mensagem && (
                  <div>
                    <span className="text-muted-foreground">Mensagem de erro:</span>
                    <p className="mt-1">{ura.opcao_invalida_mensagem}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Após {ura.max_tentativas_invalidas || 3} tentativas:</span>
                  <Badge variant="outline">{ura.acao_apos_max_tentativas || "desligar"}</Badge>
                </div>
                {ura.acao_apos_max_tentativas === "transferir" && ura.ramal_transferencia_padrao && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground">Transferir para:</span>
                    <span className="font-mono">{ura.ramal_transferencia_padrao}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
