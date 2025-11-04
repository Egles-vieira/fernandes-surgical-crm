import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCNPJA } from "@/hooks/useCNPJA";
import { ProgressoCNPJA } from "./ProgressoCNPJA";
import { DecisaoCard } from "./DecisaoCard";
import { DadosColetadosPreview } from "./DadosColetadosPreview";
import { ContextoConsulta } from "@/types/cnpja";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Search, FileText, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatarCNPJ } from "@/lib/cnpja-utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CadastroCNPJDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClienteCriado?: (clienteId: string) => void;
}

type Etapa = 1 | 2 | 3 | 4;

export function CadastroCNPJDialog({ open, onOpenChange, onClienteCriado }: CadastroCNPJDialogProps) {
  const { toast } = useToast();
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [cnpj, setCnpj] = useState("");
  const [contexto, setContexto] = useState<ContextoConsulta>({
    tipoCliente: 'comum',
    emiteNF: true,
    trabalhaComICMS: false,
    operacoesInterestaduais: false,
  });
  const [salvando, setSalvando] = useState(false);

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
    if (!cnpj) {
      toast({
        title: "CNPJ obrigatório",
        description: "Por favor, informe o CNPJ do cliente",
        variant: "destructive",
      });
      return;
    }

    const resultado = await consultarCNPJ(cnpj, contexto);
    
    if (resultado?.sucesso) {
      setEtapa(2); // Avançar para etapa de decisões
    }
  };

  const handleSalvarCliente = async () => {
    if (!dadosColetados) return;

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const office = dadosColetados.office;
      const endereco = dadosColetados.endereco;

      // Montar dados do cliente
      const clienteData = {
        user_id: user.id,
        nome_abrev: office.alias || office.name?.substring(0, 50),
        nome_emit: office.name,
        cgc: office.taxId,
        ins_estadual: dadosColetados.ie?.stateRegistration || null,
        atividade: office.company?.name || null,
        telefone1: office.phones?.[0] ? `${office.phones[0].area}${office.phones[0].number}` : null,
        e_mail: office.emails?.[0]?.address || null,
        endereco: endereco?.logradouro || office.address?.street,
        numero: office.address?.number,
        complemento: endereco?.complemento || office.address?.details,
        bairro: endereco?.bairro || office.address?.district,
        cidade: endereco?.localidade || office.address?.city,
        estado: endereco?.uf || office.address?.state,
        cep: endereco?.cep || office.address?.zip,
        lim_credito: contexto.valorContrato || 0,
        observacoes: `Cadastrado via CNPJ-IA em ${new Date().toLocaleString('pt-BR')}`,
      };

      // Criar cliente
      const { data: clienteResult, error: clienteError } = await supabase
        .from('clientes')
        .insert([clienteData])
        .select()
        .single();

      if (clienteError) throw clienteError;

      // Log da consulta API
      if (clienteResult) {
        await supabase.from('cliente_api_logs').insert([{
          cnpj: office.taxId.replace(/\D/g, ''),
          tipo_consulta: 'office',
          sucesso: true,
          dados_resposta: dadosColetados as any,
        }]);
      }

      toast({
        title: "Cliente cadastrado!",
        description: `${office.name} foi cadastrado com sucesso.`,
      });

      setEtapa(4); // Etapa de sucesso
      
      if (onClienteCriado && clienteResult) {
        onClienteCriado(clienteResult.id);
      }

      // Fechar após 2s
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleClose = () => {
    resetar();
    setEtapa(1);
    setCnpj("");
    setContexto({
      tipoCliente: 'comum',
      emiteNF: true,
      trabalhaComICMS: false,
      operacoesInterestaduais: false,
    });
    onOpenChange(false);
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 1:
        return (
          <div className="space-y-6">
            <Alert>
              <Search className="h-4 w-4" />
              <AlertDescription>
                Informe o CNPJ e configure o contexto da consulta para otimizar custos e obter apenas os dados necessários.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatarCNPJ(e.target.value))}
                  maxLength={18}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="tipoCliente">Tipo de Cliente</Label>
                <Select 
                  value={contexto.tipoCliente} 
                  onValueChange={(value) => setContexto({...contexto, tipoCliente: value as any})}
                >
                  <SelectTrigger id="tipoCliente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead (mínimo de dados)</SelectItem>
                    <SelectItem value="comum">Cliente Comum</SelectItem>
                    <SelectItem value="estrategico">Cliente Estratégico (máximo de dados)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valorContrato">Valor Estimado do Contrato (opcional)</Label>
                <Input
                  id="valorContrato"
                  type="number"
                  placeholder="0.00"
                  value={contexto.valorContrato || ''}
                  onChange={(e) => setContexto({...contexto, valorContrato: parseFloat(e.target.value) || undefined})}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contexto.emiteNF}
                    onChange={(e) => setContexto({...contexto, emiteNF: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Emite NF</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contexto.trabalhaComICMS}
                    onChange={(e) => setContexto({...contexto, trabalhaComICMS: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Trabalha com ICMS</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contexto.operacoesInterestaduais}
                    onChange={(e) => setContexto({...contexto, operacoesInterestaduais: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Operações Interestaduais</span>
                </label>
              </div>
            </div>

            {status === 'consultando' || status === 'decidindo' || status === 'executando' ? (
              <ProgressoCNPJA status={status} progresso={progresso} />
            ) : null}

            {erro && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConsultar}
                disabled={!cnpj || status === 'consultando' || status === 'decidindo' || status === 'executando'}
              >
                <Search className="mr-2 h-4 w-4" />
                Consultar CNPJ
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                A IA analisou o contexto e decidiu quais consultas executar. Revise as decisões antes de prosseguir.
              </AlertDescription>
            </Alert>

            {decisoes && (
              <div className="space-y-3">
                <DecisaoCard
                  titulo="Validar Endereço (CEP)"
                  decisao={decisoes.validarEndereco}
                  dados={dadosColetados}
                  tipoConsulta="endereco"
                />
                <DecisaoCard
                  titulo="Buscar Filiais"
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
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setEtapa(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => setEtapa(3)}>
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Revise os dados coletados antes de finalizar o cadastro do cliente.
              </AlertDescription>
            </Alert>

            {dadosColetados && <DadosColetadosPreview dados={dadosColetados} />}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setEtapa(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={handleSalvarCliente} disabled={salvando}>
                <UserPlus className="mr-2 h-4 w-4" />
                {salvando ? 'Cadastrando...' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
            <h3 className="text-xl font-semibold">Cliente cadastrado com sucesso!</h3>
            <p className="text-muted-foreground">
              O cadastro foi concluído e os dados foram salvos.
            </p>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Cadastrar Cliente via CNPJ
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Etapa {etapa}/4
            </span>
          </DialogTitle>
        </DialogHeader>

        {renderEtapa()}
      </DialogContent>
    </Dialog>
  );
}
