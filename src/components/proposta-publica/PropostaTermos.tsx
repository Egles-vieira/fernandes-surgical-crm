import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export function PropostaTermos() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScrollText className="h-5 w-5 text-primary" />
          Termos e Condições
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Validade da Proposta</h4>
            <p className="text-sm">
              Esta proposta tem validade conforme indicado no cabeçalho. Após este período, 
              os valores e condições apresentados poderão ser revisados.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Condições de Pagamento</h4>
            <p className="text-sm">
              As condições de pagamento serão acordadas após a aprovação desta proposta, 
              conforme política comercial vigente.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Prazo de Entrega</h4>
            <p className="text-sm">
              O prazo de entrega será informado após confirmação do pedido, considerando 
              disponibilidade de estoque e logística de transporte.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground text-sm mb-1">Garantia</h4>
            <p className="text-sm">
              Os produtos possuem garantia conforme especificações do fabricante e legislação vigente.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
