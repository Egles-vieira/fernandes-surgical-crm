import { Brain } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IAStatusOverview } from "./ia/IAStatusOverview";
import { IAWhatsAppAgentSection } from "./ia/IAWhatsAppAgentSection";
import { IATriageSection } from "./ia/IATriageSection";
import { IAEdiAnalysisSection } from "./ia/IAEdiAnalysisSection";
import { IATicketAssistantSection } from "./ia/IATicketAssistantSection";
import { IAGlobalSettingsSection } from "./ia/IAGlobalSettingsSection";

export function IAConfigTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Configurações de Inteligência Artificial</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as configurações de IA do sistema em um só lugar
          </p>
        </div>
      </div>

      {/* Status Overview */}
      <IAStatusOverview />

      {/* Accordion com seções por módulo */}
      <Accordion type="multiple" defaultValue={["whatsapp-agent", "global"]} className="space-y-4">
        <AccordionItem value="whatsapp-agent" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              📱 WhatsApp - Agente de Vendas IA
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <IAWhatsAppAgentSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="whatsapp-triage" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              🔀 WhatsApp - Triagem Inteligente
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <IATriageSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="edi-analysis" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              📦 EDI/Plataformas - Análise de Cotações
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <IAEdiAnalysisSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tickets-assistant" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              🎫 Tickets - Assistente IA
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <IATicketAssistantSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="global" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="flex items-center gap-2">
              ⚙️ Configurações Globais
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <IAGlobalSettingsSection />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
