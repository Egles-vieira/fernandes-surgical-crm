import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, User, ChevronRight, Menu, LogOut } from "lucide-react";
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
interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}
export default function Header({
  collapsed,
  onToggle
}: HeaderProps) {
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
          breadcrumb: "Cirúrgica Fernandes / Dashboard"
        };
      case "/vendas":
        return {
          title: "Vendas",
          breadcrumb: "Cirúrgica Fernandes / Vendas"
        };
      case "/plataformas":
        return {
          title: "Plataformas",
          breadcrumb: "Cirúrgica Fernandes / Plataformas"
        };
      case "/licitacoes":
        return {
          title: "Licitações",
          breadcrumb: "Cirúrgica Fernandes / Licitações"
        };
      case "/clientes":
        return {
          title: "Clientes",
          breadcrumb: "Cirúrgica Fernandes / Clientes"
        };
      case "/produtos":
        return {
          title: "Produtos",
          breadcrumb: "Cirúrgica Fernandes / Produtos"
        };
      default:
        return {
          title: "CRM",
          breadcrumb: "Cirúrgica Fernandes"
        };
    }
  };
  const pageInfo = getPageInfo();
  return <header className="h-16 border-b bg-card flex items-center px-6 shadow-sm">
      <div className="flex items-center gap-6 w-full">
        {/* Botão de Toggle do Menu + Título e Breadcrumb */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <button onClick={onToggle} className="p-2 hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 group" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
            <Menu size={20} className="text-foreground transition-transform group-hover:rotate-180" />
          </button>
          
          <div>
            <h2 className="text-lg font-bold text-foreground">{pageInfo.title}</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {pageInfo.breadcrumb.split(" / ").map((item, index, arr) => <span key={index} className="flex items-center gap-1">
                    {item}
                    {index < arr.length - 1 && <ChevronRight size={12} />}
                  </span>)}
              </span>
            </div>
          </div>
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
    </header>;
}