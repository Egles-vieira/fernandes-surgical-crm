import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useURAs } from "@/hooks/useURAs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { OpcaoFormDialog } from "@/components/ura/OpcaoFormDialog";
import { FluxoVisual } from "@/components/ura/FluxoVisual";
import {
  Save,
  TestTube,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  ArrowLeft,
  Copy,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { URAOpcao } from "@/hooks/useURAs";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableOpcaoProps {
  opcao: URAOpcao;
  onEdit: (opcao: URAOpcao) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, ativo: boolean) => void;
}

function SortableOpcao({ opcao, onEdit, onDelete, onToggle }: SortableOpcaoProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: opcao.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      menu_submenu: "Submenu",
      transferir_ramal: "Ramal",
      transferir_numero: "Número",
      reproduzir_audio: "Áudio",
      enviar_callback: "Callback",
      desligar: "Desligar",
      correio_voz: "Correio Voz",
    };
    return labels[tipo] || tipo;
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">
              {opcao.numero_opcao}
            </span>
          </div>

          <div className="flex-1">
            <p className="font-medium">{opcao.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {getTipoLabel(opcao.tipo_acao)}
            </p>
          </div>

          <Switch
            checked={opcao.ativo ?? false}
            onCheckedChange={(checked) => onToggle(opcao.id, checked)}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(opcao)}
          >
            <Edit className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(opcao.id)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function URAEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uras, isLoadingURAs } = useURAs();

  const [ura, setUra] = useState<any>(null);
  const [opcoes, setOpcoes] = useState<URAOpcao[]>([]);
  const [isLoadingOpcoes, setIsLoadingOpcoes] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOpcao, setSelectedOpcao] = useState<URAOpcao | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [opcaoToDelete, setOpcaoToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (uras && id) {
      const uraEncontrada = uras.find((u) => u.id === id);
      setUra(uraEncontrada);
    }
  }, [uras, id]);

  useEffect(() => {
    if (id) {
      loadOpcoes();
    }
  }, [id]);

  const loadOpcoes = async () => {
    try {
      setIsLoadingOpcoes(true);
      const { data, error } = await supabase
        .from("ura_opcoes")
        .select("*")
        .eq("ura_id", id)
        .order("ordem");

      if (error) throw error;
      setOpcoes(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar opções",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingOpcoes(false);
    }
  };

  const handleCreateOpcao = () => {
    setSelectedOpcao(null);
    setDialogOpen(true);
  };

  const handleEditOpcao = (opcao: URAOpcao) => {
    setSelectedOpcao(opcao);
    setDialogOpen(true);
  };

  const handleSubmitOpcao = async (data: any) => {
    try {
      if (selectedOpcao) {
        const { error } = await supabase
          .from("ura_opcoes")
          .update(data)
          .eq("id", selectedOpcao.id);

        if (error) throw error;

        toast({
          title: "Opção atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from("ura_opcoes")
          .insert([{ ...data, ura_id: id }]);

        if (error) throw error;

        toast({
          title: "Opção criada com sucesso!",
        });
      }

      await loadOpcoes();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar opção",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteOpcao = async () => {
    if (!opcaoToDelete) return;

    try {
      const { error } = await supabase
        .from("ura_opcoes")
        .delete()
        .eq("id", opcaoToDelete);

      if (error) throw error;

      toast({
        title: "Opção excluída com sucesso!",
      });

      await loadOpcoes();
      setDeleteDialogOpen(false);
      setOpcaoToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir opção",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleOpcao = async (opcaoId: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from("ura_opcoes")
        .update({ ativo })
        .eq("id", opcaoId);

      if (error) throw error;

      await loadOpcoes();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar opção",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = opcoes.findIndex((o) => o.id === active.id);
    const newIndex = opcoes.findIndex((o) => o.id === over.id);

    const newOpcoes = [...opcoes];
    const [movedItem] = newOpcoes.splice(oldIndex, 1);
    newOpcoes.splice(newIndex, 0, movedItem);

    setOpcoes(newOpcoes);

    // Atualizar ordem no banco
    try {
      const updates = newOpcoes.map((opcao, index) => ({
        id: opcao.id,
        ordem: index,
      }));

      for (const update of updates) {
        await supabase
          .from("ura_opcoes")
          .update({ ordem: update.ordem })
          .eq("id", update.id);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao reordenar opções",
        description: error.message,
        variant: "destructive",
      });
      await loadOpcoes();
    }
  };

  const handleCopyWebhookURL = () => {
    const webhookURL = `${window.location.origin}/api/ura/webhook/${id}`;
    navigator.clipboard.writeText(webhookURL);
    toast({
      title: "URL copiada!",
      description: "URL do webhook copiada para a área de transferência",
    });
  };

  if (isLoadingURAs || !ura) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
        {/* Sidebar Esquerda */}
        <div className="w-80 border-r bg-muted/30 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/uras")}
              className="mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-semibold text-lg">{ura.nome}</h2>
              <Badge variant={ura.ativo ? "default" : "secondary"}>
                {ura.ativo ? "Ativa" : "Inativa"}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" size="sm">
                <TestTube className="w-4 h-4 mr-2" />
                Testar
              </Button>
            </div>
          </div>

          <div className="p-4 border-b">
            <Button onClick={handleCreateOpcao} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Nova Opção
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm font-medium mb-3">
              Opções ({opcoes.length})
            </p>

            {isLoadingOpcoes ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Carregando opções...
              </p>
            ) : opcoes.length > 0 ? (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={opcoes.map((o) => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {opcoes.map((opcao) => (
                    <SortableOpcao
                      key={opcao.id}
                      opcao={opcao}
                      onEdit={handleEditOpcao}
                      onDelete={(id) => {
                        setOpcaoToDelete(id);
                        setDeleteDialogOpen(true);
                      }}
                      onToggle={handleToggleOpcao}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma opção criada
              </p>
            )}
          </div>

          <div className="p-4 border-t space-y-2">
            <Button variant="outline" className="w-full" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Simular Fluxo
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={handleCopyWebhookURL}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Webhook URL
            </Button>
          </div>
        </div>

        {/* Área Central - Fluxo Visual */}
        <div className="flex-1 overflow-y-auto bg-background">
          <FluxoVisual ura={ura} opcoes={opcoes} />
        </div>

        {/* Dialog de Criar/Editar Opção */}
        <OpcaoFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmitOpcao}
          initialData={selectedOpcao}
          uraId={id!}
        />

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta opção? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOpcao}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
