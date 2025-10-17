import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

const TemplatesWhatsApp = () => {
  return (
    <Card className="p-12 text-center">
      <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">Templates WhatsApp</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Gerencie seus templates aprovados pelo WhatsApp Business
      </p>
      <p className="text-xs text-muted-foreground">
        Em desenvolvimento - em breve você poderá criar e gerenciar templates aqui
      </p>
    </Card>
  );
};

export default TemplatesWhatsApp;
