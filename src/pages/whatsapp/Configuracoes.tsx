import { useState } from "react";
import { Settings, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContasWhatsAppList from "@/components/whatsapp/config/ContasWhatsAppList";
import NovaContaDialog from "@/components/whatsapp/config/NovaContaDialog";
import TemplatesWhatsApp from "@/components/whatsapp/config/TemplatesWhatsApp";
import RespostasRapidas from "@/components/whatsapp/config/RespostasRapidas";

const ConfiguracoesWhatsApp = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Configurações WhatsApp
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie contas, templates e respostas rápidas
                </p>
              </div>
            </div>

            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-br from-primary to-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>

        <Tabs defaultValue="contas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="contas">Contas</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="respostas">Respostas Rápidas</TabsTrigger>
          </TabsList>

          <TabsContent value="contas">
            <ContasWhatsAppList />
          </TabsContent>

          <TabsContent value="templates">
            <TemplatesWhatsApp />
          </TabsContent>

          <TabsContent value="respostas">
            <RespostasRapidas />
          </TabsContent>
        </Tabs>

        <NovaContaDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
        />
      </div>
    </div>
  );
};

export default ConfiguracoesWhatsApp;
