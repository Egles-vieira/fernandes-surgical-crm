import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GEDDashboard } from "@/components/ged/GEDDashboard";
import { GEDDocumentosList } from "@/components/ged/GEDDocumentosList";
import { GEDTiposConfig } from "@/components/ged/GEDTiposConfig";
import { FileText, LayoutDashboard, Settings } from "lucide-react";

export default function Documentos() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Documentos</h1>
          <p className="text-muted-foreground">
            Gerencie CNDs, catálogos, contratos e outros documentos da empresa
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="biblioteca" className="gap-2">
              <FileText className="h-4 w-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="configuracoes" className="gap-2">
              <Settings className="h-4 w-4" />
              Tipos de Documento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <GEDDashboard />
          </TabsContent>

          <TabsContent value="biblioteca" className="mt-6">
            <GEDDocumentosList />
          </TabsContent>

          <TabsContent value="configuracoes" className="mt-6">
            <GEDTiposConfig />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
