import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, ChevronRight, Menu, LogOut, Settings, UserCog, Shield } from "lucide-react";
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
          breadcrumb: "Cirúrgica Fernandes / Dashboard",
        };
      case "/vendas":
        return {
          title: "Vendas",
          description: "Gerencie suas propostas e pipeline de vendas",
          breadcrumb: "Cirúrgica Fernandes / Vendas",
        };
      case "/plataformas":
        return {
          title: "Plataformas",
          description: "Integração com plataformas de e-commerce",
          breadcrumb: "Cirúrgica Fernandes / Plataformas",
        };
      case "/plataformas/cotacoes":
        return {
          title: "Plataformas eletrônicas",
          description: "Gerencie cotações das plataformas EDI",
          breadcrumb: "Cirúrgica Fernandes / Plataformas / Cotações",
        };
      case "/plataformas/dashboard-ia":
        return {
          title: "Dashboard de Análise IA",
          description: "Métricas e desempenho da IA na análise de cotações",
          breadcrumb: "Cirúrgica Fernandes / Plataformas / Dashboard IA",
        };
      case "/plataformas/ml-dashboard":
        return {
          title: "ML Dashboard",
          description: "Aprendizado de máquina e métricas de feedback",
          breadcrumb: "Cirúrgica Fernandes / Plataformas / ML Dashboard",
        };
      case "/plataformas/vinculos-pendentes":
        return {
          title: "Vínculos Pendentes",
          description: "Aprove ou rejeite vínculos sugeridos pela IA",
          breadcrumb: "Cirúrgica Fernandes / Plataformas / Vínculos Pendentes",
        };
      case "/plataformas/produtos-vinculo":
        return {
          title: "Produtos Vinculados",
          description: "Gerencie vínculos entre produtos EDI e internos",
          breadcrumb: "Cirúrgica Fernandes / Plataformas / Produtos Vinculados",
        };
      case "/licitacoes":
        return {
          title: "Licitações",
          description: "Acompanhe licitações e contratos governamentais",
          breadcrumb: "Cirúrgica Fernandes / Licitações",
        };
      case "/clientes":
        return {
          title: "Clientes",
          description: "Gerencie sua base de clientes e contatos",
          breadcrumb: "Cirúrgica Fernandes / Clientes",
        };
      case "/produtos":
        return {
          title: "Produtos",
          description: "Catálogo de produtos e estoque",
          breadcrumb: "Cirúrgica Fernandes / Produtos",
        };
      case "/whatsapp":
        return {
          title: "WhatsApp",
          description: "Gerencie suas conversas e atendimentos",
          breadcrumb: "Cirúrgica Fernandes / WhatsApp",
        };
      case "/whatsapp/configuracoes":
        return {
          title: "Configurações WhatsApp",
          description: "Configure contas, templates e respostas rápidas",
          breadcrumb: "Cirúrgica Fernandes / WhatsApp / Configurações",
        };
      case "/usuarios":
        return {
          title: "Usuários",
          description: "Gerencie usuários e permissões do sistema",
          breadcrumb: "Cirúrgica Fernandes / Usuários",
        };
      case "/equipes":
        return {
          title: "Equipes",
          description: "Gerencie equipes, membros e metas",
          breadcrumb: "Cirúrgica Fernandes / Equipes",
        };
      case "/tickets":
        return {
          title: "SAC - Atendimento ao cliente",
          description: "Gerencie reclamações e solicitações de clientes",
          breadcrumb: "Cirúrgica Fernandes / Tickets",
        };
      case "/clientes/cadastro-cnpj":
        return {
          title: "Cadastro de Empresas",
          description: "Cadastre clientes com apoio da IA",
          breadcrumb: "Cirúrgica Fernandes / Clientes / Cadastro CNPJ",
        };
      case "/clientes/solicitacoes":
        return {
          title: "Solicitações de Cadastro",
          description: "Gerencie as solicitações de cadastro de clientes",
          breadcrumb: "Cirúrgica Fernandes / Clientes / Solicitações",
        };
      case "/documentos":
        return {
          title: "GED",
          description: "Gestão Eletrônica de Documentos",
          breadcrumb: "Cirúrgica Fernandes / GED / Documentos",
        };
      case "/configuracoes":
        return {
          title: "Configurações",
          description: "Configurações gerais do sistema",
          breadcrumb: "Cirúrgica Fernandes / Configurações",
        };
      default:
        if (location.pathname.startsWith("/tickets/")) {
          return {
            title: "Detalhes do Ticket",
            description: "Visualize e gerencie o ticket",
            breadcrumb: "Cirúrgica Fernandes / Tickets / Detalhes",
          };
        }
        return {
          title: "CRM",
          description: "Sistema de gestão empresarial",
          breadcrumb: "Cirúrgica Fernandes",
        };
    }
  };
  const pageInfo = getPageInfo();
  return (
    <header className="h-16 border-b bg-card flex items-center px-6 shadow-sm">
      <div className="flex items-center gap-6 w-full">
        {/* Título da Página */}
        <div>
          <h2 className="text-lg font-bold text-foreground">{pageInfo.title}</h2>
          <p className="text-xs text-muted-foreground">{pageInfo.description}</p>
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
