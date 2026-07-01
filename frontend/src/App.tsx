import React, { Component, Suspense, lazy, useState, useEffect, useCallback, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// Editor WYSIWYG TipTap (CSS incluído nos componentes)
import './styles/tiptap-global.css';
import Sidebar from './components/Sidebar';
import ObrasKanban from './pages/ObrasKanban';
import NovaCompraPage from './pages/NovaCompraPage';
import DetalhesObra from './pages/DetalhesObra';
import EditarOrcamentoPage from './pages/EditarOrcamentoPage';
// import SettingsModal from './components/SettingsModal'; // DESCONTINUADO - Substituído por página Configuracoes.tsx
import TarefasObra from './components/TarefasObra';
import Ferramentas from './components/Ferramentas';
import GestaoEmpresarial from './components/GestaoEmpresarial';
import { type Project } from './types';
import { type Notificacao } from './services/notificationsService';
import { Toaster } from './components/ui/sonner';
import MobileMenuButton from './components/MobileMenuButton';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useWhatsappUnreadSync } from './hooks/useWhatsappUnreadSync';

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
const OrdemServicosHub = lazy(() => import('./components/OrdemServicosHub'));
const CalendarioHub = lazy(() => import('./components/CalendarioHub'));
const Obras = lazy(() => import('./components/Obras'));
const Servicos = lazy(() => import('./components/Servicos'));
const Financeiro = lazy(() => import('./components/Financeiro'));
const EmissaoNFe = lazy(() => import('./components/EmissaoNFe'));
const Configuracoes = lazy(() => import('./components/Configuracoes'));
const Vendas = lazy(() => import('./components/Vendas'));
const GerenciamentoFerramentas = lazy(() => import('./components/GerenciamentoFerramentas'));
const TarefasInternasKanban = lazy(() => import('./pages/TarefasInternasKanban'));
const DetalhesTarefaInterna = lazy(() => import('./pages/DetalhesTarefaInterna'));
const FunilAtendimentoPage = lazy(() => import('./pages/FunilAtendimentoPage'));
const WhatsAppChatPage = lazy(() => import('./pages/WhatsAppChatPage'));
const ContatosS3ePage = lazy(() => import('./pages/ContatosS3ePage'));
const DocumentacaoSistemaPage = lazy(() => import('./pages/DocumentacaoSistemaPage'));

