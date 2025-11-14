import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, ChevronRight, Menu, LogOut, Settings, UserCog, Shield, Home } from "lucide-react";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresa } from "@/hooks/useEmpresa";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ThemeCustomizer from "./ThemeCustomizer";
interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}
export default function Header({ collapsed, onToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { empresa } = useEmpresa();

  // Buscar perfil do usuário logado
  const { data: perfil } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase.from("perfis_usuario").select("*").eq("id", user.id).single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar roles do usuário
  const { data: rolesData } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Garantir que roles é sempre um array de strings
  const roles =
    rolesData?.map((item: any) => {
      // Se item for um objeto, extrair a propriedade role
      if (typeof item === "object" && item !== null) {
        return typeof item.role === "string" ? item.role : String(item.role);
      }
      // Se item já for uma string, retornar diretamente
      return String(item);
    }) || [];
  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };
  const getPageInfo = () => {
    switch (location.pathname) {
      case "/":
        return {
          title: "Dashboard",
          description: "Visão geral do desempenho e métricas",
          breadcrumb: [
            { label: "Início", path: "/" }
          ],
        };
      case "/vendas":
        return {
          title: "Vendas",
          description: "Gerencie suas oportunidades e pipeline de vendas",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Vendas", path: "/vendas" }
          ],
        };
      case "/plataformas":
        return {
          title: "Plataformas",
          description: "Integração com plataformas de e-commerce",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Plataformas", path: "/plataformas" }
          ],
        };
      case "/plataformas/cotacoes":
        return {
          title: "Plataformas eletrônicas",
          description: "Gerencie cotações das plataformas EDI",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Plataformas", path: "/plataformas" },
            { label: "Cotações", path: "/plataformas/cotacoes" }
          ],
        };
      case "/plataformas/dashboard-ia":
        return {
          title: "Dashboard de Análise IA",
          description: "Métricas e desempenho da IA na análise de cotações",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Plataformas", path: "/plataformas" },
            { label: "Dashboard IA", path: "/plataformas/dashboard-ia" }
          ],
        };
      case "/plataformas/ml-dashboard":
        return {
          title: "ML Dashboard",
          description: "Aprendizado de máquina e métricas de feedback",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Plataformas", path: "/plataformas" },
            { label: "ML Dashboard", path: "/plataformas/ml-dashboard" }
          ],
        };
      case "/plataformas/vinculos-pendentes":
        return {
          title: "Vínculos Pendentes",
          description: "Aprove ou rejeite vínculos sugeridos pela IA",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Plataformas", path: "/plataformas" },
            { label: "Vínculos Pendentes", path: "/plataformas/vinculos-pendentes" }
          ],
        };
      case "/plataformas/produtos-vinculo":
        return {
          title: "Produtos Vinculados",
          description: "Gerencie vínculos entre produtos EDI e internos",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Plataformas", path: "/plataformas" },
            { label: "Produtos Vinculados", path: "/plataformas/produtos-vinculo" }
          ],
        };
      case "/licitacoes":
        return {
          title: "Licitações",
          description: "Acompanhe licitações e contratos governamentais",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Licitações", path: "/licitacoes" }
          ],
        };
      case "/clientes":
        return {
          title: "Clientes",
          description: "Gerencie sua base de clientes e contatos",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Clientes", path: "/clientes" }
          ],
        };
      case "/produtos":
        return {
          title: "Produtos",
          description: "Catálogo de produtos e estoque",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Produtos", path: "/produtos" }
          ],
        };
      case "/whatsapp":
        return {
          title: "WhatsApp",
          description: "Gerencie suas conversas e atendimentos",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "WhatsApp", path: "/whatsapp" }
          ],
        };
      case "/whatsapp/configuracoes":
        return {
          title: "Configurações WhatsApp",
          description: "Configure contas, templates e respostas rápidas",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "WhatsApp", path: "/whatsapp" },
            { label: "Configurações", path: "/whatsapp/configuracoes" }
          ],
        };
      case "/usuarios":
        return {
          title: "Usuários",
          description: "Gerencie usuários e permissões do sistema",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Usuários", path: "/usuarios" }
          ],
        };
      case "/equipes":
        return {
          title: "Equipes",
          description: "Gerencie equipes, membros e metas",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Equipes", path: "/equipes" }
          ],
        };
      case "/tickets":
        return {
          title: "SAC - Atendimento ao cliente",
          description: "Gerencie reclamações e solicitações de clientes",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Tickets", path: "/tickets" }
          ],
        };
      case "/clientes/cadastro-cnpj":
        return {
          title: "Cadastro de Empresas",
          description: "Cadastre clientes com apoio da IA",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Clientes", path: "/clientes" },
            { label: "Cadastro CNPJ", path: "/clientes/cadastro-cnpj" }
          ],
        };
      case "/clientes/solicitacoes":
        return {
          title: "Solicitações de Cadastro",
          description: "Gerencie as solicitações de cadastro de clientes",
          breadcrumb: [
            { label: "Início", path: "/" },
            { label: "Clientes", path: "/clientes" },
            { label: "Solicitações", path: "/clientes/solicitacoes" }
          ],
        };
      default:
        if (location.pathname.startsWith("/tickets/")) {
          return {
            title: "Detalhes do Ticket",
            description: "Visualize e gerencie o ticket",
            breadcrumb: [
              { label: "Início", path: "/" },
              { label: "Tickets", path: "/tickets" },
              { label: "Detalhes" }
            ],
          };
        }
        return {
          title: "CRM",
          description: "Sistema de gestão empresarial",
          breadcrumb: [
            { label: "Início", path: "/" }
          ],
        };
    }
  };
  const pageInfo = getPageInfo();
  return (
    <header className="h-20 border-b bg-card flex items-center px-6 shadow-sm">
      <div className="flex items-center gap-6 w-full">
        {/* Título da Página */}
        <div className="flex-1">
          <Breadcrumb className="mb-1">
            <BreadcrumbList>
              {pageInfo.breadcrumb.map((item, index) => (
                <div key={item.label} className="contents">
                  <BreadcrumbItem>
                    {item.path ? (
                      <BreadcrumbLink href={item.path} className="flex items-center gap-1.5">
                        {index === 0 && <Home className="h-3.5 w-3.5" />}
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < pageInfo.breadcrumb.length - 1 && <BreadcrumbSeparator />}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <h2 className="text-base font-bold text-foreground">{pageInfo.title}</h2>
        </div>

        {/* Barra de Pesquisa Global */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground mx-[150px]" />
            <Input placeholder="Pesquisar no sistema..." className="pl-10 bg-muted/50 border-0 h-9 mx-[150px]" />
          </div>
        </div>

        {/* Ações e Usuário */}
        <div className="flex items-center gap-4 ml-auto">
          {location.pathname.startsWith("/whatsapp") && (
            <Button variant="outline" size="sm" onClick={() => navigate("/whatsapp/configuracoes")}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
          )}

          <ThemeCustomizer />

          <NotificationsSheet />

          <div className="h-8 w-px bg-border"></div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 hover:bg-muted/50 transition-all h-auto py-2 px-3 rounded-lg"
              >
                <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                  {perfil?.foto_perfil_url ? (
                    <AvatarImage
                      src={perfil.foto_perfil_url}
                      alt={`${perfil.primeiro_nome} ${perfil.sobrenome}` || "Usuário"}
                    />
                  ) : null}
                  <AvatarFallback className="gradient-primary text-white text-sm font-semibold">
                    {perfil?.primeiro_nome?.substring(0, 1).toUpperCase() || ""}
                    {perfil?.sobrenome?.substring(0, 1).toUpperCase() || ""}
                    {!perfil?.primeiro_nome && (user?.email?.substring(0, 2).toUpperCase() || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm leading-tight text-left">
                  <p className="font-semibold text-foreground">
                    {perfil?.primeiro_nome
                      ? `${perfil.primeiro_nome} ${perfil.sobrenome || ""}`.trim()
                      : user?.email?.split("@")[0] || "Usuário"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-muted-foreground">{perfil?.cargo || "Sem cargo"}</p>
                    {roles && roles.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {roles[0]}
                      </Badge>
                    )}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 border-0 shadow-elegant bg-card">
              <DropdownMenuLabel className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    {perfil?.foto_perfil_url ? (
                      <AvatarImage
                        src={perfil.foto_perfil_url}
                        alt={`${perfil.primeiro_nome} ${perfil.sobrenome}` || "Usuário"}
                      />
                    ) : null}
                    <AvatarFallback className="gradient-primary text-white font-semibold">
                      {perfil?.primeiro_nome?.substring(0, 1).toUpperCase() || ""}
                      {perfil?.sobrenome?.substring(0, 1).toUpperCase() || ""}
                      {!perfil?.primeiro_nome && (user?.email?.substring(0, 2).toUpperCase() || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {perfil?.primeiro_nome
                        ? `${perfil.primeiro_nome} ${perfil.sobrenome || ""}`.trim()
                        : user?.email?.split("@")[0] || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    {perfil?.cargo && <p className="text-xs text-muted-foreground mt-1">{perfil.cargo}</p>}
                  </div>
                </div>
                {roles && roles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs px-2 py-0.5">
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer py-2.5">
                <User className="mr-3 h-4 w-4 text-primary" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="cursor-pointer py-2.5">
                <Settings className="mr-3 h-4 w-4 text-primary" />
                <span>Configurações</span>
              </DropdownMenuItem>
              {roles?.includes("admin") && (
                <DropdownMenuItem onClick={() => navigate("/usuarios")} className="cursor-pointer py-2.5">
                  <Shield className="mr-3 h-4 w-4 text-primary" />
                  <span>Gerenciar Usuários</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="font-medium">Sair da Conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
