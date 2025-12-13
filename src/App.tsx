import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Vendas from "./pages/Vendas";
import VendaDetalhes from "./pages/VendaDetalhes";
import Plataformas from "./pages/Plataformas";
import Licitacoes from "./pages/Licitacoes";
import Clientes from "./pages/Clientes";
import ClienteDetalhes from "./pages/ClienteDetalhes";
import Produtos from "./pages/Produtos";
import ImportarProdutos from "./pages/ImportarProdutos";
import ImportarClientes from "./pages/ImportarClientes";
import Usuarios from "./pages/Usuarios";
import Equipes from "./pages/Equipes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PedidosVendas from "./pages/vendas/Pedidos";
import ContratosVendas from "./pages/vendas/Contratos";
import MinhaCarteira from "./pages/vendas/MinhaCarteira";
import CotacoesPlataforma from "./pages/plataformas/Cotacoes";
import CotacaoDetalhes from "./pages/plataformas/CotacaoDetalhes";
import PedidosPlataforma from "./pages/plataformas/Pedidos";
import RelatoriosPlataforma from "./pages/plataformas/Relatorios";
import ProdutosVinculo from "./pages/plataformas/ProdutosVinculo";
import Parametros from "./pages/plataformas/Parametros";
import DashboardAnaliseIA from "./pages/plataformas/DashboardAnaliseIA";
import MLDashboard from "./pages/plataformas/MLDashboard";
import HistoricoImportacoes from "./pages/plataformas/HistoricoImportacoes";
import SolicitacaoParticipacao from "./pages/licitacoes/SolicitacaoParticipacao";
import ContratosGoverno from "./pages/licitacoes/ContratosGoverno";
import WhatsApp from "./pages/WhatsApp";
// ConfiguracoesWhatsApp migrado para /configuracoes tab WhatsApp
import ConfiguracaoGlobal from "./pages/whatsapp/ConfiguracaoGlobal";
import Governanca from "./pages/whatsapp/Governanca";
import BAMDashboard from "./pages/whatsapp/BAMDashboard";
import URAs from "./pages/URAs";
import URAEditor from "./pages/URAEditor";
import Tickets from "./pages/Tickets";
import NovoTicket from "./pages/NovoTicket";
import TicketDetalhes from "./pages/TicketDetalhes";
import TicketsDashboard from "./pages/TicketsDashboard";
import BaseConhecimento from "./pages/BaseConhecimento";
import MeuPerfil from "./pages/MeuPerfil";
import CadastroCNPJ from "./pages/CadastroCNPJ";
import SolicitacoesCadastro from "./pages/SolicitacoesCadastro";
import Configuracoes from "./pages/Configuracoes";
import PerfilVendedor from "./pages/PerfilVendedor";
import PropostaPublica from "./pages/PropostaPublica";
import Documentos from "./pages/Documentos";
import Atividades from "./pages/Atividades";
import FocusZone from "./pages/FocusZone";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// QueryClient para rotas públicas (sem ThemeProvider)
const publicQueryClient = new QueryClient();

