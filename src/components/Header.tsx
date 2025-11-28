import { useLocation, useNavigate } from "react-router-dom";
import { Search, LogOut, Settings, User, Shield, MessageCircle } from "lucide-react";
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
      if (typeof item === "object" && item !== null) {
        return typeof item.role === "string" ? item.role : String(item.role);
      }
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
        };
      case "/vendas":
        return {
          title: "Vendas",
          description: "Gerencie suas propostas e pipeline de vendas",
        };
      case "/plataformas":
        return {
          title: "Plataformas",
          description: "Integração com plataformas de e-commerce",
        };
      case "/plataformas/cotacoes":
        return {
          title: "Plataformas eletrônicas",
          description: "Gerencie cotações das plataformas EDI",
        };
      case "/plataformas/dashboard-ia":
        return {
          title: "Dashboard de Análise IA",
          description: "Métricas e desempenho da IA na análise de cotações",
        };
      case "/plataformas/ml-dashboard":
        return {
          title: "ML Dashboard",
          description: "Aprendizado de máquina e métricas de feedback",
        };
      case "/plataformas/vinculos-pendentes":
        return {
          title: "Vínculos Pendentes",
          description: "Aprove ou rejeite vínculos sugeridos pela IA",
        };
      case "/plataformas/produtos-vinculo":
        return {
          title: "Produtos Vinculados",
          description: "Gerencie vínculos entre produtos EDI e internos",
        };
      case "/licitacoes":
        return {
          title: "Licitações",
          description: "Acompanhe licitações e contratos governamentais",
        };
      case "/clientes":
        return {
          title: "Clientes",
          description: "Gerencie sua base de clientes e contatos",
        };
      case "/produtos":
        return {
          title: "Produtos",
          description: "Catálogo de produtos e estoque",
        };
      case "/whatsapp":
        return {
          title: "WhatsApp",
          description: "Gerencie suas conversas e atendimentos",
        };
      case "/whatsapp/configuracoes":
        return {
          title: "Configurações WhatsApp",
          description: "Configure contas, templates e respostas rápidas",
        };
      case "/usuarios":
        return {
          title: "Usuários",
          description: "Gerencie usuários e permissões do sistema",
        };
      case "/equipes":
        return {
          title: "Equipes",
          description: "Gerencie equipes, membros e metas",
        };
      case "/tickets":
        return {
          title: "SAC - Atendimento ao cliente",
          description: "Gerencie reclamações e solicitações de clientes",
        };
      case "/clientes/cadastro-cnpj":
        return {
          title: "Cadastro de Empresas",
          description: "Cadastre clientes com apoio da IA",
        };
      case "/clientes/solicitacoes":
        return {
          title: "Solicitações de Cadastro",
          description: "Gerencie as solicitações de cadastro de clientes",
        };
      default:
        if (location.pathname.startsWith("/tickets/")) {
          return {
            title: "Detalhes do Ticket",
            description: "Visualize e gerencie o ticket",
          };
        }
        if (location.pathname.startsWith("/vendas/")) {
          return {
            title: "Detalhes da Venda",
            description: "Visualize e gerencie a proposta",
          };
        }
        return {
          title: "CRM",
          description: "Sistema de gestão empresarial",
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="h-14 bg-background border-b border-border/40 flex items-center px-6">
      <div className="flex items-center justify-between w-full">
        {/* Título da Página */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-base font-semibold text-foreground leading-tight">
            {pageInfo.title}
          </h1>
          <p className="text-xs text-muted-foreground leading-tight">
            {pageInfo.description}
          </p>
        </div>

        {/* Barra de Pesquisa Global - Centralizada */}
        <div className="flex-1 flex justify-center px-8 max-w-2xl mx-auto">
          <div className="relative w-full max-w-md">
            <Search 
              size={16} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
            />
            <Input 
              placeholder="Pesquisar no sistema..." 
              className="pl-9 pr-4 h-9 bg-muted/30 border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/70 focus:bg-background transition-colors" 
            />
          </div>
        </div>

        {/* Ações e Usuário */}
        <div className="flex items-center gap-2">
          {location.pathname.startsWith("/whatsapp") && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => navigate("/whatsapp/configuracoes")}
            >
              <Settings className="h-[18px] w-[18px]" />
            </Button>
          )}

          <ThemeCustomizer />

          <NotificationsSheet />

          {/* Ícone de Chat/Suporte */}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 relative"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full" />
          </Button>

          {/* Avatar do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full p-0 hover:bg-muted/50"
              >
                <Avatar className="h-8 w-8 border border-border/50">
                  {perfil?.foto_perfil_url ? (
                    <AvatarImage
                      src={perfil.foto_perfil_url}
                      alt={`${perfil.primeiro_nome} ${perfil.sobrenome}` || "Usuário"}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {perfil?.primeiro_nome?.substring(0, 1).toUpperCase() || ""}
                    {perfil?.sobrenome?.substring(0, 1).toUpperCase() || ""}
                    {!perfil?.primeiro_nome && (user?.email?.substring(0, 2).toUpperCase() || "U")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 border border-border/50 shadow-lg bg-card">
              <DropdownMenuLabel className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-border/50">
                    {perfil?.foto_perfil_url ? (
                      <AvatarImage
                        src={perfil.foto_perfil_url}
                        alt={`${perfil.primeiro_nome} ${perfil.sobrenome}` || "Usuário"}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {perfil?.primeiro_nome?.substring(0, 1).toUpperCase() || ""}
                      {perfil?.sobrenome?.substring(0, 1).toUpperCase() || ""}
                      {!perfil?.primeiro_nome && (user?.email?.substring(0, 2).toUpperCase() || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">
                      {perfil?.primeiro_nome
                        ? `${perfil.primeiro_nome} ${perfil.sobrenome || ""}`.trim()
                        : user?.email?.split("@")[0] || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    {perfil?.cargo && (
                      <p className="text-xs text-muted-foreground mt-0.5">{perfil.cargo}</p>
                    )}
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
                <User className="mr-3 h-4 w-4 text-muted-foreground" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="cursor-pointer py-2.5">
                <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
                <span>Configurações</span>
              </DropdownMenuItem>
              {roles?.includes("admin") && (
                <DropdownMenuItem onClick={() => navigate("/usuarios")} className="cursor-pointer py-2.5">
                  <Shield className="mr-3 h-4 w-4 text-muted-foreground" />
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
