import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BaseConhecimento() {
  const [busca, setBusca] = useState("");

  // Dados de exemplo - depois pode vir do banco
  const categorias = [
    {
      id: "1",
      nome: "Produtos",
      icon: "📦",
      artigos: [
        {
          id: "1",
          titulo: "Como verificar o estoque de produtos?",
          conteudo: "Para verificar o estoque, acesse o menu Produtos > Estoque. Lá você pode ver a quantidade disponível de cada produto.",
          tags: ["estoque", "produtos", "consulta"],
        },
        {
          id: "2",
          titulo: "Como cadastrar um novo produto?",
          conteudo: "Para cadastrar um produto, vá em Produtos > Novo Produto e preencha os campos obrigatórios como nome, código, preço e quantidade inicial.",
          tags: ["cadastro", "produtos", "novo"],
        },
      ],
    },
    {
      id: "2",
      nome: "Pedidos",
      icon: "📋",
      artigos: [
        {
          id: "3",
          titulo: "Como criar um novo pedido?",
          conteudo: "Para criar um pedido, acesse Vendas > Novo Pedido, selecione o cliente, adicione os produtos e finalize.",
          tags: ["pedido", "vendas", "novo"],
        },
        {
          id: "4",
          titulo: "Como cancelar um pedido?",
          conteudo: "Para cancelar um pedido, abra os detalhes do pedido e clique em Cancelar. Será necessário informar o motivo do cancelamento.",
          tags: ["pedido", "cancelamento", "vendas"],
        },
      ],
    },
    {
      id: "3",
      nome: "Clientes",
      icon: "👥",
      artigos: [
        {
          id: "5",
          titulo: "Como cadastrar um novo cliente?",
          conteudo: "Acesse Clientes > Novo Cliente e preencha os dados cadastrais. CPF/CNPJ são obrigatórios.",
          tags: ["cliente", "cadastro", "novo"],
        },
        {
          id: "6",
          titulo: "Como editar informações de cliente?",
          conteudo: "Clique no cliente desejado na lista e depois em Editar. Faça as alterações necessárias e salve.",
          tags: ["cliente", "edição", "atualização"],
        },
      ],
    },
    {
      id: "4",
      nome: "Sistema",
      icon: "⚙️",
      artigos: [
        {
          id: "7",
          titulo: "Como redefinir minha senha?",
          conteudo: "Na tela de login, clique em 'Esqueci minha senha' e siga as instruções enviadas por email.",
          tags: ["senha", "login", "acesso"],
        },
        {
          id: "8",
          titulo: "Como alterar minhas configurações?",
          conteudo: "Acesse o menu do usuário no canto superior direito e clique em Configurações.",
          tags: ["configurações", "perfil", "usuário"],
        },
      ],
    },
  ];

  const artigosFiltrados = categorias.map(categoria => ({
    ...categoria,
    artigos: categoria.artigos.filter(artigo =>
      artigo.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      artigo.conteudo.toLowerCase().includes(busca.toLowerCase()) ||
      artigo.tags.some(tag => tag.toLowerCase().includes(busca.toLowerCase()))
    ),
  })).filter(categoria => categoria.artigos.length > 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Base de Conhecimento</h1>
            <p className="text-muted-foreground">
              Encontre respostas para as perguntas mais frequentes
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Artigo
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos, palavras-chave..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 text-lg h-12"
              />
            </div>
          </CardContent>
        </Card>

        {artigosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum artigo encontrado para sua busca
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {artigosFiltrados.map((categoria) => (
              <Card key={categoria.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{categoria.icon}</span>
                    {categoria.nome}
                  </CardTitle>
                  <CardDescription>
                    {categoria.artigos.length} {categoria.artigos.length === 1 ? "artigo" : "artigos"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {categoria.artigos.map((artigo, index) => (
                      <AccordionItem key={artigo.id} value={`item-${artigo.id}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          <div className="flex-1">
                            <p className="font-medium">{artigo.titulo}</p>
                            <div className="flex gap-2 mt-2">
                              {artigo.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pt-4">
                          {artigo.conteudo}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
