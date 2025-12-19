import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Palette, MessageSquare, Cloud, Clock, Brain, Zap } from "lucide-react";
import { EmpresaConfig } from "@/components/configuracoes/EmpresaConfig";
import { PersonalizarCores } from "@/components/configuracoes/PersonalizarCores";
import { WhatsAppConfigTab } from "@/components/configuracoes/WhatsAppConfigTab";
import { CronJobsConfig } from "@/components/configuracoes/CronJobsConfig";
import { JobsAssincronosConfig } from "@/components/configuracoes/JobsAssincronosConfig";
import { IAConfigTab } from "@/components/configuracoes/IAConfigTab";
import WABAConfig from "@/pages/whatsapp/WABAConfig";
export default function Configuracoes() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card className="p-6">
        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="grid w-full max-w-6xl grid-cols-7">
            <TabsTrigger value="empresa" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="cores" className="gap-2">
              <Palette className="h-4 w-4" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="waba" className="gap-2">
              <Cloud className="h-4 w-4" />
              Meta
            </TabsTrigger>
            <TabsTrigger value="ia" className="gap-2">
              <Brain className="h-4 w-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="agendamentos" className="gap-2">
              <Clock className="h-4 w-4" />
              Cron Jobs
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Zap className="h-4 w-4" />
              Jobs
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

          <TabsContent value="ia">
            <IAConfigTab />
          </TabsContent>

          <TabsContent value="agendamentos">
            <CronJobsConfig />
          </TabsContent>

          <TabsContent value="jobs">
            <JobsAssincronosConfig />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
