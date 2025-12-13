import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Settings as SettingsIcon, Palette, MessageSquare } from "lucide-react";
import { EmpresaConfig } from "@/components/configuracoes/EmpresaConfig";
import { PersonalizarCores } from "@/components/configuracoes/PersonalizarCores";
import { WhatsAppConfigTab } from "@/components/configuracoes/WhatsAppConfigTab";

export default function Configuracoes() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-3">
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
        </Tabs>
      </Card>
    </div>
  );
}
