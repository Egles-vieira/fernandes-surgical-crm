import logo from "@/assets/logo-proposta.avif";
import { Badge } from "@/components/ui/badge";

interface PropostaHeaderProps {
  numeroProposta?: string;
  vendedor?: {
    primeiro_nome?: string | null;
    sobrenome?: string | null;
    telefone?: string | null;
    celular?: string | null;
  } | null;
}

export function PropostaHeader({ numeroProposta, vendedor }: PropostaHeaderProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img 
          src={logo} 
          alt="Logo" 
          className="h-10 w-auto object-contain"
        />
        <div className="hidden sm:block">
          <Badge variant="outline" className="text-xs font-mono">
            Proposta #{numeroProposta}
          </Badge>
        </div>
      </div>

      {vendedor && (
        <div className="text-right text-sm">
          <p className="font-medium text-foreground">
            {vendedor.primeiro_nome} {vendedor.sobrenome}
          </p>
          {(vendedor.telefone || vendedor.celular) && (
            <p className="text-muted-foreground text-xs">{vendedor.telefone || vendedor.celular}</p>
          )}
        </div>
      )}
    </div>
  );
}
