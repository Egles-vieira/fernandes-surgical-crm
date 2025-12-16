import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFilasAtendimento } from "@/hooks/useFilasAtendimento";
import { Plus, Edit2, Trash2, GripVertical } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function GerenciarFilas() {
  const { filas, isLoading, createFila, updateFila, deleteFila } = useFilasAtendimento();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFila, setEditingFila] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("#3B82F6");

  const handleSubmit = () => {
    if (editingFila) {
      updateFila.mutate(
        { id: editingFila.id, nome, descricao, cor },
        {
          onSuccess: () => {
            setDialogOpen(false);
            resetForm();
          },
        }
      );
    } else {
      const maxOrdem = filas.reduce((max, f) => Math.max(max, f.ordem), 0);
      createFila.mutate(
        { nome, descricao, cor, ordem: maxOrdem + 1 } as any,
        {
          onSuccess: () => {
            setDialogOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  const handleEdit = (fila: any) => {
    setEditingFila(fila);
    setNome(fila.nome);
    setDescricao(fila.descricao || "");
    setCor(fila.cor);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingFila(null);
    setNome("");
    setDescricao("");
    setCor("#3B82F6");
  };

  if (isLoading) {
    return <Card><CardContent className="pt-6">Carregando filas...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Filas de Atendimento</CardTitle>
            <CardDescription>
              Organize conversas em filas para melhor distribuição
            </CardDescription>
          </div>
          <Sheet open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Fila
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{editingFila ? "Editar" : "Nova"} Fila</SheetTitle>
                <SheetDescription>
                  Configure as informações da fila de atendimento
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Fila</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Atendimento Geral"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição opcional da fila"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cor"
                      type="color"
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              </div>
              <SheetFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!nome}>
                  {editingFila ? "Salvar" : "Criar"} Fila
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filas.map((fila) => (
            <div
              key={fila.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: fila.cor }}
              />
              <div className="flex-1">
                <p className="font-medium">{fila.nome}</p>
                {fila.descricao && (
                  <p className="text-sm text-muted-foreground">{fila.descricao}</p>
                )}
              </div>
              <Badge variant="outline">Ordem {fila.ordem}</Badge>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(fila)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteFila.mutate(fila.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma fila cadastrada</p>
              <p className="text-sm">Clique em "Nova Fila" para começar</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
