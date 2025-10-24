import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import Plataformas from "./pages/Plataformas";
import Licitacoes from "./pages/Licitacoes";
import Clientes from "./pages/Clientes";
import ClienteDetalhes from "./pages/ClienteDetalhes";
import Produtos from "./pages/Produtos";
import ImportarProdutos from "./pages/ImportarProdutos";
import ImportarClientes from "./pages/ImportarClientes";
import Usuarios from "./pages/Usuarios";
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
import SolicitacaoParticipacao from "./pages/licitacoes/SolicitacaoParticipacao";
import ContratosGoverno from "./pages/licitacoes/ContratosGoverno";
import WhatsApp from "./pages/WhatsApp";
import ConfiguracoesWhatsApp from "./pages/whatsapp/Configuracoes";
import URAs from "./pages/URAs";
import URAEditor from "./pages/URAEditor";
import Tickets from "./pages/Tickets";
import NovoTicket from "./pages/NovoTicket";
import TicketDetalhes from "./pages/TicketDetalhes";
import TicketsDashboard from "./pages/TicketsDashboard";
import BaseConhecimento from "./pages/BaseConhecimento";

const App = () => (
  <>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/vendas" element={
          <ProtectedRoute>
            <Layout>
              <Vendas />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/plataformas" element={
          <ProtectedRoute>
            <Layout>
              <Plataformas />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/licitacoes" element={
          <ProtectedRoute>
            <Layout>
              <Licitacoes />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/clientes" element={
          <ProtectedRoute>
            <Layout>
              <Clientes />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/clientes/:id" element={
          <ProtectedRoute>
            <Layout>
              <ClienteDetalhes />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/produtos" element={
          <ProtectedRoute>
            <Layout>
              <Produtos />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/importar-produtos" element={
          <ProtectedRoute>
            <Layout>
              <ImportarProdutos />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/importar-clientes" element={
          <ProtectedRoute>
            <Layout>
              <ImportarClientes />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/vendas/pedidos" element={
          <ProtectedRoute>
            <Layout>
              <PedidosVendas />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/vendas/contratos" element={
          <ProtectedRoute>
            <Layout>
              <ContratosVendas />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/vendas/carteira" element={
          <ProtectedRoute>
            <Layout>
              <MinhaCarteira />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/plataformas/cotacoes" element={
          <ProtectedRoute>
            <Layout>
              <CotacoesPlataforma />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/plataformas/cotacoes/:id" element={
          <ProtectedRoute>
            <Layout>
              <CotacaoDetalhes />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/plataformas/pedidos" element={
          <ProtectedRoute>
            <Layout>
              <PedidosPlataforma />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/plataformas/relatorios" element={
          <ProtectedRoute>
            <Layout>
              <RelatoriosPlataforma />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/plataformas/produtos-vinculo" element={
          <ProtectedRoute>
            <Layout>
              <ProdutosVinculo />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/licitacoes/solicitacao" element={
          <ProtectedRoute>
            <Layout>
              <SolicitacaoParticipacao />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/licitacoes/contratos-governo" element={
          <ProtectedRoute>
            <Layout>
              <ContratosGoverno />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/whatsapp" element={
          <ProtectedRoute>
            <Layout>
              <WhatsApp />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/whatsapp/configuracoes" element={
          <ProtectedRoute>
            <Layout>
              <ConfiguracoesWhatsApp />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/uras" element={
          <ProtectedRoute>
            <Layout>
              <URAs />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/uras/:id/editor" element={
          <ProtectedRoute>
            <Layout>
              <URAEditor />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/usuarios" element={
          <ProtectedRoute>
            <Layout>
              <Usuarios />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tickets" element={
          <ProtectedRoute>
            <Layout>
              <Tickets />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tickets/novo" element={
          <ProtectedRoute>
            <Layout>
              <NovoTicket />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tickets/:id" element={
          <ProtectedRoute>
            <Layout>
              <TicketDetalhes />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tickets/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <TicketsDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/base-conhecimento" element={
          <ProtectedRoute>
            <Layout>
              <BaseConhecimento />
            </Layout>
          </ProtectedRoute>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;
