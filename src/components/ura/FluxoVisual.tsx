import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  ArrowDown,
  GitBranch,
  PhoneCall,
  Music,
  MessageSquare,
  XCircle,
  Voicemail,
  AlertCircle,
} from "lucide-react";
import { URA, URAOpcao } from "@/hooks/useURAs";

interface FluxoVisualProps {
  ura: URA;
  opcoes: URAOpcao[];
}

const getIconByTipo = (tipo: string) => {
  switch (tipo) {
    case "menu_submenu":
      return GitBranch;
    case "transferir_ramal":
      return Phone;
    case "transferir_numero":
      return PhoneCall;
    case "reproduzir_audio":
      return Music;
    case "enviar_callback":
      return MessageSquare;
    case "desligar":
      return XCircle;
    case "correio_voz":
      return Voicemail;
    default:
      return Phone;
  }
};

const getActionLabel = (opcao: URAOpcao) => {
  switch (opcao.tipo_acao) {
    case "transferir_ramal":
      return `Ramal ${opcao.ramal_destino}`;
    case "transferir_numero":
      return `Tel ${opcao.numero_destino}`;
    case "menu_submenu":
      return "Submenu";
    case "reproduzir_audio":
      return "Áudio";
    case "enviar_callback":
      return "Callback";
    case "desligar":
      return "Desligar";
    case "correio_voz":
      return "Correio Voz";
    default:
      return opcao.tipo_acao;
  }
};

export function FluxoVisual({ ura, opcoes }: FluxoVisualProps) {
  const opcoesAtivas = opcoes
    .filter((o) => o.ativo)
    .sort((a, b) => a.numero_opcao - b.numero_opcao);

  return (
    <div className="p-6 space-y-6">
      {/* Início */}
      <div className="flex flex-col items-center">
        <Card className="p-6 bg-primary/5 border-primary">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold text-lg">INÍCIO</p>
              <p className="text-sm text-muted-foreground">Chamada recebida</p>
            </div>
          </div>
        </Card>

        <ArrowDown className="w-6 h-6 text-muted-foreground my-2" />

        {/* Mensagem de Boas-vindas */}
        <Card className="p-4 max-w-md">
          <p className="text-sm font-medium mb-2">Mensagem de Boas-Vindas</p>
          <p className="text-sm text-muted-foreground italic">
            "{ura.mensagem_boas_vindas}"
          </p>
          <Badge variant="outline" className="mt-2">
            {ura.tipo_mensagem_boas_vindas === "texto" ? "TTS" : "Áudio"}
          </Badge>
        </Card>

        <ArrowDown className="w-6 h-6 text-muted-foreground my-2" />
      </div>

      {/* Menu de Opções */}
      <div className="flex flex-col items-center">
        <Card className="p-6 w-full max-w-2xl">
          <div className="text-center mb-4">
            <p className="font-semibold text-lg">MENU DE OPÇÕES</p>
            <p className="text-sm text-muted-foreground">
              Aguardando entrada do usuário ({ura.tempo_espera_digito}s)
            </p>
          </div>

          <div className="space-y-2">
            {opcoesAtivas.length > 0 ? (
              opcoesAtivas.map((opcao) => {
                const Icon = getIconByTipo(opcao.tipo_acao);
                return (
                  <div
                    key={opcao.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <span className="text-lg font-bold text-primary">
                        {opcao.numero_opcao}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="font-medium">{opcao.titulo}</p>
                      {opcao.mensagem_antes_acao && (
                        <p className="text-xs text-muted-foreground italic">
                          "{opcao.mensagem_antes_acao.substring(0, 60)}..."
                        </p>
                      )}
                    </div>

                    <ArrowDown className="w-4 h-4 text-muted-foreground rotate-[-90deg]" />

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {getActionLabel(opcao)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma opção configurada</p>
                <p className="text-sm">Adicione opções na sidebar</p>
              </div>
            )}
          </div>
        </Card>

        <ArrowDown className="w-6 h-6 text-muted-foreground my-2" />
      </div>

      {/* Opção Inválida */}
      <div className="flex flex-col items-center">
        <Card className="p-4 max-w-md border-destructive/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <div>
              <p className="font-medium">Opção Inválida</p>
              <p className="text-sm text-muted-foreground">
                "{ura.opcao_invalida_mensagem}"
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Máximo de tentativas:</span>
              <Badge variant="outline">{ura.max_tentativas_invalidas}x</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Após máx tentativas:</span>
              <Badge>
                {ura.acao_apos_max_tentativas === "desligar"
                  ? "Desligar"
                  : ura.acao_apos_max_tentativas === "transferir_atendente"
                  ? "Transferir"
                  : "Correio Voz"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Validação */}
      <div className="flex justify-center pt-6">
        <Card className="p-4 max-w-md">
          <div className="flex items-center gap-3">
            {opcoesAtivas.length > 0 ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <p className="text-sm">
                  <span className="font-medium">URA configurada!</span>{" "}
                  <span className="text-muted-foreground">
                    {opcoesAtivas.length} opção(ões) ativa(s)
                  </span>
                </p>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <p className="text-sm">
                  <span className="font-medium">Configuração incompleta</span>{" "}
                  <span className="text-muted-foreground">
                    Adicione pelo menos uma opção
                  </span>
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
