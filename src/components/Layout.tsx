import { useState } from "react";
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
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import favicon from "@/assets/favicon-cfernandes.png";
import logo from "@/assets/logo-cfernandes.webp";
import Header from "./Header";
import { useRoles } from "@/hooks/useRoles";

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
    ],
  },
  {
    icon: FileText,
    label: "Plataforma",
    children: [
      { path: "/plataformas/cotacoes", icon: FileText, label: "Cotações" },
    ],
  },
  {
    icon: Gavel,
    label: "Licitações",
    children: [
      { path: "/licitacoes", icon: Gavel, label: "Licitações" },
    ],
  },
  { path: "/clientes", icon: Users, label: "Clientes" },
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
  const [collapsed, setCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState<string[]>([]);

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
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar - Responsivo com Collapse */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-56"
        } gradient-primary text-white flex flex-col fixed left-0 top-0 h-full z-50 shadow-elegant transition-all duration-300`}
      >
        {/* Logo Header com Toggle */}
        <div className="p-3 flex items-center justify-center border-b border-white/10 h-20 relative">
          {!collapsed ? (
            <img 
              src={logo} 
              alt="Cirúrgica Fernandes" 
              className="h-10 object-contain animate-fade-in" 
            />
          ) : (
            <img 
              src={favicon} 
              alt="CF" 
              className="h-12 w-12 object-contain animate-fade-in rounded-lg" 
            />
          )}
          
          {/* Botão de Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white text-primary rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight size={14} /> : <Menu size={14} />}
          </button>
        </div>

        {/* Menu Items - Vertical */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.filter(item => !item.adminOnly || isAdmin).map((item, index) => {
              // Itens com children (sub-menus)
              if (item.children) {
                const isAnyChildActive = hasActiveChild(item);
                const isOpen = openMenus.includes(item.label) || isAnyChildActive;
                
                if (collapsed) {
                  // Modo compacto: apenas ícone com label
                  return (
                    <NavLink
                      key={item.label}
                      to={item.children[0].path!}
                      className={({ isActive }) =>
                        `group flex flex-col items-center justify-center py-3 px-1 transition-all duration-200 relative
                        ${
                          isActive || isAnyChildActive
                            ? "bg-white/20 text-white"
                            : "hover:bg-white/10 text-white/70 hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {(isActive || isAnyChildActive) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full" />
                          )}
                          <item.icon 
                            size={24} 
                            className="mb-1.5 transition-transform duration-200 group-hover:scale-110" 
                          />
                          <span className="text-[10px] font-medium text-center leading-tight">
                            {item.label}
                          </span>
                        </>
                      )}
                    </NavLink>
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
                      className={`group flex items-center gap-2 px-3 py-2 rounded-xl mx-2 transition-all duration-200 relative w-[calc(100%-16px)]
                      ${
                        isAnyChildActive
                          ? "bg-white/20 text-white"
                          : "hover:bg-white/10 text-white/80 hover:text-white"
                      }`}
                    >
                      <item.icon 
                        size={20} 
                        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                      />
                      <span className="font-medium text-sm flex-1 text-left">
                        {item.label}
                      </span>
                      {isOpen ? (
                        <ChevronDown size={16} className="transition-transform" />
                      ) : (
                        <ChevronRight size={16} className="transition-transform" />
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-1 space-y-1 pl-5 pr-2">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path!}
                          end={child.path === "/"}
                        >
                          {({ isActive }) => (
                            <div
                              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 relative
                              ${
                                isActive
                                  ? "bg-white/15 text-white"
                                  : "hover:bg-white/5 text-white/70 hover:text-white"
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
                      `group flex flex-col items-center justify-center py-3 px-1 transition-all duration-200 relative
                      ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "hover:bg-white/10 text-white/70 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full" />
                        )}
                        <item.icon 
                          size={24} 
                          className="mb-1.5 transition-transform duration-200 group-hover:scale-110" 
                        />
                        <span className="text-[10px] font-medium text-center leading-tight px-1">
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
                    `group flex items-center gap-2 px-3 py-2 rounded-xl mx-2 transition-all duration-200 relative
                    ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "hover:bg-white/10 text-white/80 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                      )}
                      <item.icon 
                        size={20} 
                        className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                      />
                      <span className="font-medium text-sm">
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
        <div className="border-t border-white/10 p-3">
          <div className="flex justify-center">
            <div className="text-[9px] text-white/40 text-center">
              {collapsed ? "v1.0" : "CRM v1.0.0 © 2025"}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div 
        className={`${
          collapsed ? "ml-16" : "ml-56"
        } flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300`}
      >
        {/* Header */}
        <div className="fixed top-0 right-0 left-0 z-40" style={{ marginLeft: collapsed ? '4rem' : '14rem' }}>
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
