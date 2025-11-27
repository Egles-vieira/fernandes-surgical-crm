import { useState } from "react";
import { Check, ChevronRight, ChevronDown, ChevronUp, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
type EtapaPipeline = "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "followup_cliente" | "fechamento" | "ganho" | "perdido";
interface FunnelStagesBarProps {
  etapaAtual?: EtapaPipeline;
  onAvancarEtapa?: () => void;
  onEtapaClick?: (etapa: EtapaPipeline) => void;
  camposEtapa?: {
    label: string;
    value: string | null;
  }[];
  onEditarCampos?: () => void;
}
const etapas = [{
  id: "prospeccao",
  label: "Prospecção"
}, {
  id: "qualificacao",
  label: "Qualificação"
}, {
  id: "proposta",
  label: "Proposta"
}, {
  id: "negociacao",
  label: "Negociação"
}, {
  id: "followup_cliente",
  label: "Follow-up"
}, {
  id: "fechamento",
  label: "Fechamento"
}] as const;
const orientacoesPorEtapa: Record<string, string[]> = {
  prospeccao: ["Identifique o decisor e influenciadores chave", "Pesquise sobre a empresa e seus desafios", "Prepare uma abordagem personalizada", "Qualifique o potencial do lead"],
  qualificacao: ["Confirme o orçamento disponível", "Identifique a urgência e timeline", "Valide se o produto atende às necessidades", "Mapeie todos os stakeholders envolvidos"],
  proposta: ["Revise a proposta com o time comercial", "Certifique-se que todos os itens estão corretos", "Prepare argumentos para possíveis objeções", "Valide condições de pagamento e prazos"],
  negociacao: ["Defina seu limite de desconto", "Prepare alternativas de condições de pagamento", "Mantenha contato frequente com o cliente", "Identifique pontos de flexibilização"],
  followup_cliente: ["Confirme se o cliente recebeu a proposta", "Esclareça dúvidas pendentes", "Identifique objeções ou preocupações", "Reforce os diferenciais e benefícios"],
  fechamento: ["Confirme todos os dados para faturamento", "Verifique estoque e prazo de entrega", "Prepare a documentação necessária", "Alinhe expectativas de pós-venda"],
  ganho: ["Confirme a data de entrega com o cliente", "Inicie o processo de faturamento", "Acompanhe a satisfação do cliente", "Identifique oportunidades de upsell"],
  perdido: ["Registre o motivo da perda", "Mantenha o relacionamento com o cliente", "Identifique aprendizados para o futuro", "Planeje um follow-up adequado"]
};
export function FunnelStagesBar({
  etapaAtual = "proposta",
  onAvancarEtapa,
  onEtapaClick,
  camposEtapa = [],
  onEditarCampos
}: FunnelStagesBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Verifica se a venda foi ganha ou perdida
  const isGanho = etapaAtual === "ganho";
  const isPerdido = etapaAtual === "perdido";
  const isFinalizada = isGanho || isPerdido;

  // Encontra o índice da etapa atual
  const etapaAtualIndex = etapas.findIndex(e => e.id === etapaAtual);
  const orientacoes = orientacoesPorEtapa[etapaAtual] || [];
  return <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="sticky top-[60px] z-20 bg-background border-b shadow-sm">
        <div className="py-1">
          <div className="flex items-center gap-2">
            {/* Botão Toggle */}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-2">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>

            {/* Etapas em formato chevron */}
            <div className="flex items-center -space-x-3 flex-1 px-0 mx-[13px]">
              {etapas.map((etapa, index) => {
              const isAtual = etapa.id === etapaAtual;
              const isConcluida = index < etapaAtualIndex || isFinalizada;
              const isProxima = index === etapaAtualIndex + 1;
              const isClickable = !isFinalizada && onEtapaClick;
              return <div 
                key={etapa.id} 
                onClick={() => isClickable && onEtapaClick(etapa.id)}
                className={cn(
                  "relative flex items-center justify-center h-7 flex-1 transition-all",
                  "clip-path-chevron",
                  // Cores baseadas no estado
                  isConcluida && "bg-success/90 text-success-foreground", 
                  isAtual && !isFinalizada && "bg-primary text-primary-foreground shadow-lg z-10 scale-105", 
                  isProxima && "bg-primary/80 text-primary-foreground", 
                  !isConcluida && !isAtual && !isProxima && "bg-muted text-muted-foreground",
                  // Primeiro item tem padding diferente
                  index === 0 && "pl-6 rounded-l-md",
                  // Cursor pointer quando clicável
                  isClickable && "cursor-pointer hover:opacity-90"
                )} 
                style={{
                  clipPath: index === 0 ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)" : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)"
                }}
              >
                <div className="flex items-center gap-2 relative z-10">
                  {isConcluida && <Check className="h-4 w-4" strokeWidth={3} />}
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {etapa.label}
                  </span>
                </div>
              </div>;
            })}

              {/* Status final (Ganho/Perdido) - apenas se finalizado */}
              {isFinalizada && <div className={cn("relative flex items-center justify-center h-7 px-12 pl-14 rounded-r-md transition-all", isGanho && "bg-success text-success-foreground", isPerdido && "bg-destructive text-destructive-foreground")} style={{
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)"
            }}>
                  <div className="flex items-center gap-2 relative z-10">
                    {isGanho ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="text-lg">✕</span>}
                    <span className="text-sm font-semibold">
                      {isGanho ? "Ganho" : "Perdido"}
                    </span>
                  </div>
                </div>}
            </div>

            {/* Botão de ação */}
            {!isFinalizada && onAvancarEtapa && etapaAtualIndex < etapas.length - 1 && <Button onClick={onAvancarEtapa} className="ml-3 mr-2 gap-2 shrink-0" size="sm">
                Avançar Etapa
                <ChevronRight className="h-4 w-4" />
              </Button>}
          </div>
        </div>

        {/* Conteúdo Expandido */}
        <CollapsibleContent>
          <div className="bg-muted/30 border-t">
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna Esquerda - Campos Chave */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Campos Chave desta Etapa
                    </h3>
                    {onEditarCampos && <Button variant="ghost" size="sm" onClick={onEditarCampos} className="h-8 gap-2">
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </Button>}
                  </div>
                  <div className="space-y-3">
                    {camposEtapa.length > 0 ? camposEtapa.map((campo, index) => <div key={index} className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">{campo.label}</span>
                          <span className="text-sm font-medium text-foreground text-right ml-4">
                            {campo.value || "-"}
                          </span>
                        </div>) : <p className="text-sm text-muted-foreground italic">
                        Nenhum campo específico para esta etapa
                      </p>}
                  </div>
                </div>

                {/* Coluna Direita - Orientações */}
                <div className="md:border-l md:pl-8">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                    Orientações para Sucesso
                  </h3>
                  <ul className="space-y-2">
                    {orientacoes.map((orientacao, index) => <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-sm text-muted-foreground">{orientacao}</span>
                      </li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>;
}