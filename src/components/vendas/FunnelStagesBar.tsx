import { useState } from "react";
import { Check, ChevronRight, ChevronDown, ChevronUp, Edit2, Target, Lightbulb, FileText, Calendar, Percent, User, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type EtapaPipeline = "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "followup_cliente" | "fechamento" | "ganho" | "perdido";

export interface ContatoOption {
  id: string;
  nome_completo: string;
  cargo?: string | null;
}

interface CampoEtapa {
  label: string;
  value: string | null;
  type?: "text" | "select" | "probability-select";
  options?: ContatoOption[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

interface FunnelStagesBarProps {
  etapaAtual?: EtapaPipeline;
  onAvancarEtapa?: () => void;
  onEtapaClick?: (etapa: EtapaPipeline) => void;
  camposEtapa?: CampoEtapa[];
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

// Função para obter ícone do campo
const getFieldIcon = (label: string) => {
  const labelLower = label.toLowerCase();
  if (labelLower.includes("status")) return FileText;
  if (labelLower.includes("data")) return Calendar;
  if (labelLower.includes("probabilidade")) return Percent;
  if (labelLower.includes("valor")) return TrendingUp;
  if (labelLower.includes("contato") || labelLower.includes("responsável")) return User;
  return Target;
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="sticky top-[43px] z-20 bg-background border-b shadow-sm">
        <div className="py-px my-0">
          <div className="flex items-center gap-2 py-[5px]">
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
                const isClickable = !isFinalizada && onEtapaClick;
                return (
                  <div 
                    key={etapa.id} 
                    onClick={() => isClickable && onEtapaClick(etapa.id)} 
                    className={cn(
                      "relative flex items-center justify-center h-7 flex-1 transition-all",
                      "clip-path-chevron",
                      // Cores baseadas no estado
                      isConcluida && "bg-success/90 text-success-foreground", 
                      isAtual && !isFinalizada && "bg-primary text-primary-foreground shadow-lg z-10 scale-105", 
                      !isConcluida && !isAtual && "bg-muted text-muted-foreground",
                      // Primeiro item tem padding diferente
                      index === 0 && "pl-6 rounded-l-md",
                      // Cursor pointer quando clicável
                      isClickable && "cursor-pointer hover:opacity-90"
                    )} 
                    style={{
                      clipPath: index === 0 
                        ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)" 
                        : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)"
                    }}
                  >
                    <div className="flex items-center gap-2 relative z-10">
                      {isConcluida && <Check className="h-4 w-4" strokeWidth={3} />}
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {etapa.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Status final (Ganho/Perdido) - apenas se finalizado */}
              {isFinalizada && (
                <div 
                  className={cn(
                    "relative flex items-center justify-center h-7 px-12 pl-14 rounded-r-md transition-all", 
                    isGanho && "bg-success text-success-foreground", 
                    isPerdido && "bg-destructive text-destructive-foreground"
                  )} 
                  style={{
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)"
                  }}
                >
                  <div className="flex items-center gap-2 relative z-10">
                    {isGanho ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="text-lg">✕</span>}
                    <span className="text-sm font-semibold">
                      {isGanho ? "Ganho" : "Perdido"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de ação */}
            {!isFinalizada && onAvancarEtapa && etapaAtualIndex < etapas.length - 1 && (
              <Button onClick={onAvancarEtapa} className="ml-3 mr-2 gap-2 shrink-0" size="sm">
                Avançar Etapa
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo Expandido - Design Aprimorado */}
        <CollapsibleContent>
          <div className="bg-gradient-to-b from-muted/40 to-muted/20 border-t">
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna Esquerda - Campos Chave */}
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  {/* Header do Card */}
                  <div className="flex items-center justify-between px-5 py-3 bg-muted/50 border-b">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Campos Chave
                      </h3>
                    </div>
                    {onEditarCampos && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onEditarCampos} 
                        className="h-7 gap-1.5 text-xs hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </Button>
                    )}
                  </div>
                  
                  {/* Conteúdo do Card */}
                  <div className="p-4">
                    {camposEtapa.length > 0 ? (
                      <div className="space-y-3">
                        {camposEtapa.map((campo, index) => {
                          const FieldIcon = getFieldIcon(campo.label);
                          return (
                            <div 
                              key={index} 
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-md bg-background shadow-sm group-hover:shadow transition-shadow">
                                  <FieldIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <span className="text-sm text-muted-foreground font-medium">
                                  {campo.label}
                                </span>
                              </div>
                              
                              {campo.type === "select" && campo.options && campo.onSelect ? (
                                <Select 
                                  value={campo.selectedId || ""} 
                                  onValueChange={campo.onSelect}
                                >
                                  <SelectTrigger className="w-[200px] h-8 text-sm bg-background border-border/60 hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Selecionar..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {campo.options.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">{option.nome_completo}</span>
                                          {option.cargo && (
                                            <span className="text-xs text-muted-foreground">{option.cargo}</span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : campo.type === "probability-select" && campo.onSelect ? (
                                <Select 
                                  value={campo.selectedId || ""} 
                                  onValueChange={campo.onSelect}
                                >
                                  <SelectTrigger className="w-[100px] h-8 text-sm bg-background border-border/60 hover:border-primary/50 transition-colors">
                                    <SelectValue placeholder="%" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((prob) => (
                                      <SelectItem key={prob} value={prob.toString()}>
                                        {prob}%
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge 
                                  variant="secondary" 
                                  className={cn(
                                    "font-medium px-3 py-1",
                                    !campo.value && "text-muted-foreground/60 bg-muted/50"
                                  )}
                                >
                                  {campo.value || "—"}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-3 rounded-full bg-muted/50 mb-3">
                          <FileText className="h-5 w-5 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Nenhum campo específico para esta etapa
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Direita - Orientações */}
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  {/* Header do Card */}
                  <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b">
                    <div className="p-1.5 rounded-lg bg-amber-500/20">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Orientações para Sucesso
                    </h3>
                  </div>
                  
                  {/* Conteúdo do Card */}
                  <div className="p-4">
                    <ul className="space-y-2">
                      {orientacoes.map((orientacao, index) => (
                        <li 
                          key={index} 
                          className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group"
                        >
                          <div className="mt-0.5 p-1 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground leading-relaxed">
                            {orientacao}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
