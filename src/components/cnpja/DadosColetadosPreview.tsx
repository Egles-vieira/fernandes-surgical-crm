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
  Shield,
  CheckCircle2,
  XCircle,
  Calendar,
  Globe,
  Briefcase,
} from "lucide-react";
import {
  formatarCNPJ,
  formatarCEP,
  formatarTelefone,
  formatarData,
  obterSituacaoCadastral,
} from "@/lib/cnpja-utils";

interface DadosColetadosPreviewProps {
  dados: DadosConsolidados;
}

export function DadosColetadosPreview({ dados }: DadosColetadosPreviewProps) {
  const { office, endereco, filiais, simples, ie, suframa } = dados;
  const situacao = obterSituacaoCadastral(office.status?.id);

  return (
    <div className="space-y-4">
      {/* Dados Cadastrais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Dados Cadastrais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
            <p className="text-base font-semibold">{office.name}</p>
          </div>

          {office.alias && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome Fantasia</label>
              <p>{office.alias}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
              <p className="font-mono">{formatarCNPJ(office.taxId)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <div>
                <Badge variant={office.head ? "default" : "secondary"}>
                  {office.head ? "Matriz" : "Filial"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Situação Cadastral</label>
              <div>
                <Badge variant={situacao.cor as any}>{situacao.texto}</Badge>
              </div>
            </div>

            {office.statusDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data da Situação</label>
                <p className="flex items-center gap-1 text-sm">
                  <Calendar className="w-3 h-3" />
                  {formatarData(office.statusDate)}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {office.founded && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Abertura</label>
                <p className="flex items-center gap-1 text-sm">
                  <Calendar className="w-3 h-3" />
                  {formatarData(office.founded)}
                </p>
              </div>
            )}

            {office.company?.name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Atividade Principal</label>
                <p className="flex items-center gap-1 text-sm">
                  <Briefcase className="w-3 h-3" />
                  {office.company.name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      {office.address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Logradouro</label>
              <p>
                {office.address.street}, {office.address.number}
                {office.address.details && ` - ${office.address.details}`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                <p>{office.address.district}</p>
              </div>

              {office.address.zip && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CEP</label>
                  <p className="font-mono">{formatarCEP(office.address.zip)}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                <p>{office.address.city}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <p>{office.address.state}</p>
              </div>
            </div>

            {(office.address.municipality || office.address.country || endereco?.ibge) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {(endereco?.ibge || office.address.municipality) && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Código IBGE</label>
                      <p className="font-mono text-xs">{endereco?.ibge || office.address.municipality}</p>
                    </div>
                  )}

                  {office.address.country && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">País</label>
                      <p className="flex items-center gap-1 text-xs">
                        <Globe className="w-3 h-3" />
                        {office.address.country.name}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contatos */}
      {(office.phones?.length || office.emails?.length) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contatos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {office.phones && office.phones.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefones</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {office.phones.map((phone, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono">
                      <Phone className="w-3 h-3 mr-1" />
                      {formatarTelefone(phone.area, phone.number)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {office.emails && office.emails.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">E-mails</label>
                <div className="space-y-2 mt-2">
                  {office.emails.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span>{email.address}</span>
                      {email.domain && (
                        <Badge variant="secondary" className="text-xs">
                          @{email.domain}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filiais */}
      {filiais && filiais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Filiais
              <Badge variant="secondary" className="ml-2">
                {filiais.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filiais.slice(0, 10).map((filial, idx) => (
                <div key={idx} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{filial.name}</p>
                      {filial.alias && filial.alias !== filial.name && (
                        <p className="text-xs text-muted-foreground mt-1">{filial.alias}</p>
                      )}
                    </div>
                    {filial.status && (
                      <Badge 
                        variant={filial.status.id === 2 ? "default" : "secondary"}
                        className="ml-2"
                      >
                        {filial.status.text}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{formatarCNPJ(filial.taxId)}</span>
                    {filial.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {filial.address.city} - {filial.address.state}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {filiais.length > 10 && (
                <div className="text-center py-2">
                  <Badge variant="outline">
                    + {filiais.length - 10} filiais adicionais não exibidas
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regime Tributário */}
      {simples && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Regime Tributário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Simples Nacional:</span>
              {simples.simplesNacional?.optante || simples.simples?.optant ? (
                <Badge className="flex items-center gap-1 bg-success/10 text-success border-success/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Optante
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Não optante
                </Badge>
              )}
            </div>

            {simples.mei?.optant && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">MEI:</span>
                <Badge className="bg-success/10 text-success border-success/20">
                  Microempreendedor Individual
                </Badge>
              </div>
            )}

            {(simples.simplesNacional?.dataOpcao || simples.simples?.included) && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Data de opção: {formatarData(simples.simplesNacional?.dataOpcao || simples.simples?.included || '')}
                  </span>
                </div>

                {(simples.simplesNacional?.dataExclusao || simples.simples?.excluded) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Data de exclusão: {formatarData(simples.simplesNacional?.dataExclusao || simples.simples?.excluded || '')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inscrição Estadual */}
      {ie && ie.stateRegistration && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Inscrição Estadual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium font-mono">{ie.stateRegistration}</p>
                  {(ie.situation || ie.status) && (
                    <p className="text-sm text-muted-foreground mt-1">{ie.situation || ie.status}</p>
                  )}
                </div>
                <Badge variant="outline">IE</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suframa */}
      {suframa && suframa.registration && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Suframa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium font-mono">{suframa.registration}</p>
                  {(suframa.situation || suframa.status) && (
                    <p className="text-sm text-muted-foreground mt-1">{suframa.situation || suframa.status}</p>
                  )}
                </div>
                <Badge variant="outline">Suframa</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
