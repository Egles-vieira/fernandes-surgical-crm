import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Crown, TrendingUp } from "lucide-react";
import { useEquipes, Equipe } from "@/hooks/useEquipes";
import { useRoles } from "@/hooks/useRoles";

export function OrganigramaEquipes() {
  const { equipes, isLoading } = useEquipes();
  const { allUsers } = useRoles();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando organograma...</div>
      </div>
    );
  }

  if (!equipes || equipes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Nenhuma equipe cadastrada</div>
      </div>
    );
  }

  // Organizar equipes por tipo
  const equipesPorTipo = equipes.reduce((acc, equipe) => {
    const tipo = equipe.tipo_equipe || 'outros';
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(equipe);
    return acc;
  }, {} as Record<string, Equipe[]>);

  const getEquipeBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'vendas':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'suporte':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'operacional':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
      case 'administrativo':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      vendas: 'Vendas',
      suporte: 'Suporte',
      operacional: 'Operacional',
      administrativo: 'Administrativo',
    };
    return labels[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
  };

  const getLiderInfo = (liderId: string | null) => {
    if (!liderId) return null;
    const lider = allUsers?.find(u => u.user_id === liderId);
    return lider;
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organograma de Equipes</h2>
          <p className="text-muted-foreground">Visualização hierárquica das equipes e suas estruturas</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            {equipes.length} {equipes.length === 1 ? 'Equipe' : 'Equipes'}
          </Badge>
        </div>
      </div>

      {Object.entries(equipesPorTipo).map(([tipo, equipesDoTipo]) => (
        <div key={tipo} className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`px-3 py-1 ${getEquipeBadgeColor(tipo)}`}>
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              {getTipoLabel(tipo)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {equipesDoTipo.length} {equipesDoTipo.length === 1 ? 'equipe' : 'equipes'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipesDoTipo.map((equipe) => {
              const lider = getLiderInfo(equipe.lider_equipe_id);
              const liderNome = lider?.email || 'Sem líder';

              return (
                <Card key={equipe.id} className="hover:shadow-lg transition-all duration-200 border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 bg-primary/10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(equipe.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-base truncate">{equipe.nome}</CardTitle>
                      </div>
                      {equipe.esta_ativa ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 shrink-0">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted shrink-0">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {equipe.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {equipe.descricao}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground">Líder</span>
                        <span className="text-sm font-medium truncate">{liderNome}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
