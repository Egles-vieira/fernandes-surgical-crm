import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  DollarSign, 
  FileSpreadsheet, 
  Gavel, 
  MessageCircle, 
  Package, 
  Headphones, 
  Users 
} from "lucide-react";
import { ResultadoGeralPanel } from "./panels/ResultadoGeralPanel";
import { VendasPanel } from "./panels/VendasPanel";
import { PlataformasPanel } from "./panels/PlataformasPanel";
import { LicitacoesPanel } from "./panels/LicitacoesPanel";
import { WhatsAppPanel } from "./panels/WhatsAppPanel";
import { ProdutosPanel } from "./panels/ProdutosPanel";
import { ServicesPanel } from "./panels/ServicesPanel";
import { ClientePanel } from "./panels/ClientePanel";

const panels = [
  { id: "resultado-geral", label: "Resultado Geral", icon: LayoutDashboard },
  { id: "vendas", label: "Vendas", icon: DollarSign },
  { id: "plataformas", label: "Plataformas", icon: FileSpreadsheet },
  { id: "licitacoes", label: "Licitações", icon: Gavel },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "services", label: "Services", icon: Headphones },
  { id: "cliente", label: "Cliente", icon: Users },
];

export function DashboardPaginator() {
  const [activeTab, setActiveTab] = useState("resultado-geral");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-1 h-auto p-1 bg-muted/50 rounded-lg flex-wrap">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <TabsTrigger
                key={panel.id}
                value={panel.id}
                className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{panel.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="resultado-geral" className="mt-6">
          <ResultadoGeralPanel />
        </TabsContent>

        <TabsContent value="vendas" className="mt-6">
          <VendasPanel isActive={activeTab === "vendas"} />
        </TabsContent>

        <TabsContent value="plataformas" className="mt-6">
          <PlataformasPanel isActive={activeTab === "plataformas"} />
        </TabsContent>

        <TabsContent value="licitacoes" className="mt-6">
          <LicitacoesPanel isActive={activeTab === "licitacoes"} />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppPanel isActive={activeTab === "whatsapp"} />
        </TabsContent>

        <TabsContent value="produtos" className="mt-6">
          <ProdutosPanel isActive={activeTab === "produtos"} />
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <ServicesPanel isActive={activeTab === "services"} />
        </TabsContent>

        <TabsContent value="cliente" className="mt-6">
          <ClientePanel isActive={activeTab === "cliente"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
