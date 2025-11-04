import { Decisao, DadosEndereco, DadosFilial, DadosSimples, DadosIE, DadosSuframa, DadosConsolidados } from "@/types/cnpja";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, MapPin, Building, FileText, Shield } from "lucide-react";
import { useState } from "react";
import { formatarCNPJ, formatarCEP, formatarData } from "@/lib/cnpja-utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DecisaoCardProps {
  titulo: string;
  decisao: Decisao;
  dados?: DadosConsolidados | null;
  tipoConsulta?: 'endereco' | 'company' | 'simples' | 'ie' | 'suframa';
}

export function DecisaoCard({ titulo, decisao, dados, tipoConsulta }: DecisaoCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasDados = dados && decisao.decisao && (
    (tipoConsulta === 'endereco' && dados.endereco) ||
    (tipoConsulta === 'company' && ((dados.filiais && dados.filiais.length > 0) || (dados.socios && dados.socios.length > 0))) ||
    (tipoConsulta === 'simples' && dados.simples) ||
    (tipoConsulta === 'ie' && dados.ie) ||
    (tipoConsulta === 'suframa' && dados.suframa)
  );

  const renderDados = () => {
    if (!dados || !tipoConsulta) return null;

    // Renderizar Endereço
    if (tipoConsulta === 'endereco' && dados.endereco) {
      const end = dados.endereco;
      return (
        <div className="mt-3 p-3 bg-background/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Dados do Endereço Validado
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">CEP:</span> {formatarCEP(end.cep)}
            </div>
            <div>
              <span className="text-muted-foreground">Bairro:</span> {end.bairro}
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Logradouro:</span> {end.logradouro}
            </div>
            <div>
              <span className="text-muted-foreground">Cidade:</span> {end.localidade}
            </div>
            <div>
              <span className="text-muted-foreground">UF:</span> {end.uf}
            </div>
            {end.complemento && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Complemento:</span> {end.complemento}
              </div>
            )}
            {end.ibge && (
              <div>
                <span className="text-muted-foreground">IBGE:</span> {end.ibge}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Renderizar Filiais/Company
    if (tipoConsulta === 'company') {
      const filiais = dados.filiais || [];
      const socios = dados.socios || [];
      
      if (filiais.length === 0 && socios.length === 0) {
        return (
          <div className="mt-3 p-3 bg-background/50 rounded-lg text-sm text-muted-foreground">
            Nenhuma filial ou sócio encontrado.
          </div>
        );
      }
      
      return (
        <div className="mt-3 p-3 bg-background/50 rounded-lg space-y-3">
          {filiais.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Building className="h-4 w-4" />
                Filiais Encontradas ({filiais.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filiais.slice(0, 5).map((filial, idx) => (
                  <div key={idx} className="p-2 bg-background rounded border text-xs">
                    <div className="font-medium">{filial.name}</div>
                    <div className="text-muted-foreground font-mono">{formatarCNPJ(filial.taxId)}</div>
                    {filial.address && (
                      <div className="text-muted-foreground">
                        {filial.address.city} - {filial.address.state}
                      </div>
                    )}
                  </div>
                ))}
                {filiais.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    + {filiais.length - 5} filiais não exibidas
                  </div>
                )}
              </div>
            </div>
          )}
          
          {socios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Building className="h-4 w-4" />
                Sócios ({socios.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {socios.slice(0, 5).map((socio: any, idx: number) => (
                  <div key={idx} className="p-2 bg-background rounded border text-xs">
                    <div className="font-medium">{socio.name}</div>
                    {socio.qualification && (
                      <div className="text-muted-foreground">{socio.qualification}</div>
                    )}
                  </div>
                ))}
                {socios.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    + {socios.length - 5} sócios não exibidos
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Renderizar Simples Nacional
    if (tipoConsulta === 'simples' && dados.simples) {
      const simples = dados.simples;
      const isOptante = simples.simplesNacional?.optante || simples.simples?.optant;
      return (
        <div className="mt-3 p-3 bg-background/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Regime Tributário
          </div>
          <div className="text-sm">
            <Badge variant={isOptante ? "default" : "secondary"}>
              {isOptante ? "Optante pelo Simples Nacional" : "Não optante"}
            </Badge>
          </div>
          {(simples.simplesNacional?.dataOpcao || simples.simples?.included) && (
            <div className="text-xs text-muted-foreground">
              Data de opção: {formatarData(simples.simplesNacional?.dataOpcao || simples.simples?.included || '')}
            </div>
          )}
          {simples.mei?.optant && (
            <Badge variant="outline" className="text-xs">MEI</Badge>
          )}
        </div>
      );
    }

    // Renderizar Inscrição Estadual
    if (tipoConsulta === 'ie' && dados.ie) {
      const ie = dados.ie;
      return (
        <div className="mt-3 p-3 bg-background/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4" />
            Inscrição Estadual
          </div>
          <div className="text-sm font-mono">{ie.stateRegistration}</div>
          {(ie.status || ie.situation) && (
            <Badge variant="outline" className="text-xs">
              {ie.status || ie.situation}
            </Badge>
          )}
        </div>
      );
    }

    // Renderizar Suframa
    if (tipoConsulta === 'suframa' && dados.suframa && Array.isArray(dados.suframa) && dados.suframa.length > 0) {
      const suframa = dados.suframa[0]; // Pega o primeiro registro
      return (
        <div className="mt-3 p-3 bg-background/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4" />
            Suframa
          </div>
          <div className="text-sm font-mono">{suframa.number}</div>
          {suframa.status && (
            <Badge variant="outline" className="text-xs">
              {suframa.status.text}
            </Badge>
          )}
          {suframa.since && (
            <div className="text-xs text-muted-foreground">
              Cadastrado em: {formatarData(suframa.since)}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Card className={`border-l-4 ${
      decisao.decisao 
        ? 'border-l-success bg-success/5' 
        : 'border-l-muted-foreground bg-muted/30'
    }`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              {decisao.decisao ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              {titulo}
            </span>
            
            <div className="flex items-center gap-2">
              <Badge variant={decisao.decisao ? "default" : "secondary"}>
                {decisao.decisao ? "SIM" : "NÃO"}
              </Badge>
              
              {hasDados && decisao.decisao && (
                <CollapsibleTrigger asChild>
                  <button className="p-1 hover:bg-accent rounded transition-colors">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{decisao.motivo}</p>
          
          {decisao.custoCreditos && decisao.custoCreditos > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="h-3 w-3" />
              <span>Custo: {decisao.custoCreditos} crédito{decisao.custoCreditos > 1 ? 's' : ''}</span>
            </div>
          )}

          {decisao.tipoConsulta && (
            <Badge variant="outline" className="text-xs">
              {decisao.tipoConsulta}
            </Badge>
          )}

          <CollapsibleContent>
            {renderDados()}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
