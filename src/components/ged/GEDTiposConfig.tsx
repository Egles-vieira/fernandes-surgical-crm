import { useState } from "react";
import { useGEDTipos, GEDTipoDocumento, GEDTipoInput } from "@/hooks/useGEDTipos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
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

export function GEDTiposConfig() {
  const { tipos, isLoading, createTipo, updateTipo, deleteTipo } = useGEDTipos();
  const [editingTipo, setEditingTipo] = useState<GEDTipoDocumento | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<GEDTipoInput>({
    nome: "",
    descricao: "",
    icone: "file",
    cor: "#6366f1",
    exige_validade: true,
    dias_alerta_vencimento: 30,
    permite_versoes: true,
    extensoes_permitidas: ["pdf"],
    ativo: true
  });

  const openCreate = () => {
    setEditingTipo(null);
    setForm({
      nome: "",
      descricao: "",
      icone: "file",
      cor: "#6366f1",
      exige_validade: true,
      dias_alerta_vencimento: 30,
      permite_versoes: true,
      extensoes_permitidas: ["pdf"],
      ativo: true
    });
    setDialogOpen(true);
  };

  const openEdit = (tipo: GEDTipoDocumento) => {
    setEditingTipo(tipo);
    setForm({
      nome: tipo.nome,
      descricao: tipo.descricao || "",
      icone: tipo.icone,
      cor: tipo.cor,
      exige_validade: tipo.exige_validade,
      dias_alerta_vencimento: tipo.dias_alerta_vencimento,
      permite_versoes: tipo.permite_versoes,
      extensoes_permitidas: tipo.extensoes_permitidas,
      ativo: tipo.ativo
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingTipo) {
      await updateTipo.mutateAsync({ id: editingTipo.id, ...form });
    } else {
      await createTipo.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTipo.mutateAsync(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Tipos de Documento</h2>
          <p className="text-sm text-muted-foreground">Configure os tipos de documentos aceitos no sistema</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <Card className="shadow-elegant">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead>Tipo</TableHead>
              <TableHead>Exige Validade</TableHead>
              <TableHead>Dias Alerta</TableHead>
              <TableHead>Extensões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : tipos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhum tipo cadastrado</p>
                  <Button variant="outline" className="mt-4" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar primeiro tipo
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              tipos.map(tipo => (
                <TableRow key={tipo.id} className="hover:bg-muted/50 border-b border-border/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tipo.cor }}
                      />
                      <span className="font-medium">{tipo.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tipo.exige_validade ? "default" : "secondary"}>
                      {tipo.exige_validade ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tipo.dias_alerta_vencimento}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {tipo.extensoes_permitidas.map(ext => (
                        <Badge key={ext} variant="outline" className="text-xs">
                          .{ext}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tipo.ativo ? "default" : "secondary"} className={tipo.ativo ? "bg-success/10 text-success border-success/20" : ""}>
                      {tipo.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tipo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteId(tipo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTipo ? "Editar Tipo" : "Novo Tipo de Documento"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: CND Federal"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.cor}
                    onChange={(e) => setForm({ ...form, cor: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={form.cor}
                    onChange={(e) => setForm({ ...form, cor: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição do tipo de documento"
              />
            </div>

            <div className="space-y-2">
              <Label>Extensões Permitidas (separadas por vírgula)</Label>
              <Input
                value={form.extensoes_permitidas?.join(", ")}
                onChange={(e) => setForm({ 
                  ...form, 
                  extensoes_permitidas: e.target.value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
                })}
                placeholder="pdf, doc, docx"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div>
                <Label>Exige Data de Validade</Label>
                <p className="text-xs text-muted-foreground">Documentos deste tipo possuem data de vencimento</p>
              </div>
              <Switch
                checked={form.exige_validade}
                onCheckedChange={(checked) => setForm({ ...form, exige_validade: checked })}
              />
            </div>

            {form.exige_validade && (
              <div className="space-y-2">
                <Label>Dias de Antecedência para Alerta</Label>
                <Input
                  type="number"
                  value={form.dias_alerta_vencimento}
                  onChange={(e) => setForm({ ...form, dias_alerta_vencimento: parseInt(e.target.value) || 30 })}
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div>
                <Label>Permite Versionamento</Label>
                <p className="text-xs text-muted-foreground">Manter histórico de versões anteriores</p>
              </div>
              <Switch
                checked={form.permite_versoes}
                onCheckedChange={(checked) => setForm({ ...form, permite_versoes: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div>
                <Label>Ativo</Label>
                <p className="text-xs text-muted-foreground">Tipo disponível para seleção</p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createTipo.isPending || updateTipo.isPending || !form.nome}
            >
              {(createTipo.isPending || updateTipo.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo de documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Documentos deste tipo não serão excluídos.
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