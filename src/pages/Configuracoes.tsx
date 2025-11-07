import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Settings as SettingsIcon } from "lucide-react";
import { EmpresaConfig } from "@/components/configuracoes/EmpresaConfig";

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
          <TabsList className="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
            <TabsTrigger value="empresa" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            {/* Futuras abas serão adicionadas aqui */}
          </TabsList>

          <TabsContent value="empresa">
            <EmpresaConfig />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
