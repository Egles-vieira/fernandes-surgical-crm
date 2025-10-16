import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Gavel,
  Shield,
} from "lucide-react";
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
      {/* Sidebar Vertical - Estilo Compacto */}
      <aside
        className="w-20 gradient-primary text-white flex flex-col fixed left-0 top-0 h-full z-50 shadow-elegant"
      >
        {/* Logo Header */}
        <div className="p-3 flex items-center justify-center border-b border-white/10 h-20">
          <img 
            src={favicon} 
            alt="CF" 
            className="h-12 w-12 object-contain animate-fade-in rounded-lg" 
          />
        </div>

        {/* Menu Items - Vertical */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.filter(item => !item.adminOnly || isAdmin).map((item, index) => {
              // Para itens com children, mostrar apenas o ícone principal
              if (item.children) {
                const isAnyChildActive = hasActiveChild(item);
                
                return (
                  <div key={item.label}>
                    <NavLink
                      to={item.children[0].path!}
                      className={({ isActive }) =>
                        `group flex flex-col items-center justify-center py-4 px-2 transition-all duration-200 relative
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
                  </div>
                );
              }

              // Itens simples
              return (
                <NavLink
                  key={item.path}
                  to={item.path!}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `group flex flex-col items-center justify-center py-4 px-2 transition-all duration-200 relative
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
            })}
          </div>
        </nav>

        {/* Footer - Versão */}
        <div className="border-t border-white/10 p-3">
          <div className="flex justify-center">
            <div className="text-[9px] text-white/40 text-center">
              v1.0.0
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Com margem fixa para o sidebar */}
      <div className="ml-20 flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - Fixed */}
        <div className="fixed top-0 right-0 left-20 z-40">
          <Header collapsed={false} onToggle={() => {}} />
        </div>
        
        {/* Content - Scrollable */}
        <main className="flex-1 overflow-auto mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
