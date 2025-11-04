import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCNPJA } from "@/hooks/useCNPJA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, AlertCircle, CheckCircle2, XCircle, Loader2, ArrowLeft, Calculator, X, Edit, Users } from "lucide-react";
import { ProgressoCNPJA } from "@/components/cnpja/ProgressoCNPJA";
import { DadosColetadosPreview } from "@/components/cnpja/DadosColetadosPreview";
import { useToast } from "@/hooks/use-toast";
export default function CadastroCNPJ() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [cnpj, setCnpj] = useState("");
  const {
    consultarCNPJ,
    resetar,
    status,
    progresso,
    decisoes,
    dadosColetados,
    erro
  } = useCNPJA();
  const handleConsultar = async () => {
    if (!cnpj.trim()) return;
    await consultarCNPJ(cnpj, {
      tipoCliente: 'comum',
      emiteNF: true,
      trabalhaComICMS: true,
      operacoesInterestaduais: true,
      sempreValidarCEP: true
    });
  };
  const handleNovaConsulta = () => {
    setCnpj("");
    resetar();
  };
  const handleCriarCliente = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Em breve você poderá criar clientes a partir dos dados coletados"
    });
  };
  const renderStatusBadge = () => {
    const statusMap = {
      idle: {
        label: "Aguardando",
        variant: "secondary" as const,
        icon: AlertCircle,
        color: "text-muted-foreground"
      },
      validando: {
        label: "Validando",
        variant: "default" as const,
        icon: Loader2,
        color: "text-blue-500"
      },
      consultando: {
        label: "Consultando",
        variant: "default" as const,
        icon: Loader2,
        color: "text-blue-500"
      },
      decidindo: {
        label: "Analisando",
        variant: "default" as const,
        icon: Loader2,
        color: "text-purple-500"
      },
      executando: {
        label: "Coletando",
        variant: "default" as const,
        icon: Loader2,
        color: "text-orange-500"
      },
      consolidando: {
        label: "Consolidando",
        variant: "default" as const,
        icon: Loader2,
        color: "text-indigo-500"
      },
      concluido: {
        label: "Concluído",
        variant: "default" as const,
        icon: CheckCircle2,
        color: "text-green-500"
      },
      erro: {
        label: "Erro",
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-destructive"
      }
    };
    const current = statusMap[status];
    const Icon = current.icon;
    return <Badge variant={current.variant} className="gap-1.5 px-3 py-1.5">
        <Icon className={`h-4 w-4 ${current.color} ${status !== 'concluido' && status !== 'erro' && status !== 'idle' ? 'animate-spin' : ''}`} />
        {current.label}
      </Badge>;
  };
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl space-y-4">

        {/* Status da Proposta */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status da Proposta:</span>
          {renderStatusBadge()}
        </div>

        {/* Barra de Ações */}
        {status === 'concluido' && dadosColetados && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Calculator className="h-4 w-4" />
              Calcular
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleNovaConsulta}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              Desistir
            </Button>
            <Button variant="default" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </div>
        )}

        {/* Formulário de consulta */}
        {(status === 'idle' || status === 'erro') && <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Consultar CNPJ
              </CardTitle>
              <CardDescription>
                Digite o CNPJ para consultar dados da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input placeholder="00.000.000/0000-00" value={cnpj} onChange={e => setCnpj(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleConsultar()} className="flex-1" />
                <Button onClick={handleConsultar} disabled={!cnpj.trim()} size="lg" className="min-w-[120px]">
                  <Search className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
              </div>
              {erro && <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{erro}</p>
                </div>}
            </CardContent>
          </Card>}

        {/* Progresso */}
        {status !== 'idle' && status !== 'concluido' && status !== 'erro' && <Card>
            <CardContent className="pt-6">
              <ProgressoCNPJA status={status} progresso={progresso} />
            </CardContent>
          </Card>}

        {/* Dados Coletados com Tabs */}
        {status === 'concluido' && dadosColetados && (
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Dados Cadastrais
              </TabsTrigger>
              <TabsTrigger value="atividades" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Atividades
              </TabsTrigger>
              <TabsTrigger value="fiscais" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Cadastros & Fiscais
              </TabsTrigger>
              <TabsTrigger value="contatos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Contatos
              </TabsTrigger>
              <TabsTrigger value="anotacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Anotações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-6">
              <DadosColetadosPreview dados={dadosColetados} />
            </TabsContent>

            <TabsContent value="atividades" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Atividade Principal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dadosColetados.office?.mainActivity && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {String(dadosColetados.office.mainActivity.id)}
                          </Badge>
                          <p className="text-sm flex-1">{dadosColetados.office.mainActivity.text}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Atividades Secundárias (CNAEs)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dadosColetados.office?.sideActivities && dadosColetados.office.sideActivities.length > 0 ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {dadosColetados.office.sideActivities.map((activity, idx) => (
                          <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                            <Badge variant="outline" className="font-mono text-xs">
                              {String(activity.id)}
                            </Badge>
                            <p className="text-sm flex-1">{activity.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma atividade secundária cadastrada</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fiscais" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Inscrições Estaduais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dadosColetados.ie ? (
                      <div className="space-y-2">
                        <div className="p-3 border rounded-lg">
                          <div>
                            <p className="font-mono text-sm">{dadosColetados.ie.stateRegistration || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">
                              CNPJ: {dadosColetados.ie.taxId}
                            </p>
                          </div>
                          <Badge variant={dadosColetados.ie.status === 'Ativa' ? "default" : "secondary"} className="mt-2">
                            {dadosColetados.ie.status || dadosColetados.ie.situation || 'Sem informação'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma inscrição estadual encontrada</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">SUFRAMA & Incentivos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dadosColetados.suframa && dadosColetados.suframa.length > 0 ? (
                      dadosColetados.suframa.map((suf, idx) => (
                        <div key={idx} className="space-y-3">
                          <div className="flex items-center justify-between">
                             <div>
                               <p className="font-mono text-sm font-medium">{suf.number}</p>
                               <p className="text-xs text-muted-foreground">
                                 Desde: {suf.approvalDate ? new Date(suf.approvalDate).toLocaleDateString('pt-BR') : 'Pendente'}
                               </p>
                             </div>
                            <Badge variant="default">{suf.status.text}</Badge>
                          </div>
                          {suf.incentives && suf.incentives.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium">Incentivos fiscais:</p>
                              {suf.incentives.map((inc, incIdx) => (
                                <div key={incIdx} className="p-2 bg-muted rounded text-xs">
                                  <p className="font-medium">{inc.tribute} - {inc.benefit}</p>
                                  <p className="text-muted-foreground">{inc.purpose}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{inc.basis}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Empresa não possui registro SUFRAMA</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="contatos" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dadosColetados.office?.phones && dadosColetados.office.phones.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Telefones:</p>
                      <div className="flex flex-wrap gap-2">
                        {dadosColetados.office.phones.map((phone, idx) => (
                          <Badge key={idx} variant="outline" className="font-mono">
                            ({phone.area}) {phone.number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {dadosColetados.office?.emails && dadosColetados.office.emails.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">E-mails:</p>
                      <div className="flex flex-wrap gap-2">
                        {dadosColetados.office.emails.map((email, idx) => (
                          <Badge key={idx} variant="outline">
                            {email.address}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {dadosColetados.office?.address && (
                    <div>
                      <p className="text-sm font-medium mb-2">Endereço:</p>
                      <p className="text-sm text-muted-foreground">
                        {dadosColetados.office.address.street}
                        {dadosColetados.office.address.number && `, ${dadosColetados.office.address.number}`}
                        {dadosColetados.office.address.details && ` - ${dadosColetados.office.address.details}`}
                        <br />
                        {dadosColetados.office.address.district && `${dadosColetados.office.address.district} - `}
                        {dadosColetados.office.address.city}/{dadosColetados.office.address.state}
                        <br />
                        CEP: {dadosColetados.office.address.zip}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anotacoes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Observações Internas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Notas de qualificação, histórico de SAC, combinações comerciais, SLAs de entrega, etc.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium mb-2">Etiquetas</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge>Hospitalar</Badge>
                        <Badge>Distribuidor</Badge>
                        <Badge>Manaus-AM</Badge>
                        <Badge>EPP</Badge>
                        <Badge>SUFRAMA</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-2">Checklist Rápido</p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Conferir cadastro fiscal</li>
                        <li>Validar condições comerciais</li>
                        <li>Mapear responsáveis de compras</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>;
}