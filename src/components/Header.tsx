import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, ChevronRight, Menu, LogOut, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
          description: "Gerencie suas oportunidades e pipeline de vendas",
          breadcrumb: "Cirúrgica Fernandes / Vendas",
        };
      case "/plataformas":
        return {
          title: "Plataformas",
          description: "Integração com plataformas de e-commerce",
          breadcrumb: "Cirúrgica Fernandes / Plataformas",
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
      case "/tickets":
        return {
          title: "SAC - Atendimento ao cliente",
          description: "Gerencie reclamações e solicitações de clientes",
          breadcrumb: "Cirúrgica Fernandes / Tickets",
        };
      default:
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

          <Button variant="ghost" size="sm" className="relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center">
              3
            </span>
          </Button>

          <div className="h-8 w-px bg-border"></div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {user?.email?.substring(0, 2).toUpperCase() || "CF"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm leading-tight text-left">
                  <p className="font-semibold text-foreground">Cirúrgica Fernandes</p>
                  <p className="text-xs text-muted-foreground">{user?.email || "admin@cfernandes.com.br"}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
