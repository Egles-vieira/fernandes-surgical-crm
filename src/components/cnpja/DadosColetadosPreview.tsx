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
                <p className="text-sm text-muted-foreground">SIMPLES Nacional</p>
                <div className="flex items-center gap-2">
                  <Badge variant={office.company?.simples?.optant ? "default" : "secondary"}>
                    {office.company?.simples?.optant ? "Optante" : "Não Optante"}
                  </Badge>
                  {office.company?.simples?.since && (
                    <span className="text-sm text-muted-foreground">
                      desde {formatarData(office.company.simples.since)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">SIMEI</p>
                <div className="flex items-center gap-2">
                  <Badge variant={office.company?.simei?.optant ? "default" : "secondary"}>
                    {office.company?.simei?.optant ? "Optante" : "Não Optante"}
                  </Badge>
                  {office.company?.simei?.since && (
                    <span className="text-sm text-muted-foreground">
                      desde {formatarData(office.company.simei.since)}
                    </span>
                  )}
                </div>
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
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {office.company.members.map((member, index) => (
                  <div
                    key={index}
                    className="bg-primary/5 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-primary">
                        {member.person.name}
                        {member.person.age && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {member.person.age} anos
                          </span>
                        )}
                      </p>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 shrink-0 text-xs">
                        {member.role.text}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-mono text-sm">{member.person.taxId}</p>
                    {member.since && (
                      <p className="text-xs text-muted-foreground">
                        Data: {formatarData(member.since)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Segunda linha: 3 colunas iguais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Inscrições Estaduais */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Inscrições Estaduais
              {office.registrations && office.registrations.length > 0 && (
                <Badge variant="secondary" className="text-xs">{office.registrations.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {office.registrations && office.registrations.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {office.registrations.map((registration, index) => (
                  <div
                    key={index}
                    className="bg-primary/5 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-primary">
                        {registration.number} - {registration.state}
                      </p>
                      <Badge variant={registration.enabled ? "default" : "destructive"} className="text-xs shrink-0">
                        {registration.enabled ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    {registration.type && (
                      <p className="text-xs text-muted-foreground">
                        {registration.type.text}
                      </p>
                    )}
                    {registration.status && (
                      <p className="text-xs text-muted-foreground">
                        {registration.status.text}
                      </p>
                    )}
                    {registration.statusDate && (
                      <p className="text-xs text-muted-foreground">
                        Data: {formatarData(registration.statusDate)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma inscrição estadual encontrada</p>
            )}
          </CardContent>
        </Card>

        {/* SUFRAMA & Incentivos */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              SUFRAMA & Incentivos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {dados.suframa && Array.isArray(dados.suframa) && dados.suframa.length > 0 ? (
              <div className="space-y-4">
                {dados.suframa.map((registro, index) => (
                  <div key={index} className="space-y-3">
                    {/* Cabeçalho com número e status */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono font-bold text-lg text-primary">
                          {formatarInscricaoSuframa(registro.number)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Desde: {registro.since ? formatarData(registro.since) : "Pendente"}
                        </p>
                      </div>
                      <Badge variant={registro.status.id === 1 ? "default" : "secondary"}>
                        {registro.status.text}
                      </Badge>
                    </div>

                    {/* Incentivos fiscais */}
                    {registro.incentives && registro.incentives.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Incentivos fiscais:
                        </p>
                        <div className="space-y-2">
                          {registro.incentives.map((incentivo, idx) => (
                            <div
                              key={idx}
                              className="bg-primary/5 rounded-lg p-3 space-y-1"
                            >
                              <p className="font-semibold text-sm text-primary">
                                {incentivo.tribute} - {incentivo.benefit}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {incentivo.purpose}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {incentivo.basis}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma inscrição SUFRAMA encontrada</p>
            )}
          </CardContent>
        </Card>

        {/* Atividades Secundárias (CNAEs) */}
        {office.sideActivities && office.sideActivities.length > 0 && (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Atividades Secundárias (CNAEs)
                <Badge variant="secondary" className="text-xs">{office.sideActivities.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {office.sideActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="bg-primary/5 rounded-lg p-3 space-y-1"
                  >
                    <p className="font-semibold text-sm text-primary">
                      {formatarCNAE(activity.id)}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {activity.text}
                    </p>
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