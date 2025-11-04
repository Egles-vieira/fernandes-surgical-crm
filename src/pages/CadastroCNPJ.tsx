import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, FileText, MapPin, Users, Shield, CheckCircle, AlertCircle, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCNPJA } from "@/hooks/useCNPJA";
import { formatarCNPJ, obterSituacaoCadastral, obterPorteEmpresa, formatarCEP, formatarTelefone, formatarData } from "@/lib/cnpja-utils";
import { DecisaoCard } from "@/components/cnpja/DecisaoCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function CadastroCNPJ() {
  const navigate = useNavigate();
  const [cnpj, setCnpj] = useState("");
  const { consultarCNPJ, resetar, status, progresso, decisoes, dadosColetados, erro } = useCNPJA();

  const handleConsultar = async () => {
    if (!cnpj) return;
    
    await consultarCNPJ(cnpj, {
      tipoCliente: 'comum',
      emiteNF: true,
      trabalhaComICMS: true,
      operacoesInterestaduais: true,
      sempreValidarCEP: true,
    });
  };

  const handleNovaConsulta = () => {
    setCnpj("");
    resetar();
  };

  const renderStatusBadge = () => {
    const statusMap = {
      idle: { variant: "secondary" as const, label: "Aguardando" },
      validando: { variant: "default" as const, label: "Validando CNPJ..." },
      consultando: { variant: "default" as const, label: "Consultando dados base..." },
      decidindo: { variant: "default" as const, label: "Analisando consultas..." },
      executando: { variant: "default" as const, label: "Executando consultas..." },
      consolidando: { variant: "default" as const, label: "Consolidando dados..." },
      concluido: { variant: "default" as const, label: "Concluído" },
      erro: { variant: "destructive" as const, label: "Erro" },
    };

    const statusInfo = statusMap[status];
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const renderDadosOffice = () => {
    if (!dadosColetados?.office) return null;

    const dados = dadosColetados.office;
    const situacao = obterSituacaoCadastral(dados.status?.id);

    return (
      <div className="space-y-6">
        {/* Cabeçalho com informações principais */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">{dados.name}</h2>
                {dados.alias && <p className="text-muted-foreground">{dados.alias}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <Badge variant={dados.head ? "default" : "secondary"}>
                {dados.head ? "Matriz" : "Filial"}
              </Badge>
              <Badge variant={situacao.cor as any}>
                {situacao.texto}
              </Badge>
              {dados.founded && (
                <span className="text-sm text-muted-foreground">
                  Fundada em {formatarData(dados.founded)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">CNPJ</p>
            <p className="text-xl font-mono font-semibold">{formatarCNPJ(dados.taxId)}</p>
          </div>
        </div>

        <Separator />

        {/* Grid de informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Endereço */}
          {dados.address && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="font-medium">
                    {dados.address.street}
                    {dados.address.number && `, ${dados.address.number}`}
                  </p>
                  {dados.address.details && (
                    <p className="text-muted-foreground">{dados.address.details}</p>
                  )}
                </div>
                <div>
                  <p>{dados.address.district}</p>
                  <p>
                    {dados.address.city} - {dados.address.state}
                  </p>
                  {dados.address.zip && (
                    <p className="text-muted-foreground">CEP: {formatarCEP(dados.address.zip)}</p>
                  )}
                </div>
                {dados.address.country && (
                  <p className="text-muted-foreground">{dados.address.country.name}</p>
                )}
                {dados.address.municipality && (
                  <p className="text-xs text-muted-foreground">
                    Cód. Município: {dados.address.municipality}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contatos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contatos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dados.phones && dados.phones.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Telefones</p>
                  {dados.phones.map((phone, idx) => (
                    <p key={idx} className="font-mono">
                      {formatarTelefone(phone.area, phone.number)}
                    </p>
                  ))}
                </div>
              )}
              {dados.emails && dados.emails.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">E-mails</p>
                  {dados.emails.map((email, idx) => (
                    <p key={idx} className="break-all">{email.address}</p>
                  ))}
                </div>
              )}
              {(!dados.phones || dados.phones.length === 0) && 
               (!dados.emails || dados.emails.length === 0) && (
                <p className="text-muted-foreground">Nenhum contato disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Informações Cadastrais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados Cadastrais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {dados.company && (
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="font-medium">{dados.company.name}</p>
                  {dados.company.id && (
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {dados.company.id}
                    </p>
                  )}
                </div>
              )}
              {dados.statusDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Data da Situação</p>
                  <p>{formatarData(dados.statusDate)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderEnderecoValidado = () => {
    if (!dadosColetados?.endereco) return null;

    const end = dadosColetados.endereco;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço Validado (ViaCEP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Logradouro</p>
              <p className="font-medium">{end.logradouro}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bairro</p>
              <p className="font-medium">{end.bairro}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cidade/UF</p>
              <p className="font-medium">{end.localidade} - {end.uf}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CEP</p>
              <p className="font-medium font-mono">{end.cep}</p>
            </div>
            {end.complemento && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Complemento</p>
                <p className="font-medium">{end.complemento}</p>
              </div>
            )}
            {end.ibge && (
              <div>
                <p className="text-xs text-muted-foreground">Código IBGE</p>
                <p className="font-mono text-xs">{end.ibge}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFiliais = () => {
    if (!dadosColetados?.filiais || dadosColetados.filiais.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Filiais ({dadosColetados.filiais.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dadosColetados.filiais.map((filial: any, idx: number) => (
              <div key={idx} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{filial.alias || filial.name}</p>
                    {filial.name && filial.alias && (
                      <p className="text-sm text-muted-foreground">{filial.name}</p>
                    )}
                  </div>
                  {filial.status && (
                    <Badge variant={filial.status.id === 2 ? "default" : "secondary"}>
                      {filial.status.text}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-mono">{formatarCNPJ(filial.taxId)}</p>
                {filial.address && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {filial.address.city} - {filial.address.state}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSocios = () => {
    if (!dadosColetados?.socios || dadosColetados.socios.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Quadro Societário ({dadosColetados.socios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dadosColetados.socios.map((socio: any, idx: number) => (
              <div key={idx} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{socio.name || socio.person?.name}</p>
                    {socio.role && (
                      <p className="text-sm text-muted-foreground">{socio.role.text}</p>
                    )}
                    {socio.person?.taxId && (
                      <p className="text-sm font-mono mt-1">
                        {socio.person.taxId.length === 11 
                          ? socio.person.taxId.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                          : formatarCNPJ(socio.person.taxId)
                        }
                      </p>
                    )}
                  </div>
                  {socio.since && (
                    <span className="text-xs text-muted-foreground">
                      Desde {formatarData(socio.since)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSimples = () => {
    if (!dadosColetados?.simples) return null;

    const simples = dadosColetados.simples;
    const optanteSimples = simples.simples?.optant || simples.simplesNacional?.optante;
    const optanteMEI = simples.mei?.optant;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Simples Nacional & MEI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Simples Nacional</p>
              <div className="flex items-center gap-2">
                {optanteSimples ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-semibold">
                  {optanteSimples ? "Optante" : "Não Optante"}
                </span>
              </div>
              {(simples.simplesNacional?.dataOpcao || simples.simples?.included) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Inclusão: {formatarData(simples.simplesNacional?.dataOpcao || simples.simples?.included)}
                </p>
              )}
              {(simples.simplesNacional?.dataExclusao || simples.simples?.excluded) && (
                <p className="text-xs text-muted-foreground">
                  Exclusão: {formatarData(simples.simplesNacional?.dataExclusao || simples.simples?.excluded)}
                </p>
              )}
            </div>

            <div className="p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">MEI</p>
              <div className="flex items-center gap-2">
                {optanteMEI ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-semibold">
                  {optanteMEI ? "Enquadrado" : "Não Enquadrado"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderIE = () => {
    if (!dadosColetados?.ie) return null;

    const ie = dadosColetados.ie;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inscrição Estadual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Inscrição Estadual</p>
              <p className="font-medium font-mono">{ie.stateRegistration || "Não informada"}</p>
            </div>
            {ie.status && (
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{ie.status}</p>
              </div>
            )}
            {ie.situation && (
              <div>
                <p className="text-xs text-muted-foreground">Situação</p>
                <p className="font-medium">{ie.situation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSuframa = () => {
    if (!dadosColetados?.suframa) return null;

    const suframa = dadosColetados.suframa;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Suframa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Inscrição Suframa</p>
              <p className="font-medium font-mono">{suframa.registration || "Não inscrito"}</p>
            </div>
            {suframa.status && (
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{suframa.status}</p>
              </div>
            )}
            {suframa.situation && (
              <div>
                <p className="text-xs text-muted-foreground">Situação</p>
                <p className="font-medium">{suframa.situation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Cadastro via CNPJ</h1>
            <p className="text-muted-foreground">
              Consulta inteligente com otimização de custos
            </p>
          </div>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Formulário de Consulta */}
      {(status === 'idle' || status === 'erro') && (
        <Card>
          <CardHeader>
            <CardTitle>Consultar CNPJ</CardTitle>
            <CardDescription>
              Digite o CNPJ para iniciar a consulta inteligente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {erro && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  maxLength={18}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleConsultar} disabled={!cnpj}>
                  Consultar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progresso */}
      {status !== 'idle' && status !== 'concluido' && status !== 'erro' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{renderStatusBadge()}</span>
                <span className="text-muted-foreground">{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decisões Tomadas */}
      {decisoes && status !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Decisões Inteligentes
            </CardTitle>
            <CardDescription>
              Consultas selecionadas automaticamente para otimizar custos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <DecisaoCard
              titulo="Validação de Endereço"
              decisao={decisoes.validarEndereco}
              dados={dadosColetados}
              tipoConsulta="endereco"
            />
            <DecisaoCard
              titulo="Buscar Filiais e Sócios"
              decisao={decisoes.buscarFiliais}
              dados={dadosColetados}
              tipoConsulta="company"
            />
            <DecisaoCard
              titulo="Verificar Simples Nacional"
              decisao={decisoes.verificarSimples}
              dados={dadosColetados}
              tipoConsulta="simples"
            />
            <DecisaoCard
              titulo="Validar Inscrição Estadual"
              decisao={decisoes.validarIE}
              dados={dadosColetados}
              tipoConsulta="ie"
            />
            <DecisaoCard
              titulo="Consultar Suframa"
              decisao={decisoes.consultarSuframa}
              dados={dadosColetados}
              tipoConsulta="suframa"
            />
          </CardContent>
        </Card>
      )}

      {/* Dados Coletados */}
      {status === 'concluido' && dadosColetados && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Dados Coletados</h2>
            <div className="flex gap-2">
              <Button onClick={handleNovaConsulta} variant="outline">
                Nova Consulta
              </Button>
              <Button onClick={() => {
                // TODO: Implementar criação de cliente
                console.log("Criar cliente com dados:", dadosColetados);
              }}>
                Criar Cliente
              </Button>
            </div>
          </div>

          <Tabs defaultValue="principal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="principal">Principal</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="estrutura">Estrutura</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              <TabsTrigger value="incentivos">Incentivos</TabsTrigger>
            </TabsList>

            <TabsContent value="principal" className="space-y-4">
              {renderDadosOffice()}
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4">
              {renderEnderecoValidado()}
            </TabsContent>

            <TabsContent value="estrutura" className="space-y-4">
              {renderFiliais()}
              {renderSocios()}
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-4">
              {renderSimples()}
              {renderIE()}
            </TabsContent>

            <TabsContent value="incentivos" className="space-y-4">
              {renderSuframa()}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
