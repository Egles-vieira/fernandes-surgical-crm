import { useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/vendas":
        return "Vendas";
      case "/plataformas":
        return "Plataformas";
      case "/licitacoes":
        return "Licitações";
      case "/clientes":
        return "Clientes";
      case "/produtos":
        return "Produtos";
      default:
        return "CRM";
    }
  };

  return (
    <header className="h-16 border-b bg-card flex items-center px-8 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between w-full">
        <div>
          <h2 className="text-xl font-bold text-primary">{getPageTitle()}</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Sistema CRM - Cirúrgica Fernandes
          </span>
        </div>
      </div>
    </header>
  );
}
