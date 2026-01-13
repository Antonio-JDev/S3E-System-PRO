import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// Editor WYSIWYG Jodit
import 'jodit/es2021/jodit.min.css';
import Sidebar from './components/Sidebar';
import ObrasKanban from './pages/ObrasKanban';
import NovaCompraPage from './pages/NovaCompraPage';
import DetalhesObra from './pages/DetalhesObra';
import EditarOrcamentoPage from './pages/EditarOrcamentoPage';
// import SettingsModal from './components/SettingsModal'; // DESCONTINUADO - Substituído por página Configuracoes.tsx
import MetricasEquipe from './components/MetricasEquipe';
import TarefasObra from './components/TarefasObra';
import Ferramentas from './components/Ferramentas';
import GerenciamentoEmpresarial from './components/GerenciamentoEmpresarial';
import { type Project } from './types';
import { Toaster } from './components/ui/sonner';
import MobileMenuButton from './components/MobileMenuButton';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// ====== Lazy-loaded modules principais (code splitting) ======
const Dashboard = lazy(() => import('./components/DashboardModerno'));
const DashboardAPI = lazy(() => import('./components/DashboardAPI'));
const Orcamentos = lazy(() => import('./components/Orcamentos'));
const Catalogo = lazy(() => import('./components/Catalogo'));
const Movimentacoes = lazy(() => import('./components/Movimentacoes'));
const Logs = lazy(() => import('./components/Logs'));
const Compras = lazy(() => import('./components/Compras'));
const Materiais = lazy(() => import('./components/Materiais'));
const Fornecedores = lazy(() => import('./components/Fornecedores'));
const FornecedoresAPI = lazy(() => import('./components/FornecedoresAPI'));
const FornecedoresModerno = lazy(() => import('./components/FornecedoresModerno'));
const Clientes = lazy(() => import('./components/Clientes'));
const ClientesAPI = lazy(() => import('./components/ClientesAPI'));
const ClientesModerno = lazy(() => import('./components/ClientesModerno'));
const Projetos = lazy(() => import('./components/Projetos'));
const ProjetosAPI = lazy(() => import('./components/ProjetosAPI'));
const ProjetosModerno = lazy(() => import('./components/ProjetosModerno'));
const Obras = lazy(() => import('./components/Obras'));
const Servicos = lazy(() => import('./components/Servicos'));
const Financeiro = lazy(() => import('./components/Financeiro'));
const EmissaoNFe = lazy(() => import('./components/EmissaoNFe'));
const Configuracoes = lazy(() => import('./components/Configuracoes'));
const AtualizacaoPrecos = lazy(() => import('./components/AtualizacaoPrecos'));
const Vendas = lazy(() => import('./components/Vendas'));
const Cotacoes = lazy(() => import('./components/Cotacoes'));
const GerenciamentoFerramentas = lazy(() => import('./components/GerenciamentoFerramentas'));

