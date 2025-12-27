import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ResultadoGeralPanel } from "./panels/ResultadoGeralPanel";
import { VendasPanel } from "./panels/VendasPanel";
import { PlataformasPanel } from "./panels/PlataformasPanel";
import { LicitacoesPanel } from "./panels/LicitacoesPanel";
import { WhatsAppPanel } from "./panels/WhatsAppPanel";
import { ProdutosPanel } from "./panels/ProdutosPanel";
import { ServicesPanel } from "./panels/ServicesPanel";
import { ClientePanel } from "./panels/ClientePanel";
import { PerformanceMonitorPanel } from "./panels/PerformanceMonitorPanel";
import { AgenteIAPanel } from "./panels/AgenteIAPanel";

interface DashboardPaginatorProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DashboardPaginator({ activeTab, onTabChange }: DashboardPaginatorProps) {
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsContent value="resultado-geral" className="mt-0">
          <ResultadoGeralPanel />
        </TabsContent>

        <TabsContent value="vendas" className="mt-0">
          <VendasPanel isActive={activeTab === "vendas"} />
        </TabsContent>

        <TabsContent value="plataformas" className="mt-0">
          <PlataformasPanel isActive={activeTab === "plataformas"} />
        </TabsContent>

        <TabsContent value="licitacoes" className="mt-0">
          <LicitacoesPanel isActive={activeTab === "licitacoes"} />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-0">
          <WhatsAppPanel isActive={activeTab === "whatsapp"} />
        </TabsContent>

        <TabsContent value="produtos" className="mt-0">
          <ProdutosPanel isActive={activeTab === "produtos"} />
        </TabsContent>

        <TabsContent value="services" className="mt-0">
          <ServicesPanel isActive={activeTab === "services"} />
        </TabsContent>

        <TabsContent value="cliente" className="mt-0">
          <ClientePanel isActive={activeTab === "cliente"} />
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <PerformanceMonitorPanel isActive={activeTab === "performance"} />
        </TabsContent>

        <TabsContent value="agente-ia" className="mt-0">
          <AgenteIAPanel isActive={activeTab === "agente-ia"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
