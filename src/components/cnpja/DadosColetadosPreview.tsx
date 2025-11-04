import { DadosConsolidados } from "@/types/cnpja";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Building,
  FileText,
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  Scale,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Globe,
  Navigation
} from "lucide-react";
import {
  formatarCNPJ,
  formatarCEP,
  formatarTelefone,
  formatarData,
  obterSituacaoCadastral,
  formatarCapitalSocial,
  formatarCNAE,
  formatarInscricaoSuframa,
  obterCorIncentivo,
  obterIconeIncentivo
} from "@/lib/cnpja-utils";

interface DadosColetadosPreviewProps {
  dados: DadosConsolidados;
}

export function DadosColetadosPreview({ dados }: DadosColetadosPreviewProps) {
  const { office } = dados;
  const situacaoCadastral = obterSituacaoCadastral(office.status?.id);

  return (
    <div className="grid gap-6 animate-fade-in">
      {/* Dados Cadastrais */}
      <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="gradient-subtle">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
            Dados Cadastrais
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Razão Social</p>
              <p className="font-semibold text-foreground text-lg">{office.company?.name || office.name}</p>
            </div>

            {office.alias && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome Fantasia</p>
                <p className="font-medium text-foreground">{office.alias}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CNPJ</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-mono font-bold text-primary">{formatarCNPJ(office.taxId)}</p>
                <Badge variant={office.head ? "default" : "secondary"} className="shadow-sm">
                  {office.head ? "🏢 Matriz" : "📍 Filial"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Situação Cadastral</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    situacaoCadastral.cor === "success"
                      ? "default"
                      : situacaoCadastral.cor === "warning"
                      ? "secondary"
                      : "destructive"
                  }
                  className="shadow-sm"
                >
                  {situacaoCadastral.texto}
                </Badge>
                {office.statusDate && (
                  <span className="text-xs text-muted-foreground">
                    {formatarData(office.statusDate)}
                  </span>
                )}
              </div>
            </div>

            {office.founded && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Data de Abertura
                </p>
                <p className="font-medium text-foreground">{formatarData(office.founded)}</p>
              </div>
            )}

            {office.updated && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Última Atualização</p>
                <p className="font-medium text-foreground">{formatarData(office.updated)}</p>
              </div>
            )}

            {office.company?.equity && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Capital Social
                </p>
                <p className="font-bold text-xl text-success">{formatarCapitalSocial(office.company.equity)}</p>
              </div>
            )}

            {office.company?.nature && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Natureza Jurídica</p>
                <p className="font-medium text-foreground">{office.company.nature.text}</p>
              </div>
            )}

            {office.company?.size && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Porte</p>
                <Badge variant="outline" className="shadow-sm">{office.company.size.text}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Atividades Econômicas */}
      {(office.mainActivity || (office.sideActivities && office.sideActivities.length > 0)) && (
        <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary">
          <CardHeader className="gradient-subtle">
            <CardTitle className="flex items-center gap-2 text-secondary">
              <Briefcase className="h-5 w-5" />
              Atividades Econômicas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {office.mainActivity && (
              <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-l-primary">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Atividade Principal
                </p>
                <div className="flex items-start gap-3">
                  <Badge variant="default" className="font-mono shrink-0">
                    {formatarCNAE(office.mainActivity.id)}
                  </Badge>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {office.mainActivity.text}
                  </p>
                </div>
              </div>
            )}

            {office.sideActivities && office.sideActivities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  Atividades Secundárias
                  <Badge variant="secondary" className="text-xs">{office.sideActivities.length}</Badge>
                </p>
                <div className="grid gap-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {office.sideActivities.map((atividade, index) => (
                    <div
                      key={index}
                      className="p-3 bg-background rounded-md border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="font-mono text-xs shrink-0">
                          {formatarCNAE(atividade.id)}
                        </Badge>
                        <p className="text-xs text-foreground leading-relaxed">{atividade.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quadro Societário */}
        {office.company?.members && office.company.members.length > 0 && (
          <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-accent">
            <CardHeader className="gradient-subtle">
              <CardTitle className="flex items-center gap-2 text-accent">
                <Users className="h-5 w-5" />
                Quadro Societário
                <Badge variant="secondary">{office.company.members.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {office.company.members.map((membro, index) => (
                  <div
                    key={index}
                    className="p-4 bg-muted/30 rounded-lg border hover:border-accent/50 transition-all hover-scale"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{membro.person.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          CPF: {membro.person.taxId}
                        </p>
                      </div>
                      {membro.person.age && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {membro.person.age} anos
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">
                        {membro.role.text}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Desde {formatarData(membro.since)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Endereço */}
        {office.address && (
          <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
            <CardHeader className="gradient-subtle">
              <CardTitle className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Logradouro</p>
                  <p className="text-sm font-medium text-foreground">
                    {office.address.street}, {office.address.number}
                  </p>
                  {office.address.details && (
                    <p className="text-xs text-muted-foreground">{office.address.details}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bairro</p>
                    <p className="text-sm text-foreground">{office.address.district}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CEP</p>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      {office.address.zip ? formatarCEP(office.address.zip) : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cidade</p>
                    <p className="text-sm font-medium text-foreground">{office.address.city}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</p>
                    <Badge variant="outline">{office.address.state}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">País</p>
                  <p className="text-sm text-foreground">{office.address.country?.name || 'Brasil'}</p>
                </div>

                {/* Coordenadas Geográficas */}
                {(office.address.latitude && office.address.longitude) && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Coordenadas Geográficas
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        <Navigation className="h-3 w-3 mr-1" />
                        {office.address.latitude.toFixed(6)}°
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        <Navigation className="h-3 w-3 mr-1" />
                        {office.address.longitude.toFixed(6)}°
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Código IBGE */}
                {office.address.municipality && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Código IBGE
                    </p>
                    <p className="font-mono text-sm font-semibold text-primary mt-1">
                      {office.address.municipality}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contatos */}
      {((office.phones && office.phones.length > 0) || (office.emails && office.emails.length > 0)) && (
        <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary">
          <CardHeader className="gradient-subtle">
            <CardTitle className="flex items-center gap-2 text-secondary">
              <Phone className="h-5 w-5" />
              Contatos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {office.phones && office.phones.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Telefones
                  </p>
                  {office.phones.map((telefone, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {formatarTelefone(telefone.area, telefone.number)}
                      </Badge>
                      {telefone.type && (
                        <span className="text-xs text-muted-foreground capitalize">
                          ({telefone.type.toLowerCase()})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {office.emails && office.emails.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    E-mails
                  </p>
                  {office.emails.map((email, index) => (
                    <div key={index} className="space-y-1">
                      <a
                        href={`mailto:${email.address}`}
                        className="text-sm text-primary hover:underline font-medium break-all"
                      >
                        {email.address}
                      </a>
                      {email.ownership && (
                        <p className="text-xs text-muted-foreground capitalize">
                          ({email.ownership.toLowerCase()})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regime Tributário */}
      {dados.simples && (
        <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-warning">
          <CardHeader className="gradient-subtle">
            <CardTitle className="flex items-center gap-2 text-warning">
              <FileText className="h-5 w-5" />
              Regime Tributário
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Simples Nacional
                </p>
                {(dados.simples.simplesNacional?.optante || dados.simples.simples?.optant) ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                    <Badge variant="default" className="w-full">Optante</Badge>
                    {(dados.simples.simplesNacional?.dataOpcao || dados.simples.simples?.included) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Desde {formatarData(dados.simples.simplesNacional?.dataOpcao || dados.simples.simples?.included || '')}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <Badge variant="outline" className="w-full">Não optante</Badge>
                  </>
                )}
              </div>

              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">SIMEI</p>
                {office.company?.simei?.optant ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                    <Badge variant="default" className="w-full">Optante</Badge>
                    {office.company.simei.since && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Desde {formatarData(office.company.simei.since)}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <Badge variant="outline" className="w-full">Não optante</Badge>
                  </>
                )}
              </div>

              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">MEI</p>
                {dados.simples.mei?.optant ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                    <Badge variant="default" className="w-full">É MEI</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <Badge variant="outline" className="w-full">Não é MEI</Badge>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inscrições Estaduais */}
      {office.registrations && office.registrations.length > 0 && (
        <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-accent">
          <CardHeader className="gradient-subtle">
            <CardTitle className="flex items-center gap-2 text-accent">
              <ClipboardList className="h-5 w-5" />
              Inscrições Estaduais
              <Badge variant="secondary">{office.registrations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-2">
                      Número
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-2">
                      Estado
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-2">
                      Tipo
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-2">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide py-2">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {office.registrations.map((registro, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-mono text-sm font-semibold text-foreground">
                        {registro.number}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline">{registro.state}</Badge>
                      </td>
                      <td className="py-3 text-sm text-foreground">
                        {registro.type?.text || '-'}
                      </td>
                      <td className="py-3">
                        <Badge variant={registro.enabled ? "default" : "destructive"}>
                          {registro.status?.text || (registro.enabled ? 'Ativa' : 'Inativa')}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {registro.statusDate ? formatarData(registro.statusDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filiais */}
      {dados.filiais && dados.filiais.length > 0 && (
        <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary">
          <CardHeader className="gradient-subtle">
            <CardTitle className="flex items-center gap-2 text-secondary">
              <Building className="h-5 w-5" />
              Filiais
              <Badge variant="secondary">{dados.filiais.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-3 max-h-96 overflow-y-auto custom-scrollbar">
              {dados.filiais.slice(0, 10).map((filial, index) => (
                <div
                  key={index}
                  className="p-4 bg-muted/30 rounded-lg border hover:border-secondary/50 transition-all hover-scale"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{filial.name || filial.alias}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">
                        CNPJ: {formatarCNPJ(filial.taxId)}
                      </p>
                    </div>
                    {filial.status && (
                      <Badge
                        variant={filial.status.id === 2 ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {filial.status.text}
                      </Badge>
                    )}
                  </div>
                  {filial.address && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {filial.address.city} - {filial.address.state}
                    </p>
                  )}
                </div>
              ))}
              {dados.filiais.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  + {dados.filiais.length - 10} filiais não exibidas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suframa - Zona Franca */}
      {dados.suframa && Array.isArray(dados.suframa) && dados.suframa.length > 0 && (
        <Card className="shadow-elegant hover:shadow-lg transition-all duration-300 border-l-4 border-l-success">
          <CardHeader className="gradient-subtle">
            <CardTitle className="flex items-center gap-2 text-success">
              <Globe className="h-5 w-5" />
              Suframa - Zona Franca de Manaus
              <Badge variant="secondary">{dados.suframa.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {dados.suframa.map((registro, index) => (
                <div key={index} className="border rounded-lg p-5 bg-muted/20 hover:border-success/50 transition-all">
                  {/* Cabeçalho do Registro */}
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Inscrição Suframa
                      </p>
                      <p className="font-mono font-bold text-2xl text-success">
                        {formatarInscricaoSuframa(registro.number)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Cadastrado em {formatarData(registro.since)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={registro.status.id === 1 ? "default" : "secondary"} className="shadow-sm">
                        {registro.status.text}
                      </Badge>
                      <Badge variant={registro.approved ? "default" : "outline"} className="shadow-sm">
                        {registro.approved ? "✓ Aprovada" : "⏳ Pendente"}
                      </Badge>
                    </div>
                  </div>

                  {registro.approvalDate && (
                    <div className="mb-4 flex items-center gap-2 text-sm p-3 bg-success/10 rounded-md">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-foreground">
                        Data de Aprovação: <strong>{formatarData(registro.approvalDate)}</strong>
                      </span>
                    </div>
                  )}

                  {/* Incentivos Fiscais */}
                  {registro.incentives && registro.incentives.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                          <Scale className="h-4 w-4" />
                          Incentivos Fiscais
                          <Badge variant="secondary" className="shadow-sm">{registro.incentives.length}</Badge>
                        </p>
                        <div className="space-y-3">
                          {registro.incentives.map((incentivo, idx) => (
                            <div 
                              key={idx} 
                              className="bg-background rounded-lg p-4 border hover:border-success/50 transition-all hover-scale"
                            >
                              {/* Cabeçalho do Incentivo */}
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="text-2xl">{obterIconeIncentivo(incentivo.tribute)}</span>
                                <Badge variant={obterCorIncentivo(incentivo.tribute) as any} className="shadow-sm">
                                  {incentivo.tribute}
                                </Badge>
                                <Badge variant="secondary" className="shadow-sm">{incentivo.benefit}</Badge>
                              </div>

                              {/* Detalhes */}
                              <div className="space-y-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">
                                    Finalidade
                                  </p>
                                  <p className="text-foreground leading-relaxed">{incentivo.purpose}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">
                                    Base Legal
                                  </p>
                                  <p className="font-mono text-xs bg-muted px-3 py-2 rounded border">
                                    {incentivo.basis}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
