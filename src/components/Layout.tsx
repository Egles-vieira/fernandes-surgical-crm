import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Gavel,
  Shield,
  ChevronDown,
  ChevronRight,
  Menu,
  MessageSquare,
  Phone,
  TicketCheck,
  BarChart3,
  BookOpen,
  Settings,
  Brain,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import favicon from "@/assets/favicon-cfernandes.png";
import logo from "@/assets/logo-cfernandes.webp";
import Header from "./Header";
import { useRoles } from "@/hooks/useRoles";
import { useEmpresa } from "@/hooks/useEmpresa";

interface LayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  path?: string;
  icon: any;
  label: string;
  children?: MenuItem[];
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  {
    icon: ShoppingCart,
    label: "Vendas",
    children: [
      { path: "/vendas", icon: FileText, label: "Propostas" },
      { path: "/vendas/pedidos", icon: ShoppingCart, label: "Pedidos" },
      { path: "/vendas/contratos", icon: FileText, label: "Relatórios" },
    ],
  },
  {
    icon: FileText,
    label: "Plataforma",
    children: [
      { path: "/plataformas/cotacoes", icon: FileText, label: "Cotações" },
      { path: "/plataformas/dashboard-ia", icon: Brain, label: "Dashboard IA" },
      { path: "/plataformas/ml-dashboard", icon: BarChart3, label: "ML Dashboard" },
      { path: "/plataformas/produtos-vinculo", icon: Package, label: "DE-PARA Produtos" },
      { path: "/plataformas/parametros", icon: Settings, label: "Parâmetros" },
    ],
  },
  {
    icon: Gavel,
    label: "Licitações",
    children: [
      { path: "/licitacoes", icon: Gavel, label: "Licitações" },
    ],
  },
  {
    icon: MessageSquare,
    label: "Comunicação",
    children: [
      { path: "/whatsapp", icon: MessageSquare, label: "WhatsApp" },
      { path: "/uras", icon: Phone, label: "URAs" },
      { path: "/whatsapp/configuracoes", icon: Shield, label: "Configurações", adminOnly: true },
    ],
  },
  {
    icon: TicketCheck,
    label: "SAC",
    children: [
      { path: "/tickets", icon: TicketCheck, label: "Tickets" },
      { path: "/tickets/dashboard", icon: BarChart3, label: "Dashboard" },
      { path: "/base-conhecimento", icon: BookOpen, label: "Base de Conhecimento" },
    ],
  },
  {
    icon: Users,
    label: "Clientes",
    children: [
      { path: "/clientes", icon: Users, label: "Lista de Clientes" },
      { path: "/clientes/solicitacoes", icon: FileText, label: "Solicitações" },
      { path: "/clientes/cadastro-cnpj", icon: ShoppingCart, label: "Novo Cadastro" },
    ],
  },
  {
    icon: Package,
    label: "Produtos",
    children: [
      { path: "/produtos", icon: Package, label: "Produtos" },
    ],
  },
  { path: "/usuarios", icon: Shield, label: "Admin", adminOnly: true },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isAdmin } = useRoles();
  const { empresa } = useEmpresa();
  const [collapsed, setCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // Atualizar favicon dinamicamente quando o logo da empresa mudar
  useEffect(() => {
    if (empresa?.url_logo) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) {
        link.href = empresa.url_logo;
      }
    }
  }, [empresa?.url_logo]);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isPathActive = (path: string) => {
    return location.pathname === path;
  };

  const hasActiveChild = (item: MenuItem): boolean => {
    if (item.children) {
      return item.children.some(child => child.path && isPathActive(child.path));
    }
    return false;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ '--sidebar-width': collapsed ? '4rem' : '14rem' } as React.CSSProperties}>
      {/* Sidebar - Responsivo com Collapse */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } gradient-primary text-white flex flex-col fixed left-0 top-0 h-full z-50 shadow-lg transition-all duration-300 ease-in-out`}
      >
        {/* Logo Header com Toggle */}
        <div className="p-4 flex items-center justify-center border-b border-white/10 h-20 relative">
          {!collapsed ? (
            <img 
              src={empresa?.url_logo_expandido || empresa?.url_logo || logo} 
              alt={empresa?.nome || "Cirúrgica Fernandes"} 
              className="h-12 object-contain animate-fade-in" 
            />
          ) : (
            <img 
              src={empresa?.url_logo || favicon} 
              alt={empresa?.nome || "CF"} 
              className="h-12 w-12 object-contain animate-fade-in rounded-lg" 
            />
          )}
          
          {/* Botão de Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white text-primary rounded-full p-1.5 shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-200"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Menu Items - Vertical */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-1 px-2">
            {menuItems.filter(item => !item.adminOnly || isAdmin).map((item, index) => {
              // Itens com children (sub-menus)
              if (item.children) {
                const isAnyChildActive = hasActiveChild(item);
                const isOpen = openMenus.includes(item.label) || isAnyChildActive;
                
                if (collapsed) {
                  // Modo compacto: mostrar hover card com submenus
                  return (
                    <HoverCard key={item.label} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div
                          className={`group flex flex-col items-center justify-center py-3.5 px-1 transition-all duration-200 relative cursor-pointer rounded-xl mx-1
                          ${
                            isAnyChildActive
                              ? "bg-white/20 text-white shadow-sm"
                              : "hover:bg-white/10 text-white/80 hover:text-white"
                          }`}
                        >
                          {isAnyChildActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full shadow-md" />
                          )}
                          <item.icon 
                            size={22} 
                            className="mb-1.5 transition-transform duration-200 group-hover:scale-110" 
                          />
                          <span className="text-[10px] font-semibold text-center leading-tight">
                            {item.label}
                          </span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent 
                        side="right" 
                        align="start"
                        className="w-48 bg-card border-border p-2 ml-2"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                            {item.label}
                          </p>
                          {item.children
                            .filter(child => !child.adminOnly || isAdmin)
                            .map((child) => (
                            <NavLink
                              key={child.path}
                              to={child.path!}
                              end={child.path === "/"}
                              className={({ isActive }) =>
                                `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                                ${
                                  isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted text-foreground"
                                }`
                              }
                            >
                              <child.icon size={16} className="flex-shrink-0" />
                              <span className="text-sm">{child.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                }
                
                // Modo expandido: mostrar collapsible com sub-itens
                return (
                  <Collapsible
                    key={item.label}
                    open={isOpen}
                    onOpenChange={() => toggleMenu(item.label)}
                  >
                    <CollapsibleTrigger
                      className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 relative w-full
                      ${
                        isAnyChildActive
                          ? "bg-white/20 text-white shadow-sm"
                          : "hover:bg-white/10 text-white/90 hover:text-white"
                      }`}
                    >
                      <item.icon 
                        size={20} 
                        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                      />
                      <span className="font-semibold text-sm flex-1 text-left tracking-wide">
                        {item.label}
                      </span>
                      {isOpen ? (
                        <ChevronDown size={16} className="transition-transform" />
                      ) : (
                        <ChevronRight size={16} className="transition-transform" />
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-1 space-y-0.5 pl-6 pr-1">
                      {item.children
                        .filter(child => !child.adminOnly || isAdmin)
                        .map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path!}
                          end={child.path === "/"}
                        >
                          {({ isActive }) => (
                            <div
                              className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative
                              ${
                                isActive
                                  ? "bg-white/15 text-white font-medium"
                                  : "hover:bg-white/5 text-white/80 hover:text-white"
                              }`}
                            >
                              <child.icon size={16} className="flex-shrink-0" />
                              <span className="text-sm">{child.label}</span>
                            </div>
                          )}
                        </NavLink>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              // Itens simples (sem children)
              if (collapsed) {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path!}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      `group flex flex-col items-center justify-center py-3.5 px-1 transition-all duration-200 relative rounded-xl mx-1
                      ${
                        isActive
                          ? "bg-white/20 text-white shadow-sm"
                          : "hover:bg-white/10 text-white/80 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full shadow-md" />
                        )}
                        <item.icon 
                          size={22} 
                          className="mb-1.5 transition-transform duration-200 group-hover:scale-110" 
                        />
                        <span className="text-[10px] font-semibold text-center leading-tight px-1">
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path!}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 relative
                    ${
                      isActive
                        ? "bg-white/20 text-white shadow-sm"
                        : "hover:bg-white/10 text-white/90 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-md" />
                      )}
                      <item.icon 
                        size={20} 
                        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                      />
                      <span className="font-semibold text-sm tracking-wide">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 bg-white/5">
          <div className="flex justify-center">
            <div className={`text-white/50 text-center transition-all duration-300 ${collapsed ? 'text-[9px]' : 'text-xs'}`}>
              {collapsed ? "v1.0" : (
                <div className="space-y-0.5">
                  <div className="font-semibold">CRM v1.0.0</div>
                  <div className="text-[10px]">© 2025</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div 
        className={`${
          collapsed ? "ml-16" : "ml-64"
        } flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out`}
      >
        {/* Header */}
        <div className="fixed top-0 right-0 left-0 z-40 transition-all duration-300 ease-in-out" style={{ marginLeft: collapsed ? '4rem' : '16rem' }}>
          <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
        
        {/* Content */}
        <main className="flex-1 overflow-auto mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
