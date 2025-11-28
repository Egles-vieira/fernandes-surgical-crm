import { useState, useEffect, createContext, useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, FileText, Gavel, Shield, ChevronDown, ChevronRight, Menu, MessageSquare, MessageCircle, Phone, TicketCheck, BarChart3, BookOpen, Settings, Brain, Target } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import favicon from "@/assets/favicon-cfernandes.png";
import logo from "@/assets/logo-cfernandes.webp";
import Header from "./Header";
import { useRoles } from "@/hooks/useRoles";
import { useEmpresa } from "@/hooks/useEmpresa";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { RAGAssistantButton } from "./RAGAssistantButton";
import { RAGAssistant } from "./RAGAssistant";

// Context para compartilhar estado do sidebar
interface LayoutContextType {
  collapsed: boolean;
  toggleCollapsed: () => void;
}
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a Layout component");
  }
  return context;
};
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
const menuItems: MenuItem[] = [{
  path: "/",
  icon: LayoutDashboard,
  label: "Dashboard"
}, {
  icon: ShoppingCart,
  label: "Vendas",
  children: [{
    path: "/vendas",
    icon: FileText,
    label: "Propostas"
  }, {
    path: "/vendas/pedidos",
    icon: ShoppingCart,
    label: "Pedidos"
  }, {
    path: "/vendas/contratos",
    icon: FileText,
    label: "Relatórios"
  }]
}, {
  icon: FileText,
  label: "Plataforma",
  children: [{
    path: "/plataformas/cotacoes",
    icon: FileText,
    label: "Cotações"
  }, {
    path: "/plataformas/dashboard-ia",
    icon: Brain,
    label: "Dashboard IA",
    adminOnly: true
  }, {
    path: "/plataformas/ml-dashboard",
    icon: BarChart3,
    label: "ML Dashboard",
    adminOnly: true
  }, {
    path: "/plataformas/produtos-vinculo",
    icon: Package,
    label: "DE-PARA Produtos",
    adminOnly: true
  }, {
    path: "/plataformas/parametros",
    icon: Settings,
    label: "Parâmetros",
    adminOnly: true
  }]
}, {
  icon: Gavel,
  label: "Licitações",
  children: [{
    path: "/licitacoes",
    icon: Gavel,
    label: "Licitações"
  }]
}, {
  icon: WhatsAppIcon,
  label: "Whatsapp",
  children: [{
    path: "/whatsapp",
    icon: WhatsAppIcon,
    label: "WhatsApp"
  }, {
    path: "/uras",
    icon: Phone,
    label: "URAs"
  }, {
    path: "/whatsapp/configuracoes",
    icon: Shield,
    label: "Configurações",
    adminOnly: true
  }]
}, {
  icon: TicketCheck,
  label: "SAC",
  children: [{
    path: "/tickets",
    icon: TicketCheck,
    label: "Tickets"
  }, {
    path: "/tickets/dashboard",
    icon: BarChart3,
    label: "Dashboard",
    adminOnly: true
  }, {
    path: "/base-conhecimento",
    icon: BookOpen,
    label: "Base de Conhecimento",
    adminOnly: true
  }]
}, {
  icon: Users,
  label: "Clientes",
  children: [{
    path: "/clientes",
    icon: Users,
    label: "Minha Carteira"
  }, {
    path: "/clientes/solicitacoes",
    icon: FileText,
    label: "Solicitações"
  }]
}, {
  icon: Target,
  label: "Metas",
  children: [{
    path: "/perfil-vendedor",
    icon: Target,
    label: "Minhas Metas"
  }]
}, {
  icon: Package,
  label: "Produtos",
  children: [{
    path: "/produtos",
    icon: Package,
    label: "Produtos"
  }]
}, {
  icon: Shield,
  label: "Admin",
  adminOnly: true,
  children: [{
    path: "/usuarios",
    icon: Shield,
    label: "Usuários"
  }, {
    path: "/equipes",
    icon: Users,
    label: "Equipes"
  }, {
    path: "/configuracoes",
    icon: Settings,
    label: "Configurações"
  }]
}];
export default function Layout({
  children
}: LayoutProps) {
  const location = useLocation();
  const {
    isAdmin,
    isManager
  } = useRoles();
  const {
    empresa
  } = useEmpresa();
  const [collapsed, setCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [ragAssistantOpen, setRagAssistantOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize(); // Check inicial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setOpenMenus(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
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
  return <LayoutContext.Provider value={{
    collapsed,
    toggleCollapsed: () => setCollapsed(!collapsed)
  }}>
      <div className="flex h-screen w-full overflow-hidden" style={{
      "--sidebar-width": collapsed ? "4rem" : "14rem"
    } as React.CSSProperties}>
      {/* Sidebar - Responsivo com Collapse */}
      <aside className={`${collapsed ? "w-16" : "w-56"} flex flex-col fixed left-0 top-0 h-full z-50 shadow-elegant transition-all duration-300 menu-sidebar`} style={{
        backgroundColor: `hsl(var(--menu-bg))`
      }}>
        {/* Logo Header com Toggle */}
        <div className="p-3 flex items-center justify-center border-b border-white/10 h-20 relative">
          {!collapsed ? <img src={empresa?.url_logo_expandido || empresa?.url_logo || logo} alt={empresa?.nome || "Cirúrgica Fernandes"} className="h-10 object-contain animate-fade-in" /> : <img src={empresa?.url_logo || favicon} alt={empresa?.nome || "CF"} className="h-12 w-12 object-contain animate-fade-in rounded-lg" />}

          {/* Botão de Toggle */}
          <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white text-primary rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
            {collapsed ? <ChevronRight size={14} /> : <Menu size={14} />}
          </button>
        </div>

        {/* Menu Items - Vertical */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.filter(item => !item.adminOnly || isAdmin || isManager).map((item, index) => {
              // Itens com children (sub-menus)
              if (item.children) {
                const isAnyChildActive = hasActiveChild(item);
                const isOpen = openMenus.includes(item.label) || isAnyChildActive;
                if (collapsed) {
                  // Modo compacto: mostrar hover card com submenus
                  return <HoverCard key={item.label} openDelay={200}>
                        <HoverCardTrigger asChild>
                           <div className={`group flex flex-col items-center justify-center py-3 px-1 transition-all duration-200 relative cursor-pointer
                          ${isAnyChildActive ? "bg-white/20" : "hover:bg-white/10"}`}>
                            {isAnyChildActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full bg-secondary" />}
                            <item.icon size={24} className="mb-1.5 transition-transform duration-200 group-hover:scale-110 menu-icon" />
                            <span className="text-[10px] font-medium text-center leading-tight menu-text">{item.label}</span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" align="start" className="w-48 bg-card border-border p-2 ml-2">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">{item.label}</p>
                            {item.children.filter(child => !child.adminOnly || isAdmin || isManager).map(child => <NavLink key={child.path} to={child.path!} end={child.path === "/"} className={({
                          isActive
                        }) => `flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                                ${isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}>
                                  <child.icon size={16} className="flex-shrink-0" />
                                  <span className="text-sm">{child.label}</span>
                                </NavLink>)}
                          </div>
                        </HoverCardContent>
                      </HoverCard>;
                }

                // Modo expandido: mostrar collapsible com sub-itens
                return <Collapsible key={item.label} open={isOpen} onOpenChange={() => toggleMenu(item.label)}>
                      <CollapsibleTrigger className={`group flex items-center gap-2 px-3 py-2 rounded-xl mx-2 transition-all duration-200 relative w-[calc(100%-16px)]
                      ${isAnyChildActive ? "bg-white/20" : "hover:bg-white/10"}`}>
                        <item.icon size={20} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110 menu-icon" />
                        <span className="font-medium text-sm flex-1 text-left menu-text">{item.label}</span>
                        {isOpen ? <ChevronDown size={16} className="transition-transform menu-icon" /> : <ChevronRight size={16} className="transition-transform menu-icon" />}
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-1 space-y-1 pl-5 pr-2">
                        {item.children.filter(child => !child.adminOnly || isAdmin || isManager).map(child => <NavLink key={child.path} to={child.path!} end={child.path === "/"}>
                              {({
                        isActive
                      }) => <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 relative
                              ${isActive ? "bg-white/15" : "hover:bg-white/5"}`}>
                                  <child.icon size={16} className="flex-shrink-0 menu-icon" />
                                  <span className="text-sm menu-text">{child.label}</span>
                                </div>}
                            </NavLink>)}
                      </CollapsibleContent>
                    </Collapsible>;
              }

              // Itens simples (sem children)
              if (collapsed) {
                return <NavLink key={item.path} to={item.path!} end={item.path === "/"} className={({
                  isActive
                }) => `group flex flex-col items-center justify-center py-3 px-1 transition-all duration-200 relative
                      ${isActive ? "bg-white/20" : "hover:bg-white/10"}`}>
                      {({
                    isActive
                  }) => <>
                          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full bg-secondary" />}
                          <item.icon size={24} className="mb-1.5 transition-transform duration-200 group-hover:scale-110 menu-icon" />
                          <span className="text-[10px] font-medium text-center leading-tight px-1 menu-text">{item.label}</span>
                        </>}
                    </NavLink>;
              }
              return <NavLink key={item.path} to={item.path!} end={item.path === "/"} className={({
                isActive
              }) => `group flex items-center gap-2 px-3 py-2 rounded-xl mx-2 transition-all duration-200 relative
                    ${isActive ? "bg-white/20" : "hover:bg-white/10"}`}>
                    {({
                  isActive
                }) => <>
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
                        <item.icon size={20} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110 menu-icon" />
                        <span className="font-medium text-sm menu-text">{item.label}</span>
                      </>}
                  </NavLink>;
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3">
          <div className="flex justify-center">
            <div className="text-[9px] opacity-40 text-center menu-text">{collapsed ? "v1.0" : "CRM v1.0.0 © 2025"}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${collapsed ? "ml-16" : "ml-56"} flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="fixed top-0 right-0 left-0 z-40" style={{
          marginLeft: collapsed ? "4rem" : "14rem"
        }}>
          <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto mt-16 py-0 mx-0 px-0 my-0 transition-all duration-300" style={{
          marginRight: ragAssistantOpen ? isMobile ? '0' : '600px' : '0'
        }}>
          {children}
        </main>
      </div>
      
      {/* Assistente RAG */}
      <RAGAssistantButton onClick={() => setRagAssistantOpen(!ragAssistantOpen)} />
      <RAGAssistant open={ragAssistantOpen} onOpenChange={setRagAssistantOpen} />
      </div>
    </LayoutContext.Provider>;
}