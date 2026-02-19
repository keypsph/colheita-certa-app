import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import Navigation from "@/components/Navigation";
import Index from "./pages/Index";
import Funcionarios from "./pages/Funcionarios";
import RegistroHorasPage from "./pages/RegistroHoras";
import Adiantamentos from "./pages/Adiantamentos";
import AcertoFinal from "./pages/AcertoFinal";
import Resumo from "./pages/Resumo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen pb-16">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/funcionarios" element={<Funcionarios />} />
              <Route path="/horas" element={<RegistroHorasPage />} />
              <Route path="/adiantamentos" element={<Adiantamentos />} />
              <Route path="/resumo" element={<Resumo />} />
              <Route path="/acerto" element={<AcertoFinal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Navigation />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
