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
        <CardContent className="space-y-3">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
              <p className="font-mono">{formatarCNPJ(office.taxId)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <Badge variant={office.head ? "default" : "secondary"}>
                {office.head ? "Matriz" : "Filial"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Situação</label>
              <Badge variant={situacao.cor as any}>{situacao.texto}</Badge>
            </div>

            {office.founded && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Abertura</label>
                <p>{formatarData(office.founded)}</p>
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
          <CardContent className="space-y-2">
            <div>
              <p>
                {office.address.street}, {office.address.number}
                {office.address.details && ` - ${office.address.details}`}
              </p>
              <p className="text-muted-foreground">
                {office.address.district} - {office.address.city}/{office.address.state}
              </p>
              {office.address.zip && (
                <p className="text-muted-foreground">CEP: {formatarCEP(office.address.zip)}</p>
              )}
            </div>

            {endereco && endereco.ibge && (
              <div className="pt-2 text-xs text-muted-foreground">
                <p>Código IBGE: {endereco.ibge}</p>
              </div>
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
          <CardContent className="space-y-3">
            {office.phones && office.phones.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefones</label>
                <div className="space-y-1 mt-1">
                  {office.phones.slice(0, 3).map((phone, idx) => (
                    <p key={idx} className="font-mono">
                      {formatarTelefone(phone.area, phone.number)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {office.emails && office.emails.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">E-mails</label>
                <div className="space-y-1 mt-1">
                  {office.emails.slice(0, 3).map((email, idx) => (
                    <p key={idx} className="text-sm">
                      {email.address}
                    </p>
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
              Filiais ({filiais.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filiais.slice(0, 5).map((filial, idx) => (
                <div key={idx} className="flex justify-between items-center py-2">
                  <div>
                    <p className="font-medium">{filial.alias || filial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {filial.address?.city}/{filial.address?.state}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatarCNPJ(filial.taxId)}
                  </Badge>
                </div>
              ))}
              {filiais.length > 5 && (
                <p className="text-sm text-muted-foreground pt-2">
                  + {filiais.length - 5} filiais adicionais
                </p>
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
          <CardContent className="space-y-3">
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
                <Badge className="bg-success/10 text-success border-success/20">Sim</Badge>
              </div>
            )}

            {(simples.simplesNacional?.dataOpcao || simples.simples?.included) && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Data de opção:{" "}
                  {formatarData(simples.simplesNacional?.dataOpcao || simples.simples?.included || '')}
                </span>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{ie.stateRegistration}</p>
                <p className="text-sm text-muted-foreground">{ie.situation || ie.status}</p>
              </div>
              <Badge variant="outline">IE</Badge>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{suframa.registration}</p>
                <p className="text-sm text-muted-foreground">{suframa.situation || suframa.status}</p>
              </div>
              <Badge variant="outline">Suframa</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
