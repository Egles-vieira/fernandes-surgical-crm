import { useState } from "react";
import { useMetasEquipe } from "@/hooks/useMetasEquipe";
import { MetaCard } from "./MetaCard";
import { MetaDetalhesSheet } from "./MetaDetalhesSheet";
import { AtualizarProgressoSheet } from "./AtualizarProgressoSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target } from "lucide-react";

interface MetasEquipeContentProps {
  equipeId: string | null;
}

export function MetasEquipeContent({ equipeId }: MetasEquipeContentProps) {
  const { metas, isLoading, atualizarProgresso } = useMetasEquipe(equipeId || undefined);
  const [metaSelecionada, setMetaSelecionada] = useState<any>(null);
  const [metaDetalhesOpen, setMetaDetalhesOpen] = useState(false);
  const [atualizarProgressoOpen, setAtualizarProgressoOpen] = useState(false);

  if (isLoading) {
    return <div className="text-center py-8">Carregando metas...</div>;
  }

  const metasAtivas = metas?.filter(m => m.status === 'ativa') || [];
  const metasConcluidas = metas?.filter(m => m.status === 'concluida') || [];
  const metasOutras = metas?.filter(m => !['ativa', 'concluida'].includes(m.status)) || [];

  return (
    <div className="flex-1 overflow-hidden">
      <Tabs defaultValue="ativas" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ativas">
            Ativas ({metasAtivas.length})
          </TabsTrigger>
          <TabsTrigger value="concluidas">
            Concluídas ({metasConcluidas.length})
          </TabsTrigger>
          <TabsTrigger value="outras">
            Outras ({metasOutras.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-[calc(90vh-250px)]">
            {metasAtivas.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma meta ativa</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Clique em "Nova Meta" para criar uma
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {metasAtivas.map((meta) => (
                  <MetaCard
                    key={meta.id}
                    meta={meta}
                    onVerDetalhes={() => {
                      setMetaSelecionada(meta);
                      setMetaDetalhesOpen(true);
                    }}
                    onAtualizarProgresso={() => {
                      setMetaSelecionada(meta);
                      setAtualizarProgressoOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="concluidas" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-[calc(90vh-250px)]">
            {metasConcluidas.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma meta concluída ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {metasConcluidas.map((meta) => (
                  <MetaCard
                    key={meta.id}
                    meta={meta}
                    onVerDetalhes={() => {
                      setMetaSelecionada(meta);
                      setMetaDetalhesOpen(true);
                    }}
                    onAtualizarProgresso={() => {}}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="outras" className="flex-1 overflow-hidden mt-4">
          <ScrollArea className="h-[calc(90vh-250px)]">
            {metasOutras.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma outra meta</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                {metasOutras.map((meta) => (
                  <MetaCard
                    key={meta.id}
                    meta={meta}
                    onVerDetalhes={() => {
                      setMetaSelecionada(meta);
                      setMetaDetalhesOpen(true);
                    }}
                    onAtualizarProgresso={() => {}}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <MetaDetalhesSheet
        meta={metaSelecionada}
        open={metaDetalhesOpen}
        onOpenChange={setMetaDetalhesOpen}
      />

      <AtualizarProgressoSheet
        meta={metaSelecionada}
        open={atualizarProgressoOpen}
        onOpenChange={setAtualizarProgressoOpen}
        onAtualizar={(metaId, novoValor, observacao) => {
          atualizarProgresso.mutate({ metaId, novoValor, observacao });
        }}
      />
    </div>
  );
}
