import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGEDPermissoes, GEDPermissaoInput } from "@/hooks/useGEDPermissoes";
import { useEquipes } from "@/hooks/useEquipes";
import { useVendedores } from "@/hooks/useVendedores";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Users, User, Shield, Globe } from "lucide-react";

interface GEDPermissoesDialogProps {
  documentoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES_DISPONIVEIS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'sales', label: 'Vendedor' },
  { value: 'support', label: 'Suporte' },
  { value: 'backoffice', label: 'Backoffice' }
];

const NIVEIS_ACESSO = [
  { value: 'visualizar', label: 'Visualizar' },
  { value: 'download', label: 'Download' },
  { value: 'editar', label: 'Editar' }
];

export function GEDPermissoesDialog({ documentoId, open, onOpenChange }: GEDPermissoesDialogProps) {
  const { permissoes, isLoading, addPermissao, removePermissao } = useGEDPermissoes(documentoId);
  const { equipes } = useEquipes();
  const { vendedores } = useVendedores();

  const [novoTipo, setNovoTipo] = useState<string>("todos");
  const [novoValor, setNovoValor] = useState<string>("");
  const [novoNivel, setNovoNivel] = useState<string>("visualizar");

  const handleAdd = async () => {
    const input: GEDPermissaoInput = {
      documento_id: documentoId,
      tipo: novoTipo as any,
      nivel: novoNivel as any
    };

    if (novoTipo === 'role') input.role_nome = novoValor;
    if (novoTipo === 'equipe') input.equipe_id = novoValor;
    if (novoTipo === 'usuario') input.usuario_id = novoValor;

    await addPermissao.mutateAsync(input);
    setNovoValor("");
  };

  const getPermissaoIcon = (tipo: string) => {
    switch (tipo) {
      case 'todos': return <Globe className="h-4 w-4 text-muted-foreground" />;
      case 'role': return <Shield className="h-4 w-4 text-primary" />;
      case 'equipe': return <Users className="h-4 w-4 text-success" />;
      case 'usuario': return <User className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  const getPermissaoLabel = (p: any) => {
    switch (p.tipo) {
      case 'todos': return 'Todos os usuários';
      case 'role': return ROLES_DISPONIVEIS.find(r => r.value === p.role_nome)?.label || p.role_nome;
      case 'equipe': return p.equipe?.nome || 'Equipe';
      case 'usuario': return `${p.usuario?.primeiro_nome} ${p.usuario?.sobrenome}`;
      default: return '-';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Adicionar nova permissão */}
          <div className="flex gap-2 flex-wrap">
            <Select value={novoTipo} onValueChange={(v) => { setNovoTipo(v); setNovoValor(""); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="role">Perfil</SelectItem>
                <SelectItem value="equipe">Equipe</SelectItem>
                <SelectItem value="usuario">Usuário</SelectItem>
              </SelectContent>
            </Select>

            {novoTipo === 'role' && (
              <Select value={novoValor} onValueChange={setNovoValor}>
                <SelectTrigger className="flex-1 min-w-[150px]">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {ROLES_DISPONIVEIS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {novoTipo === 'equipe' && (
              <Select value={novoValor} onValueChange={setNovoValor}>
                <SelectTrigger className="flex-1 min-w-[150px]">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {equipes?.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {novoTipo === 'usuario' && (
              <Select value={novoValor} onValueChange={setNovoValor}>
                <SelectTrigger className="flex-1 min-w-[150px]">
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {vendedores?.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.primeiro_nome} {v.sobrenome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={novoNivel} onValueChange={setNovoNivel}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {NIVEIS_ACESSO.map(n => (
                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              size="icon" 
              onClick={handleAdd}
              disabled={addPermissao.isPending || (novoTipo !== 'todos' && !novoValor)}
            >
              {addPermissao.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Lista de permissões */}
          <div className="border border-border/50 rounded-lg divide-y divide-border/50">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Carregando...</div>
            ) : permissoes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma permissão configurada</p>
                <p className="text-xs mt-1">Adicione permissões para controlar quem pode acessar este documento</p>
              </div>
            ) : (
              permissoes.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {getPermissaoIcon(p.tipo)}
                    <span className="font-medium">{getPermissaoLabel(p)}</span>
                    <Badge variant="outline" className="text-xs">{p.nivel}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePermissao.mutateAsync(p.id)}
                    disabled={removePermissao.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}