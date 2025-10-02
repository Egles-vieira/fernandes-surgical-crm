import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function MinhaCarteira() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[80vh]">
      <Card className="p-12 text-center max-w-md shadow-elegant">
        <div className="mx-auto w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-6">
          <Wallet className="text-white" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-3">Minha Carteira</h1>
        <p className="text-muted-foreground">
          Módulo em desenvolvimento. Em breve você poderá visualizar sua carteira de clientes aqui.
        </p>
      </Card>
    </div>
  );
}
