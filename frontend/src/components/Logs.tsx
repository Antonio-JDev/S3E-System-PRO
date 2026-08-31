import React, { useState, useEffect, useContext, useCallback } from 'react';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/AuthContext';
import { axiosApiService } from '../services/axiosApi';
import { configuracoesService } from '../services/configuracoesService';
import { useWhatsAppRealtimeStatus, useWhatsAppSocket } from '../hooks/useWhatsAppSocket';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';

// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const TerminalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
);

const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WrenchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L18.18 21.93M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.5 9.5l2.5 2.5 4-4" />
    </svg>
);

interface AuditLog {
    id: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    entity?: string;
    entityId?: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
    createdAt: string;
}

interface SystemStats {
    totalUsers: number;
    activeUsers: number;
    totalActions: number;
    errorRate: number;
}

interface LogsProps {
    toggleSidebar: () => void;
}

function resolveLogIp(log: AuditLog): string | undefined {
    const net = log.metadata?.network;
    return (
        log.ipAddress ||
        (typeof net?.clientIp === 'string' ? net.clientIp : undefined) ||
        (typeof log.metadata?.ipAddress === 'string' ? log.metadata.ipAddress : undefined)
    );
}

function resolveLogPath(log: AuditLog): string | undefined {
    const p = log.metadata?.path;
    return typeof p === 'string' ? p : undefined;
}

