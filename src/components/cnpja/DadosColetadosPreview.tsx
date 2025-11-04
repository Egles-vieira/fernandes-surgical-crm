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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dados Cadastrais */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados Cadastrais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Razão Social</p>
              <p className="font-medium">{office.company?.name || office.name}</p>
            </div>

            {office.alias && (
              <div>
                <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                <p className="font-medium">{office.alias}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <div className="flex items-center gap-2">
                <p className="font-medium font-mono">{formatarCNPJ(office.taxId)}</p>
                <Badge variant={office.head ? "default" : "secondary"}>
                  {office.head ? "Matriz" : "Filial"}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Situação Cadastral</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    situacaoCadastral.cor === "success"
                      ? "default"
                      : situacaoCadastral.cor === "warning"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {situacaoCadastral.texto}
                </Badge>
                {office.statusDate && (
                  <span className="text-sm text-muted-foreground">
                    {formatarData(office.statusDate)}
                  </span>
                )}
              </div>
            </div>

            {office.founded && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Abertura</p>
                <p className="font-medium">{formatarData(office.founded)}</p>
              </div>
            )}

            {office.updated && (
              <div>
                <p className="text-sm text-muted-foreground">Última Atualização</p>
                <p className="font-medium">{formatarData(office.updated)}</p>
              </div>
            )}

            {office.company?.equity && (
              <div>
                <p className="text-sm text-muted-foreground">Capital Social</p>
                <p className="font-semibold text-lg flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatarCapitalSocial(office.company.equity)}
                </p>
              </div>
            )}

            {office.company?.nature && (
              <div>
                <p className="text-sm text-muted-foreground">Natureza Jurídica</p>
                <p className="font-medium">{office.company.nature.text}</p>
              </div>
            )}

            {office.company?.size && (
              <div>
                <p className="text-sm text-muted-foreground">Porte da Empresa</p>
                <Badge variant="outline">{office.company.size.text}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Atividades Econômicas */}
      {(office.mainActivity || (office.sideActivities && office.sideActivities.length > 0)) && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Atividades Econômicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {office.mainActivity && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Atividade Principal</p>
                <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                  <Badge variant="default">CNAE {formatarCNAE(office.mainActivity.id)}</Badge>
                  <p className="font-medium flex-1">{office.mainActivity.text}</p>
                </div>
              </div>
            )}

            {office.sideActivities && office.sideActivities.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Atividades Secundárias ({office.sideActivities.length})
                </p>
                <div className="space-y-2">
                  {office.sideActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm p-2 hover:bg-accent rounded">
                      <Badge variant="outline" className="shrink-0">
                        CNAE {formatarCNAE(activity.id)}
                      </Badge>
                      <p className="flex-1">{activity.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quadro Societário */}
      {office.company?.members && office.company.members.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quadro Societário
              <Badge variant="secondary">{office.company.members.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {office.company.members.map((member, index) => (
                <div key={index} className="border rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-base">{member.person.name}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="default">{member.role.text}</Badge>
                        {member.person.age && (
                          <Badge variant="outline">{member.person.age} anos</Badge>
                        )}
                        <Badge variant="secondary">{member.person.type}</Badge>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">CPF/CNPJ</p>
                      <p className="font-mono font-medium">{member.person.taxId}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Entrada na Sociedade</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatarData(member.since)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Endereço */}
      {office.address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium">
                {office.address.street}
                {office.address.number && `, ${office.address.number}`}
                {office.address.details && ` - ${office.address.details}`}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {office.address.district}
              </p>
              <p className="font-medium">
                {office.address.city}/{office.address.state}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CEP</p>
              <p className="font-mono">{office.address.zip ? formatarCEP(office.address.zip) : "Não informado"}</p>
            </div>
            {office.address.country && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {office.address.country.name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contatos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contatos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {office.phones && office.phones.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Telefones</p>
              <div className="flex flex-wrap gap-2">
                {office.phones.map((phone, index) => (
                  <Badge key={index} variant="outline" className="font-mono">
                    {phone.type && `${phone.type}: `}
                    {formatarTelefone(phone.area, phone.number)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {office.emails && office.emails.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">E-mails</p>
              <div className="space-y-2">
                {office.emails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{email.address}</span>
                    {email.ownership && (
                      <Badge variant="secondary" className="text-xs">
                        {email.ownership}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regime Tributário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Regime Tributário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {office.company?.simples && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {office.company.simples.optant ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Simples Nacional</p>
                  {office.company.simples.since && office.company.simples.optant && (
                    <p className="text-xs text-muted-foreground">
                      desde {formatarData(office.company.simples.since)}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={office.company.simples.optant ? "default" : "outline"}>
                {office.company.simples.optant ? "Optante" : "Não Optante"}
              </Badge>
            </div>
          )}

          {office.company?.simei && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {office.company.simei.optant ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">SIMEI</p>
                  {office.company.simei.since && office.company.simei.optant && (
                    <p className="text-xs text-muted-foreground">
                      desde {formatarData(office.company.simei.since)}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={office.company.simei.optant ? "default" : "outline"}>
                {office.company.simei.optant ? "Optante" : "Não Optante"}
              </Badge>
            </div>
          )}

          {dados.simples?.mei && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {dados.simples.mei.optant ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <p className="font-medium">MEI</p>
              </div>
              <Badge variant={dados.simples.mei.optant ? "default" : "outline"}>
                {dados.simples.mei.optant ? "Optante" : "Não Optante"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inscrições Estaduais */}
      {office.registrations && office.registrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Inscrições Estaduais
              <Badge variant="secondary">{office.registrations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {office.registrations.map((registration, index) => (
                <div key={index} className="border rounded-lg p-3 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {registration.state}
                      </Badge>
                      <span className="font-mono font-semibold">{registration.number}</span>
                    </div>
                    <Badge variant={registration.enabled ? "default" : "destructive"}>
                      {registration.enabled ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {registration.type && (
                      <div>
                        <p className="text-muted-foreground">Tipo</p>
                        <p className="font-medium">{registration.type.text}</p>
                      </div>
                    )}
                    {registration.status && (
                      <div>
                        <p className="text-muted-foreground">Situação</p>
                        <p className="font-medium">{registration.status.text}</p>
                      </div>
                    )}
                    {registration.statusDate && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Data da Situação</p>
                        <p className="font-medium">{formatarData(registration.statusDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filiais */}
      {dados.filiais && dados.filiais.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Filiais
              <Badge variant="secondary">{dados.filiais.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dados.filiais.slice(0, 10).map((filial, index) => (
                <div key={index} className="border rounded-lg p-3 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{filial.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {formatarCNPJ(filial.taxId)}
                      </p>
                    </div>
                    {filial.status && (
                      <Badge
                        variant={filial.status.id === 2 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {filial.status.text}
                      </Badge>
                    )}
                  </div>
                  {filial.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {filial.address.city}/{filial.address.state}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {dados.filiais.length > 10 && (
              <p className="text-sm text-muted-foreground text-center mt-3">
                + {dados.filiais.length - 10} filiais não exibidas
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suframa - Zona Franca */}
      {dados.suframa && Array.isArray(dados.suframa) && dados.suframa.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Suframa - Zona Franca de Manaus
              <Badge variant="secondary">{dados.suframa.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dados.suframa.map((registro, index) => (
                <div key={index} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  {/* Cabeçalho do Registro */}
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-muted-foreground">Inscrição Suframa</p>
                      <p className="font-mono font-bold text-lg text-primary">
                        {formatarInscricaoSuframa(registro.number)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Cadastrado em {formatarData(registro.since)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={registro.status.id === 1 ? "default" : "secondary"}>
                        {registro.status.text}
                      </Badge>
                      <Badge variant={registro.approved ? "default" : "outline"}>
                        {registro.approved ? "✓ Aprovada" : "⏳ Pendente"}
                      </Badge>
                    </div>
                  </div>

                  {registro.approvalDate && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Data de Aprovação: {formatarData(registro.approvalDate)}
                    </div>
                  )}

                  {/* Incentivos Fiscais */}
                  {registro.incentives && registro.incentives.length > 0 && (
                    <>
                      <div className="border-t pt-4 mt-4">
                        <p className="font-semibold mb-3 flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Incentivos Fiscais
                          <Badge variant="secondary">{registro.incentives.length}</Badge>
                        </p>
                        <div className="space-y-3">
                          {registro.incentives.map((incentivo, idx) => (
                            <div 
                              key={idx} 
                              className="bg-accent/50 rounded-lg p-4 hover:bg-accent transition-colors"
                            >
                              {/* Cabeçalho do Incentivo */}
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="text-2xl">{obterIconeIncentivo(incentivo.tribute)}</span>
                                <Badge className={obterCorIncentivo(incentivo.tribute)}>
                                  {incentivo.tribute}
                                </Badge>
                                <Badge variant="secondary">{incentivo.benefit}</Badge>
                              </div>

                              {/* Detalhes */}
                              <div className="space-y-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs font-medium mb-1">Finalidade</p>
                                  <p className="text-foreground leading-relaxed">{incentivo.purpose}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs font-medium mb-1">Base Legal</p>
                                  <p className="font-mono text-xs bg-background px-3 py-2 rounded border">
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
