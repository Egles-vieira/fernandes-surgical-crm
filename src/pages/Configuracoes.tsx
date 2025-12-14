import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Palette, MessageSquare, Cloud } from "lucide-react";
import { EmpresaConfig } from "@/components/configuracoes/EmpresaConfig";
import { PersonalizarCores } from "@/components/configuracoes/PersonalizarCores";
import { WhatsAppConfigTab } from "@/components/configuracoes/WhatsAppConfigTab";
import WABAConfig from "@/pages/whatsapp/WABAConfig";

export default function Configuracoes() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card className="p-6">
        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-4">
            <TabsTrigger value="empresa" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="cores" className="gap-2">
              <Palette className="h-4 w-4" />
              Personalizar Cores
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="waba" className="gap-2">
              <Cloud className="h-4 w-4" />
              Config. Meta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
            <EmpresaConfig />
          </TabsContent>

          <TabsContent value="cores">
            <PersonalizarCores />
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppConfigTab />
          </TabsContent>

          <TabsContent value="waba">
            <WABAConfig />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}