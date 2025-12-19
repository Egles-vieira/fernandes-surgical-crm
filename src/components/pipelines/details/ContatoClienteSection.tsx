import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Phone, Mail, RefreshCw } from "lucide-react";
import { ContatoCliente } from "@/hooks/useContatosCliente";

interface ContatoClienteSectionProps {
  contatos: ContatoCliente[];
  contatoSelecionadoId: string | null;
  onSelecionarContato: (contatoId: string | null) => void;
  isLoading?: boolean;
}

export function ContatoClienteSection({
  contatos,
  contatoSelecionadoId,
  onSelecionarContato,
  isLoading = false,
}: ContatoClienteSectionProps) {
  const [modo, setModo] = useState<"visualizar" | "selecionar">(
    contatoSelecionadoId ? "visualizar" : "selecionar"
  );
  const [busca, setBusca] = useState("");

  const contatoSelecionado = contatos.find((c) => c.id === contatoSelecionadoId);

  const contatosFiltrados = contatos.filter((contato) =>
    contato.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
    contato.cargo?.toLowerCase().includes(busca.toLowerCase()) ||
    contato.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSelecionarContato = (contatoId: string) => {
    onSelecionarContato(contatoId);
    setModo("visualizar");
    setBusca("");
  };

  const handleTrocar = () => {
    setModo("selecionar");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Contato do Cliente</h3>
        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (contatos.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Contato do Cliente</h3>
        <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>
      </div>
    );
  }

  // Modo visualizar - mostra detalhes do contato selecionado
  if (modo === "visualizar" && contatoSelecionado) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Contato do Cliente</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleTrocar}
          >
            <RefreshCw className="h-3 w-3" />
            Trocar
          </Button>
        </div>

        <div className="bg-muted/30 border border-border/50 rounded-lg p-4 space-y-3">
          {/* Header com avatar, nome e badge */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
              {contatoSelecionado.primeiro_nome.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold truncate">
                  {contatoSelecionado.nome_completo}
                </p>
                <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                  Selecionado
                </Badge>
              </div>
              {contatoSelecionado.cargo && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {contatoSelecionado.cargo}
                </p>
              )}
            </div>
          </div>

          {/* Dados de contato */}
          <div className="space-y-2 pt-1">
            {(contatoSelecionado.celular || contatoSelecionado.telefone) && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-green-500" />
                <span className="text-muted-foreground">
                  {contatoSelecionado.celular || contatoSelecionado.telefone}
                </span>
              </div>
            )}
            {contatoSelecionado.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground truncate">
                  {contatoSelecionado.email}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modo selecionar - mostra lista de contatos
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contato do Cliente</h3>
        {contatoSelecionado && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setModo("visualizar")}
          >
            Cancelar
          </Button>
        )}
      </div>

      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar contato..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>

      {/* Lista de contatos */}
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1">
          {contatosFiltrados.map((contato) => (
            <div
              key={contato.id}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                contatoSelecionadoId === contato.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              )}
              onClick={() => handleSelecionarContato(contato.id)}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                {contato.primeiro_nome.substring(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {contato.nome_completo}
                </p>
                {contato.cargo && (
                  <p className="text-xs text-muted-foreground truncate">
                    {contato.cargo}
                  </p>
                )}
              </div>
              {contatoSelecionadoId === contato.id && (
                <Badge variant="secondary" className="text-[10px]">
                  Selecionado
                </Badge>
              )}
            </div>
          ))}

          {contatosFiltrados.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum contato encontrado
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
