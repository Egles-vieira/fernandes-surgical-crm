import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Settings } from "lucide-react";
import { useEDIUnidadesMedida } from "@/hooks/useEDIUnidadesMedida";
import { useEDICondicoesPagamento } from "@/hooks/useEDICondicoesPagamento";
import { useCondicoesPagamento } from "@/hooks/useCondicoesPagamento";
import { usePlataformasEDI } from "@/hooks/usePlataformasEDI";

export default function Parametros() {
  const [plataformaFiltro, setPlataformaFiltro] = useState<string>("all");
  const [dialogUnidadeAberto, setDialogUnidadeAberto] = useState(false);
  const [dialogCondicaoAberto, setDialogCondicaoAberto] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<any>(null);
  const [condicaoEditando, setCondicaoEditando] = useState<any>(null);
  
  // Estados para os formulários
  const [plataformaUnidade, setPlataformaUnidade] = useState<string>("");
  const [plataformaCondicao, setPlataformaCondicao] = useState<string>("");
  const [condicaoPagamento, setCondicaoPagamento] = useState<string>("");

  const { plataformas } = usePlataformasEDI();
  const plataformaIdFiltro = plataformaFiltro === "all" ? undefined : plataformaFiltro;
  const { unidades, isLoading: loadingUnidades, salvarUnidade, deletarUnidade } = useEDIUnidadesMedida(plataformaIdFiltro);
  const { condicoes, isLoading: loadingCondicoes, salvarCondicao, deletarCondicao } = useEDICondicoesPagamento(plataformaIdFiltro);
  const { condicoes: condicoesPagamento } = useCondicoesPagamento();

  const handleSalvarUnidade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await salvarUnidade.mutateAsync({
      id: unidadeEditando?.id,
      plataforma_id: plataformaUnidade,
      codigo_portal: formData.get("codigo_portal") as string,
      descricao_portal: formData.get("descricao_portal") as string,
      abreviacao_portal: formData.get("abreviacao_portal") as string || null,
      unidade_medida_interna: formData.get("unidade_medida_interna") as string,
      ativo: true,
    });

    setDialogUnidadeAberto(false);
    setUnidadeEditando(null);
    setPlataformaUnidade("");
  };

  const handleSalvarCondicao = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await salvarCondicao.mutateAsync({
      id: condicaoEditando?.id,
      plataforma_id: plataformaCondicao,
      codigo_portal: formData.get("codigo_portal") as string,
      descricao_portal: formData.get("descricao_portal") as string,
      condicao_pagamento_id: condicaoPagamento || null,
      codigo_integracao: formData.get("codigo_integracao") as string || null,
      ativo: true,
    });

    setDialogCondicaoAberto(false);
    setCondicaoEditando(null);
    setPlataformaCondicao("");
    setCondicaoPagamento("");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Parâmetros EDI</h1>
            <p className="text-muted-foreground">
              Configuração de DE-PARA de unidades de medida e condições de pagamento
            </p>
          </div>
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-fit">Filtrar por Portal:</Label>
            <Select value={plataformaFiltro} onValueChange={setPlataformaFiltro}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Todos os portais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os portais</SelectItem>
                {plataformas?.map((plataforma) => (
                  <SelectItem key={plataforma.id} value={plataforma.id}>
                    {plataforma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Tabs defaultValue="unidades" className="space-y-4">
          <TabsList>
            <TabsTrigger value="unidades">Unidades de Medida</TabsTrigger>
            <TabsTrigger value="condicoes">DE-PARA Condições</TabsTrigger>
            <TabsTrigger value="minhas-condicoes">Minhas Condições</TabsTrigger>
          </TabsList>

          <TabsContent value="unidades" className="space-y-4">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Unidades de Medida</h2>
                <Dialog open={dialogUnidadeAberto} onOpenChange={setDialogUnidadeAberto}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setUnidadeEditando(null);
                      setPlataformaUnidade("");
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Unidade
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {unidadeEditando ? "Editar Unidade" : "Nova Unidade"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSalvarUnidade} className="space-y-4">
                      <div>
                        <Label>Portal</Label>
                        <Select 
                          value={plataformaUnidade || unidadeEditando?.plataforma_id} 
                          onValueChange={setPlataformaUnidade}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o portal" />
                          </SelectTrigger>
                          <SelectContent>
                            {plataformas?.map((plataforma) => (
                              <SelectItem key={plataforma.id} value={plataforma.id}>
                                {plataforma.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Código Portal</Label>
                        <Input name="codigo_portal" defaultValue={unidadeEditando?.codigo_portal} required />
                      </div>
                      <div>
                        <Label>Descrição Portal</Label>
                        <Input name="descricao_portal" defaultValue={unidadeEditando?.descricao_portal} required />
                      </div>
                      <div>
                        <Label>Abreviação Portal</Label>
                        <Input name="abreviacao_portal" defaultValue={unidadeEditando?.abreviacao_portal} />
                      </div>
                      <div>
                        <Label>Unidade Interna</Label>
                        <Input name="unidade_medida_interna" defaultValue={unidadeEditando?.unidade_medida_interna} required />
                      </div>
                      <Button type="submit" className="w-full">Salvar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código Portal</TableHead>
                    <TableHead>Descrição Portal</TableHead>
                    <TableHead>Abreviação</TableHead>
                    <TableHead>Unidade Interna</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUnidades ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : unidades?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Nenhuma unidade cadastrada</TableCell>
                    </TableRow>
                  ) : (
                    unidades?.map((unidade) => (
                      <TableRow key={unidade.id}>
                        <TableCell className="font-medium">{unidade.codigo_portal}</TableCell>
                        <TableCell>{unidade.descricao_portal}</TableCell>
                        <TableCell>{unidade.abreviacao_portal}</TableCell>
                        <TableCell>{unidade.unidade_medida_interna}</TableCell>
                        <TableCell>
                          <Badge variant={unidade.ativo ? "default" : "secondary"}>
                            {unidade.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                             <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setUnidadeEditando(unidade);
                                setPlataformaUnidade(unidade.plataforma_id || "");
                                setDialogUnidadeAberto(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deletarUnidade.mutate(unidade.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="condicoes" className="space-y-4">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Condições de Pagamento</h2>
                <Dialog open={dialogCondicaoAberto} onOpenChange={setDialogCondicaoAberto}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setCondicaoEditando(null);
                      setPlataformaCondicao("");
                      setCondicaoPagamento("");
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Condição
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {condicaoEditando ? "Editar Condição" : "Nova Condição"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSalvarCondicao} className="space-y-4">
                      <div>
                        <Label>Portal</Label>
                        <Select 
                          value={plataformaCondicao || condicaoEditando?.plataforma_id} 
                          onValueChange={setPlataformaCondicao}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o portal" />
                          </SelectTrigger>
                          <SelectContent>
                            {plataformas?.map((plataforma) => (
                              <SelectItem key={plataforma.id} value={plataforma.id}>
                                {plataforma.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Código Portal</Label>
                        <Input name="codigo_portal" defaultValue={condicaoEditando?.codigo_portal} required />
                      </div>
                      <div>
                        <Label>Descrição Portal</Label>
                        <Input name="descricao_portal" defaultValue={condicaoEditando?.descricao_portal} required />
                      </div>
                      <div>
                        <Label>Minha Condição de Pagamento</Label>
                        <Select 
                          value={condicaoPagamento || condicaoEditando?.condicao_pagamento_id || ""} 
                          onValueChange={setCondicaoPagamento}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {condicoesPagamento?.map((cp) => (
                              <SelectItem key={cp.id} value={cp.id}>
                                {cp.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Código de Integração</Label>
                        <Input name="codigo_integracao" defaultValue={condicaoEditando?.codigo_integracao} />
                      </div>
                      <Button type="submit" className="w-full">Salvar</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código Portal</TableHead>
                    <TableHead>Descrição Portal</TableHead>
                    <TableHead>Condição Interna</TableHead>
                    <TableHead>Cód. Integração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCondicoes ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : condicoes?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">Nenhuma condição cadastrada</TableCell>
                    </TableRow>
                  ) : (
                    condicoes?.map((condicao) => (
                      <TableRow key={condicao.id}>
                        <TableCell className="font-medium">{condicao.codigo_portal}</TableCell>
                        <TableCell>{condicao.descricao_portal}</TableCell>
                        <TableCell>{condicao.condicoes_pagamento?.nome || "-"}</TableCell>
                        <TableCell>{condicao.codigo_integracao || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={condicao.ativo ? "default" : "secondary"}>
                            {condicao.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setCondicaoEditando(condicao);
                                setPlataformaCondicao(condicao.plataforma_id || "");
                                setCondicaoPagamento(condicao.condicao_pagamento_id || "");
                                setDialogCondicaoAberto(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deletarCondicao.mutate(condicao.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="minhas-condicoes" className="space-y-4">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Minhas Condições de Pagamento</h2>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código Integração</TableHead>
                    <TableHead>Data Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {condicoesPagamento?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">Nenhuma condição cadastrada</TableCell>
                    </TableRow>
                  ) : (
                    condicoesPagamento?.map((condicao) => (
                      <TableRow key={condicao.id}>
                        <TableCell className="font-medium">{condicao.nome}</TableCell>
                        <TableCell>{condicao.codigo_integracao || "-"}</TableCell>
                        <TableCell>{new Date(condicao.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