// Rotas públicas que não precisam de autenticação nem ThemeProvider
const PublicRoutes = () => (
  <QueryClientProvider client={publicQueryClient}>
    <BrowserRouter>
      <Routes>
        {/* Rota pública para proposta comercial - completamente isolada */}
        <Route path="/proposal/:token" element={<PropostaPublica />} />
        
        {/* Todas as outras rotas vão para o app principal com ThemeProvider */}
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

// App principal com ThemeProvider
const MainApp = () => (
  <ThemeProvider>
    <WhatsAppProvider>
      <Toaster />
      <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<ProtectedRoute>
          <Layout>
            <Index />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/vendas" element={<ProtectedRoute>
          <Layout>
            <Vendas />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/vendas/:id" element={<ProtectedRoute>
          <Layout>
            <VendaDetalhes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas" element={<ProtectedRoute>
          <Layout>
            <Plataformas />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/licitacoes" element={<ProtectedRoute>
          <Layout>
            <Licitacoes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute>
          <Layout>
            <Clientes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/clientes/:id" element={<ProtectedRoute>
          <Layout>
            <ClienteDetalhes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/clientes/cadastro-cnpj" element={<ProtectedRoute>
          <Layout>
            <CadastroCNPJ />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/clientes/solicitacoes" element={<ProtectedRoute>
          <Layout>
            <SolicitacoesCadastro />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/produtos" element={<ProtectedRoute>
          <Layout>
            <Produtos />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/importar-produtos" element={<ProtectedRoute>
          <Layout>
            <ImportarProdutos />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/importar-clientes" element={<ProtectedRoute>
          <Layout>
            <ImportarClientes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/vendas/pedidos" element={<ProtectedRoute>
          <Layout>
            <PedidosVendas />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/vendas/contratos" element={<ProtectedRoute>
          <Layout>
            <ContratosVendas />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/vendas/carteira" element={<ProtectedRoute>
          <Layout>
            <MinhaCarteira />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/cotacoes" element={<ProtectedRoute>
          <Layout>
            <CotacoesPlataforma />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/cotacoes/:id" element={<ProtectedRoute>
          <Layout>
            <CotacaoDetalhes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/pedidos" element={<ProtectedRoute>
          <Layout>
            <PedidosPlataforma />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/relatorios" element={<ProtectedRoute>
          <Layout>
            <RelatoriosPlataforma />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/produtos-vinculo" element={<ProtectedRoute>
          <Layout>
            <ProdutosVinculo />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/parametros" element={<ProtectedRoute>
          <Layout>
            <Parametros />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/dashboard-ia" element={<ProtectedRoute>
          <Layout>
            <DashboardAnaliseIA />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/ml-dashboard" element={<ProtectedRoute>
          <Layout>
            <MLDashboard />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/plataformas/historico-importacoes" element={<ProtectedRoute>
          <Layout>
            <HistoricoImportacoes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/licitacoes/solicitacao" element={<ProtectedRoute>
          <Layout>
            <SolicitacaoParticipacao />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/licitacoes/contratos-governo" element={<ProtectedRoute>
          <Layout>
            <ContratosGoverno />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/whatsapp" element={<ProtectedRoute>
          <Layout>
            <WhatsApp />
          </Layout>
        </ProtectedRoute>} />
      {/* /whatsapp/configuracoes removido - migrado para /configuracoes tab WhatsApp */}
      <Route path="/whatsapp/configuracao-global" element={<ProtectedRoute>
          <Layout>
            <ConfiguracaoGlobal />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/whatsapp/governanca" element={<ProtectedRoute>
          <Layout>
            <Governanca />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/whatsapp/bam" element={<ProtectedRoute>
          <Layout>
            <BAMDashboard />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/uras" element={<ProtectedRoute>
          <Layout>
            <URAs />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/uras/:id/editor" element={<ProtectedRoute>
          <Layout>
            <URAEditor />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute>
          <Layout>
            <Usuarios />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/equipes" element={<ProtectedRoute>
          <Layout>
            <Equipes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute>
          <Layout>
            <Tickets />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/tickets/novo" element={<ProtectedRoute>
          <Layout>
            <NovoTicket />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/tickets/:id" element={<ProtectedRoute>
          <Layout>
            <TicketDetalhes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/tickets/dashboard" element={<ProtectedRoute>
          <Layout>
            <TicketsDashboard />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/base-conhecimento" element={<ProtectedRoute>
          <Layout>
            <BaseConhecimento />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute>
          <Layout>
            <MeuPerfil />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute>
          <Layout>
            <Configuracoes />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/perfil-vendedor" element={<ProtectedRoute>
          <Layout>
            <PerfilVendedor />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/documentos" element={<ProtectedRoute>
          <Layout>
            <Documentos />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/atividades" element={<ProtectedRoute>
          <Layout>
            <Atividades />
          </Layout>
        </ProtectedRoute>} />
      <Route path="/atividades/focus" element={<ProtectedRoute>
          <Layout>
            <FocusZone />
          </Layout>
        </ProtectedRoute>} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </WhatsAppProvider>
  </ThemeProvider>
);

const App = () => <PublicRoutes />;

export default App;
