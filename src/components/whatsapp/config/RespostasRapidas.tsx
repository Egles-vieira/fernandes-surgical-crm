import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";

const RespostasRapidas = () => {
  return (
    <Card className="p-12 text-center">
      <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Respostas Rápidas</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Configure atalhos para respostas frequentes
      </p>
      <p className="text-xs text-muted-foreground">
        Em desenvolvimento - em breve você poderá criar respostas rápidas aqui
      </p>
    </Card>
  );
};

export default RespostasRapidas;
