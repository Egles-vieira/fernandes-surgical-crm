import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GEDDashboard } from "@/components/ged/GEDDashboard";
import { GEDDocumentosList } from "@/components/ged/GEDDocumentosList";
import { GEDTiposConfig } from "@/components/ged/GEDTiposConfig";
import { FileText, LayoutDashboard, Settings, FolderArchive } from "lucide-react";
import { useRoles } from "@/hooks/useRoles";

export default function Documentos() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { isAdmin, isManager } = useRoles();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FolderArchive className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Gestão de Documentos</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie CNDs, catálogos, contratos e outros documentos da empresa
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="biblioteca" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            Biblioteca
          </TabsTrigger>
          {(isAdmin || isManager) && (
            <TabsTrigger value="configuracoes" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4" />
              Tipos de Documento
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <GEDDashboard />
        </TabsContent>

        <TabsContent value="biblioteca" className="mt-0">
          <GEDDocumentosList />
        </TabsContent>

        {(isAdmin || isManager) && (
          <TabsContent value="configuracoes" className="mt-0">
            <GEDTiposConfig />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}