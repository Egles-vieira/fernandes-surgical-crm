import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Calculator, Package, Link, BarChart3, Settings, Brain, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlataformasFilters } from "@/components/plataformas/PlataformasFilters";

export default function Plataformas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "grid">("card");
  const [filters, setFilters] = useState({});

  const modulos = [
    {
      titulo: "Plataformas de eletrônicas",
      descricao: "Gerencie cotações de plataformas Bionexo, Mercado Eletrônico e outras",
      icone: Calculator,
      rota: "/plataformas/cotacoes",
      cor: "bg-blue-500",
    },
    {
      titulo: "Dashboard de Análise IA",
      descricao: "Métricas e desempenho da IA na análise de cotações",
      icone: Brain,
      rota: "/plataformas/dashboard-ia",
      cor: "bg-primary",
    },
    {
      titulo: "ML Dashboard",
      descricao: "Aprendizado de máquina e feedbacks do sistema",
      icone: TrendingUp,
      rota: "/plataformas/ml-dashboard",
      cor: "bg-indigo-500",
    },
    {
      titulo: "DE-PARA Produtos",
      descricao: "Vínculo inteligente entre produtos dos clientes e seu catálogo",
      icone: Link,
      rota: "/plataformas/produtos-vinculo",
      cor: "bg-purple-500",
    },
    {
      titulo: "Pedidos",
      descricao: "Pedidos confirmados das plataformas EDI",
      icone: Package,
      rota: "/plataformas/pedidos",
      cor: "bg-green-500",
    },
    {
      titulo: "Relatórios",
      descricao: "Analytics e métricas de performance",
      icone: BarChart3,
      rota: "/plataformas/relatorios",
      cor: "bg-orange-500",
    },
    {
      titulo: "Configurações",
      descricao: "Credenciais e configurações das plataformas",
      icone: Settings,
      rota: "/plataformas/configuracoes",
      cor: "bg-gray-500",
    },
  ];

  const filteredModulos = modulos.filter(modulo => 
    modulo.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    modulo.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plataformas EDI</h1>
        <p className="text-muted-foreground">Gestão integrada de cotações e pedidos de múltiplas plataformas</p>
      </div>

      <PlataformasFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFiltersChange={setFilters}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModulos.map((modulo) => (
          <Card
            key={modulo.rota}
            className="hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => navigate(modulo.rota)}
          >
            <CardContent className="p-6 space-y-4">
              <div
                className={`w-12 h-12 rounded-lg ${modulo.cor} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <modulo.icone className="text-white h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{modulo.titulo}</h3>
                <p className="text-sm text-muted-foreground">{modulo.descricao}</p>
              </div>
              <Button variant="ghost" className="w-full">
                Acessar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
