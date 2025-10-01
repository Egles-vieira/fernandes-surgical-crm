import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Gavel,
  Menu,
  X
} from "lucide-react";
import logo from "@/assets/logo-cfernandes.webp";
import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/vendas", icon: ShoppingCart, label: "Vendas" },
  { path: "/plataformas", icon: FileText, label: "Plataformas" },
  { path: "/licitacoes", icon: Gavel, label: "Licitações" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/produtos", icon: Package, label: "Produtos" },
];

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar - Fixed */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } gradient-primary text-white transition-all duration-300 ease-in-out flex flex-col fixed left-0 top-0 h-full z-50 shadow-lg`}
      >
        {/* Header with Logo */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm">
          {!collapsed && (
            <img 
              src={logo} 
              alt="Cirúrgica Fernandes" 
              className="h-10 object-contain animate-fade-in" 
            />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110 ml-auto group"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <Menu size={20} className="transition-transform group-hover:rotate-180" />
            ) : (
              <X size={20} className="transition-transform group-hover:rotate-90" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {({ isActive }) => (
                <div
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative overflow-hidden
                  ${
                    isActive
                      ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                      : "hover:bg-white/10 text-white/80 hover:text-white hover:translate-x-1"
                  }`}
                >
                  {/* Active indicator */}
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
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200 rounded-xl" />
                </div>
              )}
            </NavLink>
          ))}
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
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                CF
              </div>
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
          <Header />
        </div>
        
        {/* Content - Scrollable */}
        <main className="flex-1 overflow-auto mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
