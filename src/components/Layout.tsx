import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Gavel,
  Upload,
  ChevronDown,
  ChevronRight,
  Wallet,
  Calculator,
  PackageCheck,
  BarChart3,
  ClipboardList,
  Building2,
  Shield,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import logo from "@/assets/logo-cfernandes.webp";
import favicon from "@/assets/favicon-cfernandes.png";
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
      { path: "/vendas/pedidos", icon: ShoppingCart, label: "Pedidos" },
      { path: "/vendas/contratos", icon: FileText, label: "Contratos" },
      { path: "/vendas/carteira", icon: Wallet, label: "Minha Carteira" },
    ],
  },
  {
    icon: FileText,
    label: "Plataforma",
    children: [
      { path: "/plataformas/cotacoes", icon: Calculator, label: "Cotações" },
      { path: "/plataformas/pedidos", icon: PackageCheck, label: "Pedidos" },
      { path: "/plataformas/relatorios", icon: BarChart3, label: "Relatórios" },
    ],
  },
  {
    icon: Gavel,
    label: "Licitações",
    children: [
      { path: "/licitacoes", icon: Gavel, label: "Licitações" },
      { path: "/licitacoes/solicitacao", icon: ClipboardList, label: "Solicitação de Participação" },
      { path: "/licitacoes/contratos-governo", icon: Building2, label: "Contratos com Governo" },
    ],
  },
  { path: "/clientes", icon: Users, label: "Clientes" },
  {
    icon: Package,
    label: "Produtos",
    children: [
      { path: "/produtos", icon: Package, label: "Listagem de Produtos" },
      { path: "/importar-produtos", icon: Upload, label: "Importar Produtos" },
    ],
  },
  { path: "/usuarios", icon: Shield, label: "Usuários", adminOnly: true },
];

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const { isAdmin } = useRoles();

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
      {/* Sidebar - Fixed */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } gradient-primary text-white transition-all duration-300 ease-in-out flex flex-col fixed left-0 top-0 h-full z-50 shadow-lg`}
      >
        {/* Header with Logo */}
        <div className="p-4 flex items-center justify-center border-b border-white/10 backdrop-blur-sm">
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
              className="h-10 w-10 object-contain animate-fade-in rounded-lg" 
            />
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.filter(item => !item.adminOnly || isAdmin).map((item, index) => {
            if (item.children) {
              const isOpen = openMenus.includes(item.label) || hasActiveChild(item);
              
              return (
                <Collapsible
                  key={item.label}
                  open={isOpen}
                  onOpenChange={() => toggleMenu(item.label)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CollapsibleTrigger
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden w-full
                    ${
                      hasActiveChild(item)
                        ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                        : "hover:bg-white/10 text-white/80 hover:text-white"
                    }`}
                  >
                    <item.icon 
                      size={20} 
                      className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                    />
                    
                    {!collapsed && (
                      <>
                        <span className="font-medium text-sm flex-1 text-left animate-fade-in">
                          {item.label}
                        </span>
                        {isOpen ? (
                          <ChevronDown size={16} className="transition-transform" />
                        ) : (
                          <ChevronRight size={16} className="transition-transform" />
                        )}
                      </>
                    )}
                  </CollapsibleTrigger>

                  {!collapsed && (
                    <CollapsibleContent className="mt-1 space-y-1 pl-4">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path!}
                          end={child.path === "/"}
                        >
                          {({ isActive }) => (
                            <div
                              className={`group flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 relative
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
                  )}
                </Collapsible>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path!}
                end={item.path === "/"}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {({ isActive }) => (
                  <div
                    className={`group flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden
                    ${
                      isActive
                        ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                        : "hover:bg-white/10 text-white/80 hover:text-white hover:translate-x-1"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full animate-slide-in-left" />
                    )}
                    
                    <item.icon 
                      size={20} 
                      className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                    />
                    
                    {!collapsed && (
                      <span className="font-medium text-sm animate-fade-in">
                        {item.label}
                      </span>
                    )}
                    
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 rounded-xl" />
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 backdrop-blur-sm">
          {!collapsed ? (
            <div className="p-4 text-xs text-white/60 text-center space-y-1 animate-fade-in">
              <p className="font-semibold text-white/80">CRM Cirúrgica Fernandes</p>
              <p className="text-white/50">v1.0.0 © 2025</p>
            </div>
          ) : (
            <div className="p-4 flex justify-center">
              <img 
                src={favicon} 
                alt="CF" 
                className="w-10 h-10 object-contain rounded-lg opacity-80 hover:opacity-100 transition-opacity" 
              />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content - With margin for sidebar */}
      <div 
        className={`${
          collapsed ? "ml-16" : "ml-64"
        } flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300`}
      >
        {/* Header - Fixed */}
        <div className="fixed top-0 right-0 left-0 z-40" style={{ marginLeft: collapsed ? '4rem' : '16rem' }}>
          <Header collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>
        
        {/* Content - Scrollable */}
        <main className="flex-1 overflow-auto mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
