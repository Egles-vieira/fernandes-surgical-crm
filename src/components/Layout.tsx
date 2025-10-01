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
        } gradient-primary text-white transition-all duration-300 flex flex-col fixed left-0 top-0 h-full z-50`}
      >
        {/* Header with Logo */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {!collapsed && (
            <img src={logo} alt="Cirúrgica Fernandes" className="h-10 object-contain" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors ml-auto"
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-white/20 text-white shadow-lg"
                    : "hover:bg-white/10 text-white/80"
                }`
              }
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-white/10 text-xs text-white/60 text-center">
            <p>CRM Cirúrgica Fernandes</p>
            <p className="mt-1">v1.0.0 © 2025</p>
          </div>
        )}
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
