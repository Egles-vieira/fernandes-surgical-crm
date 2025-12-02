import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface PropostaEscopoProps {
  observacoes?: string | null;
}

export function PropostaEscopo({ observacoes }: PropostaEscopoProps) {
  if (!observacoes) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Observações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p className="whitespace-pre-wrap">{observacoes}</p>
        </div>
      </CardContent>
    </Card>
  );
}