/** Error boundary para a área principal: evita tela branca se um módulo lazy quebrar */
class MainContentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('MainContentErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="max-w-md">
            <p className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">Algo deu errado ao carregar esta página.</p>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">Tente recarregar ou voltar ao Dashboard.</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded-lg bg-brand-blue text-white hover:opacity-90"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainApp: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('Dashboard');
  // const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false); // DESCONTINUADO
  const [initialBudgetId, setInitialBudgetId] = useState<string | null>(null);
  const [initialClientId, setInitialClientId] = useState<string | null>(null);
  const [initialProjectId, setInitialProjectId] = useState<string | null>(null);
  const [initialProjectTab, setInitialProjectTab] = useState<'geral' | 'materiais' | 'etapas' | 'qualidade'>('geral');
  const [initialObraId, setInitialObraId] = useState<string | null>(null);
  const [initialTarefaInternaId, setInitialTarefaInternaId] = useState<string | null>(null);
  const [initialFinanceiroAba, setInitialFinanceiroAba] = useState<string | null>(null);
  const [initialFinanceiroContaId, setInitialFinanceiroContaId] = useState<string | null>(null);
  const [initialWhatsappChat, setInitialWhatsappChat] = useState<{ chatId: string; title: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useWhatsappUnreadSync();

  const clearInitialWhatsappChat = useCallback(() => setInitialWhatsappChat(null), []);

  // Ouvir evento global para abrir Contas a Pagar com conta específica (ex: botão Ver/Pagar na compra)
  // Funciona sempre, mesmo quando pathname não muda (sidebar usa activeView, não URL)
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ contaId: string }>;
      const contaId = ev?.detail?.contaId;
      if (contaId) {
        setInitialFinanceiroAba('pagar');
        setInitialFinanceiroContaId(contaId);
        setActiveView('Financeiro');
      }
    };
    window.addEventListener('s3e-open-conta-pagar', handler);
    return () => window.removeEventListener('s3e-open-conta-pagar', handler);
  }, []);

  useEffect(() => {
    const goCompras = () => setActiveView('Compras');
    window.addEventListener('s3e-navigate-compras-avulsa', goCompras);
    return () => window.removeEventListener('s3e-navigate-compras-avulsa', goCompras);
  }, []);

  // Detectar URL e setar activeView automaticamente
  // Também lê sinais do localStorage (ex: Compras -> Contas a Pagar) para navegação cross-page
  useEffect(() => {
    const pathname = location.pathname;

    // 1. Verificar se há sinal de navegação via localStorage (ex: vindo de /compras)
    try {
      const aba = localStorage.getItem('s3e_initial_financeiro_aba');
      const contaId = localStorage.getItem('s3e_initial_conta_pagar_id');
      if (aba) {
        setInitialFinanceiroAba(aba);
        setActiveView('Financeiro'); // forçar abertura do Financeiro
        localStorage.removeItem('s3e_initial_financeiro_aba');
      }
      if (contaId) {
        setInitialFinanceiroContaId(contaId);
        localStorage.removeItem('s3e_initial_conta_pagar_id');
      }
      // Se havia sinal, não sobrescrever com o mapeamento de rota
      if (aba) return;
    } catch (err) {
      // ignore
    }

    // 2. Mapear rotas para views (só se não houve sinal de localStorage)
    if (pathname === '/orcamentos' || pathname.startsWith('/orcamentos/')) {
      setActiveView('Orçamentos');
    } else if (pathname === '/compras' || pathname.startsWith('/compras/')) {
      setActiveView('Compras');
    } else if (pathname === '/vendas' || pathname.startsWith('/vendas/')) {
      setActiveView('Vendas');
    } else if (pathname === '/projetos' || pathname.startsWith('/projetos/')) {
      setActiveView('Ordem De Serviços');
    } else if (pathname === '/atendimento' || pathname.startsWith('/atendimento')) {
      setActiveView('Funil de Atendimento');
    } else if (pathname === '/whatsapp' || pathname.startsWith('/whatsapp')) {
      setActiveView('Chat WhatsApp');
    } else if (pathname === '/clientes' || pathname.startsWith('/clientes/')) {
      setActiveView('Clientes');
    } else if (pathname === '/materiais' || pathname.startsWith('/materiais/')) {
      setActiveView('Materiais');
    } else if (pathname === '/fornecedores' || pathname.startsWith('/fornecedores/')) {
      setActiveView('Fornecedores');
    } else if (pathname === '/obras' || pathname.startsWith('/obras/')) {
      setActiveView('Execução Obra');
    } else if (pathname === '/calendario') {
      setActiveView('Calendário');
    } else if (pathname === '/tarefas-internas') {
      setActiveView('Tarefas Internas');
      setInitialTarefaInternaId(null);
    } else if (pathname.startsWith('/tarefas-internas/') && pathname !== '/tarefas-internas') {
      const id = pathname.replace('/tarefas-internas/', '').split('/')[0];
      if (id) {
        setInitialTarefaInternaId(id);
        setActiveView('DetalhesTarefaInterna');
      } else {
        setActiveView('Tarefas Internas');
      }
    } else if (pathname === '/documentacao-sistema') {
      setActiveView('Documentação API');
    } else if (pathname === '/' || pathname === '') {
      setActiveView('Dashboard');
    }
  }, [location.pathname, location.search]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const navigate = useNavigate();

  const handleNavigate = (view: string, ...args: any[]) => {
    if (view === 'Documentação API') {
      navigate('/documentacao-sistema');
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      return;
    }
    if (view === 'Chat WhatsApp' && typeof args[0] === 'string' && args[0].length > 0 && typeof args[1] === 'string') {
      setInitialWhatsappChat({ chatId: args[0], title: args[1] });
    }
    setActiveView(view);
    if (window.innerWidth < 1024) { // lg breakpoint
      setIsSidebarOpen(false);
    }
    // Se for DetalhesObra e tiver argumentos, usar o primeiro como obraId
    if (view === 'DetalhesObra' && args[0]) {
      setInitialObraId(args[0]);
    }
    // Se for DetalhesTarefaInterna e tiver argumentos, usar o primeiro como tarefaId
    if (view === 'DetalhesTarefaInterna' && args[0]) {
      setInitialTarefaInternaId(args[0]);
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

  const handleViewTarefaInterna = (tarefaId: string) => {
    setInitialTarefaInternaId(tarefaId);
    handleNavigate('DetalhesTarefaInterna');
  };

  const handleViewSale = (saleId: string) => {
    // Navegar para vendas - o componente pode abrir o modal automaticamente se necessário
    handleNavigate('Vendas');
    // TODO: Implementar abertura automática do modal de visualização de venda
  };

  const handleViewClient = (clientId: string) => {
    setInitialClientId(clientId);
    handleNavigate('Clientes');
  };

  const handleNotificationIr = (n: Notificacao) => {
    const meta = n.metadata as { projetoId?: string; obraId?: string; tarefaInternaId?: string; subtype?: string; link?: string } | undefined;
    switch (n.tipo) {
      case 'kanban_ordem_servico':
        if (meta?.projetoId) {
          setInitialProjectId(meta.projetoId);
          setInitialProjectTab('etapas'); // abrir direto na aba Kanban
          handleNavigate('Ordem De Serviços');
        } else {
          handleNavigate('Ordem De Serviços');
        }
        break;
      case 'kanban_obras':
        if (meta?.obraId) {
          handleViewObra(meta.obraId);
        } else {
          handleNavigate('Execução Obra');
        }
        break;
      case 'tarefas_internas':
        if (meta?.tarefaInternaId) {
          handleViewTarefaInterna(meta.tarefaInternaId);
        } else {
          handleNavigate('Tarefas Internas');
        }
        break;
      case 'financeiro':
        if (meta?.subtype === 'contas_vencendo_hoje' || (typeof meta?.link === 'string' && meta.link.includes('contas-pagar'))) {
          setInitialFinanceiroAba('pagar');
        } else if (typeof meta?.link === 'string' && meta.link.includes('contas-receber')) {
          setInitialFinanceiroAba('receber');
        } else {
          setInitialFinanceiroAba('dashboard');
        }
        handleNavigate('Financeiro');
        break;
      default:
        handleNavigate('Dashboard');
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'Dashboard':
        return <Dashboard toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
      case 'Orçamentos':
        return (
          <Orcamentos
            toggleSidebar={toggleSidebar}
            initialBudgetId={initialBudgetId}
            onClearInitialBudgetId={() => setInitialBudgetId(null)}
          />
        );
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
      case 'Fornecedores':
        return <FornecedoresModerno toggleSidebar={toggleSidebar} />;
      case 'Funil de Atendimento':
        return <FunilAtendimentoPage toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
      case 'Chat WhatsApp':
        return (
          <WhatsAppChatPage
            toggleSidebar={toggleSidebar}
            initialWhatsappChat={initialWhatsappChat}
            onClearInitialWhatsappChat={clearInitialWhatsappChat}
          />
        );
      case 'Contatos S3E':
        return <ContatosS3ePage toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
      case 'Clientes':
        return (
          <ClientesModerno
            toggleSidebar={toggleSidebar}
            initialClientId={initialClientId}
            onClearInitialClientId={() => setInitialClientId(null)}
          />
        );
      case 'Tarefas Internas':
        return <TarefasInternasKanban toggleSidebar={toggleSidebar} onNavigate={handleNavigate} onViewTarefaInterna={handleViewTarefaInterna} />;
      case 'DetalhesTarefaInterna':
        return initialTarefaInternaId ? (
          <DetalhesTarefaInterna toggleSidebar={toggleSidebar} tarefaId={initialTarefaInternaId} onNavigate={handleNavigate} />
        ) : (
          <TarefasInternasKanban toggleSidebar={toggleSidebar} onNavigate={handleNavigate} onViewTarefaInterna={handleViewTarefaInterna} />
        );
      case 'Ordem De Serviços':
        return <OrdemServicosHub 
                 toggleSidebar={toggleSidebar} 
                 onNavigate={handleNavigate}
                 onViewBudget={handleViewBudget}
                 onViewSale={handleViewSale}
                 onViewClient={handleViewClient}
                 initialProjectId={initialProjectId}
                 initialProjectTab={initialProjectTab}
                 onClearInitialProject={() => { setInitialProjectId(null); setInitialProjectTab('geral'); }}
                 onViewObra={handleViewObra}
               />;
      case 'Calendário':
        return <CalendarioHub toggleSidebar={toggleSidebar} />;
      case 'Execução Obra':
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
      case 'Financeiro':
        return (
          <Financeiro
            toggleSidebar={toggleSidebar}
            initialAba={initialFinanceiroAba}
            initialContaId={initialFinanceiroContaId}
            onClearInitialAba={() => { setInitialFinanceiroAba(null); }}
            onClearInitialContaId={() => { setInitialFinanceiroContaId(null); }}
          />
        );
      case 'Vendas':
        return <Vendas toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
      case 'Emissão NF-e':
        return <EmissaoNFe toggleSidebar={toggleSidebar} />;
      case 'Serviços':
        return <Servicos toggleSidebar={toggleSidebar} />;
      case 'Ferramentas':
        return <GerenciamentoFerramentas toggleSidebar={toggleSidebar} />;
      case 'Configurações':
        return <Configuracoes toggleSidebar={toggleSidebar} />;
      case 'Gestão empresarial':
        return <GestaoEmpresarial toggleSidebar={toggleSidebar} />;
      default:
        return <DashboardAPI toggleSidebar={toggleSidebar} onNavigate={handleNavigate} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-dark-bg font-sans text-gray-900 dark:text-dark-text">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        activeView={activeView}
        onNavigate={handleNavigate}
        onNotificationIr={handleNotificationIr}
        onOpenSettings={() => {}}
      />
      {isSidebarOpen && (
        <div 
          onClick={toggleSidebar} 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}
      <main className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-dark-bg relative min-w-0 flex flex-col">
        {/* Botão Hambúrguer para Mobile - aparece apenas quando sidebar está fechada em mobile */}
        {!isSidebarOpen && <MobileMenuButton onClick={toggleSidebar} isOpen={isSidebarOpen} />}
        <MainContentErrorBoundary>
          <Suspense fallback={
            <div className="flex flex-1 items-center justify-center min-h-[50vh] bg-gray-50 dark:bg-dark-bg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-dark-text-secondary">Carregando...</p>
              </div>
            </div>
          }>
          {(() => {
            const activeEl = renderActiveView();
            try {
              // Pass prop to child so pages can suppress their own full-screen spinner
              return React.isValidElement(activeEl)
                ? React.cloneElement(activeEl as React.ReactElement, { suppressSuspenseSpinner: true })
                : activeEl;
            } catch {
              return activeEl;
            }
          })()}
          </Suspense>
        </MainContentErrorBoundary>
      </main>
      {/* SettingsModal DESCONTINUADO - Substituído por página Configuracoes.tsx */}
      {/* <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      /> */}
    </div>
  );
};

// Componente wrapper para páginas standalone com Sidebar (navegação SPA, sem refresh)
const StandalonePageWrapper: React.FC<{ children: React.ReactNode; activeView?: string }> = ({ children, activeView = 'Compras' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigate = (view: string) => {
    const routeMap: Record<string, string> = {
      'Dashboard': '/',
      'Orçamentos': '/',
      'Catálogo': '/',
      'Movimentações': '/',
      'Logs': '/',
      'Compras': '/compras',
      'Materiais': '/',
      'Estoque': '/',
      'Fornecedores': '/',
      'Clientes': '/',
      'Tarefas Internas': '/',
      'Ordem De Serviços': '/',
      'Execução Obra': '/',
      'Tarefas da Obra': '/',
      'Ferramentas': '/',
      'Financeiro': '/',
      'Vendas': '/',
      'Emissão NF-e': '/',
      'Serviços': '/',
      'Configurações': '/',
      'Gestão empresarial': '/'
    };

    const route = routeMap[view] || '/';
    navigate(route);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-dark-bg font-sans text-gray-900 dark:text-dark-text">
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
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-dark-bg relative min-w-0">
        {/* Botão Hambúrguer para Mobile - aparece apenas quando sidebar está fechada em mobile */}
        {!isSidebarOpen && <MobileMenuButton onClick={toggleSidebar} isOpen={isSidebarOpen} />}
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-dark-bg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-dark-text-secondary">Carregando...</p>
              </div>
            </div>
          }
        >
          {(() => {
            const child = children as React.ReactElement;
            return React.isValidElement(child) ? React.cloneElement(child, { toggleSidebar, suppressSuspenseSpinner: true }) : child;
          })()}
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
                path="/documentacao-sistema"
                element={
                  <ProtectedRoute>
                    <StandalonePageWrapper activeView="Documentação API">
                      <DocumentacaoSistemaPage />
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
