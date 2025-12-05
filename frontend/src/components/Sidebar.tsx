
import React, { useState, useEffect, useMemo } from 'react';
import { navLinks, S3ELogoIcon } from '../constants';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeToggle } from './theme-toggle';
import { hasPermission } from '../utils/permissions';
import { getUploadUrl } from '../config/api';
import { queryClient } from '../lib/queryClient';
import { dashboardService } from '../services/dashboardService';
import { orcamentosService } from '../services/orcamentosService';
import { vendasService } from '../services/vendasService';

interface SidebarProps {
    isOpen: boolean;
    toggleSidebar: () => void;
    activeView: string;
    onNavigate: (view: string) => void;
    onOpenSettings: () => void;
}

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const ArrowRightOnRectangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, activeView, onNavigate, onOpenSettings }) => {
    const { user, logout } = useContext(AuthContext)!;
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    // ===== Prefetch de módulos (code splitting) e dados (React Query) =====
    const prefetchModuleMap: Record<string, () => Promise<unknown>> = {
        Dashboard: () => import('../components/DashboardModerno'),
        'Orçamentos': () => import('../components/Orcamentos'),
        Financeiro: () => import('../components/Financeiro'),
        Vendas: () => import('../components/Vendas'),
        Clientes: () => import('../components/ClientesModerno'),
    };

    const handlePrefetch = (viewName: string) => {
        // Prefetch do módulo (chunk JS)
        const importFn = prefetchModuleMap[viewName];
        if (importFn) {
            importFn();
        }

        // Prefetch de dados via React Query (quando fizer sentido)
        if (viewName === 'Dashboard') {
            queryClient.prefetchQuery({
                queryKey: ['dashboard', 'completo'],
                queryFn: async () => {
                    const result = await dashboardService.getDashboardCompleto();
                    return result.data;
                },
            });
        }

        if (viewName === 'Orçamentos') {
            queryClient.prefetchQuery({
                queryKey: ['orcamentos', 'lista'],
                queryFn: async () => {
                    const result = await orcamentosService.listar();
                    return result.data;
                },
            });
        }

        if (viewName === 'Financeiro') {
            queryClient.prefetchQuery({
                queryKey: ['financeiro', 'dashboard-vendas'],
                queryFn: async () => {
                    const result = await vendasService.getDashboard();
                    return result.data;
                },
            });
        }
    };

    // Filtrar links baseado nas permissões do usuário
    const filteredNavLinks = useMemo(() => {
        const userRole = user?.role?.toLowerCase();
        
        return navLinks.filter(link => {
            // Desenvolvedor tem acesso a tudo
            if (userRole === 'desenvolvedor') {
                return true;
            }
            
            // Se o link tem devOnly=true, só mostra para desenvolvedor (legado)
            if (link.devOnly && userRole !== 'desenvolvedor') {
                return false;
            }
            
            // Se o link tem uma permissão específica, verifica se o usuário tem
            if (link.requiredPermission) {
                // Por enquanto, se não for desenvolvedor, verifica a permissão
                // TODO: Implementar sistema de permissões granular no futuro
                // Por enquanto, admin e desenvolvedor têm acesso a tudo
                if (userRole === 'admin' || userRole === 'administrador') {
                    return true;
                }
                // Para outros roles, pode implementar verificação específica aqui
                return hasPermission(user, link.requiredPermission);
            }
            
            // Links sem permissão específica são mostrados para todos
            return true;
        });
    }, [user]);

    useEffect(() => {
        // Carregar logo do backend
        const loadLogoFromBackend = async () => {
            try {
                const { configuracoesService } = await import('../services/configuracoesService');
                const response = await configuracoesService.getConfiguracoes();
                if (response.success && response.data?.logoUrl) {
                    const logoUrl = response.data.logoUrl;
                    const fullLogoUrl = getUploadUrl(logoUrl);
                    setCompanyLogo(fullLogoUrl);
                    localStorage.setItem('companyLogo', fullLogoUrl);
                }
            } catch (error) {
                console.error('Erro ao carregar logo do backend:', error);
                // Fallback: carregar do localStorage
                const savedLogo = localStorage.getItem('companyLogo');
                if (savedLogo) {
                    setCompanyLogo(savedLogo);
                }
            }
        };

        loadLogoFromBackend();

        // Ouvir mudanças na logo via localStorage
        const handleStorageChange = () => {
            const updatedLogo = localStorage.getItem('companyLogo');
            if (updatedLogo) {
                setCompanyLogo(updatedLogo);
            }
        };

        // Ouvir evento customizado de atualização de logo
        const handleLogoUpdated = (event: CustomEvent) => {
            if (event.detail?.logoUrl) {
                setCompanyLogo(event.detail.logoUrl);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('logoUpdated', handleLogoUpdated as EventListener);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('logoUpdated', handleLogoUpdated as EventListener);
        };
    }, []);

    const handleLogout = () => {
        logout();
    };

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', newState.toString());
    };

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} flex flex-col bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border-r border-gray-200 dark:border-dark-border fixed inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className={`p-5 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gradient-to-r from-white to-gray-50 dark:from-dark-card dark:to-dark-bg ${isCollapsed ? 'flex-col gap-3' : ''}`}>
                <div className={`flex items-center ${isCollapsed ? 'flex-col' : 'space-x-3'}`}>
                    {companyLogo ? (
                        <div className="w-11 h-11 rounded-xl shadow-medium overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                            <img 
                                src={companyLogo} 
                                alt="Logo da Empresa" 
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const originalSrc = target.src;
                                    console.error('❌ Erro ao carregar logo na sidebar:', originalSrc);
                                    
                                    // Extrair filename da URL
                                    const urlParts = originalSrc.split('/');
                                    const filename = urlParts[urlParts.length - 1];
                                    
                                    // Tentar endpoint específico
                                    const alternativeUrl = import.meta.env.VITE_API_URL 
                                        ? `${import.meta.env.VITE_API_URL}/api/configuracoes/logo/${filename}`
                                        : `/api/configuracoes/logo/${filename}`;
                                    
                                    if (!target.src.includes('/api/configuracoes/logo/')) {
                                        console.log('🔄 Tentando URL alternativa na sidebar:', alternativeUrl);
                                        target.src = alternativeUrl;
                                    } else {
                                        // Se ainda falhar, usar fallback
                                        console.error('❌ Falha ao carregar logo na sidebar, usando fallback');
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                            parent.innerHTML = '<div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-2.5 shadow-medium ring-2 ring-blue-100"><svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>';
                                        }
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-2.5 shadow-medium ring-2 ring-blue-100">
                            <S3ELogoIcon className="w-6 h-6 text-white" />
                        </div>
                    )}
                    {!isCollapsed && (
                        <div>
                            <h1 className="font-bold text-base text-gray-900 dark:text-dark-text">S3E Engenharia</h1>
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary font-medium">Gestão de Estoque & Vendas</p>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Botão de recolher/expandir (desktop) */}
                    <button 
                        onClick={toggleCollapse} 
                        className="hidden lg:flex p-2 text-gray-500 dark:text-dark-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                        aria-label={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                        title={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                    >
                        {isCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
                    </button>
                    {/* Botão de fechar (mobile) */}
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-500 dark:text-dark-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" aria-label="Close sidebar">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <nav className="flex-1 px-3 py-5 overflow-y-auto">
                {/* GERAL */}
                {filteredNavLinks.filter(link => link.name === 'Dashboard').length > 0 && (
                    <div className="mb-6">
                        {!isCollapsed && (
                            <>
                                <span className="block px-2 mb-3 text-[10px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">Módulos Principais</span>
                                <span className="block px-3 py-1.5 mb-2 text-xs font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider bg-gray-50 dark:bg-dark-bg rounded-lg">Geral</span>
                            </>
                        )}
                        <ul className="space-y-1">
                            {filteredNavLinks.filter(link => link.name === 'Dashboard').map((link) => (
                            <li key={link.name}>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onNavigate(link.name);
                                    }}
                                    onMouseEnter={() => handlePrefetch(link.name)}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative
                                        ${activeView === link.name
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                                            : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text'
                                        }`}
                                    title={isCollapsed ? link.name : ''}
                                >
                                    <link.icon className={`w-5 h-5 ${!isCollapsed && 'mr-3'}`} />
                                    {!isCollapsed && link.name}
                                </a>
                            </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* COMERCIAL / VENDAS */}
                {filteredNavLinks.filter(link => ['Clientes', 'Orçamentos', 'Vendas', 'Cotações', 'Serviços'].includes(link.name)).length > 0 && (
                    <div className="mb-6">
                        {!isCollapsed && (
                            <span className="block px-3 py-1.5 mb-2 text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider bg-green-50 dark:bg-green-900/20 rounded-lg">Comercial</span>
                        )}
                        <ul className="space-y-1">
                            {filteredNavLinks.filter(link => ['Clientes', 'Orçamentos', 'Vendas', 'Cotações', 'Serviços'].includes(link.name)).map((link) => (
                            <li key={link.name}>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onNavigate(link.name);
                                    }}
                                    onMouseEnter={() => handlePrefetch(link.name)}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative
                                        ${activeView === link.name
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                                            : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text'
                                        }`}
                                    title={isCollapsed ? link.name : ''}
                                >
                                    <link.icon className={`w-5 h-5 ${!isCollapsed && 'mr-3'}`} />
                                    {!isCollapsed && link.name}
                                </a>
                            </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* SUPRIMENTOS / ESTOQUE */}
                {filteredNavLinks.filter(link => ['Fornecedores', 'Compras', 'Estoque', 'Movimentações', 'Catálogo', 'Atualização de Preços'].includes(link.name)).length > 0 && (
                    <div className="mb-6">
                        {!isCollapsed && (
                            <span className="block px-3 py-1.5 mb-2 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider bg-orange-50 dark:bg-orange-900/20 rounded-lg">Suprimentos</span>
                        )}
                        <ul className="space-y-1">
                            {filteredNavLinks.filter(link => ['Fornecedores', 'Compras', 'Estoque', 'Movimentações', 'Catálogo', 'Atualização de Preços'].includes(link.name)).map((link) => (
                            <li key={link.name}>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onNavigate(link.name);
                                    }}
                                    onMouseEnter={() => handlePrefetch(link.name)}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative
                                        ${activeView === link.name
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                                            : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text'
                                        }`}
                                    title={isCollapsed ? link.name : ''}
                                >
                                    <link.icon className={`w-5 h-5 ${!isCollapsed && 'mr-3'}`} />
                                    {!isCollapsed && link.name}
                                </a>
                            </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* OPERACIONAL / PROJETOS */}
                {filteredNavLinks.filter(link => ['Projetos', 'Obras', 'Tarefas da Obra', 'Ferramentas', 'Métricas de Equipe'].includes(link.name)).length > 0 && (
                    <div className="mb-6">
                        {!isCollapsed && (
                            <span className="block px-3 py-1.5 mb-2 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-50 dark:bg-purple-900/20 rounded-lg">Operacional</span>
                        )}
                        <ul className="space-y-1">
                            {filteredNavLinks.filter(link => ['Projetos', 'Obras', 'Tarefas da Obra', 'Ferramentas', 'Métricas de Equipe'].includes(link.name)).map((link) => (
                            <li key={link.name}>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onNavigate(link.name);
                                    }}
                                    onMouseEnter={() => handlePrefetch(link.name)}
                                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative
                                        ${activeView === link.name
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                                            : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text'
                                        }`}
                                    title={isCollapsed ? link.name : ''}
                                >
                                    <link.icon className={`w-5 h-5 ${!isCollapsed && 'mr-3'}`} />
                                    {!isCollapsed && link.name}
                                </a>
                            </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* FINANCEIRO / CONTÁBIL */}
                {filteredNavLinks.filter(link => ['Financeiro', 'Emissão NF-e', 'Logs'].includes(link.name)).length > 0 && (
                    <div className="mb-6">
                        {!isCollapsed && (
                            <span className="block px-3 py-1.5 mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 rounded-lg">Financeiro</span>
                        )}
                        <ul className="space-y-1">
                            {filteredNavLinks.filter(link => ['Financeiro', 'Emissão NF-e', 'Logs'].includes(link.name)).map((link) => {
                            // Usar tema vermelho para Logs (desenvolvedor)
                            const isDevPage = link.name === 'Logs';
                            const activeClass = isDevPage && activeView === link.name
                                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-medium ring-2 ring-red-300 dark:ring-red-800'
                                : activeView === link.name
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text';
                            
                            return (
                                <li key={link.name}>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onNavigate(link.name);
                                        }}
                                        onMouseEnter={() => handlePrefetch(link.name)}
                                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative ${activeClass}`}
                                        title={isCollapsed ? link.name : ''}
                                    >
                                        <link.icon className={`w-5 h-5 ${!isCollapsed && 'mr-3'}`} />
                                        {!isCollapsed && (
                                            <span className="flex items-center gap-2">
                                                {link.name}
                                                {isDevPage && (
                                                    <span className="px-1.5 py-0.5 bg-white/20 text-[9px] font-bold rounded">DEV</span>
                                                )}
                                            </span>
                                        )}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                )}

                {/* GERENCIAMENTO / ADMINISTRATIVO */}
                {filteredNavLinks.filter(link => link.name === 'Gerenciamento Empresarial').length > 0 && (
                    <div className="mb-6">
                        {!isCollapsed && (
                            <span className="block px-3 py-1.5 mb-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">Gerenciamento</span>
                        )}
                        <ul className="space-y-1">
                            {filteredNavLinks.filter(link => link.name === 'Gerenciamento Empresarial').map((link) => (
                                <li key={link.name}>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onNavigate(link.name);
                                        }}
                                        onMouseEnter={() => handlePrefetch(link.name)}
                                        className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative
                                            ${activeView === link.name
                                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                                                : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg hover:text-gray-900 dark:hover:text-dark-text'
                                            }`}
                                        title={isCollapsed ? link.name : ''}
                                    >
                                        <link.icon className={`w-5 h-5 ${!isCollapsed && 'mr-3'}`} />
                                        {!isCollapsed && link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>

            <div className={`p-4 border-t border-gray-100 dark:border-dark-border bg-gradient-to-r from-gray-50 to-white dark:from-dark-card dark:to-dark-bg ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                 <div className={`flex ${isCollapsed ? 'flex-col items-center gap-3' : 'items-center justify-between'} mb-3`}>
                    <div className={`flex items-center ${isCollapsed ? 'flex-col' : 'gap-3'}`}>
                        {!isCollapsed && (
                            <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-dark-text">{user?.name || 'Usuário'}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary font-medium">{user?.role || 'Admin'}</p>
                                    {user?.role?.toLowerCase() === 'desenvolvedor' && (
                                        <span className="px-2 py-0.5 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                                            DEV
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            {/* Botão de alternar tema */}
                            <div className="scale-90">
                                <ThemeToggle />
                            </div>
                            {/* Botão de configurações */}
                            <button 
                                onClick={() => {
                                    onNavigate('Configurações');
                                    if (window.innerWidth < 1024) toggleSidebar();
                                }} 
                                className="p-2 rounded-xl text-gray-400 dark:text-dark-text-secondary hover:bg-white dark:hover:bg-dark-bg hover:text-gray-600 dark:hover:text-dark-text hover:shadow-soft transition-all duration-200" 
                                title="Configurações do Sistema"
                            >
                                <Cog6ToothIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
                {isCollapsed && (
                    <div className="flex flex-col gap-2 mb-3">
                        <div className="scale-90">
                            <ThemeToggle />
                        </div>
                        <button 
                            onClick={() => {
                                onNavigate('Configurações');
                                if (window.innerWidth < 1024) toggleSidebar();
                            }} 
                            className="p-2 rounded-xl text-gray-400 dark:text-dark-text-secondary hover:bg-white dark:hover:bg-dark-bg hover:text-gray-600 dark:hover:text-dark-text hover:shadow-soft transition-all duration-200" 
                            title="Configurações do Sistema"
                        >
                            <Cog6ToothIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                <button 
                    onClick={handleLogout}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-center px-4'} py-2.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 border border-red-100 dark:border-red-800 hover:border-red-200 dark:hover:border-red-700 shadow-soft hover:shadow-medium`}
                    title={isCollapsed ? 'Sair' : ''}
                >
                    <ArrowRightOnRectangleIcon className={`w-4 h-4 ${!isCollapsed && 'mr-2'}`} />
                    {!isCollapsed && 'Sair'}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