const MainApp: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('Dashboard');
  // const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // DESCONTINUADO
  const [initialBudgetId, setInitialBudgetId] = useState<string | null>(null);
  const [initialProjectId, setInitialProjectId] = useState<string | null>(null);
  const [initialObraId, setInitialObraId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Detectar URL e setar activeView automaticamente
  useEffect(() => {
    const pathname = location.pathname;
    
    // Mapear rotas para views
    if (pathname === '/orcamentos' || pathname.startsWith('/orcamentos/')) {
      setActiveView('Orçamentos');
    } else if (pathname === '/compras' || pathname.startsWith('/compras/')) {
      setActiveView('Compras');
    } else if (pathname === '/vendas' || pathname.startsWith('/vendas/')) {
      setActiveView('Vendas');
    } else if (pathname === '/projetos' || pathname.startsWith('/projetos/')) {
      setActiveView('Ordem De Serviços');
    } else if (pathname === '/clientes' || pathname.startsWith('/clientes/')) {
      setActiveView('Clientes');
    } else if (pathname === '/materiais' || pathname.startsWith('/materiais/')) {
      setActiveView('Materiais');
    } else if (pathname === '/fornecedores' || pathname.startsWith('/fornecedores/')) {
      setActiveView('Fornecedores');
    } else if (pathname === '/obras' || pathname.startsWith('/obras/')) {
      setActiveView('Obras');
    } else if (pathname === '/' || pathname === '') {
      setActiveView('Dashboard');
    }
    // Se não corresponder a nenhuma rota específica, manter o activeView atual
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const handleNavigate = (view: string, ...args: any[]) => {
    setActiveView(view);
    if (window.innerWidth < 1024) { // lg breakpoint
      setIsSidebarOpen(false);
    }
    // Se for DetalhesObra e tiver argumentos, usar o primeiro como obraId
    if (view === 'DetalhesObra' && args[0]) {
      setInitialObraId(args[0]);
    }
  };

  const handleViewBudget = (budgetId: string) => {
    setInitialBudgetId(budgetId);
    handleNavigate('Orçamentos');
  };
  
  const handleViewProject = (projectId: string) => {
    setInitialProjectId(projectId);
    handleNavigate('Ordem De Serviços');
  };

  const handleViewObra = (obraId: string) => {
    setInitialObraId(obraId);
    handleNavigate('DetalhesObra');
  };

  const handleViewSale = (saleId: string) => {
    // Navegar para vendas - o componente pode abrir o modal automaticamente se necessário
    handleNavigate('Vendas');
    // TODO: Implementar abertura automática do modal de visualização de venda
  };

  const handleViewClient = (clientId: string) => {
    // Navegar para clientes - o componente pode abrir o modal automaticamente se necessário
    handleNavigate('Clientes');
    // TODO: Implementar abertura automática do modal de visualização de cliente
  };


  const renderActiveView = () => {
    switch (activeView) {
      case 'Dashboard':
        return <Dashboard toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
      case 'Orçamentos':
        return <Orcamentos toggleSidebar={toggleSidebar} />;
      case 'Catálogo':
        return <Catalogo toggleSidebar={toggleSidebar} />;
      case 'Movimentações':
        return <Movimentacoes toggleSidebar={toggleSidebar} />;
      case 'Logs':
      case 'Histórico': // Compatibilidade
        return <Logs toggleSidebar={toggleSidebar} />;
      case 'Compras':
        return <Compras toggleSidebar={toggleSidebar} />;
      case 'Estoque':
      case 'Materiais':
        return <Materiais toggleSidebar={toggleSidebar} />;
      case 'Atualização de Preços':
        return <AtualizacaoPrecos toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
      case 'Fornecedores':
        return <FornecedoresModerno toggleSidebar={toggleSidebar} />;
      case 'Clientes':
        return <ClientesModerno toggleSidebar={toggleSidebar} />;
      case 'Ordem De Serviços':
        return <ProjetosModerno 
                 toggleSidebar={toggleSidebar} 
                 onNavigate={handleNavigate}
                 onViewBudget={handleViewBudget}
                 onViewSale={handleViewSale}
                 onViewClient={handleViewClient}
                 onViewObra={handleViewObra}
               />;
      case 'Obras':
        return <ObrasKanban toggleSidebar={toggleSidebar} onNavigate={(view: string, ...args: any[]) => {
          if (view === 'DetalhesObra' && args[0]) {
            handleViewObra(args[0]);
          } else {
            handleNavigate(view);
          }
        }} />;
      case 'DetalhesObra':
        return initialObraId ? (
          <DetalhesObra toggleSidebar={toggleSidebar} obraId={initialObraId} onNavigate={handleNavigate} />
        ) : (
          <ObrasKanban toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />
        );
      case 'Tarefas da Obra':
        return <TarefasObra toggleSidebar={toggleSidebar} />;
      case 'Métricas de Equipe':
        return <MetricasEquipe toggleSidebar={toggleSidebar} />;
      case 'Financeiro':
        return <Financeiro toggleSidebar={toggleSidebar} />;
      case 'Vendas':
        return <Vendas toggleSidebar={toggleSidebar} />;
      case 'Cotações':
        return <Cotacoes toggleSidebar={toggleSidebar} />;
      case 'Emissão NF-e':
        return <EmissaoNFe toggleSidebar={toggleSidebar} />;
      case 'Serviços':
        return <Servicos toggleSidebar={toggleSidebar} />;
      case 'Ferramentas':
        return <GerenciamentoFerramentas toggleSidebar={toggleSidebar} />;
      case 'Configurações':
        return <Configuracoes toggleSidebar={toggleSidebar} />;
      case 'Gerenciamento Empresarial':
        return <GerenciamentoEmpresarial toggleSidebar={toggleSidebar} />;
      default:
        return <DashboardAPI toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-gray-50 dark:bg-dark-bg font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenSettings={() => {}} // DESCONTINUADO - Agora usa onNavigate('Configurações')
      />
      {isSidebarOpen && (
        <div 
          onClick={toggleSidebar} 
          className="fixed inset-0 z-30 bg-black opacity-50 lg:hidden"
          aria-hidden="true"
        ></div>
      )}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-bg relative">
        {/* Botão Hambúrguer para Mobile - aparece apenas quando sidebar está fechada em mobile */}
        {!isSidebarOpen && <MobileMenuButton onClick={toggleSidebar} isOpen={isSidebarOpen} />}
        {renderActiveView()}
      </main>
      {/* SettingsModal DESCONTINUADO - Substituído por página Configuracoes.tsx */}
      {/* <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      /> */}
    </div>
  );
};

// Componente wrapper para páginas standalone com Sidebar
const StandalonePageWrapper: React.FC<{ children: React.ReactNode; activeView?: string }> = ({ children, activeView = 'Compras' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigate = (view: string) => {
    // Mapear views para rotas
    const routeMap: Record<string, string> = {
      'Dashboard': '/',
      'Orçamentos': '/',
      'Catálogo': '/',
      'Movimentações': '/',
      'Logs': '/',
      'Compras': '/compras',
      'Materiais': '/',
      'Estoque': '/',
      'Atualização de Preços': '/',
      'Fornecedores': '/',
      'Clientes': '/',
      'Ordem De Serviços': '/',
      'Obras': '/',
      'Tarefas da Obra': '/',
      'Ferramentas': '/',
      'Métricas de Equipe': '/',
      'Financeiro': '/',
      'Vendas': '/',
      'Emissão NF-e': '/',
      'Serviços': '/',
      'Configurações': '/',
      'Gerenciamento Empresarial': '/'
    };

    const route = routeMap[view] || '/';
    window.location.href = route;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-gray-50 dark:bg-dark-bg font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenSettings={() => handleNavigate('Configurações')}
      />
      {isSidebarOpen && (
        <div 
          onClick={toggleSidebar} 
          className="fixed inset-0 z-30 bg-black opacity-50 lg:hidden"
          aria-hidden="true"
        ></div>
      )}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-bg relative">
        {/* Botão Hambúrguer para Mobile - aparece apenas quando sidebar está fechada em mobile */}
        {!isSidebarOpen && <MobileMenuButton onClick={toggleSidebar} isOpen={isSidebarOpen} />}
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-dark-text-secondary text-sm">
                  Carregando página...
                </p>
              </div>
            </div>
          }
        >
          {React.cloneElement(children as React.ReactElement, { toggleSidebar })}
        </Suspense>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/compras"
                element={
                  <ProtectedRoute>
                    <StandalonePageWrapper>
                      <Compras toggleSidebar={() => {}} />
                    </StandalonePageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compras/nova"
                element={
                  <ProtectedRoute>
                    <StandalonePageWrapper>
                      <NovaCompraPage toggleSidebar={() => {}} />
                    </StandalonePageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orcamentos/editar/:id"
                element={
                  <ProtectedRoute>
                    <StandalonePageWrapper activeView="Orçamentos">
                      <EditarOrcamentoPage toggleSidebar={() => {}} />
                    </StandalonePageWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainApp />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster position="top-right" expand={false} richColors closeButton />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
