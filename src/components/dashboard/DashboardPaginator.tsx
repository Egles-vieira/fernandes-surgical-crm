import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardVendas } from "./panels/DashboardVendas";
import { DashboardProdutos } from "./panels/DashboardProdutos";
import { DashboardPlataformas } from "./panels/DashboardPlataformas";
import { DashboardWhatsApp } from "./panels/DashboardWhatsApp";
import { DashboardLicitacoes } from "./panels/DashboardLicitacoes";
import { DashboardNPS } from "./panels/DashboardNPS";
import { DashboardCliente } from "./panels/DashboardCliente";

export function DashboardPaginator() {
  return (
    <Tabs defaultValue="vendas" className="w-full">
      <div className="border-b border-border bg-card/50 sticky top-0 z-10">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none gap-0 px-6">
          <TabsTrigger
            value="vendas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
          >
            Vendas
          </TabsTrigger>
          <TabsTrigger
            value="produtos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
          >
            Produtos
          </TabsTrigger>
          <TabsTrigger
            value="plataformas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
          >
            Plataformas
          </TabsTrigger>
          <TabsTrigger
            value="whatsapp"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
          >
            WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value="licitacoes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
          >
            Licitações
          </TabsTrigger>
          <TabsTrigger
            value="nps"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
          >
            NPS
          </TabsTrigger>
          <TabsTrigger
            value="cliente"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium"
          >
            Cliente
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="vendas" className="mt-0">
        <DashboardVendas />
      </TabsContent>

      <TabsContent value="produtos" className="mt-0">
        <DashboardProdutos />
      </TabsContent>

      <TabsContent value="plataformas" className="mt-0">
        <DashboardPlataformas />
      </TabsContent>

      <TabsContent value="whatsapp" className="mt-0">
        <DashboardWhatsApp />
      </TabsContent>

      <TabsContent value="licitacoes" className="mt-0">
        <DashboardLicitacoes />
      </TabsContent>

      <TabsContent value="nps" className="mt-0">
        <DashboardNPS />
      </TabsContent>

      <TabsContent value="cliente" className="mt-0">
        <DashboardCliente />
      </TabsContent>
    </Tabs>
  );
}