const Logs: React.FC<LogsProps> = ({ toggleSidebar }) => {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    
    // Ambiente: localhost = Test-Dev, qualquer outra URL = Produção
    const isProducao = typeof window !== 'undefined' && window.location?.hostname?.toLowerCase() !== 'localhost';
    const ambienteLabel = isProducao ? 'Produção' : 'Test-Dev';
    
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<SystemStats>({ totalUsers: 0, activeUsers: 0, totalActions: 0, errorRate: 0 });
    const [auditUnavailable, setAuditUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('Todos');
    const [entityFilter, setEntityFilter] = useState<string>('Todos');
    const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'health' | 'manutencao'>('logs');
    const [backfillLoading, setBackfillLoading] = useState(false);
    const [portfolioUrl, setPortfolioUrl] = useState('https://antonio-jdev.github.io/portfolio-01/');
    const [portfolioSaving, setPortfolioSaving] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Probe Socket.io somente na aba Health (DEV)
    useWhatsAppSocket(
        () => {},
        undefined,
        { enabled: user?.role?.toLowerCase() === 'desenvolvedor' && activeTab === 'health' }
    );
    const realtime = useWhatsAppRealtimeStatus();

    // Verificar acesso (apenas desenvolvedor)
    useEffect(() => {
        if (user?.role?.toLowerCase() !== 'desenvolvedor') {
            toast.error('🚫 Acesso negado', {
                description: 'Esta página é restrita a desenvolvedores.'
            });
        }
    }, [user]);

    const loadData = useCallback(async (opts?: { silent?: boolean }) => {
        try {
            if (!opts?.silent) {
                setLoading(true);
            }
            const response = await axiosApiService.get<{
                logs?: AuditLog[];
                stats?: SystemStats;
                auditAvailable?: boolean;
            }>('/api/logs/audit', { limit: 500, offset: 0 });
            if (response.success && response.data) {
                const raw = response.data as Record<string, unknown>;
                const payload = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as {
                    logs?: AuditLog[];
                    stats?: SystemStats;
                    auditAvailable?: boolean;
                };
                setLogs(Array.isArray(payload.logs) ? payload.logs : []);
                if (payload.stats) setStats(payload.stats);
                setAuditUnavailable(payload.auditAvailable === false);
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            if (!opts?.silent) {
                setLogs([]);
                setStats({ totalUsers: 0, activeUsers: 0, totalActions: 0, errorRate: 0 });
            }
        } finally {
            if (!opts?.silent) {
                setLoading(false);
            }
        }
    }, []);

    const checkBackendHealth = async () => {
        try {
            const response = await axiosApiService.get('/api/health');
            if (response.success) {
                setBackendStatus('online');
            } else {
                setBackendStatus('offline');
            }
        } catch (error) {
            setBackendStatus('offline');
        }
    };

    const runBackfillOrcamentista = async () => {
        if (backfillLoading) return;
        setBackfillLoading(true);
        try {
            const response = await axiosApiService.post<{
                orcamentosPreenchidos: number;
                preenchidosPorAudit: number;
                preenchidosPorUser: number;
                preenchidosFallback: number;
                vendasAtualizadas: number;
            }>('/api/orcamentos/backfill-orcamentista', {});
            if (response.success && response.data) {
                const d = (response.data as any)?.data ?? response.data;
                const total = d?.orcamentosPreenchidos ?? 0;
                const vendas = d?.vendasAtualizadas ?? 0;
                toast.success('Backfill concluído', {
                    description: total > 0
                        ? `${total} orçamento(s) com nome de orçamentista preenchido. ${vendas} venda(s) atualizada(s) com vendedor.`
                        : 'Nenhum orçamento precisava de preenchimento.',
                    duration: 6000
                });
            } else {
                toast.error('Erro no backfill', { description: (response as any).error || 'Resposta inválida.' });
            }
        } catch (error: any) {
            console.error('Erro ao executar backfill:', error);
            toast.error('Erro ao executar backfill', {
                description: error?.response?.data?.error || error?.message || 'Tente novamente.'
            });
        } finally {
            setBackfillLoading(false);
        }
    };

    const loadPortfolioUrl = useCallback(async () => {
        try {
            const response = await configuracoesService.getConfiguracoes();
            const url = (response as any)?.data?.portfolioUrl;
            if (typeof url === 'string' && url.trim()) {
                setPortfolioUrl(url.trim());
            }
        } catch (error) {
            console.error('Erro ao carregar URL do portfólio:', error);
        }
    }, []);

    // Carregar dados e atualizar em intervalo curto (auditoria em tempo quase real)
    useEffect(() => {
        if (user?.role?.toLowerCase() === 'desenvolvedor') {
            loadData();
            checkBackendHealth();
            loadPortfolioUrl();
            const interval = setInterval(() => {
                loadData({ silent: true });
                checkBackendHealth();
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [user, loadData, loadPortfolioUrl]);

    const handleAlterarPortfolioUrl = async () => {
        const normalized = portfolioUrl.trim();
        if (!normalized) {
            toast.error('Informe uma URL para salvar');
            return;
        }
        if (!/^https?:\/\//i.test(normalized)) {
            toast.error('A URL deve começar com http:// ou https://');
            return;
        }

        try {
            setPortfolioSaving(true);
            const response = await configuracoesService.atualizarPortfolioUrl(normalized);
            if (response.success) {
                toast.success('URL do portfólio atualizada com sucesso');
                setPortfolioUrl(normalized);
                return;
            }
            toast.error((response as any).error || 'Não foi possível atualizar a URL');
        } catch (error: any) {
            console.error('Erro ao atualizar URL do portfólio:', error);
            toast.error(error?.response?.data?.message || 'Erro ao atualizar URL do portfólio');
        } finally {
            setPortfolioSaving(false);
        }
    };

    const entityOptions = Array.from(
        new Set(logs.map((l) => l.entity).filter((e): e is string => Boolean(e)))
    ).sort();

    // Filtrar logs
    const filteredLogs = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        const ip = resolveLogIp(log)?.toLowerCase() || '';
        const path = resolveLogPath(log)?.toLowerCase() || '';
        const matchesSearch = !term ||
            log.description.toLowerCase().includes(term) ||
            log.userName?.toLowerCase().includes(term) ||
            log.action.toLowerCase().includes(term) ||
            log.entity?.toLowerCase().includes(term) ||
            log.entityId?.toLowerCase().includes(term) ||
            ip.includes(term) ||
            path.includes(term);
        
        const matchesAction = actionFilter === 'Todos' || log.action === actionFilter;
        const matchesEntity = entityFilter === 'Todos' || log.entity === entityFilter;
        
        return matchesSearch && matchesAction && matchesEntity;
    });

    // Verificar acesso
    if (user?.role?.toLowerCase() !== 'desenvolvedor') {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="modal-content max-w-md w-full p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">🚫 Acesso Negado</h2>
                    <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                        Esta página é restrita a desenvolvedores. Você não tem permissão para acessar este recurso.
                    </p>
                    <div className="card-secondary p-4 rounded-xl mb-4">
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                            Sua role atual:
                        </p>
                        <p className="font-bold text-red-600 dark:text-red-400">
                            {user?.role || 'Não definida'}
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                        Apenas usuários com role <strong className="text-red-600 dark:text-red-400">"desenvolvedor"</strong> podem acessar os logs do sistema.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Banner de Alerta - Área de Desenvolvedor */}
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 dark:from-red-700 dark:via-red-600 dark:to-red-700 rounded-2xl p-4 mb-6 shadow-strong border-2 border-red-400 dark:border-red-900 animate-fade-in">
                <div className="flex items-center justify-center gap-3 text-white">
                    <TerminalIcon className="w-6 h-6" />
                    <p className="font-bold text-sm sm:text-base">
                        🔓 ÁREA DE DESENVOLVEDOR • ACESSO TOTAL AO SISTEMA
                    </p>
                    <TerminalIcon className="w-6 h-6" />
                </div>
            </div>

            {/* Header com Indicador de Desenvolvedor */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
                                🔧 Sistema de Logs
                            </h1>
                            {/* Badge de Acesso Desenvolvedor */}
                            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 text-white shadow-medium ring-2 ring-red-300 dark:ring-red-800">
                                🔓 DESENVOLVEDOR
                            </span>
                            {/* Badge de Ambiente: Produção ou Test-Dev conforme URL (localhost = Test-Dev) */}
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-medium ring-2 ${
                                isProducao 
                                    ? 'bg-emerald-600 text-white ring-emerald-400 dark:ring-emerald-800' 
                                    : 'bg-amber-500 text-white ring-amber-400 dark:ring-amber-700'
                            }`}>
                                {isProducao ? '🌐 Produção' : '🧪 Test-Dev'}
                            </span>
                            {/* Status do Backend */}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                backendStatus === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                backendStatus === 'offline' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                                {backendStatus === 'online' ? '● ONLINE' : 
                                 backendStatus === 'offline' ? '● OFFLINE' : '⋯ VERIFICANDO'}
                            </span>
                        </div>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary">
                            Auditoria, monitoramento e análise completa do sistema
                        </p>
                    </div>
                </div>
            </header>

            {auditUnavailable && (
                <div className="mb-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-900 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-100">
                    <p className="font-semibold">Auditoria indisponível no banco</p>
                    <p className="mt-1 text-sm">
                        A tabela <code className="rounded bg-amber-100 px-1 dark:bg-amber-950">audit_logs</code> está ausente,
                        incompleta ou com schema incompatível. Rode as migrations pendentes no backend e confira se{' '}
                        <code className="rounded bg-amber-100 px-1 dark:bg-amber-950">DISABLE_AUDIT_LOGS</code> não está
                        como <strong>true</strong> no servidor.
                    </p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card-primary shadow-soft border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Total de Usuários</p>
                        <ChartBarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalUsers}</p>
                </div>

                <div className="card-primary shadow-soft border-2 border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Usuários Ativos</p>
                        <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.activeUsers}</p>
                </div>

                <div className="card-primary shadow-soft border-2 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Total de Ações</p>
                        <TerminalIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalActions}</p>
                </div>

                <div className="card-primary shadow-soft border-2 border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Taxa de Erro</p>
                        <XCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.errorRate.toFixed(2)}%</p>
                </div>
            </div>

            {/* Tabs Container com Border Vermelha (Desenvolvedor) */}
            <div className="card-primary shadow-soft border-2 border-red-200 dark:border-red-800 mb-6">
                <div className="border-b border-gray-200 dark:border-dark-border">
                    <ScrollableRow as="nav" ariaLabel="Abas de logs" className="gap-4 px-6">
                        {[
                            { id: 'logs', label: '📋 Logs de Auditoria', icon: TerminalIcon },
                            { id: 'analytics', label: '📊 Analytics', icon: ChartBarIcon },
                            { id: 'health', label: '💚 Health Check', icon: CheckCircleIcon },
                            { id: 'manutencao', label: '🔧 Manutenção', icon: WrenchIcon }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`${scrollableNavItemClasses} flex items-center gap-2 px-4 py-4 border-b-2 font-semibold transition-all ${
                                    activeTab === tab.id
                                        ? 'border-red-600 text-red-600 dark:border-red-500 dark:text-red-400'
                                        : 'border-transparent text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text'
                                }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </ScrollableRow>
                </div>

                <div className="p-6">
                    {activeTab === 'logs' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                    Atualização automática a cada 10 segundos (sem recarregar a página).
                                </p>
                                <button
                                    type="button"
                                    onClick={() => loadData()}
                                    className="btn-secondary whitespace-nowrap shrink-0"
                                >
                                    Atualizar agora
                                </button>
                            </div>
                            {/* Filtros */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input
                                    type="text"
                                    placeholder="Buscar logs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-field"
                                />
                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="select-field"
                                >
                                    <option value="Todos">Todas as Ações</option>
                                    <option value="LOGIN">Login</option>
                                    <option value="LOGIN_FAILED">Login falhou</option>
                                    <option value="LOGOUT">Logout</option>
                                    <option value="CREATE">Criação</option>
                                    <option value="UPDATE">Atualização</option>
                                    <option value="UPDATE_USER">Atualização usuário</option>
                                    <option value="UPDATE_PROFILE">Perfil</option>
                                    <option value="DELETE">Exclusão</option>
                                    <option value="VIEW">Consulta</option>
                                    <option value="ERROR">Erro HTTP / falha</option>
                                </select>
                                <select
                                    value={entityFilter}
                                    onChange={(e) => setEntityFilter(e.target.value)}
                                    className="select-field"
                                >
                                    <option value="Todos">Todas as Entidades</option>
                                    {entityOptions.map((e) => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Lista de Logs */}
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 dark:border-red-400 mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando logs...</p>
                                </div>
                            ) : filteredLogs.length === 0 ? (
                                <div className="text-center py-12 card-secondary rounded-xl">
                                    <TerminalIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-dark-text-secondary font-semibold">Nenhum log encontrado</p>
                                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-2">
                                        {logs.length === 0 ? 'O sistema ainda não registrou ações' : 'Tente ajustar os filtros'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredLogs.map((log) => {
                                        const ip = resolveLogIp(log);
                                        const path = resolveLogPath(log);
                                        const net = log.metadata?.network;
                                        const statusCode = log.metadata?.statusCode;
                                        const isError = log.action === 'ERROR' || log.action === 'LOGIN_FAILED';
                                        const isExpanded = expandedLogId === log.id;

                                        return (
                                        <div
                                            key={log.id}
                                            className={`card-secondary rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors border ${
                                                isError
                                                    ? 'border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20'
                                                    : 'border-gray-200 dark:border-dark-border'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                            log.action === 'ERROR' ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200' :
                                                            log.action === 'DELETE' || log.action === 'DELETE_PERMANENT' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                            log.action === 'CREATE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                            log.action === 'UPDATE' || log.action.startsWith('UPDATE') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                            log.action === 'LOGIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                            log.action === 'LOGIN_FAILED' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {log.action}
                                                            {statusCode != null && (
                                                                <span className="ml-1 opacity-80">({statusCode})</span>
                                                            )}
                                                        </span>
                                                        {log.entity && (
                                                            <span className="text-sm font-medium text-gray-700 dark:text-dark-text">
                                                                {log.entity}{log.entityId ? ` · ${log.entityId}` : ''}
                                                            </span>
                                                        )}
                                                        <span className="text-sm text-gray-500 dark:text-dark-text-secondary">•</span>
                                                        <span className="text-sm text-gray-600 dark:text-dark-text-secondary">{log.userName || 'Sistema'}</span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">({log.userRole || 'N/A'})</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-dark-text">{log.description}</p>
                                                    {path && (
                                                        <p className="text-xs font-mono text-gray-500 dark:text-dark-text-secondary mt-1 truncate" title={path}>
                                                            Rota: {path}
                                                        </p>
                                                    )}
                                                    <div className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1 space-y-0.5">
                                                        {ip && (
                                                            <p><span className="font-semibold">IP cliente:</span> <span className="font-mono">{ip}</span></p>
                                                        )}
                                                        {net?.ipChain?.length > 1 && (
                                                            <p><span className="font-semibold">Cadeia proxy:</span> <span className="font-mono">{net.ipChain.join(' → ')}</span></p>
                                                        )}
                                                        {(net?.origin || net?.referer || net?.host) && (
                                                            <p className="truncate">
                                                                {net.host && <span>Host: {net.host} · </span>}
                                                                {net.origin && <span>Origem: {net.origin} · </span>}
                                                                {net.referer && <span>Referer: {net.referer}</span>}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {(log.metadata?.errorMessage || log.metadata?.stack) && (
                                                        <p className="text-xs text-orange-800 dark:text-orange-300 mt-2 font-mono break-all">
                                                            {log.metadata.errorMessage}
                                                            {Array.isArray(log.metadata.stack)
                                                                ? `\n${(log.metadata.stack as string[]).join('\n')}`
                                                                : typeof log.metadata.stack === 'string'
                                                                    ? `\n${log.metadata.stack}`
                                                                    : ''}
                                                        </p>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                        className="text-xs text-red-600 dark:text-red-400 mt-2 hover:underline"
                                                    >
                                                        {isExpanded ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos (debug)'}
                                                    </button>
                                                    {isExpanded && log.metadata && (
                                                        <pre className="mt-2 p-2 text-[10px] leading-tight bg-gray-900 text-green-300 rounded-lg overflow-x-auto max-h-48">
                                                            {JSON.stringify(log.metadata, null, 2)}
                                                        </pre>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                                                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-6">📊 Analytics do Sistema</h3>
                            
                            {/* Gráfico de Ações por Tipo */}
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-dark-text mb-4">📈 Ações mais Frequentes</h4>
                                <div className="space-y-3">
                                    {['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'ERROR'].map((action, idx) => {
                                        const count = logs.filter(l => l.action === action).length;
                                        const percentage = logs.length > 0 ? (count / logs.length) * 100 : 0;
                                        
                                        return (
                                            <div key={action} className="flex items-center gap-4">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-dark-text w-24">{action}</span>
                                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                                                    <div 
                                                        className={`h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${
                                                            idx === 0 ? 'bg-blue-500 dark:bg-blue-600' :
                                                            idx === 1 ? 'bg-green-500 dark:bg-green-600' :
                                                            idx === 2 ? 'bg-yellow-500 dark:bg-yellow-600' :
                                                            idx === 3 ? 'bg-red-500 dark:bg-red-600' : 'bg-purple-500 dark:bg-purple-600'
                                                        }`}
                                                        style={{ width: `${percentage}%` }}
                                                    >
                                                        {percentage > 10 && (
                                                            <span className="text-xs font-bold text-white">{count}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-gray-600 dark:text-dark-text-secondary w-16">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Usuários Mais Ativos */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-dark-text mb-4">👥 Usuários Mais Ativos</h4>
                                <div className="space-y-2">
                                    {Array.from(new Set(logs.map(l => l.userName).filter(Boolean))).slice(0, 5).map(userName => {
                                        const userLogs = logs.filter(l => l.userName === userName);
                                        const userRole = userLogs[0]?.userRole || 'N/A';
                                        
                                        return (
                                            <div key={userName} className="flex items-center justify-between card-primary p-3 rounded-lg">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{userName}</p>
                                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{userRole}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm font-bold">
                                                    {userLogs.length} ações
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {logs.length === 0 && (
                                        <p className="text-center text-gray-500 dark:text-dark-text-secondary py-4">Nenhum dado disponível</p>
                                    )}
                                </div>
                            </div>

                            {/* Atividade por Entidade */}
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl p-6">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-dark-text mb-4">🎯 Atividade por Entidade</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {['Projeto', 'Orcamento', 'Cliente', 'Material'].map(entity => {
                                        const count = logs.filter(l => l.entity === entity).length;
                                        return (
                                            <div key={entity} className="card-primary p-4 rounded-xl text-center border border-gray-200 dark:border-dark-border">
                                                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{count}</p>
                                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{entity}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'health' && (
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-6">💚 Health Check do Sistema</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Tempo real (Socket.io) */}
                                <div className={`p-6 rounded-2xl border-2 ${
                                    realtime.connected
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                                }`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        {realtime.connected ? (
                                            <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <XCircleIcon className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                                        )}
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">Tempo real (Socket.io)</h3>
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                WhatsApp CRM — eventos em tempo real (DEV)
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`text-3xl font-bold mb-2 ${
                                        realtime.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                                    }`}>
                                        {realtime.connected ? '✓ ONLINE' : '⚠ OFFLINE'}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-dark-text-secondary space-y-1">
                                        <p>
                                            <span className="font-semibold">Último evento:</span>{' '}
                                            {realtime.lastEvent ? `${realtime.lastEvent.name} • ${new Date(realtime.lastEvent.atMs).toLocaleTimeString('pt-BR')}` : '—'}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Última conexão:</span>{' '}
                                            {realtime.lastConnectedAtMs ? new Date(realtime.lastConnectedAtMs).toLocaleTimeString('pt-BR') : '—'}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Última queda:</span>{' '}
                                            {realtime.lastDisconnectedAtMs ? new Date(realtime.lastDisconnectedAtMs).toLocaleTimeString('pt-BR') : '—'}
                                        </p>
                                        {realtime.lastError ? (
                                            <p className="text-orange-700 dark:text-orange-400">
                                                <span className="font-semibold">Erro:</span> {realtime.lastError}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                                            msgs: {realtime.eventCounts['whatsapp:message'] ?? 0}
                                        </span>
                                        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                                            meta: {realtime.eventCounts['whatsapp:chat:meta'] ?? 0}
                                        </span>
                                        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                                            ack: {realtime.eventCounts['whatsapp:message:ack'] ?? 0}
                                        </span>
                                        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                                            unread: {realtime.eventCounts['update_unread_count'] ?? 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Backend Status */}
                                <div className={`p-6 rounded-2xl border-2 ${
                                    backendStatus === 'online' 
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        {backendStatus === 'online' ? (
                                            <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <XCircleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
                                        )}
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">Backend API</h3>
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Status do servidor Node.js</p>
                                        </div>
                                    </div>
                                    <div className={`text-3xl font-bold mb-2 ${
                                        backendStatus === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                        {backendStatus === 'online' ? '✓ ONLINE' : '✗ OFFLINE'}
                                    </div>
                                    {backendStatus === 'online' && (
                                        <p className="text-sm text-green-700 dark:text-green-400">
                                            Todas as APIs estão respondendo normalmente
                                        </p>
                                    )}
                                </div>

                                {/* Database Status */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <ChartBarIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">Database</h3>
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">PostgreSQL + Prisma ORM</p>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                                        ✓ CONECTADO
                                    </div>
                                    <p className="text-sm text-blue-700 dark:text-blue-400">
                                        Banco de dados operacional
                                    </p>
                                </div>

                                {/* Frontend Status */}
                                <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <CheckCircleIcon className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">Frontend</h3>
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">React + Vite</p>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                                        ✓ ATIVO
                                    </div>
                                    <p className="text-sm text-purple-700 dark:text-purple-400">
                                        Interface funcionando perfeitamente
                                    </p>
                                </div>

                                {/* Sistema Status com tema Vermelho (Desenvolvedor) */}
                                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-3">
                                        <TerminalIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">Sistema Geral</h3>
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">S3E System PRO</p>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                                        ✓ OPERACIONAL
                                    </div>
                                    <p className="text-sm text-red-700 dark:text-red-400">
                                        Todos os módulos funcionando
                                    </p>
                                </div>
                            </div>

                            {/* Informações Adicionais */}
                            <div className="card-secondary border border-gray-200 dark:border-dark-border rounded-2xl p-6">
                                <h4 className="font-bold text-gray-900 dark:text-dark-text mb-4">ℹ️ Informações do Sistema</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600 dark:text-dark-text-secondary">Versão:</p>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">1.0.0</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 dark:text-dark-text-secondary">Ambiente:</p>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">Desenvolvimento</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 dark:text-dark-text-secondary">Última Verificação:</p>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">{new Date().toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 dark:text-dark-text-secondary">Logs Registrados:</p>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">{stats.totalActions}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => checkBackendHealth()}
                                className="btn-danger w-full"
                            >
                                🔄 Atualizar Status do Sistema
                            </button>
                        </div>
                    )}

                    {activeTab === 'manutencao' && (
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-6">🔧 Manutenção (apenas desenvolvedor)</h3>
                            <div className="card-secondary border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                                <h4 className="font-bold text-gray-900 dark:text-dark-text mb-2">🔗 URL do portfólio (página de login)</h4>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                    Altere aqui o link do botão de portfólio exibido no login. Não precisa rebuildar para trocar só essa URL.
                                </p>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input
                                        type="url"
                                        value={portfolioUrl}
                                        onChange={(e) => setPortfolioUrl(e.target.value)}
                                        placeholder="https://seu-portfolio.com"
                                        className="input-field flex-1"
                                        disabled={portfolioSaving}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAlterarPortfolioUrl}
                                        disabled={portfolioSaving}
                                        className="btn-primary min-w-[140px] disabled:opacity-60"
                                    >
                                        {portfolioSaving ? 'Alterando...' : 'Alterar'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-3">
                                    Apenas usuários com role <strong>desenvolvedor</strong> podem alterar esta URL.
                                </p>
                            </div>
                            <div className="card-secondary border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                                <h4 className="font-bold text-gray-900 dark:text-dark-text mb-2">Preencher nomes de orçamentistas</h4>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                                    Após subir uma nova versão em produção, use este botão para preencher o campo &quot;orçamentista&quot; nos orçamentos antigos e atualizar o &quot;vendedor&quot; nas vendas. Não é necessário rodar script no servidor (ex.: TrueNAS).
                                </p>
                                <button
                                    onClick={runBackfillOrcamentista}
                                    disabled={backfillLoading}
                                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                                >
                                    {backfillLoading ? (
                                        <>⏳ Executando...</>
                                    ) : (
                                        <>✅ Executar backfill de orçamentistas</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Logs;

