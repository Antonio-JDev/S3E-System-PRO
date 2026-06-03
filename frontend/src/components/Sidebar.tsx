import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { navLinks, S3ELogoIcon } from '../constants';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { hasPermission } from '../utils/permissions';
import { getUploadUrl } from '../config/api';
import { queryClient } from '../lib/queryClient';
import { dashboardService } from '../services/dashboardService';
import { orcamentosService } from '../services/orcamentosService';
import { vendasService } from '../services/vendasService';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from './ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';
import { Bell, Settings, LogOut, ChevronsUpDown, Sun, Moon } from 'lucide-react';
import { ThemeContext } from '../contexts/ThemeContext';
import { NotificationBell } from './NotificationBell';
import { APP_SIDEBAR_TAGLINE, DEFAULT_SIDEBAR_APP_NAME } from '../config/branding';
import { useWhatsappUnreadStore } from '../stores/whatsappUnreadStore';

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
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Cog6ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ArrowRightOnRectangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const NavSection: React.FC<{
  title: string;
  links: Array<{ name: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; devOnly?: boolean }>;
  activeView: string;
  onNavigate: (view: string) => void;
  onPrefetch: (view: string) => void;
  collapsed: boolean;
  isDevSection?: boolean;
}> = ({ title, links, activeView, onNavigate, onPrefetch, collapsed, isDevSection }) => {
  if (links.length === 0) return null;
  const totalUnread = useWhatsappUnreadStore((s) => s.totalUnread);
  return (
    <SidebarGroup className={cn(collapsed ? 'px-1.5' : 'px-3', 'py-2')}>
      {!collapsed && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {links.map((link) => {
          const isDevPage = link.name === 'Logs';
          const isWhatsappChat = link.name === 'Chat WhatsApp';
          const isActive = activeView === link.name;
          const activeClass =
            isDevPage && isActive
              ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700'
              : isActive
                ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700'
                : '';
          return (
            <SidebarMenuItem key={link.name}>
              <SidebarMenuButton
                isActive={!!activeClass}
                onClick={() => onNavigate(link.name)}
                onMouseEnter={() => onPrefetch(link.name)}
                title={collapsed ? link.name : undefined}
                className={cn(activeClass, isActive && '[&_svg]:text-current')}
              >
                <span className="relative inline-flex">
                  <link.icon className="h-5 w-5 shrink-0" />
                  {isWhatsappChat && totalUnread > 0 && (
                    <span
                      className={cn(
                        'absolute -right-2 -top-2 min-w-[18px] h-[18px] px-1',
                        'rounded-full bg-red-600 text-white text-[11px] font-bold',
                        'flex items-center justify-center leading-none',
                        collapsed ? 'translate-x-0' : ''
                      )}
                      aria-label={`Mensagens não lidas: ${totalUnread}`}
                    >
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <span className="flex items-center gap-2 truncate">
                    {link.name}
                    {isDevPage && <span className="rounded bg-red-600/80 px-1.5 py-0.5 text-[10px] font-bold">DEV</span>}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
  onNotificationIr?: (n: import('../services/notificationsService').Notificacao) => void;
  onOpenSettings: () => void;
}

const SidebarInner: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, activeView, onNavigate, onNotificationIr }) => {
  const { user, logout } = useContext(AuthContext)!;
  const themeContext = useContext(ThemeContext);
  const { collapsed, setCollapsed } = useSidebar();
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyDisplayName, setCompanyDisplayName] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_APP_NAME;
    return localStorage.getItem('companyDisplayName') || DEFAULT_SIDEBAR_APP_NAME;
  });

  const prefetchModuleMap: Record<string, () => Promise<unknown>> = {
    Dashboard: () => import('../components/DashboardModerno'),
    'Orçamentos': () => import('../components/Orcamentos'),
    Financeiro: () => import('../components/Financeiro'),
    Vendas: () => import('../components/Vendas'),
    Clientes: () => import('../components/ClientesModerno'),
    'Chat WhatsApp': () => import('../pages/WhatsAppChatPage'),
    'Contatos S3E': () => import('../pages/ContatosS3ePage'),
  };

  const handlePrefetch = useCallback((viewName: string) => {
    const importFn = prefetchModuleMap[viewName];
    if (importFn) importFn();
    if (viewName === 'Dashboard') {
      queryClient.prefetchQuery({ queryKey: ['dashboard', 'completo'], queryFn: async () => (await dashboardService.getDashboardCompleto()).data });
    }
    if (viewName === 'Orçamentos') {
      queryClient.prefetchQuery({ queryKey: ['orcamentos', 'lista'], queryFn: async () => (await orcamentosService.listar()).data });
    }
    if (viewName === 'Financeiro') {
      queryClient.prefetchQuery({ queryKey: ['financeiro', 'dashboard-vendas'], queryFn: async () => (await vendasService.getDashboard()).data });
    }
  }, []);

  const filteredNavLinks = useMemo(() => {
    const userRole = user?.role?.toLowerCase();
    return navLinks.filter((link) => {
      if (userRole === 'desenvolvedor') return true;
      if (link.devOnly && userRole !== 'desenvolvedor') return false; // Logs: apenas desenvolvedor
      if (link.requiredPermission) {
        if (userRole === 'admin' || userRole === 'administrador' || user?.isAdmin === true) return true; // Admin/isAdmin: todos exceto Logs
        return hasPermission(user, link.requiredPermission);
      }
      return true;
    });
  }, [user]);

  useEffect(() => {
    const applyBrandingFromConfig = (data: { logoUrl?: string | null; nomeEmpresa?: string | null }) => {
      const name = data.nomeEmpresa?.trim() || DEFAULT_SIDEBAR_APP_NAME;
      setCompanyDisplayName(name);
      localStorage.setItem('companyDisplayName', name);
      if (data.logoUrl) {
        const url = getUploadUrl(data.logoUrl);
        setCompanyLogo(url);
        localStorage.setItem('companyLogo', url);
      }
    };

    const loadBranding = async () => {
      try {
        const { configuracoesService } = await import('../services/configuracoesService');
        const response = await configuracoesService.getConfiguracoes();
        if (response.success && response.data) {
          applyBrandingFromConfig(response.data);
        }
      } catch {
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) setCompanyLogo(savedLogo);
        const savedName = localStorage.getItem('companyDisplayName');
        if (savedName) setCompanyDisplayName(savedName);
      }
    };
    loadBranding();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'companyLogo' && ev.newValue) setCompanyLogo(ev.newValue);
      if (ev.key === 'companyDisplayName' && ev.newValue) setCompanyDisplayName(ev.newValue);
    };
    const onLogoUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.logoUrl) setCompanyLogo(detail.logoUrl);
    };
    const onCompanyNameUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nomeEmpresa != null && String(detail.nomeEmpresa).trim() !== '') {
        const name = String(detail.nomeEmpresa).trim();
        setCompanyDisplayName(name);
        localStorage.setItem('companyDisplayName', name);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('logoUpdated', onLogoUpdated as EventListener);
    window.addEventListener('companyNameUpdated', onCompanyNameUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('logoUpdated', onLogoUpdated as EventListener);
      window.removeEventListener('companyNameUpdated', onCompanyNameUpdated as EventListener);
    };
  }, []);

  const geral = useMemo(() => filteredNavLinks.filter((l) => l.name === 'Dashboard'), [filteredNavLinks]);
  const comercial = useMemo(() => filteredNavLinks.filter((l) => ['Funil de Atendimento', 'Chat WhatsApp', 'Contatos S3E', 'Clientes', 'Orçamentos', 'Vendas', 'Cotações', 'Serviços'].includes(l.name)), [filteredNavLinks]);
  const suprimentos = useMemo(() => filteredNavLinks.filter((l) => ['Fornecedores', 'Estoque', 'Movimentações', 'Catálogo'].includes(l.name)), [filteredNavLinks]);
  const operacional = useMemo(() => filteredNavLinks.filter((l) => ['Tarefas Internas', 'Ordem De Serviços', 'Execução Obra', 'Tarefas da Obra', 'Ferramentas'].includes(l.name)), [filteredNavLinks]);
  const financeiro = useMemo(() => filteredNavLinks.filter((l) => ['Financeiro', 'Compras', 'Emissão NF-e', 'Logs'].includes(l.name)), [filteredNavLinks]);
  const gestaoEmpresarial = useMemo(
    () => filteredNavLinks.filter((l) => ['Gestão empresarial', 'Documentação API'].includes(l.name)),
    [filteredNavLinks]
  );

  return (
    <Sidebar open={isOpen} collapsible="icon">
      <SidebarHeader className={cn(collapsed && 'px-2 py-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          {companyLogo ? (
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
              <img src={companyLogo} alt="Logo" className="h-full w-full object-contain" onError={() => setCompanyLogo(null)} />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <S3ELogoIcon className="h-5 w-5" />
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900 dark:text-white">{companyDisplayName}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400 leading-snug">{APP_SIDEBAR_TAGLINE}</p>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white transition-colors shrink-0"
              aria-label={collapsed ? 'Expandir' : 'Recolher'}
            >
              {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
            <button type="button" onClick={toggleSidebar} className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white shrink-0" aria-label="Fechar">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          <div className={cn('shrink-0', collapsed && 'flex justify-center')}>
            <NotificationBell collapsed={collapsed} onNotificationIr={onNotificationIr} />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavSection title="Geral" links={geral} activeView={activeView} onNavigate={onNavigate} onPrefetch={handlePrefetch} collapsed={collapsed} />
        <NavSection title="Comercial" links={comercial} activeView={activeView} onNavigate={onNavigate} onPrefetch={handlePrefetch} collapsed={collapsed} />
        <NavSection title="Suprimentos" links={suprimentos} activeView={activeView} onNavigate={onNavigate} onPrefetch={handlePrefetch} collapsed={collapsed} />
        <NavSection title="Operacional" links={operacional} activeView={activeView} onNavigate={onNavigate} onPrefetch={handlePrefetch} collapsed={collapsed} />
        <NavSection title="Financeiro" links={financeiro} activeView={activeView} onNavigate={onNavigate} onPrefetch={handlePrefetch} collapsed={collapsed} isDevSection />
        <NavSection title="Gestão empresarial" links={gestaoEmpresarial} activeView={activeView} onNavigate={onNavigate} onPrefetch={handlePrefetch} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className={cn(collapsed && 'px-2 py-2')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                collapsed && 'justify-center px-2'
              )}
              aria-label="Menu do usuário"
            >
                <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Usuário'}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email || user?.role || '—'}</p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={8}
            className="min-w-[220px] bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-900 dark:text-dark-text shadow-lg rounded-lg"
          >
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-dark-text">{user?.name || 'Usuário'}</p>
                <p className="truncate text-xs text-gray-500 dark:text-dark-text-secondary">{user?.email || user?.role || '—'}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { onNavigate('Configurações'); if (window.innerWidth < 1024) toggleSidebar(); }}
              className="cursor-pointer flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            {themeContext && (
              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2"
                onClick={() => themeContext.setTheme(themeContext.effectiveTheme === 'dark' ? 'light' : 'dark')}
              >
                {themeContext.effectiveTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Alternar tema
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer flex items-center gap-2 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const SidebarWithProvider: React.FC<SidebarProps> = (props) => {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }, [collapsed]);
  return (
    <SidebarProvider collapsed={collapsed} onCollapsedChange={setCollapsed}>
      <SidebarInner {...props} />
    </SidebarProvider>
  );
};

export default SidebarWithProvider;
