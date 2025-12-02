import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PropostaApresentacaoProps {
  cliente?: {
    nome_abrev?: string | null;
    nome_emit?: string | null;
    cgc?: string | null;
  } | null;
  vendedor?: {
    primeiro_nome?: string;
    sobrenome?: string;
    telefone?: string;
  } | null;
  mensagemPersonalizada?: string | null;
  dataCriacao?: string;
  validadeAte?: string | null;
}

export function PropostaApresentacao({ 
  cliente, 
  vendedor,
  mensagemPersonalizada,
  dataCriacao,
  validadeAte
}: PropostaApresentacaoProps) {
  const nomeCliente = cliente?.nome_abrev || cliente?.nome_emit || 'Cliente';
  const nomeVendedor = vendedor ? `${vendedor.primeiro_nome} ${vendedor.sobrenome}` : '';
  
  const isExpiringSoon = validadeAte && new Date(validadeAte).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Proposta Comercial
            </h1>
            <p className="text-muted-foreground">
              Prezado(a) <span className="font-medium text-foreground">{nomeCliente}</span>,
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {dataCriacao && (
              <Badge variant="outline" className="gap-1.5 justify-center">
                <Calendar className="h-3 w-3" />
                {format(new Date(dataCriacao), "dd MMM yyyy", { locale: ptBR })}
              </Badge>
            )}
            {validadeAte && (
              <Badge 
                variant={isExpiringSoon ? "destructive" : "secondary"} 
                className="gap-1.5 justify-center"
              >
                Válida até {format(new Date(validadeAte), "dd/MM/yyyy")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Mensagem personalizada ou padrão */}
        <div className="prose prose-sm max-w-none text-muted-foreground">
          {mensagemPersonalizada ? (
            <p className="whitespace-pre-wrap">{mensagemPersonalizada}</p>
          ) : (
            <p>
              Temos o prazer de apresentar nossa proposta comercial, elaborada especialmente 
              para atender às suas necessidades. Abaixo você encontrará todos os detalhes 
              dos produtos e condições comerciais oferecidas.
            </p>
          )}
        </div>

        {/* Info cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {cliente && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Cliente</p>
                <p className="text-sm text-muted-foreground">{nomeCliente}</p>
                {cliente.cgc && (
                  <p className="text-xs text-muted-foreground mt-1">
                    CNPJ: {cliente.cgc}
                  </p>
                )}
              </div>
            </div>
          )}

          {vendedor && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Consultor</p>
                <p className="text-sm text-muted-foreground">{nomeVendedor}</p>
                {vendedor.telefone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tel: {vendedor.telefone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
