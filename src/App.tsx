import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DataLoader } from "@/components/DataLoader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import ClienteDetalhes from "@/pages/ClienteDetalhes";
import Imoveis from "@/pages/Imoveis";
import ImovelDetalhes from "@/pages/ImovelDetalhes";
import FunilVendas from "@/pages/FunilVendas";
import Juridico from "@/pages/Juridico";
import Midias from "@/pages/Midias";
import Financeiro from "@/pages/Financeiro";
import Configuracoes from "@/pages/Configuracoes";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes */}
          <Route element={
            <ProtectedRoute>
              <DataLoader>
                <AppLayout />
              </DataLoader>
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhes />} />
            <Route path="/imoveis" element={<Imoveis />} />
            <Route path="/imoveis/:id" element={<ImovelDetalhes />} />
            <Route path="/funil" element={<FunilVendas />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/juridico" element={<Juridico />} />
            <Route path="/midias" element={<Midias />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
