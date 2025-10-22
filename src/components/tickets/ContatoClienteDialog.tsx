import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Mail, Phone, Briefcase, Plus } from "lucide-react";

interface ContatoCliente {
  id: string;
  primeiro_nome: string;
  sobrenome: string;
  nome_completo?: string;
  cargo?: string;
  email?: string;
  email_secundario?: string;
  telefone?: string;
  celular?: string;
  conta_id?: string;
}

interface ContatoClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string; // Mudado de clienteId para contaId
  clienteNome: string;
  onContatoSelecionado: (contato: { nome: string; email: string; telefone: string }) => void;
}

export default function ContatoClienteDialog({
  open,
  onOpenChange,
  contaId,
  clienteNome,
  onContatoSelecionado,
}: ContatoClienteDialogProps) {
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<"selecionar" | "novo">("selecionar");
  const [contatoSelecionadoId, setContatoSelecionadoId] = useState<string | null>(null);
  const [novoContato, setNovoContato] = useState({
    primeiro_nome: "",
    sobrenome: "",
    cargo: "",
    email: "",
    telefone: "",
    celular: "",
  });

  // Buscar contatos do cliente
  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ["contatos", contaId],
    queryFn: async () => {
      if (!contaId) return [];
      
      const { data, error } = await supabase
        .from("contatos")
        .select("*")
        .eq("conta_id", contaId)
        .order("primeiro_nome");

      if (error) throw error;
      return data as ContatoCliente[];
    },
    enabled: open && !!contaId,
  });

  // Reset ao abrir
  useEffect(() => {
    if (open && contatos.length > 0) {
      setModo("selecionar");
      setContatoSelecionadoId(contatos[0]?.id || null);
    } else if (open && contatos.length === 0) {
      setModo("novo");
      setContatoSelecionadoId(null);
    }
    
    if (open) {
      setNovoContato({
        primeiro_nome: "",
        sobrenome: "",
        cargo: "",
        email: "",
        telefone: "",
        celular: "",
      });
    }
  }, [open, contatos]);

  // Mutation para criar contato
  const criarContato = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("contatos")
        .insert({
          conta_id: contaId,
          nome_completo: `${novoContato.primeiro_nome} ${novoContato.sobrenome}`.trim(),
          ...novoContato,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contatos", contaId] });
      toast.success("Contato criado com sucesso!");
      
      onContatoSelecionado({
        nome: data.nome_completo || `${data.primeiro_nome} ${data.sobrenome}`,
        email: data.email || "",
        telefone: data.telefone || data.celular || "",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar contato: " + error.message);
    },
  });

  const handleConfirmar = () => {
    if (modo === "selecionar") {
      const contato = contatos.find((c) => c.id === contatoSelecionadoId);
      if (contato) {
        onContatoSelecionado({
          nome: contato.nome_completo || `${contato.primeiro_nome} ${contato.sobrenome}`,
          email: contato.email || "",
          telefone: contato.telefone || contato.celular || "",
        });
        onOpenChange(false);
      } else {
        toast.error("Selecione um contato");
      }
    } else {
      if (!novoContato.primeiro_nome || !novoContato.sobrenome) {
        toast.error("Nome e sobrenome são obrigatórios");
        return;
      }
      criarContato.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contatos do Cliente</DialogTitle>
          <DialogDescription>
            Cliente: <strong>{clienteNome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle entre Selecionar e Novo */}
          {contatos.length > 0 && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={modo === "selecionar" ? "default" : "outline"}
                onClick={() => {
                  setModo("selecionar");
                  if (!contatoSelecionadoId && contatos.length > 0) {
                    setContatoSelecionadoId(contatos[0].id);
                  }
                }}
                className="flex-1"
              >
                <User className="h-4 w-4 mr-2" />
                Contatos Existentes ({contatos.length})
              </Button>
              <Button
                type="button"
                variant={modo === "novo" ? "default" : "outline"}
                onClick={() => setModo("novo")}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Contato
              </Button>
            </div>
          )}
          
          {contatos.length === 0 && (
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado para este cliente</p>
            </div>
          )}

          <Separator />

          {/* Modo: Selecionar */}
          {modo === "selecionar" && (
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Carregando...</p>
              ) : (
                <RadioGroup value={contatoSelecionadoId || ""} onValueChange={setContatoSelecionadoId}>
                  {contatos.map((contato) => (
                    <div
                      key={contato.id}
                      className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    >
                      <RadioGroupItem value={contato.id} id={contato.id} />
                      <label htmlFor={contato.id} className="flex-1 cursor-pointer space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {contato.nome_completo || `${contato.primeiro_nome} ${contato.sobrenome}`}
                          </p>
                        </div>
                        {contato.cargo && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            {contato.cargo}
                          </div>
                        )}
                        {contato.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contato.email}
                          </div>
                        )}
                        {(contato.telefone || contato.celular) && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {contato.telefone || contato.celular}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          {/* Modo: Novo Contato */}
          {modo === "novo" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primeiro_nome">Primeiro Nome *</Label>
                  <Input
                    id="primeiro_nome"
                    value={novoContato.primeiro_nome}
                    onChange={(e) =>
                      setNovoContato((prev) => ({ ...prev, primeiro_nome: e.target.value }))
                    }
                    placeholder="João"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sobrenome">Sobrenome *</Label>
                  <Input
                    id="sobrenome"
                    value={novoContato.sobrenome}
                    onChange={(e) =>
                      setNovoContato((prev) => ({ ...prev, sobrenome: e.target.value }))
                    }
                    placeholder="Silva"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={novoContato.cargo}
                  onChange={(e) =>
                    setNovoContato((prev) => ({ ...prev, cargo: e.target.value }))
                  }
                  placeholder="Ex: Gerente de Compras"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={novoContato.email}
                  onChange={(e) =>
                    setNovoContato((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={novoContato.telefone}
                    onChange={(e) =>
                      setNovoContato((prev) => ({ ...prev, telefone: e.target.value }))
                    }
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={novoContato.celular}
                    onChange={(e) =>
                      setNovoContato((prev) => ({ ...prev, celular: e.target.value }))
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={criarContato.isPending}>
            {criarContato.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
