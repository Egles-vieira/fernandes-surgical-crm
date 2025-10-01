import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import Plataformas from "./pages/Plataformas";
import Licitacoes from "./pages/Licitacoes";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import ImportarProdutos from "./pages/ImportarProdutos";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
