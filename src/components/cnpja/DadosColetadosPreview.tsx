import { DadosConsolidados } from "@/types/cnpja";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  Globe,
  DollarSign,
  Scale,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";
import {
  formatarCNPJ,
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
    <div className="space-y-6">
      {/* Primeira linha: 70% / 30% */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Dados Cadastrais - 70% */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados Cadastrais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Razão Social</p>
                <p className="font-medium">{office.company?.name || office.name || "Sem informação"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                <p className="font-medium">{office.alias || "Sem informação"}</p>
              </div>

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

              <div>
                <p className="text-sm text-muted-foreground">Data de Abertura</p>
                <p className="font-medium">{office.founded ? formatarData(office.founded) : "Sem informação"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Última Atualização</p>
                <p className="font-medium">{office.updated ? formatarData(office.updated) : "Sem informação"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Capital Social</p>
                <p className="font-semibold text-lg flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {office.company?.equity ? formatarCapitalSocial(office.company.equity) : "Sem informação"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Natureza Jurídica</p>
                <p className="font-medium">{office.company?.nature?.text || "Sem informação"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Porte da Empresa</p>
                <Badge variant="outline">{office.company?.size?.text || "Sem informação"}</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Inscrição Estadual</p>
                {office.registrations && office.registrations.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <p className="font-medium font-mono">{office.registrations[0].number}</p>
                    <Badge variant="outline" className="text-xs">
                      {office.registrations[0].state}
                    </Badge>
                    <Badge variant={office.registrations[0].enabled ? "default" : "destructive"} className="text-xs">
                      {office.registrations[0].enabled ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                ) : (
                  <p className="font-medium text-muted-foreground">Sem informação</p>
                )}
              </div>

              <div className="col-span-3">
                <p className="text-sm text-muted-foreground mb-2">Atividade Principal</p>
                {office.mainActivity ? (
                  <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
                    <Badge variant="default">CNAE {formatarCNAE(office.mainActivity.id)}</Badge>
                    <p className="font-medium flex-1">{office.mainActivity.text}</p>
                  </div>
                ) : (
                  <p className="font-medium text-muted-foreground">Sem informação</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quadro Societário - 30% */}
        {office.company?.members && office.company.members.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Quadro Societário
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                  {office.company.members.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {office.company.members.map((member, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:border-primary transition-colors">
                    <p className="font-semibold text-sm mb-2 line-clamp-2">{member.person.name}</p>
                    <Badge variant="outline" className="text-xs mb-2">{member.role.text}</Badge>
                    <div className="text-xs space-y-1">
                      <div>
                        <p className="text-muted-foreground">CPF/CNPJ</p>
                        <p className="font-mono font-medium">{member.person.taxId}</p>
                      </div>
                      {member.since && (
                        <div>
                          <p className="text-muted-foreground">Entrada</p>
                          <p className="font-medium">{formatarData(member.since)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Segunda linha: 3 colunas iguais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inscrições Estaduais */}
        {office.registrations && office.registrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" />
                Inscrições Estaduais
                <Badge variant="secondary" className="text-xs">{office.registrations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {office.registrations.map((registration, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {registration.state}
                      </Badge>
                      <Badge variant={registration.enabled ? "default" : "destructive"} className="text-xs">
                        {registration.enabled ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="font-mono font-semibold text-sm">{registration.number}</p>
                    {registration.type && (
                      <p className="text-xs text-muted-foreground mt-1">{registration.type.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SUFRAMA & Incentivos */}
        {dados.suframa && Array.isArray(dados.suframa) && dados.suframa.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                SUFRAMA & Incentivos
                <Badge variant="secondary" className="text-xs">{dados.suframa.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {dados.suframa.map((registro, index) => (
                  <div key={index} className="border rounded-lg p-3 hover:border-primary transition-colors">
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground">Inscrição</p>
                      <p className="font-mono font-semibold text-sm">
                        {formatarInscricaoSuframa(registro.number)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={registro.status.id === 1 ? "default" : "secondary"} className="text-xs">
                        {registro.status.text}
                      </Badge>
                      {registro.approved && (
                        <Badge variant="default" className="text-xs bg-green-600">
                          Aprovada
                        </Badge>
                      )}
                    </div>
                    {registro.incentives && registro.incentives.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">
                          {registro.incentives.length} incentivo(s)
                        </p>
                        <div className="space-y-1">
                          {registro.incentives.slice(0, 2).map((inc, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs mr-1">
                              {inc.tribute}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Atividades Secundárias (CNAEs) */}
        {office.sideActivities && office.sideActivities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Atividades Secundárias (CNAEs)
                <Badge variant="secondary" className="text-xs">{office.sideActivities.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {office.sideActivities.map((activity, index) => (
                  <div key={index} className="border rounded-lg p-2 hover:border-primary transition-colors">
                    <Badge variant="outline" className="text-xs mb-1">
                      CNAE {formatarCNAE(activity.id)}
                    </Badge>
                    <p className="text-xs leading-relaxed">{activity.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}