/**
 * Página de Governança WhatsApp
 * Configurações de unidades, expedientes, feriados e templates
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Clock, CalendarDays, Settings, FileText } from "lucide-react";
import {
  UnidadesManager,
  ExpedienteConfig,
  FeriadosCalendar,
  ConfiguracoesAtendimento,
  TemplatesSistema
} from "@/components/whatsapp/governanca";

export default function Governanca() {
  const [activeTab, setActiveTab] = useState("unidades");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Governança WhatsApp</h1>
        <p className="text-muted-foreground">
          Configure unidades, expedientes, feriados e regras de atendimento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="unidades" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Unidades</span>
          </TabsTrigger>
          <TabsTrigger value="expediente" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Expediente</span>
          </TabsTrigger>
          <TabsTrigger value="feriados" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Feriados</span>
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">SLA & Distribuição</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unidades" className="mt-6">
          <UnidadesManager />
        </TabsContent>

        <TabsContent value="expediente" className="mt-6">
          <ExpedienteConfig />
        </TabsContent>

        <TabsContent value="feriados" className="mt-6">
          <FeriadosCalendar />
        </TabsContent>

        <TabsContent value="configuracoes" className="mt-6">
          <ConfiguracoesAtendimento />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesSistema />
        </TabsContent>
      </Tabs>
    </div>
  );
}
