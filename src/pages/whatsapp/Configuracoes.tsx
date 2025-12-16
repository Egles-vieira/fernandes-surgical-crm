import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Plus, Activity, Building2, Clock, Users, MessageSquare, Zap, LayoutGrid, Phone, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Componentes de Config existentes
import ContasWhatsAppList from "@/components/whatsapp/config/ContasWhatsAppList";
import NovaContaDialog from "@/components/whatsapp/config/NovaContaDialog";
import TemplatesWhatsApp from "@/components/whatsapp/config/TemplatesWhatsApp";
import RespostasRapidas from "@/components/whatsapp/config/RespostasRapidas";
import { GerenciarFilasWhatsApp } from "@/components/whatsapp/config/GerenciarFilasWhatsApp";
import { GerenciarCarteiras } from "@/components/whatsapp/config/GerenciarCarteiras";

// Componentes de Governança
import { 
  UnidadesManager, 
  ExpedienteConfig, 
  FeriadosCalendar,
  ConfiguracoesAtendimento,
  TemplatesSistema 
} from "@/components/whatsapp/governanca";

const ConfiguracoesWhatsApp = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6">
        {/* Header */}
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
                  Central de configuração do módulo WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => navigate('/whatsapp/bam')}
              >
                <Activity className="w-4 h-4 mr-2" />
                Monitor BAM
              </Button>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-br from-primary to-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Conta
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs com 8 abas */}
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="geral" className="gap-1.5">
              <Settings className="w-4 h-4 hidden sm:block" />
              <span>Geral</span>
            </TabsTrigger>
            <TabsTrigger value="contas" className="gap-1.5">
              <Phone className="w-4 h-4 hidden sm:block" />
              <span>Contas</span>
            </TabsTrigger>
            <TabsTrigger value="unidades" className="gap-1.5">
              <Building2 className="w-4 h-4 hidden sm:block" />
              <span>Unidades</span>
            </TabsTrigger>
            <TabsTrigger value="expediente" className="gap-1.5">
              <Clock className="w-4 h-4 hidden sm:block" />
              <span>Expediente</span>
            </TabsTrigger>
            <TabsTrigger value="filas" className="gap-1.5">
              <LayoutGrid className="w-4 h-4 hidden sm:block" />
              <span>Filas</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <MessageSquare className="w-4 h-4 hidden sm:block" />
              <span>Templates</span>
            </TabsTrigger>
            <TabsTrigger value="respostas" className="gap-1.5">
              <Zap className="w-4 h-4 hidden sm:block" />
              <span>Respostas</span>
            </TabsTrigger>
            <TabsTrigger value="equipe" className="gap-1.5">
              <Users className="w-4 h-4 hidden sm:block" />
              <span>Equipe</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Geral */}
          <TabsContent value="geral">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Modo de Operação WhatsApp</CardTitle>
                  <CardDescription>
                    Configure qual provedor de API o sistema deve utilizar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => navigate('/whatsapp/configuracao-global')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Gerenciar Configuração Global
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SLA & Distribuição</CardTitle>
                  <CardDescription>
                    Configure tempos de resposta e regras de distribuição
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConfiguracoesAtendimento />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Contas */}
          <TabsContent value="contas">
            <ContasWhatsAppList />
          </TabsContent>

          {/* Tab: Unidades */}
          <TabsContent value="unidades">
            <UnidadesManager />
          </TabsContent>

          {/* Tab: Expediente */}
          <TabsContent value="expediente">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Horários de Expediente</CardTitle>
                  <CardDescription>
                    Configure os horários de atendimento por dia da semana
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpedienteConfig />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calendário de Feriados</CardTitle>
                  <CardDescription>
                    Gerencie os feriados e datas sem atendimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FeriadosCalendar />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Filas WhatsApp */}
          <TabsContent value="filas">
            <GerenciarFilasWhatsApp />
          </TabsContent>

          {/* Tab: Templates */}
          <TabsContent value="templates">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Templates de API (HSM)</CardTitle>
                  <CardDescription>
                    Templates aprovados para envio via API oficial
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplatesWhatsApp />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Templates do Sistema</CardTitle>
                  <CardDescription>
                    Mensagens pré-configuradas para automações internas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplatesSistema />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Equipe - Carteiras + BAM */}
          <TabsContent value="equipe">
            <div className="space-y-6">
              {/* Carteiras de Clientes */}
              <GerenciarCarteiras />

              {/* Acesso ao BAM */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Monitor de Atendimento (BAM)
                  </CardTitle>
                  <CardDescription>
                    Acompanhe operadores em tempo real, gerencie disponibilidade e distribua conversas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate('/whatsapp/bam')}>
                    <Activity className="w-4 h-4 mr-2" />
                    Acessar Monitor BAM
                  </Button>
                </CardContent>
              </Card>
            </div>
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
