import { useState } from "react";
import { useGEDDocumentos, GEDDocumento } from "@/hooks/useGEDDocumentos";
import { useGEDTipos } from "@/hooks/useGEDTipos";
import { GEDStatusBadge } from "./GEDStatusBadge";
import { GEDUploadDialog } from "./GEDUploadDialog";
import { GEDPermissoesDialog } from "./GEDPermissoesDialog";
import { GEDPreviewDialog } from "./GEDPreviewDialog";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Plus, MoreHorizontal, Download, Eye, Trash2, 
  Shield, ChevronLeft, ChevronRight, FileIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function GEDDocumentosList() {
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [permissoesDocId, setPermissoesDocId] = useState<string | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<GEDDocumento | null>(null);

  const { tiposAtivos } = useGEDTipos();
  const { documentos, total, totalPages, isLoading, deleteDocumento } = useGEDDocumentos({
    tipoId: tipoFiltro !== "todos" ? tipoFiltro : undefined,
    status: statusFiltro !== "todos" ? statusFiltro : undefined,
    search: search || undefined,
    page
  });

  const handleDownload = async (doc: GEDDocumento) => {
    try {
      const { data, error } = await supabase.storage
        .from('ged-documentos')
        .download(doc.arquivo_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.arquivo_nome;
      a.click();
      URL.revokeObjectURL(url);

      // Registrar visualização
      await supabase.from('ged_visualizacoes').insert({
        documento_id: doc.id,
        usuario_id: (await supabase.auth.getUser()).data.user?.id,
        acao: 'baixou'
      });
    } catch (error: any) {
      toast.error("Erro ao baixar arquivo: " + error.message);
    }
  };

  const handleView = (doc: GEDDocumento) => {
    setPreviewDoc(doc);
  };

  const handleDelete = async () => {
    if (!deleteDocId) return;
    await deleteDocumento.mutateAsync(deleteDocId);
    setDeleteDocId(null);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou número..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={tipoFiltro} onValueChange={(v) => { setTipoFiltro(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tiposAtivos.map(tipo => (
              <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="valido">Válidos</SelectItem>
            <SelectItem value="vencendo">Vencendo</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="sem_validade">Sem validade</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Tabela */}
      <Card className="shadow-elegant">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : documentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <FileIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhum documento encontrado</p>
                  <Button variant="outline" className="mt-4" onClick={() => setUploadOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar primeiro documento
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              documentos.map(doc => (
                <TableRow key={doc.id} className="hover:bg-muted/50 border-b border-border/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.titulo}</p>
                        {doc.versao > 1 && (
                          <p className="text-xs text-muted-foreground">v{doc.versao_label}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: doc.tipo?.cor + '20', color: doc.tipo?.cor }}
                    >
                      {doc.tipo?.nome}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {doc.numero_documento || "-"}
                  </TableCell>
                  <TableCell>
                    {doc.data_validade 
                      ? format(new Date(doc.data_validade), "dd/MM/yyyy", { locale: ptBR })
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <GEDStatusBadge status={doc.status_validade} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {doc.criado_em 
                      ? format(new Date(doc.criado_em), "dd/MM/yyyy", { locale: ptBR })
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => handleView(doc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPermissoesDocId(doc.id)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Permissões
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteDocId(doc.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * 20) + 1}-{Math.min(page * 20, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <GEDUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      
      {permissoesDocId && (
        <GEDPermissoesDialog
          documentoId={permissoesDocId}
          open={!!permissoesDocId}
          onOpenChange={(open) => !open && setPermissoesDocId(null)}
        />
      )}

      <GEDPreviewDialog
        documento={previewDoc}
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
      />

      <AlertDialog open={!!deleteDocId} onOpenChange={(open) => !open && setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O documento será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}