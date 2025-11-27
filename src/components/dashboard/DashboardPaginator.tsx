import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LayoutDashboard, 
  DollarSign, 
  FileSpreadsheet, 
  Gavel, 
  MessageCircle, 
  Package, 
  Headphones, 
  Users,
  ChevronRight
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
  { id: "resultado-geral", label: "Resultado Geral", icon: LayoutDashboard, description: "Visão consolidada de todos os indicadores" },
  { id: "vendas", label: "Vendas", icon: DollarSign, description: "Pipeline, metas e performance comercial" },
  { id: "plataformas", label: "Plataformas", icon: FileSpreadsheet, description: "Cotações EDI e análise de plataformas" },
  { id: "licitacoes", label: "Licitações", icon: Gavel, description: "Acompanhamento de processos licitatórios" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, description: "Conversas, propostas e métricas do agente" },
  { id: "produtos", label: "Produtos", icon: Package, description: "Estoque, embeddings e catálogo" },
  { id: "services", label: "Services", icon: Headphones, description: "Tickets, SLA e atendimento ao cliente" },
  { id: "cliente", label: "Cliente", icon: Users, description: "Base de clientes e análise de carteira" },
];

export function DashboardPaginator() {
  const [activeTab, setActiveTab] = useState("resultado-geral");

  const activePanel = panels.find(p => p.id === activeTab);
  const ActiveIcon = activePanel?.icon || LayoutDashboard;

  return (
    <div className="space-y-6">
      {/* Header com seletor de dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ActiveIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{activePanel?.label}</h1>
            <p className="text-sm text-muted-foreground">{activePanel?.description}</p>
          </div>
        </div>
        
        {/* Dropdown seletor de dashboards */}
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full sm:w-[280px] bg-card border-border/50">
            <SelectValue placeholder="Selecionar dashboard" />
          </SelectTrigger>
          <SelectContent>
            {panels.map((panel) => {
              const Icon = panel.icon;
              return (
                <SelectItem key={panel.id} value={panel.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{panel.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs de navegação rápida */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-1 h-auto p-1 bg-muted/30 rounded-lg flex-wrap border border-border/30">
          {panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <TabsTrigger
                key={panel.id}
                value={panel.id}
                className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-border/50 rounded-md transition-all text-sm"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{panel.label}</span>
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
