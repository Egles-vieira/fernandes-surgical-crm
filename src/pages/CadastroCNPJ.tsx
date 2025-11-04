import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCNPJA } from "@/hooks/useCNPJA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, XCircle } from "lucide-react";
import { ProgressoCNPJA } from "@/components/cnpja/ProgressoCNPJA";
import { DadosColetadosPreview } from "@/components/cnpja/DadosColetadosPreview";
import { CadastroActionBar } from "@/components/cnpja/CadastroActionBar";
import { Badge } from "@/components/ui/badge";
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

  const handleCalcular = () => {
    toast({
      title: "Calcular",
      description: "Função de cálculo em desenvolvimento"
    });
  };

  const handleEditar = () => {
    toast({
      title: "Editar",
      description: "Função de edição em desenvolvimento"
    });
  };

  const handleDiretoria = () => {
    toast({
      title: "Diretoria",
      description: "Visualizando quadro societário"
    });
  };

  const handleEfetivar = () => {
    toast({
      title: "Efetivar Cadastro",
      description: "Cadastro será efetivado e cliente criado"
    });
  };

  return <div className="min-h-screen bg-background">
      {/* Barra de Ações Fixa */}
      <CadastroActionBar 
        status={status}
        onCalcular={handleCalcular}
        onCancelar={handleNovaConsulta}
        onEditar={handleEditar}
        onDiretoria={handleDiretoria}
        onEfetivar={handleEfetivar}
      />

      <div className="container mx-auto p-6 max-w-7xl space-y-0">

        {/* Barra de Status e Ações - Removida pois agora está fixa no topo */}

        {/* Formulário de consulta */}
        {(status === 'idle' || status === 'erro') && <Card className="border-2 mt-4">
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
        {status !== 'idle' && status !== 'concluido' && status !== 'erro' && <Card className="mt-4">
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
              <TabsTrigger value="contatos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Contatos
              </TabsTrigger>
              <TabsTrigger value="anotacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                Anotações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <DadosColetadosPreview dados={dadosColetados} />
            </TabsContent>

            <TabsContent value="contatos" className="mt-4">
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

            <TabsContent value="anotacoes" className="mt-4">
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