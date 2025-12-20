import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function OportunidadeDetailsSheetSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-6 border-b bg-card py-[10px]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Coluna esquerda */}
        <div className="w-[340px] border-r flex flex-col bg-card">
          <div className="p-4 space-y-4">
            {/* Cliente section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-16" />
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contatos section */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <Separator />

            {/* Campos customizados */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>

            <Separator />

            {/* Vendedor */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-40" />
            </div>

            <Separator />

            {/* Datas */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Header da coluna direita */}
          <div className="px-6 py-4 border-b space-y-4 bg-card">
            {/* Pipeline info */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Stages bar skeleton */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 flex-1 rounded-md" />
              ))}
            </div>

            {/* Valor total e botão salvar */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="px-6 py-2 border-b bg-card">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          {/* Conteúdo das tabs */}
          <div className="flex-1 p-6 space-y-4">
            {/* Grid de itens skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-28" />
            </div>
            
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border-b last:border-b-0">
                  <div className="flex gap-4 items-center">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
