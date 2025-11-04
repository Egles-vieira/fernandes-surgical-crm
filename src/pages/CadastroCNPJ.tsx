import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCNPJA } from "@/hooks/useCNPJA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  UserPlus
} from "lucide-react";
import { ProgressoCNPJA } from "@/components/cnpja/ProgressoCNPJA";
import { DecisaoCard } from "@/components/cnpja/DecisaoCard";
import { DadosColetadosPreview } from "@/components/cnpja/DadosColetadosPreview";
import { useToast } from "@/hooks/use-toast";

export default function CadastroCNPJ() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cnpj, setCnpj] = useState("");
  const {
    consultarCNPJ,
    resetar,
    status,
    progresso,
    decisoes,
    dadosColetados,
    erro,
  } = useCNPJA();

  const handleConsultar = async () => {
    if (!cnpj.trim()) return;
    
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

  const handleCriarCliente = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Em breve você poderá criar clientes a partir dos dados coletados",
    });
  };

  const renderStatusBadge = () => {
    const statusMap = {
      idle: { label: "Aguardando", variant: "secondary" as const, icon: AlertCircle, color: "text-muted-foreground" },
      validando: { label: "Validando", variant: "default" as const, icon: Loader2, color: "text-blue-500" },
      consultando: { label: "Consultando", variant: "default" as const, icon: Loader2, color: "text-blue-500" },
      decidindo: { label: "Analisando", variant: "default" as const, icon: Loader2, color: "text-purple-500" },
      executando: { label: "Coletando", variant: "default" as const, icon: Loader2, color: "text-orange-500" },
      consolidando: { label: "Consolidando", variant: "default" as const, icon: Loader2, color: "text-indigo-500" },
      concluido: { label: "Concluído", variant: "default" as const, icon: CheckCircle2, color: "text-green-500" },
      erro: { label: "Erro", variant: "destructive" as const, icon: XCircle, color: "text-destructive" },
    };

    const current = statusMap[status];
    const Icon = current.icon;

    return (
      <Badge variant={current.variant} className="gap-1.5 px-3 py-1.5">
        <Icon className={`h-4 w-4 ${current.color} ${status !== 'concluido' && status !== 'erro' && status !== 'idle' ? 'animate-spin' : ''}`} />
        {current.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/clientes")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                Cadastro via CNPJ
              </h1>
              <p className="text-muted-foreground mt-1">
                Consulta inteligente de dados empresariais
              </p>
            </div>
          </div>
          {renderStatusBadge()}
        </div>

        {/* Formulário de consulta */}
        {(status === 'idle' || status === 'erro') && (
          <Card className="mb-6 border-2">
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
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConsultar()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleConsultar}
                  disabled={!cnpj.trim()}
                  size="lg"
                  className="min-w-[120px]"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
              </div>
              {erro && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{erro}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progresso */}
        {status !== 'idle' && status !== 'concluido' && status !== 'erro' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <ProgressoCNPJA status={status} progresso={progresso} />
            </CardContent>
          </Card>
        )}

        {/* Dados Coletados com novo layout */}
        {status === 'concluido' && dadosColetados && (
          <div className="space-y-6">
            {/* Header de Ações */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Empresa Encontrada</h2>
                  <p className="text-sm text-muted-foreground">
                    {dadosColetados.office?.name}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleNovaConsulta}>
                  <Search className="h-4 w-4 mr-2" />
                  Nova Consulta
                </Button>
                <Button onClick={handleCriarCliente}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Cliente
                </Button>
              </div>
            </div>

            {/* Cards com Análise Inteligente */}
            {decisoes && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <DecisaoCard
                  titulo="Endereço"
                  decisao={decisoes.validarEndereco}
                  dados={dadosColetados}
                  tipoConsulta="endereco"
                />
                <DecisaoCard
                  titulo="Filiais/Sócios"
                  decisao={decisoes.buscarFiliais}
                  dados={dadosColetados}
                  tipoConsulta="company"
                />
                <DecisaoCard
                  titulo="Simples Nacional"
                  decisao={decisoes.verificarSimples}
                  dados={dadosColetados}
                  tipoConsulta="simples"
                />
                <DecisaoCard
                  titulo="Inscrição Estadual"
                  decisao={decisoes.validarIE}
                  dados={dadosColetados}
                  tipoConsulta="ie"
                />
              </div>
            )}

            {/* Preview completo dos dados */}
            <DadosColetadosPreview dados={dadosColetados} />
          </div>
        )}
      </div>
    </div>
  );
}
