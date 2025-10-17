import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import NovoTemplateDialog from "./NovoTemplateDialog";

const TemplatesWhatsApp = () => {
  const [busca, setBusca] = useState("");
  const [dialogNovoTemplate, setDialogNovoTemplate] = useState(false);
  const [templateSelecionado, setTemplateSelecionado] = useState<any>(null);
  const [dialogVisualizacao, setDialogVisualizacao] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contas } = useQuery({
    queryKey: ['whatsapp-contas-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_contas')
        .select('*')
        .is('excluido_em', null)
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const contaAtiva = contas?.[0];

  const { data: templates, isLoading } = useQuery({
    queryKey: ['whatsapp-templates', contaAtiva?.id],
    queryFn: async () => {
      if (!contaAtiva?.id) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('whatsapp_conta_id', contaAtiva.id)
        .is('excluido_em', null)
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!contaAtiva?.id,
  });

  const deletarTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ excluido_em: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast({
        title: "Template excluído",
        description: "Template removido com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const templatesFiltrados = templates?.filter((template) => {
    if (!busca) return true;
    const searchLower = busca.toLowerCase();
    return (
      template.nome_template.toLowerCase().includes(searchLower) ||
      template.categoria.toLowerCase().includes(searchLower) ||
      template.corpo.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { variant: "default" | "destructive" | "outline" | "secondary", icon: any, label: string }> = {
      aprovado: { variant: "default", icon: CheckCircle, label: "Aprovado" },
      pendente: { variant: "secondary", icon: Clock, label: "Pendente" },
      rejeitado: { variant: "destructive", icon: XCircle, label: "Rejeitado" },
    };

    const config = statusMap[status || 'pendente'] || statusMap.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (!contaAtiva) {
    return (
      <Card className="p-12 text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma conta conectada</h3>
        <p className="text-sm text-muted-foreground">
          Configure uma conta WhatsApp Business para gerenciar templates
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Templates WhatsApp
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie seus templates de mensagens aprovados
            </p>
          </div>
          <Button onClick={() => setDialogNovoTemplate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando templates...
          </div>
        ) : templatesFiltrados?.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {busca ? "Tente ajustar sua busca" : "Comece criando seu primeiro template"}
            </p>
            {!busca && (
              <Button onClick={() => setDialogNovoTemplate(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Template
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesFiltrados?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.nome_template}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.categoria}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(template.status_aprovacao)}
                    </TableCell>
                    <TableCell>
                      {template.total_enviados || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.criado_em &&
                        formatDistanceToNow(new Date(template.criado_em), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setTemplateSelecionado(template);
                              setDialogVisualizacao(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setTemplateSelecionado(template);
                              setDialogNovoTemplate(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deletarTemplateMutation.mutate(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <NovoTemplateDialog
        open={dialogNovoTemplate}
        onOpenChange={(open) => {
          setDialogNovoTemplate(open);
          if (!open) setTemplateSelecionado(null);
        }}
        contaId={contaAtiva.id}
        template={templateSelecionado}
      />
    </>
  );
};

export default TemplatesWhatsApp;
