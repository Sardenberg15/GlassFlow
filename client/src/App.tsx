import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import Dashboard from "@/pages/dashboard";
import Clientes from "@/pages/clientes";
import Projetos from "@/pages/projetos";
import Orcamentos from "@/pages/orcamentos";
import OrcamentosWizard from "@/pages/orcamentos-wizard";
import FinanceiroV2 from "@/pages/financeiro-v2";
import NotFound from "@/pages/not-found";
import VendedorApp from "@/pages/vendedor";
import ProjetoDetalhe from "@/pages/projeto-detalhe";
import QuoteEditor from "@/pages/quote-editor";
import Esquadrias from "@/pages/esquadrias";
import Producao from "@/pages/producao";
import ProducaoDetalhe from "@/pages/producao-detalhe";
import Estoque from "@/pages/estoque";
import Funcionarios from "@/pages/funcionarios";
import DRE from "@/pages/dre";
import Configuracoes from "@/pages/configuracoes";
import ArquivoVirtual from "@/pages/arquivo-virtual";
import TorreControle from "@/pages/torre-controle";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/torre-de-controle" component={TorreControle} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/projetos" component={Projetos} />
      <Route path="/projetos/:id" component={ProjetoDetalhe} />
      <Route path="/orcamentos" component={Orcamentos} />
      <Route path="/orcamentos/novo" component={OrcamentosWizard} />
      <Route path="/orcamentos/:id/editor" component={QuoteEditor} />
      <Route path="/financeiro" component={FinanceiroV2} />
      <Route path="/dre" component={DRE} />
      <Route path="/esquadrias" component={Esquadrias} />
      <Route path="/producao" component={Producao} />
      <Route path="/producao/:id" component={ProducaoDetalhe} />
      <Route path="/estoque" component={Estoque} />
      <Route path="/funcionarios" component={Funcionarios} />
      {/* App independente do vendedor (SPA sem router interno) */}
      <Route path="/vendedor" component={VendedorApp} />
      <Route path="/arquivo-virtual" component={ArquivoVirtual} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light">
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between p-4 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2">
                    <NotificationsDropdown />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
