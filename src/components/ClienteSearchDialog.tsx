import { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { clientes, total, isLoading } = useClientes({ 
    page, 
    pageSize, 
    searchTerm: debouncedSearch 
  });

  const totalPages = Math.ceil(total / pageSize);

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
    setPage(1);
    onOpenChange(false);
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
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

          {/* Info bar */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {isLoading ? "Carregando..." : `${total} cliente(s) encontrado(s)`}
            </span>
            {totalPages > 1 && (
              <span>
                Página {page} de {totalPages}
              </span>
            )}
          </div>

          {/* Results */}
          <div className="border rounded-lg overflow-hidden max-h-[450px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando clientes...
              </div>
            ) : clientes.length === 0 ? (
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
                  {clientes.map((cliente) => (
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
                      <TableCell className="font-mono text-sm">{formatCGC(cliente.cgc)}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.natureza === "Juridica" ? "default" : "secondary"}>
                          {cliente.natureza === "Juridica" ? "Jurídico" : "Físico"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" onClick={() => handleSelect(cliente)}>
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} de {total}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={page === totalPages || isLoading}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
