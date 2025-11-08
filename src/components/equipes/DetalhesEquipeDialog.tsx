import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Calendar, History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HistoricoEquipeTimeline } from "./HistoricoEquipeTimeline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DetalhesEquipeDialogProps {
  equipe: any;
  membros: any[];
  usuarios: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetalhesEquipeDialog({
  equipe,
  membros,
  usuarios,
  open,
  onOpenChange,
}: DetalhesEquipeDialogProps) {
  if (!equipe) return null;

  const lider = usuarios?.find((u) => u.user_id === equipe.lider_equipe_id);
  const totalMembros = membros?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{equipe.nome}</DialogTitle>
              <DialogDescription className="mt-2">
                {equipe.descricao || "Sem descrição"}
              </DialogDescription>
            </div>
            <Badge variant={equipe.esta_ativa ? "default" : "secondary"}>
              {equipe.esta_ativa ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Membros</p>
              <p className="text-lg font-semibold">{totalMembros}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Crown className="h-5 w-5 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Líder</p>
              <p className="text-sm font-medium truncate">{lider?.email || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Criada em</p>
              <p className="text-sm font-medium">
                {format(new Date(equipe.criado_em), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs com conteúdo */}
        <Tabs defaultValue="membros" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="membros" className="gap-2">
              <Users className="h-4 w-4" />
              Membros
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="membros" className="flex-1 overflow-auto mt-4">
            <div className="space-y-2">
              {membros && membros.length > 0 ? (
                membros.map((membro: any) => {
                  const user = usuarios?.find((u) => u.user_id === membro.usuario_id);
                  const isLider = equipe.lider_equipe_id === membro.usuario_id;

                  return (
                    <div
                      key={membro.usuario_id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {user?.email?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user?.email || membro.usuario_id}</p>
                          {isLider && (
                            <Badge variant="default" className="bg-warning hover:bg-warning/90">
                              <Crown className="h-3 w-3 mr-1" />
                              Líder
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Desde{" "}
                          {format(new Date(membro.entrou_em), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum membro na equipe ainda.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="historico" className="flex-1 overflow-hidden mt-4">
            <HistoricoEquipeTimeline equipeId={equipe.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
