import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Plus, Activity, Building2, Clock, Users, MessageSquare, Zap, LayoutGrid, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Componentes de Config existentes
import ContasWhatsAppList from "@/components/whatsapp/config/ContasWhatsAppList";
import NovaContaDialog from "@/components/whatsapp/config/NovaContaDialog";
import TemplatesWhatsApp from "@/components/whatsapp/config/TemplatesWhatsApp";
import RespostasRapidas from "@/components/whatsapp/config/RespostasRapidas";
import { GerenciarFilas } from "@/components/whatsapp/config/GerenciarFilas";
import { StatusDisponibilidadeCard } from "@/components/whatsapp/StatusDisponibilidadeCard";
import { VendedoresDisponiveisPanel } from "@/components/whatsapp/VendedoresDisponiveisPanel";

// Componentes de Governança
import { 
  UnidadesManager, 
  ExpedienteConfig, 
  FeriadosCalendar,
  ConfiguracoesAtendimento,
  TemplatesSistema 
} from "@/components/whatsapp/governanca";

export const WhatsAppConfigTab = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configurações WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Central de configuração do módulo WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => navigate('/whatsapp/bam')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Monitor BAM
          </Button>
          <Button 
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Sub-Tabs com 8 abas */}
      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="geral" className="gap-1.5 text-xs sm:text-sm">
            <Settings className="w-3.5 h-3.5 hidden sm:block" />
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="contas" className="gap-1.5 text-xs sm:text-sm">
            <Phone className="w-3.5 h-3.5 hidden sm:block" />
            <span>Contas</span>
          </TabsTrigger>
          <TabsTrigger value="unidades" className="gap-1.5 text-xs sm:text-sm">
            <Building2 className="w-3.5 h-3.5 hidden sm:block" />
            <span>Unidades</span>
          </TabsTrigger>
          <TabsTrigger value="expediente" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="w-3.5 h-3.5 hidden sm:block" />
            <span>Expediente</span>
          </TabsTrigger>
          <TabsTrigger value="filas" className="gap-1.5 text-xs sm:text-sm">
            <LayoutGrid className="w-3.5 h-3.5 hidden sm:block" />
            <span>Filas</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="w-3.5 h-3.5 hidden sm:block" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="respostas" className="gap-1.5 text-xs sm:text-sm">
            <Zap className="w-3.5 h-3.5 hidden sm:block" />
            <span>Respostas</span>
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5 text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5 hidden sm:block" />
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

        {/* Tab: Filas */}
        <TabsContent value="filas">
          <GerenciarFilas />
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

        {/* Tab: Respostas */}
        <TabsContent value="respostas">
          <RespostasRapidas />
        </TabsContent>

        {/* Tab: Equipe */}
        <TabsContent value="equipe">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusDisponibilidadeCard />
            <VendedoresDisponiveisPanel />
          </div>
        </TabsContent>
      </Tabs>

      <NovaContaDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
  );
};
