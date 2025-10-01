import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientes } from "@/hooks/useClientes";
import { Tables } from "@/integrations/supabase/types";

type Cliente = Tables<"clientes">;

interface ClienteSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCliente: (cliente: Cliente) => void;
}

export function ClienteSearchDialog({
  open,
  onOpenChange,
  onSelectCliente,
}: ClienteSearchDialogProps) {
  const { clientes, isLoading } = useClientes();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome_emit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nome_abrev.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cgc.includes(searchTerm.replace(/[^\d]/g, "")) ||
      (c.cod_emitente && c.cod_emitente.toString().includes(searchTerm))
  );

  const formatCGC = (cgc: string) => {
    if (cgc.length === 14) {
      return cgc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    } else if (cgc.length === 11) {
      return cgc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }
    return cgc;
  };

  const handleSelect = (cliente: Cliente) => {
    onSelectCliente(cliente);
    setSearchTerm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Pesquisar Clientes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Buscar por nome, código, CNPJ/CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando clientes...
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead className="w-[300px]">Nome</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {cliente.cod_emitente}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <div>{cliente.nome_emit}</div>
                          <div className="text-xs text-muted-foreground">{cliente.nome_abrev}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCGC(cliente.cgc)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={
                            cliente.identific === 'Cliente' 
                              ? 'bg-success/10 text-success border-success/20'
                              : cliente.identific === 'Fornecedor'
                              ? 'bg-secondary/10 text-secondary border-secondary/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }
                        >
                          {cliente.identific}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          onClick={() => handleSelect(cliente)}
                        >
                          <Plus size={16} className="mr-1" />
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}