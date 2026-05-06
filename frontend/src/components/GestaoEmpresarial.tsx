import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { 
    funcionariosService,
    rhService,
    valesService, 
    beneficiosService,
    veiculosService, 
    gastosVeiculoService, 
    planosService,
    despesasFixasService 
} from '../services/gerenciamentoService';
import { financeiroService } from '../services/financeiroService';
import { axiosApiService } from '../services/axiosApi';
import { maskCpf, maskTelefoneBr, onlyDigits } from '../utils/masks';
import { decimalHoursToHHmm, minutesToHHmm } from '../utils/timeFormat';
import BIDashboard from './BIDashboard';
import ResumoAdministrativo from './ResumoAdministrativo';
import { DollarSign, Minus, Plus } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';

/** Fecha o modal/dialog ao pressionar Escape */
function useEscapeKey(onClose: () => void, isActive: boolean) {
    useEffect(() => {
        if (!isActive) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, onClose]);
}

/**
 * Converte data vinda da API (string ISO ou Date) para yyyy-MM-dd.
 * <input type="date"> só aceita esse formato; com "2020-01-15T00:00:00.000Z" o campo fica vazio e o required acusa erro.
 */
function formatYmdForDateInput(raw: unknown): string {
    if (raw == null || raw === '') return '';
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
        if (t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
        return '';
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return raw.toISOString().slice(0, 10);
    }
    return '';
}

type StatsImportPresenca = {
    importados: number;
    atualizados: number;
    ignorados: number;
    inconsistentes: number;
    naoEncontrados: Array<{ codigoRelogio: number; nomeRelogio: string }>;
    errosParse: string[];
    avisos: string[];
    ano?: number;
    mes?: number;
    descontosDiariaAutonomo?: { funcionariosProcessados: number; lancamentosCriados: number };
};

function statsImportPresencaVazias(): StatsImportPresenca {
    return {
        importados: 0,
        atualizados: 0,
        ignorados: 0,
        inconsistentes: 0,
        naoEncontrados: [],
        errosParse: [],
        avisos: [],
    };
}

/**
 * Interpreta a resposta de POST /api/ponto/importar-presenca (ApiResponse ou payload aninhado).
 */
function parseRespostaImportPresenca(res: unknown): { ok: boolean; erro?: string; stats: StatsImportPresenca } {
    const empty = statsImportPresencaVazias();
    if (res == null || typeof res !== 'object') {
        return { ok: false, erro: 'Resposta inválida do servidor.', stats: empty };
    }
    const r = res as Record<string, unknown>;

    if (r.success === false) {
        const msg =
            (typeof r.error === 'string' && r.error) ||
            (typeof r.message === 'string' && r.message) ||
            'Falha na importação';
        return { ok: false, erro: msg, stats: empty };
    }

    let payload: unknown = r.data;
    if (
        payload &&
        typeof payload === 'object' &&
        payload !== null &&
        !('importados' in payload) &&
        'data' in payload &&
        typeof (payload as { data: unknown }).data === 'object' &&
        (payload as { data: unknown }).data !== null &&
        'importados' in ((payload as { data: Record<string, unknown> }).data as object)
    ) {
        payload = (payload as { data: unknown }).data;
    }
    if ((!payload || typeof payload !== 'object') && typeof r.importados === 'number') {
        payload = r;
    }
    if (!payload || typeof payload !== 'object') {
        if (r.success === true) {
            return {
                ok: false,
                erro: 'O servidor não retornou o resumo da importação (campo data vazio).',
                stats: empty,
            };
        }
        return { ok: false, erro: 'Formato de resposta inesperado.', stats: empty };
    }

    const s = payload as Record<string, unknown>;
    const num = (k: string) => {
        const v = s[k];
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string' && v.trim() !== '') {
            const n = parseFloat(v.replace(',', '.'));
            return Number.isFinite(n) ? n : 0;
        }
        return 0;
    };

    return {
        ok: true,
        stats: {
            importados: num('importados'),
            atualizados: num('atualizados'),
            ignorados: num('ignorados'),
            inconsistentes: num('inconsistentes'),
            naoEncontrados: Array.isArray(s.naoEncontrados) ? (s.naoEncontrados as StatsImportPresenca['naoEncontrados']) : [],
            errosParse: Array.isArray(s.errosParse) ? (s.errosParse as string[]) : [],
            avisos: Array.isArray(s.avisos) ? (s.avisos as string[]) : [],
            ano: typeof s.ano === 'number' ? s.ano : undefined,
            mes: typeof s.mes === 'number' ? s.mes : undefined,
            descontosDiariaAutonomo: (() => {
                const d = s.descontosDiariaAutonomo;
                if (!d || typeof d !== 'object') return undefined;
                const dd = d as Record<string, unknown>;
                const fp = dd.funcionariosProcessados;
                const lc = dd.lancamentosCriados;
                return {
                    funcionariosProcessados:
                        typeof fp === 'number' && Number.isFinite(fp) ? fp : 0,
                    lancamentosCriados: typeof lc === 'number' && Number.isFinite(lc) ? lc : 0,
                };
            })(),
        },
    };
}

// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
);

const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const ClipboardDocumentListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
);

interface GestaoEmpresarialProps {
    toggleSidebar: () => void;
}

type SubPage = 'dashboard' | 'resumo-administrativo' | 'rh' | 'carros' | 'planos' | 'despesas';

const GestaoEmpresarial: React.FC<GestaoEmpresarialProps> = ({ toggleSidebar }) => {
    const [activeSubPage, setActiveSubPage] = useState<SubPage>('dashboard');
    const auth = useAuth();
    const currentRole = auth.user?.role?.toLowerCase();
    // Ocultar aba "Recursos Humanos" para gerente (e outros que não devem ver salários)
    const hideRhForRoles = ['engenheiro_eletricista', 'gerente', 'desenhista_industrial'];
    const showRhTab = !currentRole || !hideRhForRoles.includes(currentRole);
    // Ocultar abas "Frota" e "Despesas Fixas" para engenheiro elétrico e desenhista industrial
    const hideFrotaDespesasForRoles = ['engenheiro_eletricista', 'desenhista_industrial'];
    const showFrotaTab = !currentRole || !hideFrotaDespesasForRoles.includes(currentRole);
    const showDespesasTab = !currentRole || !hideFrotaDespesasForRoles.includes(currentRole);

    // Redirecionar para dashboard se a subpágina ativa for uma aba oculta para o role
    useEffect(() => {
        if (!currentRole) return;
        if (hideRhForRoles.includes(currentRole) && activeSubPage === 'rh') setActiveSubPage('dashboard');
        if (hideFrotaDespesasForRoles.includes(currentRole) && (activeSubPage === 'carros' || activeSubPage === 'despesas')) setActiveSubPage('dashboard');
    }, [currentRole, activeSubPage]);

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Gestão empresarial</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gestão de RH, Frota e Planos Estratégicos</p>
                    </div>
                </div>
            </header>

            {/* Navegação por Tabs */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-2 mb-8">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveSubPage('dashboard')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                            activeSubPage === 'dashboard'
                                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <ChartBarIcon className="w-5 h-5" />
                        Dashboard
                    </button>
                    {showRhTab && (
                        <button
                            onClick={() => setActiveSubPage('rh')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                                activeSubPage === 'rh'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <UsersIcon className="w-5 h-5" />
                            Recursos Humanos
                        </button>
                    )}
                    {showFrotaTab && (
                        <button
                            onClick={() => setActiveSubPage('carros')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                                activeSubPage === 'carros'
                                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <TruckIcon className="w-5 h-5" />
                            Frota
                        </button>
                    )}
                    <button
                        onClick={() => setActiveSubPage('planos')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                            activeSubPage === 'planos'
                                ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <ClipboardDocumentListIcon className="w-5 h-5" />
                        Planos Estratégicos
                    </button>
                    {showDespesasTab && (
                        <button
                            onClick={() => setActiveSubPage('despesas')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                                activeSubPage === 'despesas'
                                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Despesas Fixas
                        </button>
                    )}
                </div>
            </div>

            {/* Conteúdo das Subpáginas */}
            <div className="animate-fade-in">
                {activeSubPage === 'dashboard' && <BIDashboardView />}
                {activeSubPage === 'resumo-administrativo' && <ResumoAdministrativoView />}
                {activeSubPage === 'rh' && <RHView />}
                {activeSubPage === 'carros' && <CarrosView />}
                {activeSubPage === 'planos' && <PlanosView />}
                {activeSubPage === 'despesas' && <DespesasFixasView />}
            </div>
        </div>
    );
};

// ==================== BI DASHBOARD VIEW ====================
const BIDashboardView: React.FC = () => {
    return <BIDashboard />;
};

// ==================== RESUMO ADMINISTRATIVO VIEW ====================
const ResumoAdministrativoView: React.FC = () => {
    return <ResumoAdministrativo />;
};

// ==================== DASHBOARD VIEW (Legacy - mantido para referência) ====================
const DashboardView: React.FC = () => {
    const [metricas, setMetricas] = useState({
        funcionarios: { total: 0, folhaPagamento: 0, valesMes: 0, custoTotal: 0 },
        frota: { totalVeiculos: 0, gastosMes: 0, combustivel: 0, manutencao: 0 },
        planos: { altaPrioridade: 0, mediaPrioridade: 0, concluidos: 0, emAndamento: 0, total: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarMetricas();
    }, []);

    const carregarMetricas = async () => {
        try {
            setLoading(true);
            const [rhResp, frotaResp, planosResp] = await Promise.all([
                funcionariosService.obterMetricas(),
                veiculosService.obterMetricas(),
                planosService.obterMetricas()
            ]);
            // Extrair dados de forma segura (axiosApiService retorna { success, data } ou o próprio payload)
            const rhData = rhResp?.data ?? (rhResp && typeof rhResp === 'object' ? (rhResp as any) : null);
            const frotaData = frotaResp?.data ?? (frotaResp && typeof frotaResp === 'object' ? (frotaResp as any) : null);
            const planosData = planosResp?.data ?? (planosResp && typeof planosResp === 'object' ? (planosResp as any) : null);

            setMetricas({
                funcionarios: rhData ?? { total: 0, folhaPagamento: 0, valesMes: 0, custoTotal: 0 },
                frota: frotaData ?? { totalVeiculos: 0, gastosMes: 0, combustivel: 0, manutencao: 0 },
                planos: planosData ?? { altaPrioridade: 0, mediaPrioridade: 0, concluidos: 0, emAndamento: 0, total: 0 }
            });
        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
            toast.error('Erro ao carregar métricas do dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Visão Geral</h2>
            
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total de Funcionários */}
                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <UsersIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Funcionários</p>
                            <p className="text-2xl font-bold text-blue-600">{metricas.funcionarios.total || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">Ativos</p>
                        </div>
                    </div>
                </div>

                {/* Folha de Pagamento */}
                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Folha Mensal</p>
                            <p className="text-2xl font-bold text-green-600">
                                R$ {(metricas.funcionarios.folhaPagamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Veículos */}
                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                            <TruckIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Veículos</p>
                            <p className="text-2xl font-bold text-orange-600">{metricas.frota.totalVeiculos || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">Ativos</p>
                        </div>
                    </div>
                </div>

                {/* Planos Ativos */}
                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Planos</p>
                            <p className="text-2xl font-bold text-purple-600">{metricas.planos.emAndamento || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">Em andamento</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações Rápidas */}
            <div className="card-primary">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Acesso Rápido</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-6 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left">
                        <UsersIcon className="w-8 h-8 text-blue-600 mb-3" />
                        <h4 className="font-bold text-gray-900">Recursos Humanos</h4>
                        <p className="text-sm text-gray-600 mt-1">Gerenciar funcionários e folha de pagamento</p>
                    </button>
                    <button className="p-6 border-2 border-orange-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-left">
                        <TruckIcon className="w-8 h-8 text-orange-600 mb-3" />
                        <h4 className="font-bold text-gray-900">Gestão de Frota</h4>
                        <p className="text-sm text-gray-600 mt-1">Controlar veículos e despesas</p>
                    </button>
                    <button className="p-6 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left">
                        <ClipboardDocumentListIcon className="w-8 h-8 text-green-600 mb-3" />
                        <h4 className="font-bold text-gray-900">Planos Estratégicos</h4>
                        <p className="text-sm text-gray-600 mt-1">Acompanhar evolução da empresa</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== RH VIEW ====================
const RHView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'funcionarios' | 'estoque'>('funcionarios');
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [metricas, setMetricas] = useState<{
        folhaPagamento: number | null;
        valesMes: number | null;
        custoTotal: number | null;
        porFuncionario?: Array<{
            funcionarioId: string;
            tipoContrato: string;
            salarioBase: number;
            valorDiaria: number | null;
            totalAPagar: number;
        }> | null;
        masked?: boolean;
    }>({ folhaPagamento: 0, valesMes: 0, custoTotal: 0, porFuncionario: [] });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isValeModalOpen, setIsValeModalOpen] = useState(false);
    const [isBeneficiosModalOpen, setIsBeneficiosModalOpen] = useState(false);
    const [editandoFuncionario, setEditandoFuncionario] = useState<string | null>(null);
    const [funcionarioForm, setFuncionarioForm] = useState({
        nome: '',
        cargo: '',
        salario: '',
        dataAdmissao: new Date().toISOString().split('T')[0],
        cpf: '',
        telefone: '',
        email: '',
        status: 'Ativo',
        diaPagamento: '5',
        uniformeCamisa: '',
        uniformeCalca: '',
        uniformeBermuda: '',
        uniformeSapato: '',
        // Campos adicionais para regras de folha
        tipoContrato: 'REGISTRADO',
        salarioBase: '',
        valorHora: '',
        valorDiaria: '',
        cargaHorariaMensal: '220',
        saldoBancoHoras: '',
        codigoRelogio: '',
        trabalhaFimDeSemana: false,
        valorHoraFimDeSemana: '',
        workShiftId: '',
        toleranciaMinutos: '5',
        inicioNoturno: '18:00',
        permitirHorasExtras100: false,
        descontoDiariaSemBatidaAutonomo: false,
        valorHoraNormalAutonomo: '',
        valorHoraExtra50Autonomo: '',
        valorHoraExtra100Autonomo: '',
        valorHoraNoturna20Autonomo: '',
        autoCalculoHorasAutonomo: true,
    });
    
    // Estados para busca rápida de usuários
    const [usuariosCadastrados, setUsuariosCadastrados] = useState<any[]>([]);
    const [buscaUsuario, setBuscaUsuario] = useState('');
    const [mostrarListaUsuarios, setMostrarListaUsuarios] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<any | null>(null);
    const [valeForm, setValeForm] = useState({
        funcionarioId: '',
        tipo: 'Vale Transporte',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        descricao: ''
    });
    
    const [beneficios, setBeneficios] = useState<any[]>([]);
    const [workShifts, setWorkShifts] = useState<any[]>([]);
    const [beneficioEmEdicao, setBeneficioEmEdicao] = useState<any | null>(null);
    const [beneficioForm, setBeneficioForm] = useState({ nome: '', valorPadrao: '', ativo: true });

    const [folhaDetalhada, setFolhaDetalhada] = useState<any | null>(null);
    const [funcionarioFolha, setFuncionarioFolha] = useState<any | null>(null);
    const [folhaMesRef, setFolhaMesRef] = useState<string | null>(null);
    const [rhCompetencia, setRhCompetencia] = useState(() => {
        const hoje = new Date();
        return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    });
    const [lancamentoNovo, setLancamentoNovo] = useState({
        categoria: 'ADIANTAMENTO' as 'ADIANTAMENTO' | 'FALTA' | 'FALTA_JUSTIFICADA' | 'DESCONTO_OUTRO' | 'ACRESCIMO',
        valor: '',
        descricao: '',
    });
    const [pontoImportAno, setPontoImportAno] = useState(String(new Date().getFullYear()));
    const [pontoImportMes, setPontoImportMes] = useState(String(new Date().getMonth() + 1));
    const [pontoImportBusy, setPontoImportBusy] = useState(false);
    const [sincronizarParcelaBusy, setSincronizarParcelaBusy] = useState(false);
    const pontoFileInputRef = useRef<HTMLInputElement>(null);

    // Estados para dialog de confirmação de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [funcionarioParaDeletar, setFuncionarioParaDeletar] = useState<{ id: string; nome: string } | null>(null);

    // Modal Ver dados do colaborador
    const [funcionarioVerDados, setFuncionarioVerDados] = useState<any | null>(null);
    // Modal Histórico de pagamentos
    const [funcionarioHistorico, setFuncionarioHistorico] = useState<any | null>(null);
    const [historicoPagamentosLista, setHistoricoPagamentosLista] = useState<any[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    const [batidasEdicao, setBatidasEdicao] = useState<Record<number, string[]>>({});
    const [salvandoBatidasDia, setSalvandoBatidasDia] = useState<number | null>(null);
    const [pdfFolhaBusy, setPdfFolhaBusy] = useState(false);
    const [bancoHorasConverterInput, setBancoHorasConverterInput] = useState('');
    const [modoIncluirBanco, setModoIncluirBanco] = useState<'total' | 'parcial'>('total');
    const [horasParcialBancoInput, setHorasParcialBancoInput] = useState('');
    const [valorSimuladoBanco, setValorSimuladoBanco] = useState<number | null>(null);
    const [busyBancoAcao, setBusyBancoAcao] = useState(false);
    const [origemConverterFolga, setOrigemConverterFolga] = useState<'automatico' | 'normais' | 'extras100'>(
        'normais',
    );
    const [alocacaoPagamentoBanco, setAlocacaoPagamentoBanco] = useState<
        'automatico' | 'so_normais' | 'so_extras100' | 'misto'
    >('so_normais');
    const [horasMistoNormais, setHorasMistoNormais] = useState('');
    const [horasMisto100, setHorasMisto100] = useState('');
    const [modoQuitacaoDivida, setModoQuitacaoDivida] = useState<'DESCONTAR_SALARIO' | 'COMPENSAR_BANCO'>(
        'DESCONTAR_SALARIO',
    );
    const [periodoCompensacaoDivida, setPeriodoCompensacaoDivida] = useState<'DIAS_SEMANA' | 'FINAL_DE_SEMANA'>(
        'DIAS_SEMANA',
    );

    const aplicarCalculoHorasAutonomoPorDiaria = (
        base: typeof funcionarioForm,
        diariaInput: string,
    ): typeof funcionarioForm => {
        const diaria = parseFloat(String(diariaInput ?? '').replace(',', '.'));
        if (
            base.tipoContrato !== 'AUTONOMO' ||
            !base.autoCalculoHorasAutonomo ||
            !Number.isFinite(diaria) ||
            diaria <= 0
        ) {
            return base;
        }

        const valorHoraNormal = diaria / 8;
        const fmt = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

        return {
            ...base,
            valorDiaria: diariaInput,
            valorHoraNormalAutonomo: fmt(valorHoraNormal),
            valorHoraExtra50Autonomo: fmt(valorHoraNormal * 1.5),
            valorHoraExtra100Autonomo: fmt(valorHoraNormal * 2),
            valorHoraNoturna20Autonomo: fmt(valorHoraNormal * 1.2),
        };
    };

    useEffect(() => {
        carregarDados();
    }, [rhCompetencia]);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [funcResp, metricasResp, beneficiosResp, shiftsResp] = await Promise.all([
                funcionariosService.listar(),
                funcionariosService.obterMetricas(rhCompetencia),
                beneficiosService.listar(),
                rhService.listarWorkShifts(),
            ]);
            setFuncionarios(Array.isArray(funcResp?.data) ? (funcResp.data as any[]) : []);
            setMetricas(
                (metricasResp?.data as any) ?? {
                    folhaPagamento: 0,
                    valesMes: 0,
                    custoTotal: 0,
                    porFuncionario: [],
                }
            );
            setBeneficios(Array.isArray(beneficiosResp?.data) ? beneficiosResp.data : []);
            setWorkShifts(Array.isArray(shiftsResp?.data) ? shiftsResp.data : []);
        } catch (error) {
            console.error('Erro ao carregar dados de RH:', error);
            toast.error('Erro ao carregar funcionários');
        } finally {
            setLoading(false);
        }
    };

    const handleDetalharFolha = async (funcionario: any) => {
        try {
            setFuncionarioFolha(funcionario);
            setFolhaDetalhada(null);
            setLancamentoNovo({ categoria: 'ADIANTAMENTO', valor: '', descricao: '' });
            const mes = rhCompetencia;
            setFolhaMesRef(mes);
            const resp = await axiosApiService.get(`/api/rh/folha/${funcionario.id}/${mes}`);
            const folha =
                resp && typeof resp === 'object' && 'data' in resp && (resp as any).data != null
                    ? (resp as any).data
                    : null;
            setFolhaDetalhada(folha);
        } catch (error) {
            console.error('Erro ao detalhar folha:', error);
            toast.error('Erro ao carregar folha do mês');
        }
    };

    const recarregarFolhaAberta = async () => {
        if (!funcionarioFolha?.id || !folhaMesRef) return;
        try {
            const resp = await axiosApiService.get(`/api/rh/folha/${funcionarioFolha.id}/${folhaMesRef}`);
            const folha =
                resp && typeof resp === 'object' && 'data' in resp && (resp as any).data != null
                    ? (resp as any).data
                    : null;
            setFolhaDetalhada(folha);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao atualizar folha');
        }
    };

    useEffect(() => {
        if (!folhaDetalhada?.conferenciaPonto) {
            setBatidasEdicao({});
            return;
        }
        const next: Record<number, string[]> = {};
        for (const row of folhaDetalhada.conferenciaPonto as Array<{
            dia: number;
            registroPontoId?: string | null;
            batidas?: string[];
        }>) {
            if (row.registroPontoId && Array.isArray(row.batidas)) {
                next[row.dia] = [...row.batidas];
            }
        }
        setBatidasEdicao(next);
    }, [folhaDetalhada]);

    useEffect(() => {
        setValorSimuladoBanco(null);
        setBancoHorasConverterInput('');
        setModoIncluirBanco('total');
        setHorasParcialBancoInput('');
        setOrigemConverterFolga('normais');
        setAlocacaoPagamentoBanco('so_normais');
        setHorasMistoNormais('');
        setHorasMisto100('');
    }, [funcionarioVerDados?.id]);

    const handleGerarPdfConferenciaPonto = async () => {
        if (!funcionarioFolha?.id || !folhaMesRef) return;
        setPdfFolhaBusy(true);
        try {
            const blob = await axiosApiService.getBlob(`/api/rh/folha/${funcionarioFolha.id}/${folhaMesRef}/pdf`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const nomeArquivo = `conferencia-ponto-${String(funcionarioFolha.nome ?? 'colaborador').replace(/\s+/g, '-')}-${folhaMesRef}.pdf`;
            a.download = nomeArquivo;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('PDF de conferência gerado');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar PDF da conferência');
        } finally {
            setPdfFolhaBusy(false);
        }
    };

    const handleSalvarBatidasDia = async (dia: number, registroPontoId: string) => {
        const bat = batidasEdicao[dia];
        if (!registroPontoId || !bat) return;
        const filtradas = bat.map((s) => String(s).trim()).filter(Boolean);
        if (filtradas.length === 0) {
            toast.error('Informe ao menos uma batida (horário)');
            return;
        }
        setSalvandoBatidasDia(dia);
        try {
            const r = await rhService.atualizarRegistroPonto(registroPontoId, filtradas);
            if (!r.success) {
                toast.error(
                    typeof (r as { error?: string }).error === 'string'
                        ? (r as { error: string }).error
                        : 'Erro ao salvar batidas',
                );
                return;
            }
            toast.success('Batidas salvas — horas recalculadas');
            await recarregarFolhaAberta();
            await carregarDados();
        } catch (e) {
            console.error(e);
            toast.error('Erro ao salvar batidas');
        } finally {
            setSalvandoBatidasDia(null);
        }
    };

    const handleRegistrarFaltaJustificada = async (dia: number) => {
        if (!funcionarioFolha?.id || !folhaDetalhada?.referencia) return;
        const descricao = window.prompt('Descreva o motivo/atestado da falta justificada:');
        if (!descricao || !descricao.trim()) {
            return;
        }
        try {
            const resp = await rhService.registrarFaltaJustificada({
                funcionarioId: funcionarioFolha.id,
                referenciaAno: folhaDetalhada.referencia.ano,
                referenciaMes: folhaDetalhada.referencia.mes,
                dia,
                descricao: descricao.trim(),
            });
            if (!resp.success) {
                toast.error((resp as { message?: string }).message ?? 'Não foi possível registrar a falta');
                return;
            }
            toast.success('Falta justificada registrada');
            await recarregarFolhaAberta();
            await carregarDados();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao registrar falta justificada');
        }
    };

    const handleProporDividaHoras = async () => {
        if (!funcionarioVerDados?.id) return;
        const horas = Number(folhaDetalhada?.dividaHoras?.horasNegativas ?? 0);
        if (!Number.isFinite(horas) || horas <= 0) {
            toast.error('Não há horas negativas para propor compensação');
            return;
        }
        const [anoStr, mesStr] = rhCompetencia.split('-');
        const referenciaAno = parseInt(anoStr, 10);
        const referenciaMes = parseInt(mesStr, 10);
        try {
            const resp = await rhService.proporDividaHoras({
                funcionarioId: funcionarioVerDados.id,
                referenciaAno,
                referenciaMes,
                horasDivida: horas,
                modoQuitacao: modoQuitacaoDivida,
                periodoCompensacao: periodoCompensacaoDivida,
            });
            if (!resp.success) {
                toast.error((resp as { message?: string }).message ?? 'Erro ao propor dívida');
                return;
            }
            toast.success('Proposta de quitação criada');
            await carregarDados();
            await recarregarFolhaAberta();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao criar proposta de quitação');
        }
    };

    const handleAprovarCompensacaoDia = async (diaId: string) => {
        if (!diaId) return;
        try {
            const resp = await rhService.aprovarDiaDivida(diaId);
            if (!resp.success) {
                toast.error((resp as { message?: string }).message ?? 'Erro ao aprovar dia');
                return;
            }
            toast.success('Dia de compensação aprovado');
            await recarregarFolhaAberta();
            await carregarDados();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao aprovar compensação');
        }
    };

    const handleConverterBancoParaFolga = async () => {
        if (!funcionarioVerDados?.id) return;
        const h = parseFloat(String(bancoHorasConverterInput).replace(',', '.'));
        if (!Number.isFinite(h) || h <= 0) {
            toast.error('Informe uma quantidade de horas válida');
            return;
        }
        setBusyBancoAcao(true);
        try {
            const r = await rhService.converterBancoParaFolga({
                funcionarioId: funcionarioVerDados.id,
                horas: h,
                origem: origemConverterFolga,
            });
            if (!r.success) {
                toast.error(
                    typeof (r as { message?: string }).message === 'string'
                        ? (r as { message: string }).message
                        : 'Não foi possível converter',
                );
                return;
            }
            const data = (r as {
                data?: {
                    saldoNovo?: number;
                    saldoNormaisNovo?: number;
                    saldoExtras100Novo?: number;
                    horasFolgaTotal?: number;
                };
            }).data;
            toast.success('Horas convertidas em folga');
            setBancoHorasConverterInput('');
            await carregarDados();
            if (data && funcionarioVerDados) {
                setFuncionarioVerDados({
                    ...funcionarioVerDados,
                    saldoBancoHoras: data.saldoNovo,
                    saldoBancoHorasNormaisExcedente: data.saldoNormaisNovo,
                    saldoBancoHorasExtras100: data.saldoExtras100Novo,
                    horasFolgaAcumuladas: data.horasFolgaTotal,
                });
            }
        } finally {
            setBusyBancoAcao(false);
        }
    };

    const handleCalcularValorPagamentoBanco = () => {
        if (!funcionarioVerDados || funcionarioVerDados.tipoContrato === 'AUTONOMO') return;
        const base = Number(funcionarioVerDados.salarioBase ?? funcionarioVerDados.salario ?? 0);
        const carga = Number(funcionarioVerDados.cargaHorariaMensal ?? 220);
        const vh = base > 0 && carga > 0 ? base / carga : Number(funcionarioVerDados.valorHora ?? 0);
        let saldoN = Number(funcionarioVerDados.saldoBancoHorasNormaisExcedente ?? 0);
        let saldo100 = Number(funcionarioVerDados.saldoBancoHorasExtras100 ?? 0);
        const legado = Number(funcionarioVerDados.saldoBancoHoras ?? saldoN + saldo100);
        if (saldoN + saldo100 <= 0 && legado > 0) {
            saldoN = legado;
            saldo100 = 0;
        }
        if (vh <= 0) {
            toast.error('Não foi possível obter valor hora (salário base ou carga)');
            setValorSimuladoBanco(null);
            return;
        }
        setValorSimuladoBanco(saldoN * vh + saldo100 * vh * 2);
    };

    const handleIncluirBancoNaFolhaCompetencia = async () => {
        if (!funcionarioVerDados?.id || funcionarioVerDados.tipoContrato === 'AUTONOMO') return;
        const partes = rhCompetencia.split('-');
        const referenciaAno = parseInt(partes[0], 10);
        const referenciaMes = parseInt(partes[1], 10);
        if (!Number.isFinite(referenciaAno) || !Number.isFinite(referenciaMes)) {
            toast.error('Competência inválida');
            return;
        }
        let horasParcial: number | undefined;
        let alocacao:
            | { tipo: 'automatico' | 'so_normais' | 'so_extras100' }
            | { tipo: 'misto'; horasNormais: number; horasExtras100: number }
            | undefined;

        if (modoIncluirBanco === 'parcial') {
            if (alocacaoPagamentoBanco === 'misto') {
                const hn = parseFloat(String(horasMistoNormais).replace(',', '.'));
                const h100 = parseFloat(String(horasMisto100).replace(',', '.'));
                if (!Number.isFinite(hn) || !Number.isFinite(h100) || hn < 0 || h100 < 0) {
                    toast.error('Informe horas normais e HE 100% na alocação mista');
                    return;
                }
                horasParcial = hn + h100;
                alocacao = { tipo: 'misto', horasNormais: hn, horasExtras100: h100 };
            } else {
                horasParcial = parseFloat(String(horasParcialBancoInput).replace(',', '.'));
                if (!Number.isFinite(horasParcial) || horasParcial <= 0) {
                    toast.error('Informe as horas (modo parcial)');
                    return;
                }
                alocacao = { tipo: alocacaoPagamentoBanco };
            }
        } else {
            alocacao = { tipo: 'automatico' };
        }

        setBusyBancoAcao(true);
        try {
            const r = await rhService.incluirBancoHorasNaFolha({
                funcionarioId: funcionarioVerDados.id,
                referenciaAno,
                referenciaMes,
                modo: modoIncluirBanco,
                horasParcial,
                alocacao,
            });
            if (!r.success) {
                toast.error(
                    typeof (r as { message?: string }).message === 'string'
                        ? (r as { message: string }).message
                        : 'Não foi possível incluir na folha',
                );
                return;
            }
            toast.success('Lançamento de pagamento de banco incluído na folha do mês');
            await carregarDados();
        } finally {
            setBusyBancoAcao(false);
        }
    };

    const handleImportarPontoArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setPontoImportBusy(true);
        try {
            const ano = parseInt(pontoImportAno, 10);
            const mes = parseInt(pontoImportMes, 10);
            const res = await rhService.importarPresencaXls(
                file,
                Number.isFinite(ano) ? ano : undefined,
                Number.isFinite(mes) && mes >= 1 && mes <= 12 ? mes : undefined,
            );
            const parsed = parseRespostaImportPresenca(res);
            if (!parsed.ok) {
                toast.error(parsed.erro || 'Falha na importação');
                return;
            }
            const { stats: st } = parsed;
            const ref = st.ano != null && st.mes != null ? `Referência: ${st.ano}/${String(st.mes).padStart(2, '0')}. ` : '';
            const linhaResumo = `${ref}Importados: ${st.importados}, atualizados: ${st.atualizados}, ignorados: ${st.ignorados}, inconsistentes: ${st.inconsistentes}. Códigos não encontrados: ${st.naoEncontrados.length}.`;
            const extras: string[] = [];
            if (st.errosParse.length) extras.push(`Erros no arquivo: ${st.errosParse.join(' | ')}`);
            if (st.avisos.length) extras.push(st.avisos.join(' | '));
            if (st.naoEncontrados.length) {
                extras.push(
                    `IDs não batendo com cadastro: ${st.naoEncontrados
                        .slice(0, 8)
                        .map((x) => `${x.codigoRelogio} (${x.nomeRelogio})`)
                        .join(', ')}${st.naoEncontrados.length > 8 ? '…' : ''}`,
                );
            }
            if (
                st.descontosDiariaAutonomo &&
                (st.descontosDiariaAutonomo.lancamentosCriados > 0 ||
                    st.descontosDiariaAutonomo.funcionariosProcessados > 0)
            ) {
                extras.push(
                    `Autônomo (desconto diária sem batida): ${st.descontosDiariaAutonomo.lancamentosCriados} lançamento(s) em ${st.descontosDiariaAutonomo.funcionariosProcessados} colaborador(es).`,
                );
            }
            const description = [linhaResumo, ...extras].filter(Boolean).join('\n');
            const nadaGravado = st.importados === 0 && st.atualizados === 0;
            if (st.errosParse.length > 0) {
                toast.error('Importação com problemas no layout da planilha', {
                    description,
                    duration: 12000,
                });
            } else if (nadaGravado) {
                toast.warning('Nenhum registro de ponto gravado', {
                    description:
                        description +
                        (st.naoEncontrados.length === 0 && st.ignorados === 0
                            ? '\nConfira se a aba é \"Registro de Presenca\", se há linha 1..31 e cabeçalho Namero/NOME, e se cada funcionário tem o mesmo código no cadastro (campo Código no relógio de ponto).'
                            : ''),
                    duration: 14000,
                });
            } else {
                toast.success('Importação de ponto concluída', {
                    description,
                    duration: 10000,
                });
            }
            carregarDados();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao importar planilha';
            toast.error(msg);
        } finally {
            setPontoImportBusy(false);
        }
    };

    const handleAdicionarLancamentoFolha = async () => {
        if (!funcionarioFolha || !folhaDetalhada?.referencia) return;
        const v = parseFloat(String(lancamentoNovo.valor).replace(',', '.'));
        if (!Number.isFinite(v) || v <= 0) {
            toast.error('Informe um valor positivo');
            return;
        }
        const r = await rhService.criarLancamento({
            funcionarioId: funcionarioFolha.id,
            referenciaAno: folhaDetalhada.referencia.ano,
            referenciaMes: folhaDetalhada.referencia.mes,
            categoria: lancamentoNovo.categoria,
            valor: v,
            descricao: lancamentoNovo.descricao.trim() || null,
        });
        if (!r.success) {
            toast.error((r as { error?: string }).error || 'Erro ao lançar');
            return;
        }
        setLancamentoNovo({ categoria: 'ADIANTAMENTO', valor: '', descricao: '' });
        await recarregarFolhaAberta();
        await carregarDados();
        toast.success('Lançamento incluído');
    };

    const handleExcluirLancamentoFolha = async (id: string) => {
        const r = await rhService.excluirLancamento(id);
        if (!r.success) {
            toast.error((r as { error?: string }).error || 'Erro ao excluir');
            return;
        }
        await recarregarFolhaAberta();
        await carregarDados();
        toast.success('Lançamento removido');
    };

    const handleSincronizarParcelaConta = async () => {
        if (!funcionarioFolha?.id || !folhaDetalhada?.referencia) return;
        setSincronizarParcelaBusy(true);
        try {
            const resp = await rhService.sincronizarParcelaFolha({
                funcionarioId: funcionarioFolha.id,
                referenciaAno: folhaDetalhada.referencia.ano,
                referenciaMes: folhaDetalhada.referencia.mes,
            });
            if (!resp?.success) {
                toast.error(
                    typeof (resp as { error?: string })?.error === 'string'
                        ? (resp as { error: string }).error
                        : 'Não foi possível sincronizar com Contas a pagar',
                );
                return;
            }
            const msg =
                typeof (resp as { message?: string }).message === 'string'
                    ? (resp as { message: string }).message
                    : 'Sincronização concluída.';
            toast.success(msg);
            await carregarDados();
            await recarregarFolhaAberta();
        } finally {
            setSincronizarParcelaBusy(false);
        }
    };

    const handleAbrirModalEdicao = async (funcionario: any) => {
        setEditandoFuncionario(funcionario.id);
        const ymdAdmissao = formatYmdForDateInput(funcionario.dataAdmissao);
        const salarioStr =
            funcionario.salario != null && funcionario.salario !== ''
                ? String(Number(funcionario.salario))
                : '';
        const salarioBaseStr =
            funcionario.salarioBase != null && funcionario.salarioBase !== ''
                ? String(Number(funcionario.salarioBase))
                : '';
        const salarioEspelhado = salarioStr !== '' ? salarioStr : salarioBaseStr;

        let cfgTrabalha = false;
        let cfgValorFds = '';
        let cfgWorkShiftId = '';
        let cfgTolerancia = '5';
        let cfgInicioNoturno = '18:00';
        try {
            const cfgResp = await rhService.buscarConfigPonto(funcionario.id);
            const row =
                cfgResp &&
                typeof cfgResp === 'object' &&
                'data' in cfgResp &&
                (cfgResp as { data?: unknown }).data != null
                    ? (cfgResp as { data: Record<string, unknown> }).data
                    : null;
            if (row && typeof row === 'object' && row !== null) {
                cfgTrabalha = !!(row as { trabalhaFimDeSemana?: boolean }).trabalhaFimDeSemana;
                const vf = (row as { valorHoraFimDeSemana?: unknown }).valorHoraFimDeSemana;
                cfgValorFds =
                    vf != null && vf !== '' ? String(vf) : '';
                const ws = (row as { workShiftId?: unknown }).workShiftId;
                cfgWorkShiftId = typeof ws === 'string' ? ws : '';
                const tol = (row as { toleranciaMinutos?: unknown }).toleranciaMinutos;
                cfgTolerancia = tol != null ? String(tol) : '5';
                const iniNot = (row as { inicioNoturno?: unknown }).inicioNoturno;
                cfgInicioNoturno = typeof iniNot === 'string' && iniNot.trim() ? iniNot : '18:00';
            }
        } catch {
            /* sem registro ainda */
        }

        setFuncionarioForm({
            nome: funcionario.nome ?? '',
            cargo: funcionario.cargo ?? '',
            salario: salarioEspelhado,
            dataAdmissao: ymdAdmissao || new Date().toISOString().split('T')[0],
            cpf:
                funcionario.cpf != null && String(funcionario.cpf).trim() !== ''
                    ? maskCpf(String(funcionario.cpf).trim())
                    : '',
            telefone: funcionario.telefone ? maskTelefoneBr(String(funcionario.telefone)) : '',
            email: funcionario.email || '',
            status: funcionario.status,
            diaPagamento: funcionario.diaPagamento != null ? String(funcionario.diaPagamento) : '5',
            uniformeCamisa: funcionario.uniformeCamisa || '',
            uniformeCalca: funcionario.uniformeCalca || '',
            uniformeBermuda: funcionario.uniformeBermuda || '',
            uniformeSapato: funcionario.uniformeSapato || '',
            tipoContrato: funcionario.tipoContrato || 'REGISTRADO',
            salarioBase: salarioEspelhado,
            valorHora:
                funcionario.valorHora != null && funcionario.valorHora !== ''
                    ? String(funcionario.valorHora)
                    : '',
            valorDiaria:
                funcionario.valorDiaria != null && funcionario.valorDiaria !== ''
                    ? String(funcionario.valorDiaria)
                    : '',
            cargaHorariaMensal:
                funcionario.cargaHorariaMensal != null && funcionario.cargaHorariaMensal !== ''
                    ? String(funcionario.cargaHorariaMensal)
                    : '220',
            saldoBancoHoras:
                funcionario.saldoBancoHoras != null && funcionario.saldoBancoHoras !== ''
                    ? String(funcionario.saldoBancoHoras)
                    : '',
            codigoRelogio:
                funcionario.codigoRelogio != null && funcionario.codigoRelogio !== ''
                    ? String(funcionario.codigoRelogio)
                    : '',
            trabalhaFimDeSemana: cfgTrabalha,
            valorHoraFimDeSemana: cfgValorFds,
            workShiftId: cfgWorkShiftId,
            toleranciaMinutos: cfgTolerancia,
            inicioNoturno: cfgInicioNoturno,
            permitirHorasExtras100: funcionario.permitirHorasExtras100 ?? false,
            descontoDiariaSemBatidaAutonomo: funcionario.descontoDiariaSemBatidaAutonomo ?? false,
            valorHoraNormalAutonomo:
                funcionario.valorHoraNormalAutonomo != null && funcionario.valorHoraNormalAutonomo !== ''
                    ? String(funcionario.valorHoraNormalAutonomo)
                    : '',
            valorHoraExtra50Autonomo:
                funcionario.valorHoraExtra50Autonomo != null && funcionario.valorHoraExtra50Autonomo !== ''
                    ? String(funcionario.valorHoraExtra50Autonomo)
                    : '',
            valorHoraExtra100Autonomo:
                funcionario.valorHoraExtra100Autonomo != null && funcionario.valorHoraExtra100Autonomo !== ''
                    ? String(funcionario.valorHoraExtra100Autonomo)
                    : '',
            valorHoraNoturna20Autonomo:
                funcionario.valorHoraNoturna20Autonomo != null && funcionario.valorHoraNoturna20Autonomo !== ''
                    ? String(funcionario.valorHoraNoturna20Autonomo)
                    : '',
            autoCalculoHorasAutonomo: true,
        });
        setIsModalOpen(true);
    };

    const handleDeletarFuncionario = (id: string, nome: string) => {
        setFuncionarioParaDeletar({ id, nome });
        setShowDeleteDialog(true);
    };

    const handleVerDadosColaborador = (func: any) => {
        setFuncionarioVerDados(func);
        setModoQuitacaoDivida(
            func?.modoQuitacaoHorasNegativas === 'COMPENSAR_BANCO' ? 'COMPENSAR_BANCO' : 'DESCONTAR_SALARIO',
        );
        setPeriodoCompensacaoDivida(
            func?.periodoCompensacaoHoras === 'FINAL_DE_SEMANA' ? 'FINAL_DE_SEMANA' : 'DIAS_SEMANA',
        );
    };

    const handleAbrirHistoricoPagamentos = async (func: any) => {
        setFuncionarioHistorico(func);
        setLoadingHistorico(true);
        try {
            const resp = await funcionariosService.historicoPagamentos(func.id) as any;
            const hist = resp?.data?.data ?? resp?.data ?? resp ?? [];
            setHistoricoPagamentosLista(Array.isArray(hist) ? (hist as any[]) : []);
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
            toast.error('Erro ao carregar histórico de pagamentos');
            setHistoricoPagamentosLista([]);
        } finally {
            setLoadingHistorico(false);
        }
    };

    const confirmarDelecao = async () => {
        if (!funcionarioParaDeletar) return;

        try {
            await funcionariosService.deletar(funcionarioParaDeletar.id);
            toast.success('Funcionário deletado com sucesso!', {
                description: `${funcionarioParaDeletar.nome} foi removido do sistema`,
                duration: 4000,
            });
            setShowDeleteDialog(false);
            setFuncionarioParaDeletar(null);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao deletar funcionário:', error);
            toast.error('Erro ao deletar funcionário', {
                description: error.response?.data?.message || 'Não foi possível deletar o funcionário. Tente novamente.',
                duration: 4000,
            });
        }
    };

    const cancelarDelecao = () => {
        setShowDeleteDialog(false);
        setFuncionarioParaDeletar(null);
    };

    const carregarUsuarios = async () => {
        try {
            const response = await axiosApiService.get('/api/configuracoes/usuarios');
            // axiosApiService.get retorna um objeto { success, data } ou { success:false, error }
            const usuarios = response?.data ?? (Array.isArray(response) ? response : []);
            setUsuariosCadastrados(Array.isArray(usuarios) ? usuarios : []);
            console.log(`✅ ${Array.isArray(usuarios) ? usuarios.length : 0} usuários carregados para seleção rápida`);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    };

    const handleAbrirModalNovo = async () => {
        // Resetar formulário
        setEditandoFuncionario(null);
        setFuncionarioForm({
            nome: '',
            cargo: '',
            salario: '',
            dataAdmissao: new Date().toISOString().split('T')[0],
            cpf: '',
            telefone: '',
            email: '',
            status: 'Ativo',
            diaPagamento: '5',
            uniformeCamisa: '',
            uniformeCalca: '',
            uniformeBermuda: '',
            uniformeSapato: '',
            tipoContrato: 'REGISTRADO',
            salarioBase: '',
            valorHora: '',
            valorDiaria: '',
            cargaHorariaMensal: '220',
            saldoBancoHoras: '',
            codigoRelogio: '',
            trabalhaFimDeSemana: false,
            valorHoraFimDeSemana: '',
            workShiftId: '',
            toleranciaMinutos: '5',
            inicioNoturno: '18:00',
            permitirHorasExtras100: false,
            descontoDiariaSemBatidaAutonomo: false,
            valorHoraNormalAutonomo: '',
            valorHoraExtra50Autonomo: '',
            valorHoraExtra100Autonomo: '',
            valorHoraNoturna20Autonomo: '',
            autoCalculoHorasAutonomo: true,
        });
        setBuscaUsuario('');
        setUsuarioSelecionado(null);
        
        // Carregar usuários para seleção rápida
        await carregarUsuarios();
        
        setIsModalOpen(true);
    };

    const handleSelecionarUsuario = (usuario: any) => {
        console.log('👤 Usuário selecionado:', usuario);
        setUsuarioSelecionado(usuario);
        setBuscaUsuario(usuario.name || usuario.email);
        setMostrarListaUsuarios(false);
        
        // Preencher automaticamente os campos do formulário
        setFuncionarioForm({
            nome: usuario.name || '',
            cargo: usuario.role === 'eletricista' ? 'Eletricista' : usuario.role === 'gerente' ? 'Gerente' : 'Funcionário',
            salario: '',
            dataAdmissao: new Date().toISOString().split('T')[0],
            cpf: '',
            telefone: '',
            email: usuario.email || '',
            status: 'Ativo',
            diaPagamento: '5',
            uniformeCamisa: '',
            uniformeCalca: '',
            uniformeBermuda: '',
            uniformeSapato: '',
            tipoContrato: 'REGISTRADO',
            salarioBase: '',
            valorHora: '',
            valorDiaria: '',
            cargaHorariaMensal: '220',
            saldoBancoHoras: '',
            codigoRelogio: '',
            trabalhaFimDeSemana: false,
            valorHoraFimDeSemana: '',
            workShiftId: '',
            toleranciaMinutos: '5',
            inicioNoturno: '18:00',
            permitirHorasExtras100: false,
            descontoDiariaSemBatidaAutonomo: false,
            valorHoraNormalAutonomo: '',
            valorHoraExtra50Autonomo: '',
            valorHoraExtra100Autonomo: '',
            valorHoraNoturna20Autonomo: '',
            autoCalculoHorasAutonomo: true,
        });
        
        toast.success(`✅ Dados de ${usuario.name} carregados! Complete as informações.`);
    };

    const usuariosFiltrados = useMemo(() => {
        if (!buscaUsuario) return usuariosCadastrados;
        return usuariosCadastrados.filter(u => 
            u.name?.toLowerCase().includes(buscaUsuario.toLowerCase()) ||
            u.email?.toLowerCase().includes(buscaUsuario.toLowerCase())
        );
    }, [buscaUsuario, usuariosCadastrados]);

    const handleFecharModal = () => {
        setIsModalOpen(false);
        setEditandoFuncionario(null);
        setBuscaUsuario('');
        setUsuarioSelecionado(null);
        setMostrarListaUsuarios(false);
        setFuncionarioForm({
            nome: '',
            cargo: '',
            salario: '',
            dataAdmissao: new Date().toISOString().split('T')[0],
            cpf: '',
            telefone: '',
            email: '',
            status: 'Ativo',
            diaPagamento: '5',
            uniformeCamisa: '',
            uniformeCalca: '',
            uniformeBermuda: '',
            uniformeSapato: '',
            tipoContrato: 'REGISTRADO',
            salarioBase: '',
            valorHora: '',
            valorDiaria: '',
            cargaHorariaMensal: '220',
            saldoBancoHoras: '',
            codigoRelogio: '',
            trabalhaFimDeSemana: false,
            valorHoraFimDeSemana: '',
            workShiftId: '',
            toleranciaMinutos: '5',
            inicioNoturno: '18:00',
            permitirHorasExtras100: false,
            descontoDiariaSemBatidaAutonomo: false,
            valorHoraNormalAutonomo: '',
            valorHoraExtra50Autonomo: '',
            valorHoraExtra100Autonomo: '',
            valorHoraNoturna20Autonomo: '',
            autoCalculoHorasAutonomo: true,
        });
    };

    useEscapeKey(handleFecharModal, isModalOpen);
    useEscapeKey(() => setIsValeModalOpen(false), isValeModalOpen);
    useEscapeKey(() => setFuncionarioVerDados(null), !!funcionarioVerDados);
    useEscapeKey(() => { setFuncionarioHistorico(null); setHistoricoPagamentosLista([]); }, !!funcionarioHistorico);
    useEscapeKey(cancelarDelecao, showDeleteDialog);

    const handleSubmitFuncionario = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const codigoRelogioNum =
                funcionarioForm.codigoRelogio === '' || funcionarioForm.codigoRelogio === undefined
                    ? null
                    : parseInt(String(funcionarioForm.codigoRelogio).trim(), 10);
            const salarioStrNorm = String(funcionarioForm.salario || funcionarioForm.salarioBase || '')
                .trim()
                .replace(',', '.');
            const salarioUnificado =
                funcionarioForm.tipoContrato === 'AUTONOMO'
                    ? 0
                    : salarioStrNorm === ''
                      ? NaN
                      : parseFloat(salarioStrNorm);
            const parseOptDec = (s: string) => {
                const t = String(s ?? '').trim().replace(',', '.');
                if (t === '') return undefined;
                const n = parseFloat(t);
                return Number.isFinite(n) ? n : undefined;
            };
            const payload = {
                nome: funcionarioForm.nome,
                cargo: funcionarioForm.cargo,
                salario: Number.isFinite(salarioUnificado) ? salarioUnificado : 0,
                dataAdmissao: funcionarioForm.dataAdmissao,
                cpf: onlyDigits(funcionarioForm.cpf),
                telefone: funcionarioForm.telefone ? onlyDigits(funcionarioForm.telefone) : '',
                email: funcionarioForm.email,
                status: funcionarioForm.status,
                diaPagamento: funcionarioForm.diaPagamento ? parseInt(funcionarioForm.diaPagamento, 10) : undefined,
                uniformeCamisa: funcionarioForm.uniformeCamisa,
                uniformeCalca: funcionarioForm.uniformeCalca,
                uniformeBermuda: funcionarioForm.uniformeBermuda,
                uniformeSapato: funcionarioForm.uniformeSapato,
                tipoContrato: funcionarioForm.tipoContrato as 'REGISTRADO' | 'AUTONOMO',
                salarioBase:
                    funcionarioForm.tipoContrato === 'AUTONOMO'
                        ? undefined
                        : Number.isFinite(salarioUnificado)
                          ? salarioUnificado
                          : undefined,
                valorHora: funcionarioForm.valorHora ? parseFloat(funcionarioForm.valorHora) : undefined,
                valorDiaria: funcionarioForm.valorDiaria
                    ? parseFloat(funcionarioForm.valorDiaria)
                    : undefined,
                cargaHorariaMensal: funcionarioForm.cargaHorariaMensal
                    ? parseInt(funcionarioForm.cargaHorariaMensal, 10)
                    : undefined,
                saldoBancoHoras:
                    funcionarioForm.saldoBancoHoras !== '' && funcionarioForm.saldoBancoHoras != null
                        ? parseFloat(String(funcionarioForm.saldoBancoHoras))
                        : undefined,
                codigoRelogio:
                    codigoRelogioNum !== null && !Number.isNaN(codigoRelogioNum) && codigoRelogioNum > 0
                        ? codigoRelogioNum
                        : undefined,
                permitirHorasExtras100: funcionarioForm.permitirHorasExtras100 ?? false,
                descontoDiariaSemBatidaAutonomo:
                    funcionarioForm.tipoContrato === 'AUTONOMO' &&
                    (funcionarioForm.descontoDiariaSemBatidaAutonomo ?? false),
                valorHoraNormalAutonomo: parseOptDec(funcionarioForm.valorHoraNormalAutonomo),
                valorHoraExtra50Autonomo: parseOptDec(funcionarioForm.valorHoraExtra50Autonomo),
                valorHoraExtra100Autonomo: parseOptDec(funcionarioForm.valorHoraExtra100Autonomo),
                valorHoraNoturna20Autonomo: parseOptDec(funcionarioForm.valorHoraNoturna20Autonomo),
            };

            let res;
            if (editandoFuncionario) {
                res = await funcionariosService.atualizar(editandoFuncionario, payload);
            } else {
                res = await funcionariosService.criar(payload);
            }

            if (!res.success) {
                toast.error(editandoFuncionario ? 'Erro ao atualizar funcionário' : 'Erro ao cadastrar funcionário', {
                    description: (res as { error?: string }).error || 'Tente novamente',
                    duration: 4000,
                });
                return;
            }

            const funcionarioId =
                editandoFuncionario ?? (res.data as { id?: string } | undefined)?.id;
            if (funcionarioId) {
                const rawFds = String(funcionarioForm.valorHoraFimDeSemana ?? '').trim();
                const vFds = rawFds === '' ? null : parseFloat(rawFds.replace(',', '.'));
                const tol = parseInt(String(funcionarioForm.toleranciaMinutos ?? '5'), 10);
                await rhService.salvarConfigPonto(funcionarioId, {
                    trabalhaFimDeSemana: funcionarioForm.trabalhaFimDeSemana,
                    valorHoraFimDeSemana:
                        vFds !== null && Number.isFinite(vFds) ? vFds : null,
                    workShiftId:
                        typeof funcionarioForm.workShiftId === 'string' && funcionarioForm.workShiftId.trim() !== ''
                            ? funcionarioForm.workShiftId
                            : null,
                    toleranciaMinutos: Number.isFinite(tol) ? tol : 5,
                    inicioNoturno:
                        funcionarioForm.inicioNoturno && String(funcionarioForm.inicioNoturno).trim() !== ''
                            ? String(funcionarioForm.inicioNoturno)
                            : null,
                });
            }

            toast.success(
                editandoFuncionario ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!',
                {
                    description: editandoFuncionario
                        ? `${funcionarioForm.nome} foi atualizado no sistema`
                        : `${funcionarioForm.nome} foi adicionado ao quadro de funcionários`,
                    duration: 4000,
                },
            );
            handleFecharModal();
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao salvar funcionário:', error);
            toast.error(editandoFuncionario ? 'Erro ao atualizar funcionário' : 'Erro ao cadastrar funcionário', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    const handleSubmitVale = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await valesService.criar({
                ...valeForm,
                valor: parseFloat(valeForm.valor)
            });
            const funcionario = funcionarios.find(f => f.id === valeForm.funcionarioId);
            toast.success('Vale registrado com sucesso!', {
                description: `${valeForm.tipo} de R$ ${parseFloat(valeForm.valor).toFixed(2)} para ${funcionario?.nome}`,
                duration: 4000,
            });
            setIsValeModalOpen(false);
            setValeForm({
                funcionarioId: '',
                tipo: 'Vale Transporte',
                valor: '',
                data: new Date().toISOString().split('T')[0],
                descricao: ''
            });
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao registrar vale:', error);
            toast.error('Erro ao registrar vale', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Header RH */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Recursos Humanos</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsBeneficiosModalOpen(true)}
                        className="btn-outline flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Benefícios
                    </button>
                    <button
                        onClick={() => setIsValeModalOpen(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Registrar Vale
                    </button>
                    <button
                        onClick={handleAbrirModalNovo}
                        className="btn-success flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar Funcionário
                    </button>
                </div>
            </div>

            {/* Tabs de Navegação */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('funcionarios')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                            activeTab === 'funcionarios'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <UsersIcon className="w-5 h-5" />
                        Funcionários
                    </button>
                    <button
                        onClick={() => setActiveTab('estoque')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                            activeTab === 'estoque'
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Estoque de Recursos Humanos
                    </button>
                </div>
            </div>

            {activeTab === 'funcionarios' && (
                <>
                    {/* Métricas RH */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                            <p className="text-sm font-medium text-blue-700">Folha de Pagamento</p>
                            <p className="text-2xl font-bold text-blue-900">
                                R$ {(metricas.folhaPagamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">Mensal</p>
                        </div>
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                            <p className="text-sm font-medium text-green-700">Vales do Mês</p>
                            <p className="text-2xl font-bold text-green-900">
                                R$ {(metricas.valesMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                            <p className="text-sm font-medium text-purple-700">Custo Total</p>
                            <p className="text-2xl font-bold text-purple-900">
                                R$ {(metricas.custoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Seletor de competência (mês/ano) */}
                    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 mb-6 flex items-center gap-4">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Competência:</label>
                        <input
                            type="month"
                            className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100"
                            value={rhCompetencia}
                            onChange={(e) => setRhCompetencia(e.target.value)}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Selecione o mês/ano para visualizar folhas e importações
                        </span>
                    </div>

                    <div className="card-primary border-2 border-dashed border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Importar presença do relógio</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Envie <strong>.xls</strong> ou <strong>.xlsx</strong> (aba &quot;Registro de Presença&quot;). O backend usa{' '}
                            <strong>SheetJS (xlsx)</strong> em <code className="text-xs bg-white/80 dark:bg-black/30 px-1 rounded">ponto-import.parser</code>, depois grava em{' '}
                            <em>RegistroPonto</em>. Cada colaborador precisa do <strong>código no relógio</strong> cadastrado.
                        </p>
                        <div className="flex flex-wrap gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Ano (opcional)</label>
                                <input
                                    type="number"
                                    className="w-28 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card"
                                    value={pontoImportAno}
                                    onChange={(ev) => setPontoImportAno(ev.target.value)}
                                    min={2000}
                                    max={2100}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Mês 1–12 (opcional)</label>
                                <input
                                    type="number"
                                    className="w-24 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card"
                                    value={pontoImportMes}
                                    onChange={(ev) => setPontoImportMes(ev.target.value)}
                                    min={1}
                                    max={12}
                                />
                            </div>
                            <input
                                ref={pontoFileInputRef}
                                type="file"
                                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={handleImportarPontoArquivo}
                            />
                            <button
                                type="button"
                                disabled={pontoImportBusy}
                                onClick={() => pontoFileInputRef.current?.click()}
                                className="btn-success inline-flex items-center gap-2 disabled:opacity-60"
                            >
                                {pontoImportBusy ? (
                                    <>Processando…</>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Selecionar arquivo e importar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Tabela de Funcionários */}
            <div className="card-primary">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Funcionários Cadastrados</h3>
                {funcionarios.length === 0 ? (
                    <div className="text-center py-12">
                        <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum funcionário cadastrado</p>
                        <button
                            onClick={handleAbrirModalNovo}
                            className="mt-4 btn-success inline-flex items-center gap-2"
                        >
                            Cadastrar Primeiro Funcionário
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nome</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Cargo</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vínculo</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Remuneração</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                                        Total folha
                                        <span className="block font-normal normal-case text-[10px] text-gray-500">
                                            ({rhCompetencia})
                                        </span>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {funcionarios.map((func) => {
                                    const resumoLinha = metricas.porFuncionario?.find((p) => p.funcionarioId === func.id);
                                    const tipo = func.tipoContrato === 'AUTONOMO' ? 'AUTONOMO' : 'REGISTRADO';
                                    const rhMasked = !!metricas.masked;
                                    return (
                                    <tr key={func.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">{func.nome}</td>
                                        <td className="px-6 py-4 text-gray-600">{func.cargo}</td>
                                        <td className="px-6 py-4 text-gray-800 text-sm">
                                            {tipo === 'AUTONOMO' ? 'Autônomo' : 'Registrado'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900 text-sm">
                                            {rhMasked ? (
                                                <span className="text-gray-400">—</span>
                                            ) : tipo === 'AUTONOMO' ? (
                                                <>
                                                    R${' '}
                                                    {Number(func.valorDiaria ?? 0).toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                    /dia
                                                </>
                                            ) : (
                                                <>
                                                    R${' '}
                                                    {Number(
                                                        resumoLinha?.salarioBase ??
                                                            func.salarioBase ??
                                                            func.salario ??
                                                            0
                                                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                                                    <span className="text-xs font-normal text-gray-500">(base)</span>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                                            {func.status !== 'Ativo' ? (
                                                <span className="text-gray-400 font-normal text-xs">—</span>
                                            ) : rhMasked ? (
                                                <span className="text-gray-400">—</span>
                                            ) : (
                                                <>
                                                    R${' '}
                                                    {Number(resumoLinha?.totalAPagar ?? 0).toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                func.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {func.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleVerDadosColaborador(func)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Ver dados
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAbrirHistoricoPagamentos(func)}
                                                    className="text-amber-600 hover:text-amber-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Histórico
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDetalharFolha(func)}
                                                    className="text-emerald-600 hover:text-emerald-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h4l2 2h10a1 1 0 011 1v2H3V4z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9h18v8a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
                                                    </svg>
                                                    Detalhar Folha
                                                </button>
                                                <button 
                                                    onClick={() => handleAbrirModalEdicao(func)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Editar
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletarFuncionario(func.id, func.nome)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Deletar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Adicionar/Editar Funcionário */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && handleFecharModal()}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className={`relative p-6 border-b border-gray-200 dark:border-dark-border shrink-0 ${editandoFuncionario ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
                            <h2 className="text-2xl font-bold text-white pr-10">
                                {editandoFuncionario ? 'Editar Funcionário' : 'Adicionar Funcionário'}
                            </h2>
                            <p className="text-sm text-white/90 mt-1">
                                {editandoFuncionario ? 'Atualize os dados do colaborador' : 'Preencha os dados para cadastrar um novo colaborador'}
                            </p>
                            <button type="button" onClick={handleFecharModal} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmitFuncionario} className="flex flex-col flex-1 min-h-0">
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {/* Busca Rápida */}
                  {!editandoFuncionario && (
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <label className="block text-sm font-semibold text-blue-900 mb-2">
                        🔍 Busca Rápida de Usuário (Opcional)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={buscaUsuario}
                          onChange={(e) => {
                            setBuscaUsuario(e.target.value);
                            setMostrarListaUsuarios(true);
                            setUsuarioSelecionado(null);
                          }}
                          onFocus={() => setMostrarListaUsuarios(true)}
                          placeholder="Digite nome ou email de um usuário cadastrado..."
                          className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />

                        {mostrarListaUsuarios && usuariosFiltrados.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-300 rounded-xl shadow-xl max-h-72 overflow-y-auto z-10">
                            {usuariosFiltrados.slice(0, 20).map((usuario) => (
                              <button
                                key={usuario.id}
                                type="button"
                                onClick={() => handleSelecionarUsuario(usuario)}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {usuario.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{usuario.name}</p>
                                    <p className="text-xs text-gray-600">{usuario.email}</p>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                    usuario.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                    usuario.role === 'gerente' ? 'bg-blue-100 text-blue-700' :
                                    usuario.role === 'eletricista' ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {usuario.role}
                                  </span>
                                </div>
                              </button>
                            ))}
                            {usuariosFiltrados.length > 20 && (
                              <div className="p-3 text-center text-xs text-gray-500">
                                Mostrando 20 de {usuariosFiltrados.length} resultados. Refinar busca para ver mais.
                              </div>
                            )}
                          </div>
                        )}

                        {usuarioSelecionado && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-green-800 font-medium">
                              Usuário vinculado: <strong>{usuarioSelecionado.name}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUsuarioSelecionado(null);
                                setBuscaUsuario('');
                                setFuncionarioForm({
                                  nome: '',
                                  cargo: '',
                                  salario: '',
                                  dataAdmissao: new Date().toISOString().split('T')[0],
                                  cpf: '',
                                  telefone: '',
                                  email: '',
                                  status: 'Ativo',
                                  diaPagamento: '5',
                                  uniformeCamisa: '',
                                  uniformeCalca: '',
                                  uniformeBermuda: '',
                                  uniformeSapato: '',
                                  tipoContrato: 'REGISTRADO',
                                  salarioBase: '',
                                  valorHora: '',
                                  valorDiaria: '',
                                  cargaHorariaMensal: '220',
                                  saldoBancoHoras: '',
                                  codigoRelogio: '',
                                  trabalhaFimDeSemana: false,
                                  valorHoraFimDeSemana: '',
                                  workShiftId: '',
                                  toleranciaMinutos: '5',
                                  inicioNoturno: '18:00',
                                  permitirHorasExtras100: false,
                                  descontoDiariaSemBatidaAutonomo: false,
                                  valorHoraNormalAutonomo: '',
                                  valorHoraExtra50Autonomo: '',
                                  valorHoraExtra100Autonomo: '',
                                  valorHoraNoturna20Autonomo: '',
                                  autoCalculoHorasAutonomo: true,
                                });
                              }}
                              className="ml-auto text-red-600 hover:text-red-700 text-xs font-semibold"
                            >
                              ✕ Limpar
                            </button>
                          </div>
                        )}

                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        💡 Digite para buscar um usuário existente e preencher automaticamente nome e email
                      </p>
                    </div>
                  )}

                  {/* Campos do formulário (mantidos) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={funcionarioForm.nome}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, nome: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cargo *</label>
                      <input
                        type="text"
                        required
                        value={funcionarioForm.cargo}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, cargo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {funcionarioForm.tipoContrato === 'REGISTRADO' ? 'Salário (CLT) *' : 'Salário fixo (apenas CLT)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required={funcionarioForm.tipoContrato === 'REGISTRADO'}
                        value={funcionarioForm.tipoContrato === 'AUTONOMO' ? '0' : funcionarioForm.salario}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFuncionarioForm({ ...funcionarioForm, salario: v, salarioBase: v });
                        }}
                        disabled={funcionarioForm.tipoContrato === 'AUTONOMO'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-dark-hover disabled:text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {funcionarioForm.tipoContrato === 'REGISTRADO'
                          ? 'O mesmo valor é usado em Salário base (folha), abaixo.'
                          : 'Autônomo: remuneração vem das diárias e dos valores de hora (seção abaixo). Mantido 0 aqui.'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Admissão *</label>
                      <input
                        type="date"
                        required
                        value={funcionarioForm.dataAdmissao}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, dataAdmissao: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CPF *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        required
                        maxLength={14}
                        placeholder="000.000.000-00"
                        value={funcionarioForm.cpf}
                        onChange={(e) =>
                          setFuncionarioForm({ ...funcionarioForm, cpf: maskCpf(e.target.value) })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        maxLength={16}
                        placeholder="(11) 22334-4556"
                        value={funcionarioForm.telefone}
                        onChange={(e) =>
                          setFuncionarioForm({ ...funcionarioForm, telefone: maskTelefoneBr(e.target.value) })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                      <input
                        type="email"
                        value={funcionarioForm.email}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dia do pagamento (mês) *</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={funcionarioForm.diaPagamento}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, diaPagamento: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 5"
                      />
                      <p className="text-xs text-gray-500 mt-1">Dia do mês em que o salário vence em Contas a Pagar (1-31)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={funcionarioForm.status}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Férias">Férias</option>
                        <option value="Afastado">Afastado</option>
                      </select>
                    </div>

                    <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Configuração de contrato e folha</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Contrato</label>
                          <select
                            value={funcionarioForm.tipoContrato}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFuncionarioForm((prev) => {
                                const next = {
                                  ...prev,
                                  tipoContrato: v,
                                  ...(v === 'AUTONOMO'
                                    ? { salario: '0', salarioBase: '0' }
                                    : {}),
                                };
                                if (v === 'AUTONOMO' && String(next.valorDiaria ?? '').trim() !== '') {
                                  return aplicarCalculoHorasAutonomoPorDiaria(next, next.valorDiaria);
                                }
                                return next;
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="REGISTRADO">Registrado (CLT)</option>
                            <option value="AUTONOMO">Autônomo</option>
                          </select>
                        </div>
                        {funcionarioForm.tipoContrato === 'REGISTRADO' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Salário base (folha)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={funcionarioForm.salarioBase}
                            onChange={(e) => {
                              const v = e.target.value;
                              setFuncionarioForm({ ...funcionarioForm, salarioBase: v, salario: v });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Espelha o salário acima"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Sincronizado com o campo Salário (CLT).</p>
                        </div>
                        )}
                        {funcionarioForm.tipoContrato === 'AUTONOMO' && (
                          <div className="md:col-span-3 space-y-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/15 p-4">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                              Autônomo — diária e valores de hora
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-300/90">
                              Com <strong>valores de hora</strong>, a folha usa <strong>diária × dias úteis com ponto</strong> (seg–sex, exceto
                              feriados) como base; horas em jornada 8h–17h30 nesses dias entram só para auditoria. Acréscimos: HE 50%, noturna
                              (após 18h) e domingo/feriado. Sem tarifas, vale o modelo legado (diária + FDS por hora).
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Valor da diária (dias úteis com ponto)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={funcionarioForm.valorDiaria}
                                  onChange={(e) =>
                                    setFuncionarioForm((prev) =>
                                      aplicarCalculoHorasAutonomoPorDiaria(
                                        { ...prev, valorDiaria: e.target.value },
                                        e.target.value,
                                      ),
                                    )
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card"
                                  placeholder="Seg–Sex (exceto feriado): 1 dia com ponto = 1 diária quando há tarifas de hora"
                                />
                                <label className="mt-2 inline-flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-amber-300"
                                        checked={funcionarioForm.autoCalculoHorasAutonomo ?? true}
                                        onChange={(e) =>
                                            setFuncionarioForm((prev) => {
                                                const next = {
                                                    ...prev,
                                                    autoCalculoHorasAutonomo: e.target.checked,
                                                };
                                                if (e.target.checked) {
                                                    return aplicarCalculoHorasAutonomoPorDiaria(
                                                        next,
                                                        String(next.valorDiaria ?? ''),
                                                    );
                                                }
                                                return next;
                                            })
                                        }
                                    />
                                    Auto calcular valores de hora pela diária
                                </label>
                                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-1">
                                    {funcionarioForm.autoCalculoHorasAutonomo
                                        ? 'Automático ativo: normal = diária/8, HE50 = 1,5x, HE100 = 2x, noturna = +20%.'
                                        : 'Automático desativado: valores de hora podem ser preenchidos manualmente.'}
                                </p>
                                <label className="mt-2 flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 rounded border-gray-300"
                                        checked={funcionarioForm.descontoDiariaSemBatidaAutonomo ?? false}
                                        onChange={(e) =>
                                            setFuncionarioForm({
                                                ...funcionarioForm,
                                                descontoDiariaSemBatidaAutonomo: e.target.checked,
                                            })
                                        }
                                    />
                                    <span>
                                        Descontar uma diária na folha (lançamento <strong>Falta</strong>) em cada dia útil
                                        (seg–sex, exceto feriados) <strong>sem batida no ponto</strong>, após importar o
                                        arquivo de presença. Valor = diária cadastrada acima.
                                    </span>
                                </label>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Valor hora normal (seg a sex, jornada 8h–17h30)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={funcionarioForm.valorHoraNormalAutonomo}
                                  onChange={(e) =>
                                    setFuncionarioForm({ ...funcionarioForm, valorHoraNormalAutonomo: e.target.value })
                                  }
                                  disabled={funcionarioForm.autoCalculoHorasAutonomo}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card"
                                  placeholder="Também usado no sábado (hora integral)"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Valor hora 50% (fora de 8h–17h30, até 18h)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={funcionarioForm.valorHoraExtra50Autonomo}
                                  onChange={(e) =>
                                    setFuncionarioForm({ ...funcionarioForm, valorHoraExtra50Autonomo: e.target.value })
                                  }
                                  disabled={funcionarioForm.autoCalculoHorasAutonomo}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Valor hora 100% (domingos e feriados — calendário BR)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={funcionarioForm.valorHoraExtra100Autonomo}
                                  onChange={(e) =>
                                    setFuncionarioForm({ ...funcionarioForm, valorHoraExtra100Autonomo: e.target.value })
                                  }
                                  disabled={funcionarioForm.autoCalculoHorasAutonomo}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Valor hora noturna (após 18h, batida no ponto)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={funcionarioForm.valorHoraNoturna20Autonomo}
                                  onChange={(e) =>
                                    setFuncionarioForm({ ...funcionarioForm, valorHoraNoturna20Autonomo: e.target.value })
                                  }
                                  disabled={funcionarioForm.autoCalculoHorasAutonomo}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card"
                                  placeholder="Inclui adicional noturno acordado"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Valor hora (fallback legado — FDS se não usar tarifas acima)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={funcionarioForm.valorHora}
                                  onChange={(e) => setFuncionarioForm({ ...funcionarioForm, valorHora: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card"
                                  placeholder="Usado só no modo legado (diária + FDS)"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {funcionarioForm.tipoContrato === 'REGISTRADO' && (
                          <>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Carga horária mensal (CLT)</label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={funcionarioForm.cargaHorariaMensal}
                            onChange={(e) =>
                              setFuncionarioForm({ ...funcionarioForm, cargaHorariaMensal: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-card"
                            placeholder="220"
                          />
                          <p className="text-xs text-gray-500 mt-0.5">Base para banco de horas (ex.: 220h).</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Saldo banco de horas (CLT)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={funcionarioForm.saldoBancoHoras}
                            onChange={(e) =>
                              setFuncionarioForm({ ...funcionarioForm, saldoBancoHoras: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-card"
                            placeholder="Horas acumuladas"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Jornada padrão (WorkShift)</label>
                          <select
                            value={funcionarioForm.workShiftId}
                            onChange={(e) => setFuncionarioForm({ ...funcionarioForm, workShiftId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-card"
                          >
                            <option value="">Sem jornada vinculada</option>
                            {workShifts.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nome} ({s.entrada1}-{s.saida1} / {s.entrada2}-{s.saida2})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Tolerância (minutos)</label>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            step={1}
                            value={funcionarioForm.toleranciaMinutos}
                            onChange={(e) =>
                              setFuncionarioForm({ ...funcionarioForm, toleranciaMinutos: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-card"
                            placeholder="5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Início noturno (HH:mm)</label>
                          <input
                            type="text"
                            value={funcionarioForm.inicioNoturno}
                            onChange={(e) =>
                              setFuncionarioForm({ ...funcionarioForm, inicioNoturno: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-card"
                            placeholder="18:00"
                          />
                        </div>
                          <div className="md:col-span-3">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={funcionarioForm.permitirHorasExtras100 ?? false}
                                onChange={(e) =>
                                  setFuncionarioForm({ ...funcionarioForm, permitirHorasExtras100: e.target.checked })
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              Pagar HE 100% em domingos/feriados (se desmarcado, horas vão para banco de horas)
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                              Quando marcado, horas trabalhadas em domingos e feriados são pagas com adicional de 100%.
                            </p>
                          </div>
                          </>
                        )}
                        {funcionarioForm.tipoContrato === 'AUTONOMO' && (
                          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={funcionarioForm.trabalhaFimDeSemana}
                                onChange={(e) =>
                                  setFuncionarioForm({ ...funcionarioForm, trabalhaFimDeSemana: e.target.checked })
                                }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              Trabalha em finais de semana (referência operacional)
                            </label>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Valor hora fim de semana (autônomo)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={funcionarioForm.valorHoraFimDeSemana}
                                onChange={(e) =>
                                  setFuncionarioForm({
                                    ...funcionarioForm,
                                    valorHoraFimDeSemana: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-card"
                                placeholder="Se vazio, usa Valor Hora do cadastro"
                              />
                              <p className="text-xs text-gray-500 mt-0.5">
                                Usado na folha para horas de sáb/domingo. Salvo em configuração de ponto.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Código no relógio de ponto
                          </label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={funcionarioForm.codigoRelogio}
                            onChange={(e) =>
                              setFuncionarioForm({ ...funcionarioForm, codigoRelogio: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-card"
                            placeholder="Ex.: 4 — ID Nº I no XLS de presença"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Opcional. Deve coincidir com o ID do arquivo de presença para importar batidas automaticamente.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Tamanhos de uniforme</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Camisa</label>
                          <input
                            type="text"
                            value={funcionarioForm.uniformeCamisa}
                            onChange={(e) => setFuncionarioForm({ ...funcionarioForm, uniformeCamisa: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="P, M, G..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Calça</label>
                          <input
                            type="text"
                            value={funcionarioForm.uniformeCalca}
                            onChange={(e) => setFuncionarioForm({ ...funcionarioForm, uniformeCalca: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="38, 40..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bermuda</label>
                          <input
                            type="text"
                            value={funcionarioForm.uniformeBermuda}
                            onChange={(e) => setFuncionarioForm({ ...funcionarioForm, uniformeBermuda: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="38, 40..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Sapato</label>
                          <input
                            type="text"
                            value={funcionarioForm.uniformeSapato}
                            onChange={(e) => setFuncionarioForm({ ...funcionarioForm, uniformeSapato: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="39, 40..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 shrink-0 bg-gray-50 dark:bg-dark-hover/30">
                          <button type="button" onClick={handleFecharModal} className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors">
                            Cancelar
                          </button>
                          <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-semibold shadow-md transition-colors">
                            {editandoFuncionario ? 'Atualizar' : 'Cadastrar'}
                          </button>
                        </div>
                </form>
                    </div>
                </div>
            )}

            {/* Modal Registrar Vale */}
            {isValeModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-900">Registrar Vale</h3>
                        </div>
                        <form onSubmit={handleSubmitVale} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Funcionário *</label>
                                <select
                                    required
                                    value={valeForm.funcionarioId}
                                    onChange={(e) => setValeForm({ ...valeForm, funcionarioId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="">Selecione...</option>
                                    {funcionarios.map(f => (
                                        <option key={f.id} value={f.id}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                                <select
                                    required
                                    value={valeForm.tipo}
                                    onChange={(e) => setValeForm({ ...valeForm, tipo: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="Vale Transporte">Vale Transporte</option>
                                    <option value="Vale Alimentação">Vale Alimentação</option>
                                    <option value="Adiantamento">Adiantamento</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={valeForm.valor}
                                    onChange={(e) => setValeForm({ ...valeForm, valor: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                                <input
                                    type="date"
                                    required
                                    value={valeForm.data}
                                    onChange={(e) => setValeForm({ ...valeForm, data: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                                <textarea
                                    value={valeForm.descricao}
                                    onChange={(e) => setValeForm({ ...valeForm, descricao: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsValeModalOpen(false)} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    Registrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Benefícios */}
            {isBeneficiosModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-gray-900">Benefícios</h3>
                            <button
                                type="button"
                                onClick={() => { setIsBeneficiosModalOpen(false); setBeneficioEmEdicao(null); }}
                                className="p-2 text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        const payload = {
                                            nome: beneficioForm.nome,
                                            valorPadrao: parseFloat(beneficioForm.valorPadrao),
                                            ativo: beneficioForm.ativo,
                                        };
                                        if (beneficioEmEdicao) {
                                            await beneficiosService.atualizar(beneficioEmEdicao.id, payload);
                                            toast.success('Benefício atualizado com sucesso');
                                        } else {
                                            await beneficiosService.criar(payload);
                                            toast.success('Benefício criado com sucesso');
                                        }
                                        setBeneficioEmEdicao(null);
                                        setBeneficioForm({ nome: '', valorPadrao: '', ativo: true });
                                        const resp = await beneficiosService.listar();
                                        setBeneficios(Array.isArray(resp?.data) ? resp.data : []);
                                    } catch (error) {
                                        console.error('Erro ao salvar benefício:', error);
                                        toast.error('Erro ao salvar benefício');
                                    }
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                    <input
                                        type="text"
                                        required
                                        value={beneficioForm.nome}
                                        onChange={(e) => setBeneficioForm({ ...beneficioForm, nome: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor Padrão (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={beneficioForm.valorPadrao}
                                        onChange={(e) => setBeneficioForm({ ...beneficioForm, valorPadrao: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="beneficio-ativo"
                                        type="checkbox"
                                        checked={beneficioForm.ativo}
                                        onChange={(e) => setBeneficioForm({ ...beneficioForm, ativo: e.target.checked })}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="beneficio-ativo" className="text-sm text-gray-700">
                                        Ativo
                                    </label>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBeneficioEmEdicao(null);
                                            setBeneficioForm({ nome: '', valorPadrao: '', ativo: true });
                                        }}
                                        className="flex-1 btn-secondary"
                                    >
                                        Limpar
                                    </button>
                                    <button type="submit" className="flex-1 btn-success">
                                        {beneficioEmEdicao ? 'Atualizar' : 'Adicionar'}
                                    </button>
                                </div>
                            </form>

                            <div className="border-t border-gray-200 pt-4">
                                <h4 className="text-sm font-semibold text-gray-800 mb-2">Benefícios cadastrados</h4>
                                {beneficios.length === 0 ? (
                                    <p className="text-sm text-gray-500">Nenhum benefício cadastrado.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {beneficios.map((b) => (
                                            <div
                                                key={b.id}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{b.nome}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Valor padrão:{' '}
                                                        {Number(b.valorPadrao).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}{' '}
                                                        • {b.ativo ? 'Ativo' : 'Inativo'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setBeneficioEmEdicao(b);
                                                            setBeneficioForm({
                                                                nome: b.nome,
                                                                valorPadrao: String(b.valorPadrao),
                                                                ativo: b.ativo,
                                                            });
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                await beneficiosService.deletar(b.id);
                                                                toast.success('Benefício excluído');
                                                                const resp = await beneficiosService.listar();
                                                                setBeneficios(Array.isArray(resp?.data) ? resp.data : []);
                                                            } catch (error) {
                                                                console.error('Erro ao excluir benefício:', error);
                                                                toast.error('Erro ao excluir benefício');
                                                            }
                                                        }}
                                                        className="text-red-600 hover:text-red-800 text-xs font-semibold"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalhar Folha do Mês */}
            {funcionarioFolha && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong w-full max-w-[min(96rem,calc(100vw-1rem))] max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-emerald-600 to-emerald-700 shrink-0">
                            <h3 className="text-xl font-bold text-white pr-10">Folha do mês</h3>
                            <p className="text-sm text-emerald-100 mt-1">{funcionarioFolha.nome}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setFuncionarioFolha(null);
                                    setFolhaDetalhada(null);
                                    setFolhaMesRef(null);
                                }}
                                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {/* Seletor de competência no modal */}
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-dark-border">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Competência:</label>
                                <input
                                    type="month"
                                    className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 text-sm"
                                    value={folhaMesRef ?? ''}
                                    onChange={async (e) => {
                                        const novoMes = e.target.value;
                                        setFolhaMesRef(novoMes);
                                        setFolhaDetalhada(null);
                                        try {
                                            const resp = await axiosApiService.get(`/api/rh/folha/${funcionarioFolha.id}/${novoMes}`);
                                            const folha =
                                                resp && typeof resp === 'object' && 'data' in resp && (resp as any).data != null
                                                    ? (resp as any).data
                                                    : null;
                                            setFolhaDetalhada(folha);
                                        } catch (err) {
                                            console.error('Erro ao carregar folha:', err);
                                            toast.error('Erro ao carregar folha do mês');
                                        }
                                    }}
                                />
                            </div>
                            {!folhaDetalhada ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Carregando detalhes da folha...</p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <span className="font-semibold text-gray-600 dark:text-gray-400">Horas normais:</span>
                                            <p className="text-gray-900 dark:text-gray-100">
                                                <span className="font-mono">{decimalHoursToHHmm(folhaDetalhada.horas.normais)}</span>{' '}
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    ({folhaDetalhada.horas.normais.toFixed(2)} h)
                                                </span>
                                            </p>
                                            {folhaDetalhada.tipoContrato === 'AUTONOMO' &&
                                                folhaDetalhada.autonomo?.modo === 'por_hora' && (
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                                                        Auditoria: horas em jornada/sábado registradas no ponto. O valor base do mês usa{' '}
                                                        <strong>diária × dias úteis</strong> (seg–sex, exceto feriados), não esta quantidade ×
                                                        valor hora.
                                                    </p>
                                                )}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-600 dark:text-gray-400">Horas extras 50%:</span>
                                            <p className="text-gray-900 dark:text-gray-100">
                                                <span className="font-mono">{decimalHoursToHHmm(folhaDetalhada.horas.extras50)}</span>{' '}
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    ({folhaDetalhada.horas.extras50.toFixed(2)} h)
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-600 dark:text-gray-400">Horas extras 100%:</span>
                                            <p className="text-gray-900 dark:text-gray-100">
                                                <span className="font-mono">{decimalHoursToHHmm(folhaDetalhada.horas.extras100)}</span>{' '}
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    ({folhaDetalhada.horas.extras100.toFixed(2)} h)
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-600 dark:text-gray-400">Horas fim de semana:</span>
                                            <p className="text-gray-900 dark:text-gray-100">
                                                <span className="font-mono">{decimalHoursToHHmm(folhaDetalhada.horas.fimDeSemana)}</span>{' '}
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    ({folhaDetalhada.horas.fimDeSemana.toFixed(2)} h)
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-600 dark:text-gray-400">Salário base:</span>
                                            <p className="text-gray-900 dark:text-gray-100">
                                                {Number(folhaDetalhada.valores.salarioBase).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-600 dark:text-gray-400">Valor hora base:</span>
                                            <p className="text-gray-900 dark:text-gray-100">
                                                {Number(folhaDetalhada.valores.valorHoraBase).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-dark-border pt-4 space-y-2 text-sm">
                                        <p className="font-semibold text-gray-700 dark:text-gray-300">Resumo de valores</p>
                                        {folhaDetalhada.tipoContrato === 'AUTONOMO' &&
                                        folhaDetalhada.autonomo?.modo === 'por_hora' ? (
                                            <>
                                                <p className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Diárias (dias úteis com ponto, exceto feriado)
                                                    </span>
                                                    <span className="text-gray-900 dark:text-gray-100">
                                                        {folhaDetalhada.autonomo.diasUteisComRegistro} ×{' '}
                                                        {Number(folhaDetalhada.autonomo.valorDiaria).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}{' '}
                                                        ={' '}
                                                        {Number(folhaDetalhada.autonomo.subtotalDiarias).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                                {(Number(folhaDetalhada.autonomo.subtotalSabado ?? 0) > 0 ||
                                                    (folhaDetalhada.autonomo.horasSabado ?? 0) > 0) && (
                                                    <p className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">Sábado (hora normal)</span>
                                                        <span className="text-gray-900 dark:text-gray-100">
                                                            {(folhaDetalhada.autonomo.horasSabado ?? 0).toFixed(2)} h →{' '}
                                                            {Number(folhaDetalhada.autonomo.subtotalSabado ?? 0).toLocaleString('pt-BR', {
                                                                style: 'currency',
                                                                currency: 'BRL',
                                                            })}
                                                        </span>
                                                    </p>
                                                )}
                                                <p className="flex justify-between font-medium border-b border-gray-100 dark:border-dark-border pb-2">
                                                    <span className="text-gray-700 dark:text-gray-300">Total base (diárias + sábado)</span>
                                                    <span className="text-gray-900 dark:text-gray-100">
                                                        {Number(folhaDetalhada.valores.valorHorasNormais).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                                                    Acréscimos por HE 50%, noturna e domingo/feriado aparecem na caixa &quot;Acréscimos
                                                    automáticos&quot; abaixo, somados ao total a pagar.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Horas normais</span>
                                                    <span className="text-gray-900 dark:text-gray-100">
                                                        {Number(folhaDetalhada.valores.valorHorasNormais).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                                <p className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Horas extras 50%</span>
                                                    <span className="text-gray-900 dark:text-gray-100">
                                                        {Number(folhaDetalhada.valores.valorHorasExtras50).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                                <p className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Horas extras 100%</span>
                                                    <span className="text-gray-900 dark:text-gray-100">
                                                        {Number(folhaDetalhada.valores.valorHorasExtras100).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                                {folhaDetalhada.valores.valorHorasNoturnaAutonomo != null &&
                                                    folhaDetalhada.valores.valorHorasNoturnaAutonomo > 0 && (
                                                        <p className="flex justify-between">
                                                            <span className="text-gray-600 dark:text-gray-400">Hora noturna (autônomo)</span>
                                                            <span className="text-gray-900 dark:text-gray-100">
                                                                {Number(folhaDetalhada.valores.valorHorasNoturnaAutonomo).toLocaleString(
                                                                    'pt-BR',
                                                                    {
                                                                        style: 'currency',
                                                                        currency: 'BRL',
                                                                    },
                                                                )}
                                                            </span>
                                                        </p>
                                                    )}
                                            </>
                                        )}
                                        {folhaDetalhada.autonomo && folhaDetalhada.autonomo.modo === 'legacy' && (
                                            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-1 text-xs">
                                                <p className="font-semibold text-emerald-900 dark:text-emerald-200">Autônomo — diárias + fim de semana (legado)</p>
                                                <p className="flex justify-between">
                                                    <span>Dias úteis com ponto × diária</span>
                                                    <span>
                                                        {folhaDetalhada.autonomo.diasUteisComRegistro} ×{' '}
                                                        {Number(folhaDetalhada.autonomo.valorDiaria).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}{' '}
                                                        ={' '}
                                                        {Number(folhaDetalhada.autonomo.subtotalDiarias).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                                <p className="flex justify-between">
                                                    <span>Horas FDS × valor hora FDS</span>
                                                    <span>
                                                        {folhaDetalhada.horas.fimDeSemana.toFixed(2)} h ×{' '}
                                                        {Number(folhaDetalhada.autonomo.valorHoraFimDeSemana).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}{' '}
                                                        ={' '}
                                                        {Number(folhaDetalhada.autonomo.subtotalFimDeSemana).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                        {folhaDetalhada.autonomo && folhaDetalhada.autonomo.modo === 'por_hora' && (
                                            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-2 text-xs">
                                                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                                                    Autônomo — auditoria de horas (ponto)
                                                </p>
                                                <p className="flex justify-between gap-2">
                                                    <span className="text-emerald-800/90 dark:text-emerald-200/90">
                                                        Horas em jornada 8h–17h30 (seg–sex, exceto feriado)
                                                    </span>
                                                    <span className="font-mono shrink-0">
                                                        {decimalHoursToHHmm(folhaDetalhada.autonomo.horasNormaisJornadaAuditoria ?? 0)}
                                                        <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70 ml-1">
                                                            ({(folhaDetalhada.autonomo.horasNormaisJornadaAuditoria ?? 0).toFixed(2)} h)
                                                        </span>
                                                    </span>
                                                </p>
                                                {(folhaDetalhada.autonomo.horasSabado ?? 0) > 0 && (
                                                    <p className="flex justify-between gap-2">
                                                        <span className="text-emerald-800/90 dark:text-emerald-200/90">
                                                            Horas em sábado (pagas por valor hora normal)
                                                        </span>
                                                        <span className="font-mono shrink-0">
                                                            {decimalHoursToHHmm(folhaDetalhada.autonomo.horasSabado ?? 0)}
                                                            <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70 ml-1">
                                                                ({(folhaDetalhada.autonomo.horasSabado ?? 0).toFixed(2)} h)
                                                            </span>
                                                        </span>
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 border-t border-emerald-200/60 dark:border-emerald-800/40 pt-2">
                                                    Soma para conferência (jornada + sábado):{' '}
                                                    <strong>{decimalHoursToHHmm(folhaDetalhada.autonomo.horasHoraNormal ?? 0)}</strong>{' '}
                                                    ({(folhaDetalhada.autonomo.horasHoraNormal ?? 0).toFixed(2)} h) — alinhada ao quadro
                                                    &quot;Horas normais&quot; acima.
                                                </p>
                                            </div>
                                        )}
                                        {folhaDetalhada.registrado && (
                                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2 text-xs">
                                                <p className="font-semibold text-blue-900 dark:text-blue-200">CLT — salário fixo + banco de horas</p>
                                                <p>
                                                    Carga mensal: {folhaDetalhada.registrado.cargaHorariaMensal} h · Trabalhadas:{' '}
                                                    <span className="font-mono">{decimalHoursToHHmm(folhaDetalhada.registrado.horasTrabalhadasNoMes)}</span>{' '}
                                                    ({folhaDetalhada.registrado.horasTrabalhadasNoMes.toFixed(2)} h) · Excedente total p/ banco:{' '}
                                                    <span className="font-mono">{decimalHoursToHHmm(folhaDetalhada.registrado.horasExcedentesParaBanco)}</span>{' '}
                                                    ({folhaDetalhada.registrado.horasExcedentesParaBanco.toFixed(2)} h)
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-md bg-white/60 dark:bg-dark-card/30 p-2 border border-blue-100/80 dark:border-blue-900/40">
                                                    <div>
                                                        <span className="text-[10px] font-semibold text-blue-800/90 dark:text-blue-200">
                                                            Excedente (jornada / não 100%)
                                                        </span>
                                                        <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                                            {decimalHoursToHHmm(
                                                                Number(folhaDetalhada.registrado.horasExcedentesNormaisCompetencia ?? 0),
                                                            )}
                                                            <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                                                                ({Number(
                                                                    folhaDetalhada.registrado.horasExcedentesNormaisCompetencia ?? 0,
                                                                ).toFixed(2)}{' '}
                                                                h)
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-semibold text-blue-800/90 dark:text-blue-200">
                                                            Excedente HE 100%
                                                        </span>
                                                        <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                                            {decimalHoursToHHmm(
                                                                Number(folhaDetalhada.registrado.horasExcedentesExtras100Competencia ?? 0),
                                                            )}
                                                            <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">
                                                                ({Number(
                                                                    folhaDetalhada.registrado.horasExcedentesExtras100Competencia ?? 0,
                                                                ).toFixed(2)}{' '}
                                                                h)
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-semibold text-blue-800/90 dark:text-blue-200">
                                                            Saldo no cadastro (total)
                                                        </span>
                                                        <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                                                            {decimalHoursToHHmm(Number(folhaDetalhada.registrado.saldoBancoHorasAtual))}{' '}
                                                            <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
                                                                ({Number(folhaDetalhada.registrado.saldoBancoHorasAtual).toFixed(2)} h)
                                                            </span>
                                                            <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                                                                Normais:{' '}
                                                                {decimalHoursToHHmm(
                                                                    Number(folhaDetalhada.registrado.saldoBancoHorasNormaisAtual ?? 0),
                                                                )}{' '}
                                                                · 100%:{' '}
                                                                {decimalHoursToHHmm(
                                                                    Number(folhaDetalhada.registrado.saldoBancoHorasExtras100Atual ?? 0),
                                                                )}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                {Math.abs(
                                                    Number(folhaDetalhada.registrado.saldoBancoHorasProjetado) -
                                                        Number(folhaDetalhada.registrado.saldoBancoHorasAtual),
                                                ) > 0.01 && (
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        Projetado (legado):{' '}
                                                        {Number(folhaDetalhada.registrado.saldoBancoHorasProjetado).toFixed(2)} h
                                                    </p>
                                                )}
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    O total a pagar usa salário fixo + benefícios. A exibição separa jornada e HE 100% só para conferência;
                                                    folga ou pagamento dependem das ações no modal &quot;Dados do colaborador&quot;, não desta tela.
                                                </p>
                                            </div>
                                        )}
                                        {folhaDetalhada.totaisLancamentos &&
                                            (folhaDetalhada.totaisLancamentos.subtracoes > 0 ||
                                                folhaDetalhada.totaisLancamentos.acrescimos > 0) && (
                                                <p className="flex justify-between text-amber-800 dark:text-amber-200 text-xs">
                                                    <span>
                                                        Lançamentos manuais (− / +)
                                                        {folhaDetalhada.autonomo?.modo === 'por_hora'
                                                            ? ' — adiantamentos, faltas, outros'
                                                            : ''}
                                                    </span>
                                                    <span>
                                                        −{' '}
                                                        {Number(folhaDetalhada.totaisLancamentos.subtracoes).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}{' '}
                                                        / +{' '}
                                                        {Number(folhaDetalhada.totaisLancamentos.acrescimos).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                            )}
                                        {folhaDetalhada.autonomo?.modo === 'por_hora' && (
                                            <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/25 p-3 space-y-2 text-xs">
                                                <p className="font-semibold text-amber-900 dark:text-amber-200">
                                                    Acréscimos automáticos (horários especiais)
                                                </p>
                                                <p className="text-[10px] text-amber-900/80 dark:text-amber-200/80">
                                                    Valores conforme tarifas cadastradas (HE 50% até 18h, noturna após 18h com adicional acordado,
                                                    domingo e feriado com valor hora 100%).
                                                </p>
                                                <ul className="space-y-1.5 text-amber-950 dark:text-amber-100">
                                                    <li className="flex justify-between gap-2">
                                                        <span>
                                                            HE 50% (fora 8h–17h30, até 18h):{' '}
                                                            <strong>{decimalHoursToHHmm(folhaDetalhada.autonomo.horasExtra50 ?? 0)}</strong>{' '}
                                                            ({(folhaDetalhada.autonomo.horasExtra50 ?? 0).toFixed(2)} h)
                                                        </span>
                                                        <span className="shrink-0 font-medium">
                                                            +{' '}
                                                            {Number(folhaDetalhada.autonomo.subtotalHoraExtra50 ?? 0).toLocaleString(
                                                                'pt-BR',
                                                                { style: 'currency', currency: 'BRL' },
                                                            )}
                                                        </span>
                                                    </li>
                                                    <li className="flex justify-between gap-2">
                                                        <span>
                                                            Noturna (após 18h):{' '}
                                                            <strong>{decimalHoursToHHmm(folhaDetalhada.autonomo.horasNoturna ?? 0)}</strong>{' '}
                                                            ({(folhaDetalhada.autonomo.horasNoturna ?? 0).toFixed(2)} h)
                                                        </span>
                                                        <span className="shrink-0 font-medium">
                                                            +{' '}
                                                            {Number(folhaDetalhada.autonomo.subtotalHoraNoturna ?? 0).toLocaleString(
                                                                'pt-BR',
                                                                { style: 'currency', currency: 'BRL' },
                                                            )}
                                                        </span>
                                                    </li>
                                                    <li className="flex justify-between gap-2">
                                                        <span>
                                                            Domingo e feriado (valor hora 100%):{' '}
                                                            <strong>{decimalHoursToHHmm(folhaDetalhada.autonomo.horasExtra100 ?? 0)}</strong>{' '}
                                                            ({(folhaDetalhada.autonomo.horasExtra100 ?? 0).toFixed(2)} h)
                                                        </span>
                                                        <span className="shrink-0 font-medium">
                                                            +{' '}
                                                            {Number(folhaDetalhada.autonomo.subtotalHoraExtra100 ?? 0).toLocaleString(
                                                                'pt-BR',
                                                                { style: 'currency', currency: 'BRL' },
                                                            )}
                                                        </span>
                                                    </li>
                                                </ul>
                                                <p className="flex justify-between font-semibold border-t border-amber-200 dark:border-amber-800/50 pt-2 text-amber-950 dark:text-amber-100">
                                                    <span>Soma dos acréscimos automáticos</span>
                                                    <span>
                                                        {Number(folhaDetalhada.autonomo.totalAcrescimosJornada ?? 0).toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                        <div className="rounded-lg border border-gray-200 dark:border-dark-border p-3 space-y-3 text-xs">
                                            <p className="font-semibold text-gray-700 dark:text-gray-300">
                                                Lançamentos do mês
                                                {folhaDetalhada.referencia
                                                    ? ` (${folhaDetalhada.referencia.mes}/${folhaDetalhada.referencia.ano})`
                                                    : ''}
                                            </p>
                                            {folhaDetalhada.autonomo?.modo === 'por_hora' && (
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">
                                                    Inclui adiantamentos, faltas, outros descontos e acréscimos manuais (somam ou reduzem o total
                                                    após base e acréscimos automáticos).
                                                </p>
                                            )}
                                            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Tipo</label>
                                                    <select
                                                        value={lancamentoNovo.categoria}
                                                        onChange={(e) =>
                                                            setLancamentoNovo({
                                                                ...lancamentoNovo,
                                                                categoria: e.target
                                                                    .value as typeof lancamentoNovo.categoria,
                                                            })
                                                        }
                                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card"
                                                    >
                                                        <option value="ADIANTAMENTO">Adiantamento</option>
                                                        <option value="FALTA">Falta</option>
                                                            <option value="FALTA_JUSTIFICADA">Falta justificada</option>
                                                        <option value="DESCONTO_OUTRO">Outro desconto</option>
                                                        <option value="ACRESCIMO">Acréscimo</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Valor (R$)</label>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={lancamentoNovo.valor}
                                                        onChange={(e) =>
                                                            setLancamentoNovo({ ...lancamentoNovo, valor: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card"
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                        Descrição (opcional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={lancamentoNovo.descricao}
                                                        onChange={(e) =>
                                                            setLancamentoNovo({ ...lancamentoNovo, descricao: e.target.value })
                                                        }
                                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card"
                                                    />
                                                </div>
                                                <div className="sm:col-span-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleAdicionarLancamentoFolha()}
                                                        className="w-full btn-success text-xs py-1.5"
                                                    >
                                                        Incluir
                                                    </button>
                                                </div>
                                            </div>
                                            {Array.isArray(folhaDetalhada.lancamentos) && folhaDetalhada.lancamentos.length > 0 ? (
                                                <ul className="space-y-1.5">
                                                    {folhaDetalhada.lancamentos.map(
                                                        (l: {
                                                            id: string;
                                                            categoria: string;
                                                            valor: number;
                                                            descricao: string | null;
                                                        }) => {
                                                            const catLabel: Record<string, string> = {
                                                                ADIANTAMENTO: 'Adiantamento',
                                                                FALTA: 'Falta',
                                                                FALTA_JUSTIFICADA: 'Falta justificada',
                                                                DESCONTO_OUTRO: 'Outro desconto',
                                                                ACRESCIMO: 'Acréscimo',
                                                                PAGAMENTO_BANCO_HORAS: 'Pagamento banco de horas',
                                                            };
                                                            const isSub =
                                                                l.categoria === 'ADIANTAMENTO' ||
                                                                l.categoria === 'FALTA' ||
                                                                l.categoria === 'DESCONTO_OUTRO';
                                                            return (
                                                                <li
                                                                    key={l.id}
                                                                    className="flex justify-between gap-2 items-center text-gray-800 dark:text-gray-200"
                                                                >
                                                                    <span className="min-w-0">
                                                                        {catLabel[l.categoria] ?? l.categoria}
                                                                        {l.descricao ? ` — ${l.descricao}` : ''}
                                                                    </span>
                                                                    <span className="flex items-center gap-2 shrink-0">
                                                                        <span
                                                                            className={
                                                                                isSub
                                                                                    ? 'text-red-600 dark:text-red-400'
                                                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                                            }
                                                                        >
                                                                            {isSub ? '− ' : '+ '}
                                                                            {Number(l.valor).toLocaleString('pt-BR', {
                                                                                style: 'currency',
                                                                                currency: 'BRL',
                                                                            })}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                void handleExcluirLancamentoFolha(l.id)
                                                                            }
                                                                            className="text-red-600 hover:underline text-[10px] font-semibold"
                                                                        >
                                                                            Excluir
                                                                        </button>
                                                                    </span>
                                                                </li>
                                                            );
                                                        },
                                                    )}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">
                                                    Nenhum lançamento manual neste mês.
                                                </p>
                                            )}
                                        </div>
                                        <p className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Benefícios</span>
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {Number(folhaDetalhada.valores.totalBeneficios).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}
                                            </span>
                                        </p>
                                        {folhaDetalhada.autonomo?.modo === 'por_hora' && (
                                            <p className="text-[11px] text-gray-600 dark:text-gray-400 pt-1">
                                                <strong>Total a pagar</strong> = base (diárias + sábado) + soma dos acréscimos automáticos +
                                                benefícios + lançamentos manuais (+/−).
                                            </p>
                                        )}
                                        <p className="flex justify-between text-base font-semibold border-t border-gray-200 dark:border-dark-border pt-2 mt-1">
                                            <span className="text-gray-800 dark:text-gray-200">Total a pagar</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                {Number(folhaDetalhada.valores.totalAPagar).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}
                                            </span>
                                        </p>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                                            <button
                                                type="button"
                                                disabled={sincronizarParcelaBusy}
                                                onClick={() => void handleSincronizarParcelaConta()}
                                                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
                                            >
                                                {sincronizarParcelaBusy ? 'Atualizando…' : 'Atualizar valor na conta a pagar'}
                                            </button>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 sm:flex-1">
                                                Grava na parcela de salário <strong className="font-medium">Pendente</strong> do mês o mesmo total exibido acima (após lançamentos). Atualiza também a coluna &quot;Total folha&quot; na lista ao recarregar os dados.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Calendário de conferência de ponto */}
                                    {Array.isArray(folhaDetalhada.conferenciaPonto) && folhaDetalhada.conferenciaPonto.length > 0 && (
                                        <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                                <div>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                                                        Conferência de ponto — {folhaDetalhada.referencia?.mes}/{folhaDetalhada.referencia?.ano}
                                                    </p>
                                                    {folhaDetalhada.jornada?.nome && (
                                                        <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                                            Jornada: <strong>{folhaDetalhada.jornada.nome}</strong> (
                                                            {folhaDetalhada.jornada.entrada1}-{folhaDetalhada.jornada.saida1} /{' '}
                                                            {folhaDetalhada.jornada.entrada2}-{folhaDetalhada.jornada.saida2}) · Tolerância{' '}
                                                            {folhaDetalhada.jornada.toleranciaMinutos} min
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={pdfFolhaBusy || !folhaMesRef}
                                                    onClick={() => void handleGerarPdfConferenciaPonto()}
                                                    className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50"
                                                >
                                                    {pdfFolhaBusy ? 'Gerando…' : 'Gerar PDF da conferência'}
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                                                Todas as batidas do dia (como no relógio). Ajuste os horários e salve — as horas do dia são recalculadas no servidor.{' '}
                                                <span className="text-violet-700 dark:text-violet-300 font-medium">
                                                    Feriados nacionais e municipais (Itajaí/SC) aparecem na coluna ao lado — inclusive em segunda a sexta.
                                                </span>
                                            </p>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs border-collapse min-w-[780px]">
                                                    <thead>
                                                        <tr className="bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300">
                                                            <th className="px-2 py-1.5 text-left border border-gray-200 dark:border-dark-border w-10">Dia</th>
                                                            <th className="px-2 py-1.5 text-left border border-gray-200 dark:border-dark-border w-12">Sem.</th>
                                                            <th className="px-2 py-1.5 text-left border border-gray-200 dark:border-dark-border w-36">
                                                                Feriado
                                                            </th>
                                                            <th className="px-2 py-1.5 text-left border border-gray-200 dark:border-dark-border min-w-[280px]">
                                                                Batidas
                                                            </th>
                                                            <th className="px-2 py-1.5 text-center border border-gray-200 dark:border-dark-border w-28">
                                                                Intervalo almoço
                                                            </th>
                                                            <th className="px-2 py-1.5 text-center border border-gray-200 dark:border-dark-border w-20" title="Total de horas trabalhadas no dia (HH:mm)">
                                                                Horas
                                                                <span className="block text-[9px] font-normal text-gray-500 dark:text-gray-400 lowercase">
                                                                    HH:mm
                                                                </span>
                                                            </th>
                                                            <th className="px-2 py-1.5 text-center border border-gray-200 dark:border-dark-border w-20" title="Atraso na entrada além da tolerância de 5 minutos">
                                                                Atraso
                                                            </th>
                                                            <th className="px-2 py-1.5 text-center border border-gray-200 dark:border-dark-border w-20" title="Saída antes do horário previsto além da tolerância de 5 minutos">
                                                                Saída ant.
                                                            </th>
                                                            <th className="px-2 py-1.5 text-center border border-gray-200 dark:border-dark-border w-24">Situação</th>
                                                            <th className="px-2 py-1.5 text-center border border-gray-200 dark:border-dark-border w-24">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {folhaDetalhada.conferenciaPonto.map((d: {
                                                            dia: number;
                                                            diaSemanaLabel: string;
                                                            ehFimDeSemana: boolean;
                                                            ehFeriado?: boolean;
                                                            nomeFeriado?: string | null;
                                                            temRegistro: boolean;
                                                            horasLiquidas: number;
                                                            batidas?: string[];
                                                            registroPontoId?: string | null;
                                                            entrada: string | null;
                                                            saida: string | null;
                                                            situacao: string;
                                                            faltaJustificada?: boolean;
                                                            statusCompensacaoRh?: 'PENDENTE' | 'APROVADO_RH' | 'REPROVADO' | null;
                                                            compensacaoDiaId?: string | null;
                                                            minutosAtraso?: number;
                                                            minutosHorasDevidas?: number;
                                                            intervaloAlmocoInicio?: string | null;
                                                            intervaloAlmocoFim?: string | null;
                                                        }) => {
                                                            const bgRow =
                                                                d.statusCompensacaoRh === 'PENDENTE'
                                                                    ? 'bg-orange-50/90 dark:bg-orange-900/20'
                                                                    :
                                                                d.ehFeriado && !d.ehFimDeSemana
                                                                    ? 'bg-violet-50/80 dark:bg-violet-950/25'
                                                                    : d.ehFimDeSemana
                                                                      ? 'bg-gray-50 dark:bg-dark-hover/50'
                                                                      : '';
                                                            let situacaoClass = 'text-gray-500 dark:text-gray-400';
                                                            if (d.situacao === 'OK') {
                                                                situacaoClass = 'text-emerald-600 dark:text-emerald-400 font-semibold';
                                                            } else if (d.situacao === 'Inconsistente') {
                                                                situacaoClass = 'text-amber-600 dark:text-amber-400 font-semibold';
                                                            } else if (
                                                                d.situacao === 'Sem registro' &&
                                                                !d.ehFimDeSemana &&
                                                                !d.ehFeriado
                                                            ) {
                                                                situacaoClass = 'text-red-500 dark:text-red-400';
                                                            }
                                                            if (d.statusCompensacaoRh === 'PENDENTE') {
                                                                situacaoClass = 'text-orange-600 dark:text-orange-400 font-semibold';
                                                            }
                                                            const regId = d.registroPontoId ?? null;
                                                            const listaBat =
                                                                regId && batidasEdicao[d.dia]
                                                                    ? batidasEdicao[d.dia]
                                                                    : Array.isArray(d.batidas)
                                                                      ? d.batidas
                                                                      : [];
                                                            const almocoInicio = d.intervaloAlmocoInicio ?? null;
                                                            const almocoFim = d.intervaloAlmocoFim ?? null;
                                                            const almocoLabel =
                                                                almocoInicio && almocoFim ? `${almocoInicio}–${almocoFim}` : '—';
                                                            const canAlmoco =
                                                                !!regId &&
                                                                (listaBat.length === 2 || listaBat.length === 3);
                                                            const exibirBatidas =
                                                                listaBat.length > 0
                                                                    ? listaBat
                                                                    : d.temRegistro && (d.entrada || d.saida)
                                                                      ? [d.entrada, d.saida].filter(Boolean) as string[]
                                                                      : [];
                                                            return (
                                                                <tr key={d.dia} className={bgRow}>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border text-gray-900 dark:text-gray-100 align-top">
                                                                        {String(d.dia).padStart(2, '0')}
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 align-top">
                                                                        {d.diaSemanaLabel}
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border align-top text-[11px]">
                                                                        {d.ehFeriado ? (
                                                                            <span className="inline-flex flex-col gap-0.5 text-violet-800 dark:text-violet-200">
                                                                                <span className="font-semibold">Sim</span>
                                                                                {d.nomeFeriado ? (
                                                                                    <span className="font-normal leading-tight">
                                                                                        {d.nomeFeriado}
                                                                                    </span>
                                                                                ) : null}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border align-top">
                                                                        {regId ? (
                                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                                {listaBat.map((b, idx) => (
                                                                                    <span key={idx} className="inline-flex items-center gap-0.5">
                                                                                        <input
                                                                                            type="text"
                                                                                            inputMode="numeric"
                                                                                            placeholder="HH:mm"
                                                                                            maxLength={5}
                                                                                            value={b}
                                                                                            onChange={(e) => {
                                                                                                const v = e.target.value;
                                                                                                setBatidasEdicao((prev) => {
                                                                                                    const cur = [...(prev[d.dia] ?? listaBat)];
                                                                                                    cur[idx] = v;
                                                                                                    return { ...prev, [d.dia]: cur };
                                                                                                });
                                                                                            }}
                                                                                            className="w-[76px] px-1 py-0.5 border border-gray-300 dark:border-dark-border rounded bg-white dark:bg-dark-card text-[11px] font-mono"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            title="Remover batida"
                                                                                            className="p-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                                            onClick={() => {
                                                                                                setBatidasEdicao((prev) => {
                                                                                                    const cur = [...(prev[d.dia] ?? listaBat)];
                                                                                                    cur.splice(idx, 1);
                                                                                                    return { ...prev, [d.dia]: cur };
                                                                                                });
                                                                                            }}
                                                                                        >
                                                                                            <Minus className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </span>
                                                                                ))}
                                                                                <button
                                                                                    type="button"
                                                                                    title="Adicionar batida"
                                                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-dashed border-gray-400 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover"
                                                                                    onClick={() => {
                                                                                        setBatidasEdicao((prev) => {
                                                                                            const cur = [...(prev[d.dia] ?? listaBat), ''];
                                                                                            return { ...prev, [d.dia]: cur };
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5" />
                                                                                    <span className="text-[10px]">batida</span>
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-700 dark:text-gray-200 font-mono text-[11px]">
                                                                                {exibirBatidas.length > 0
                                                                                    ? exibirBatidas.join(' · ')
                                                                                    : '—'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border text-center align-top">
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <span className="text-[11px] font-mono text-gray-800 dark:text-gray-200">
                                                                                {almocoLabel}
                                                                            </span>
                                                                            {canAlmoco && (
                                                                                <button
                                                                                    type="button"
                                                                                    className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
                                                                                    onClick={async () => {
                                                                                        const inserir = ['12:00', '13:00'];
                                                                                        setBatidasEdicao((prev) => {
                                                                                            const cur = [...(prev[d.dia] ?? listaBat)];
                                                                                            for (const h of inserir) {
                                                                                                if (!cur.includes(h)) cur.push(h);
                                                                                            }
                                                                                            // Ordena por minuto (HH:mm)
                                                                                            const toMin = (hhmm: string) => {
                                                                                                const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/);
                                                                                                if (!m) return Number.POSITIVE_INFINITY;
                                                                                                return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
                                                                                            };
                                                                                            cur.sort((a, b) => toMin(a) - toMin(b));
                                                                                            return { ...prev, [d.dia]: cur };
                                                                                        });
                                                                                        try {
                                                                                            await rhService.salvarIntervaloAlmoco(regId!, { inicio: '12:00', fim: '13:00' });
                                                                                            toast.success('Intervalo de almoço registrado (12:00–13:00)');
                                                                                            await handleSalvarBatidasDia(d.dia, regId!);
                                                                                        } catch (e) {
                                                                                            console.error(e);
                                                                                            toast.error('Erro ao salvar intervalo de almoço');
                                                                                        }
                                                                                    }}
                                                                                    title="Preenche almoço 12:00–13:00 (para dias com 2–3 batidas)"
                                                                                >
                                                                                    Almoço
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border text-center text-gray-900 dark:text-gray-100 align-top">
                                                                        {d.temRegistro ? (
                                                                            <span
                                                                                className="font-mono font-semibold"
                                                                                title={`Centesimal: ${d.horasLiquidas.toFixed(2)} h`}
                                                                            >
                                                                                {decimalHoursToHHmm(d.horasLiquidas)}
                                                                            </span>
                                                                        ) : (
                                                                            '-'
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border text-center align-top">
                                                                        {(d.minutosAtraso ?? 0) > 0 ? (
                                                                            <span
                                                                                className="font-mono font-bold text-red-600 dark:text-red-400"
                                                                                title="Entrada além da tolerância de 5 minutos"
                                                                            >
                                                                                {minutesToHHmm(d.minutosAtraso ?? 0)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border text-center align-top">
                                                                        {(d.minutosHorasDevidas ?? 0) > 0 ? (
                                                                            <span
                                                                                className="font-mono font-bold text-red-600 dark:text-red-400"
                                                                                title="Saída antes do horário previsto além da tolerância de 5 minutos"
                                                                            >
                                                                                {minutesToHHmm(d.minutosHorasDevidas ?? 0)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td
                                                                        className={`px-2 py-1 border border-gray-200 dark:border-dark-border text-center align-top ${situacaoClass}`}
                                                                    >
                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                            <span>{d.situacao}</span>
                                                                            {d.faltaJustificada && (
                                                                                <span className="text-[10px] text-sky-600 dark:text-sky-300 font-medium">
                                                                                    Falta justificada
                                                                                </span>
                                                                            )}
                                                                            {d.statusCompensacaoRh === 'PENDENTE' && (
                                                                                <span className="text-[10px] text-orange-600 dark:text-orange-300 font-medium">
                                                                                    Compensação pendente RH
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 py-1 border border-gray-200 dark:border-dark-border text-center align-top">
                                                                        {regId ? (
                                                                            <button
                                                                                type="button"
                                                                                disabled={salvandoBatidasDia === d.dia}
                                                                                onClick={() => void handleSalvarBatidasDia(d.dia, regId)}
                                                                                className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline disabled:opacity-50"
                                                                            >
                                                                                {salvandoBatidasDia === d.dia ? 'Salvando…' : 'Salvar'}
                                                                            </button>
                                                                        ) : (
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                {!d.ehFimDeSemana && !d.ehFeriado && !d.faltaJustificada && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => void handleRegistrarFaltaJustificada(d.dia)}
                                                                                        className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 hover:underline"
                                                                                    >
                                                                                        Falta justificada
                                                                                    </button>
                                                                                )}
                                                                                {d.statusCompensacaoRh === 'PENDENTE' && d.compensacaoDiaId && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => void handleAprovarCompensacaoDia(d.compensacaoDiaId!)}
                                                                                        className="text-[10px] font-semibold text-orange-700 dark:text-orange-300 hover:underline"
                                                                                    >
                                                                                        OK RH
                                                                                    </button>
                                                                                )}
                                                                                {!d.statusCompensacaoRh && (
                                                                                    <span className="text-gray-400">—</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ver dados do colaborador */}
            {funcionarioVerDados && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong w-full max-w-[min(72rem,calc(100vw-2rem))] max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
                            <h3 className="text-xl font-bold text-white pr-10">Dados do colaborador</h3>
                            <p className="text-sm text-blue-100 mt-1">{funcionarioVerDados.nome}</p>
                            <button type="button" onClick={() => setFuncionarioVerDados(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Nome</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{funcionarioVerDados.nome}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cargo</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{funcionarioVerDados.cargo}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vínculo</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{funcionarioVerDados.tipoContrato === 'AUTONOMO' ? 'Autônomo' : 'Registrado (CLT)'}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Remuneração</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                                        {funcionarioVerDados.tipoContrato === 'AUTONOMO' ? (
                                            <>
                                                {Number(funcionarioVerDados.valorDiaria ?? 0).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}
                                                <span className="text-xs text-gray-500 dark:text-gray-400"> / dia</span>
                                            </>
                                        ) : (
                                            <>
                                                {Number(
                                                    funcionarioVerDados.salarioBase ?? funcionarioVerDados.salario ?? 0
                                                ).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}{' '}
                                                <span className="text-xs text-gray-500 dark:text-gray-400">(salário base)</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                {funcionarioVerDados.tipoContrato === 'AUTONOMO' && (
                                    <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5 sm:col-span-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Desconto automático (falta diária na importação do ponto)
                                        </span>
                                        <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                                            {funcionarioVerDados.descontoDiariaSemBatidaAutonomo ? 'Ativo' : 'Inativo'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Cada dia útil sem batida gera lançamento Falta no valor da diária ao importar o XLS.
                                        </p>
                                    </div>
                                )}
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dia pagamento</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{funcionarioVerDados.diaPagamento ?? 5}º do mês</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Data admissão</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{funcionarioVerDados.dataAdmissao ? new Date(funcionarioVerDados.dataAdmissao).toLocaleDateString('pt-BR') : '-'}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{funcionarioVerDados.status}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">CPF</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100 font-mono text-xs">{funcionarioVerDados.cpf || '-'}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Telefone</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{funcionarioVerDados.telefone || '-'}</p>
                                </div>
                                <div className="rounded-xl border border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-hover/25 px-3 py-2.5 sm:col-span-2 lg:col-span-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">E-mail</span>
                                    <p className="mt-0.5 font-medium text-gray-900 dark:text-gray-100 break-all">{funcionarioVerDados.email || '-'}</p>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 dark:border-dark-border pt-4 space-y-2">
                                <p className="font-semibold text-gray-700 dark:text-gray-300">Ponto e valores por hora (referência na folha)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-900/30 p-3">
                                    <div className="lg:col-span-3">
                                        <span className="font-semibold text-gray-600 dark:text-gray-400">Código ID no relógio:</span>{' '}
                                        <span className="text-gray-900 dark:text-gray-100 font-mono">
                                            {funcionarioVerDados.codigoRelogio != null && funcionarioVerDados.codigoRelogio !== ''
                                                ? String(funcionarioVerDados.codigoRelogio)
                                                : '—'}
                                        </span>
                                    </div>
                                    {funcionarioVerDados.tipoContrato === 'AUTONOMO' &&
                                    (funcionarioVerDados.valorHoraNormalAutonomo != null ||
                                        funcionarioVerDados.valorHoraExtra50Autonomo != null ||
                                        funcionarioVerDados.valorHoraExtra100Autonomo != null ||
                                        funcionarioVerDados.valorHoraNoturna20Autonomo != null) ? (
                                        <>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Hora normal (8h–17h30, seg–sex)</span>
                                                <p className="text-gray-900 dark:text-gray-100">
                                                    {Number(funcionarioVerDados.valorHoraNormalAutonomo ?? funcionarioVerDados.valorHora ?? 0).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Hora +50% (fora da jornada até 18h)</span>
                                                <p className="text-gray-900 dark:text-gray-100">
                                                    {Number(funcionarioVerDados.valorHoraExtra50Autonomo ?? 0).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Hora +100% (domingo e feriado)</span>
                                                <p className="text-gray-900 dark:text-gray-100">
                                                    {Number(funcionarioVerDados.valorHoraExtra100Autonomo ?? 0).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600 dark:text-gray-400">Noturna (após 18h, piso +20% — valor da hora configurado)</span>
                                                <p className="text-gray-900 dark:text-gray-100">
                                                    {Number(funcionarioVerDados.valorHoraNoturna20Autonomo ?? 0).toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </p>
                                            </div>
                                        </>
                                    ) : funcionarioVerDados.tipoContrato === 'AUTONOMO' ? (
                                        <p className="lg:col-span-3 text-xs text-gray-600 dark:text-gray-400">
                                            Modo diária + hora de fim de semana: use a <strong>remuneração (diária)</strong> e o valor hora geral do cadastro / configuração de ponto para sábado e domingo na folha.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="lg:col-span-3">
                                                <span className="text-gray-600 dark:text-gray-400">Valor hora base (CLT, referência na folha)</span>
                                                <p className="text-gray-900 dark:text-gray-100">
                                                    {(() => {
                                                        const base = Number(funcionarioVerDados.salarioBase ?? funcionarioVerDados.salario ?? 0);
                                                        const carga = Number(funcionarioVerDados.cargaHorariaMensal ?? 220);
                                                        const vh =
                                                            base > 0 && carga > 0
                                                                ? base / carga
                                                                : Number(funcionarioVerDados.valorHora ?? 0);
                                                        return vh.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                                    })()}
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                                        (salário base ÷ carga {Number(funcionarioVerDados.cargaHorariaMensal ?? 220)} h, ou valor hora cadastrado)
                                                    </span>
                                                </p>
                                            </div>
                                            <p className="lg:col-span-3 text-xs text-gray-600 dark:text-gray-400">
                                                Na folha CLT, o total mensal usa salário fixo + benefícios + lançamentos; valores de horas normais/extras na tela são apenas referência (banco de horas).
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {funcionarioVerDados.tipoContrato !== 'AUTONOMO' && (
                                <div className="rounded-xl border border-amber-200/90 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-4">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">Banco de horas e folgas (RH)</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            Competência da grade RH: <span className="font-mono font-semibold">{rhCompetencia}</span>.
                                            O banco só aumenta com o ponto importado ou ajustado;{' '}
                                            <strong className="font-medium text-gray-700 dark:text-gray-300">
                                                nada vira folga nem pagamento sozinho
                                            </strong>
                                            . Se a RH não fizer nada, as horas permanecem no banco somando mês a mês.
                                        </p>
                                        <p className="mt-2 text-[11px] leading-relaxed rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-100/35 dark:bg-amber-950/35 px-3 py-2 text-amber-950 dark:text-amber-100">
                                            <strong>Folgas acumuladas</strong> só sobem quando alguém usa &quot;Converter em folga&quot;.
                                            O lançamento de pagamento na folha só entra quando usar &quot;Incluir na folha&quot;; a baixa do saldo
                                            ocorre ao marcar a parcela de salário como paga em Contas a pagar.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                        <div className="rounded-lg bg-white/60 dark:bg-dark-card/40 px-3 py-2 border border-amber-100 dark:border-amber-900/40">
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                                Excedente jornada (não HE 100%)
                                            </span>
                                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                                                {Number(funcionarioVerDados.saldoBancoHorasNormaisExcedente ?? 0).toFixed(2)} h
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-white/60 dark:bg-dark-card/40 px-3 py-2 border border-amber-100 dark:border-amber-900/40">
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                                Horas extras 100% no banco
                                            </span>
                                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                                                {Number(funcionarioVerDados.saldoBancoHorasExtras100 ?? 0).toFixed(2)} h
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-amber-100/50 dark:bg-amber-900/25 px-3 py-2 border border-amber-300/70 dark:border-amber-700/50">
                                            <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                                                Total banco (informação)
                                            </span>
                                            <p className="text-lg font-bold text-amber-950 dark:text-amber-100 font-mono">
                                                {(() => {
                                                    let n = Number(funcionarioVerDados.saldoBancoHorasNormaisExcedente ?? 0);
                                                    let e = Number(funcionarioVerDados.saldoBancoHorasExtras100 ?? 0);
                                                    const leg = Number(funcionarioVerDados.saldoBancoHoras ?? n + e);
                                                    if (n + e <= 0 && leg > 0) n = leg;
                                                    return (n + e).toFixed(2);
                                                })()}{' '}
                                                h
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-white/60 dark:bg-dark-card/40 px-3 py-2 border border-amber-100 dark:border-amber-900/40">
                                            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                                Folgas acumuladas (convertidas)
                                            </span>
                                            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                {Number(funcionarioVerDados.horasFolgaAcumuladas ?? 0).toFixed(2)} h
                                            </p>
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50/70 dark:bg-orange-950/20 p-3 space-y-2">
                                        <p className="text-xs font-semibold text-orange-900 dark:text-orange-200">
                                            Dívida de horas e quitação
                                        </p>
                                        <p className="text-sm text-gray-800 dark:text-gray-200">
                                            Horas negativas atuais:{' '}
                                            <strong className="font-mono">
                                                {Number(folhaDetalhada?.dividaHoras?.horasNegativas ?? funcionarioVerDados.saldoHorasNegativas ?? 0).toFixed(2)} h
                                            </strong>
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                    Quitar como
                                                </label>
                                                <select
                                                    value={modoQuitacaoDivida}
                                                    onChange={(e) =>
                                                        setModoQuitacaoDivida(
                                                            e.target.value as 'DESCONTAR_SALARIO' | 'COMPENSAR_BANCO',
                                                        )
                                                    }
                                                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card"
                                                >
                                                    <option value="DESCONTAR_SALARIO">Descontar salário</option>
                                                    <option value="COMPENSAR_BANCO">Compensar banco</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                    Período para compensar
                                                </label>
                                                <select
                                                    value={periodoCompensacaoDivida}
                                                    onChange={(e) =>
                                                        setPeriodoCompensacaoDivida(
                                                            e.target.value as 'DIAS_SEMANA' | 'FINAL_DE_SEMANA',
                                                        )
                                                    }
                                                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card"
                                                >
                                                    <option value="DIAS_SEMANA">Dias da semana</option>
                                                    <option value="FINAL_DE_SEMANA">Final de semana</option>
                                                </select>
                                            </div>
                                            <div className="flex items-end">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        Number(folhaDetalhada?.dividaHoras?.horasNegativas ?? 0) <= 0 ||
                                                        (modoQuitacaoDivida === 'COMPENSAR_BANCO' &&
                                                            Number(funcionarioVerDados.saldoBancoHoras ?? 0) <= 0)
                                                    }
                                                    onClick={() => void handleProporDividaHoras()}
                                                    className="w-full px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 disabled:opacity-50"
                                                >
                                                    Criar proposta RH
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                            Quando selecionado “Dias da semana” ou “Final de semana”, os dias sugeridos ficam em
                                            laranja na conferência; após “OK RH”, a dívida é baixada.
                                        </p>
                                    </div>
                                    <div className="border-t border-amber-200/70 dark:border-amber-800/40 pt-3 space-y-2">
                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">a) Converter horas do banco em folga</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                            Opcional: escolha de qual saldo descontar <em>somente no momento</em> em que você clicar em
                                            Converter. Não altera regras globais nem move horas sem este passo.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-700 dark:text-gray-300 mb-1">
                                            <span className="font-medium">Descontar de:</span>
                                            <label className="inline-flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="origemConvFolga"
                                                    checked={origemConverterFolga === 'normais'}
                                                    onChange={() => setOrigemConverterFolga('normais')}
                                                />
                                                Só excedente jornada
                                            </label>
                                            <label className="inline-flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="origemConvFolga"
                                                    checked={origemConverterFolga === 'extras100'}
                                                    onChange={() => setOrigemConverterFolga('extras100')}
                                                />
                                                Só HE 100%
                                            </label>
                                            <label className="inline-flex items-center gap-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="origemConvFolga"
                                                    checked={origemConverterFolga === 'automatico'}
                                                    onChange={() => setOrigemConverterFolga('automatico')}
                                                />
                                                Misto: HE 100% primeiro, depois jornada
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap items-end gap-2">
                                            <div>
                                                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Quantidade (h)</label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={bancoHorasConverterInput}
                                                    onChange={(e) => setBancoHorasConverterInput(e.target.value)}
                                                    className="w-28 px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                disabled={busyBancoAcao}
                                                onClick={() => void handleConverterBancoParaFolga()}
                                                className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
                                            >
                                                Converter em folga
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border-t border-amber-200/70 dark:border-amber-800/40 pt-3 space-y-2">
                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">b) Valor estimado do saldo em dinheiro (referência)</p>
                                        <button
                                            type="button"
                                            onClick={handleCalcularValorPagamentoBanco}
                                            className="px-3 py-2 rounded-lg border border-amber-600 text-amber-800 dark:text-amber-200 text-xs font-semibold hover:bg-amber-100/80 dark:hover:bg-amber-900/30"
                                        >
                                            Calcular
                                        </button>
                                        {valorSimuladoBanco != null && (
                                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                {valorSimuladoBanco.toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}{' '}
                                                <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
                                                    (jornada × VH + HE 100% × 2×VH)
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="border-t border-amber-200/70 dark:border-amber-800/40 pt-3 space-y-3">
                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">c) Incluir pagamento na folha do mês</p>
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-700 dark:text-gray-300">
                                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="modoBancoFolha"
                                                    checked={modoIncluirBanco === 'total'}
                                                    onChange={() => setModoIncluirBanco('total')}
                                                />
                                                Total (todo o saldo)
                                            </label>
                                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="modoBancoFolha"
                                                    checked={modoIncluirBanco === 'parcial'}
                                                    onChange={() => setModoIncluirBanco('parcial')}
                                                />
                                                Parcial
                                            </label>
                                        </div>
                                        {modoIncluirBanco === 'parcial' && (
                                            <div className="space-y-2">
                                                <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                                                    De qual saldo descontar ao incluir o pagamento (só ao clicar em Incluir)
                                                </p>
                                                <div className="flex flex-wrap gap-3 text-[11px]">
                                                    <label className="inline-flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="alocPagBanco"
                                                            checked={alocacaoPagamentoBanco === 'so_normais'}
                                                            onChange={() => setAlocacaoPagamentoBanco('so_normais')}
                                                        />
                                                        Só excedente jornada
                                                    </label>
                                                    <label className="inline-flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="alocPagBanco"
                                                            checked={alocacaoPagamentoBanco === 'so_extras100'}
                                                            onChange={() => setAlocacaoPagamentoBanco('so_extras100')}
                                                        />
                                                        Só HE 100%
                                                    </label>
                                                    <label className="inline-flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="alocPagBanco"
                                                            checked={alocacaoPagamentoBanco === 'automatico'}
                                                            onChange={() => setAlocacaoPagamentoBanco('automatico')}
                                                        />
                                                        Misto: HE 100% primeiro
                                                    </label>
                                                    <label className="inline-flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="alocPagBanco"
                                                            checked={alocacaoPagamentoBanco === 'misto'}
                                                            onChange={() => setAlocacaoPagamentoBanco('misto')}
                                                        />
                                                        Misto (definir cada uma)
                                                    </label>
                                                </div>
                                                {alocacaoPagamentoBanco !== 'misto' && (
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                            Horas a pagar (total)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={horasParcialBancoInput}
                                                            onChange={(e) => setHorasParcialBancoInput(e.target.value)}
                                                            className="w-28 px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                )}
                                                {alocacaoPagamentoBanco === 'misto' && (
                                                    <div className="flex flex-wrap gap-3 items-end">
                                                        <div>
                                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                                Horas jornada
                                                            </label>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={horasMistoNormais}
                                                                onChange={(e) => setHorasMistoNormais(e.target.value)}
                                                                className="w-24 px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                                                                Horas HE 100%
                                                            </label>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={horasMisto100}
                                                                onChange={(e) => setHorasMisto100(e.target.value)}
                                                                className="w-24 px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            disabled={busyBancoAcao}
                                            onClick={() => void handleIncluirBancoNaFolhaCompetencia()}
                                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            Incluir na folha
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Uniforme</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                                    <div><span className="text-gray-600 dark:text-gray-400">Camisa:</span> <span className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.uniformeCamisa || '-'}</span></div>
                                    <div><span className="text-gray-600 dark:text-gray-400">Calça:</span> <span className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.uniformeCalca || '-'}</span></div>
                                    <div><span className="text-gray-600 dark:text-gray-400">Bermuda:</span> <span className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.uniformeBermuda || '-'}</span></div>
                                    <div><span className="text-gray-600 dark:text-gray-400">Sapato:</span> <span className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.uniformeSapato || '-'}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end shrink-0 bg-gray-50 dark:bg-dark-hover/30">
                            <button type="button" onClick={() => { handleAbrirModalEdicao(funcionarioVerDados); setFuncionarioVerDados(null); }} className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 font-semibold shadow-md transition-colors">
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Histórico de pagamentos (recorrentes) */}
            {funcionarioHistorico && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
                            <h3 className="text-xl font-bold text-white pr-10">Histórico de pagamentos</h3>
                            <p className="text-sm text-blue-100 mt-1">{funcionarioHistorico.nome}</p>
                            <button type="button" onClick={() => { setFuncionarioHistorico(null); setHistoricoPagamentosLista([]); }} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingHistorico ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" /></div>
                            ) : historicoPagamentosLista.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum pagamento recorrente (salário) registrado ainda. Gere as contas em Financeiro → Contas a Pagar.</p>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-dark-hover border-b border-gray-200 dark:border-dark-border">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Descrição</th>
                                                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Valor</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Vencimento</th>
                                                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historicoPagamentosLista.map((conta: any) => (
                                                <tr key={conta.id} className="border-b border-gray-100 dark:border-dark-border last:border-0">
                                                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{conta.descricao}</td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">R$ {Number(conta.valorParcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{conta.dataVencimento ? new Date(conta.dataVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                            conta.status === 'Pago' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                            conta.status === 'Atrasado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                        }`}>{conta.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end shrink-0 bg-gray-50 dark:bg-dark-hover/30">
                            <button type="button" onClick={() => { setFuncionarioHistorico(null); setHistoricoPagamentosLista([]); }} className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog de Confirmação de Exclusão */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-3">
                                <p className="text-gray-700">
                                    Tem certeza que deseja deletar o funcionário{' '}
                                    <span className="font-bold text-gray-900">{funcionarioParaDeletar?.nome}</span>?
                                </p>
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                    <p className="text-sm text-red-800 font-medium">
                                        ⚠️ Esta ação não pode ser desfeita!
                                    </p>
                                    <p className="text-sm text-red-700 mt-2">
                                        Todos os dados relacionados ao funcionário, incluindo vales e histórico, serão permanentemente removidos.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelarDelecao}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarDelecao}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Sim, Deletar Funcionário
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
                </>
            )}

            {activeTab === 'estoque' && <EstoqueRecursosHumanosView />}
        </div>
        </>
    );
};

// Componente de Estoque de Recursos Humanos
const EstoqueRecursosHumanosView: React.FC = () => {
    const [recursos, setRecursos] = useState<any[]>([]);
    const [funcionarios, setFuncionarios] = useState<any[]>([]);
    const [kitsFerramentas, setKitsFerramentas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalVinculacaoOpen, setIsModalVinculacaoOpen] = useState(false);
    const [isModalHistoricoOpen, setIsModalHistoricoOpen] = useState(false);
    const [historicoRecurso, setHistoricoRecurso] = useState<any[]>([]);
    const [recursoParaVincular, setRecursoParaVincular] = useState<any | null>(null);
    const [buscaFuncionario, setBuscaFuncionario] = useState('');
    const [funcionariosSelecionados, setFuncionariosSelecionados] = useState<string[]>([]);
    const [quantidadeVinculacao, setQuantidadeVinculacao] = useState<string>('1');
    const [dataEntregaVinculacao, setDataEntregaVinculacao] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [observacoesEntrega, setObservacoesEntrega] = useState<string>('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showExcluirRecursoDialog, setShowExcluirRecursoDialog] = useState(false);
    const [recursoParaExcluir, setRecursoParaExcluir] = useState<{ id: string; nomeItem?: string } | null>(null);
    const [isModalDetalhesKitOpen, setIsModalDetalhesKitOpen] = useState(false);
    const [kitDetalhesSelecionado, setKitDetalhesSelecionado] = useState<any | null>(null);
    const [abaDetalhesKit, setAbaDetalhesKit] = useState<'ferramentas' | 'uniformes'>('ferramentas');
    const [historicoUniformesKit, setHistoricoUniformesKit] = useState<any[]>([]);
    const [loadingHistoricoKit, setLoadingHistoricoKit] = useState(false);
    const [avisoHistoricoKit, setAvisoHistoricoKit] = useState('');
    const [editandoRecurso, setEditandoRecurso] = useState<string | null>(null);
    const [recursoForm, setRecursoForm] = useState({
        nomeItem: '',
        quantidade: '',
        valorUnitario: '',
        valorTotal: '',
        funcionarioId: '',
        observacoes: ''
    });
    const [filtroFuncionario, setFiltroFuncionario] = useState<string>('');

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [recursosResp, funcionariosResp, kitsResp] = await Promise.all([
                axiosApiService.get('/api/recursos-humanos'),
                funcionariosService.listar(),
                axiosApiService.get('/api/kits-ferramenta')
            ]);
            setRecursos(Array.isArray(recursosResp?.data) ? (recursosResp.data as any[]) : (recursosResp?.data ?? []) as any[]);
            setFuncionarios(Array.isArray(funcionariosResp?.data) ? (funcionariosResp.data as any[]) : (funcionariosResp?.data ?? []) as any[]);
            // A resposta pode vir como { success: true, data: [...] } ou diretamente como array
            const kitsData = (kitsResp as any)?.data?.data ?? (kitsResp as any)?.data ?? [];
            setKitsFerramentas(Array.isArray(kitsData) ? kitsData.filter((kit: any) => kit.ativo) : []);
        } catch (error) {
            console.error('Erro ao carregar estoque de recursos humanos:', error);
            toast.error('Erro ao carregar estoque');
        } finally {
            setLoading(false);
        }
    };

    const recursosFiltrados = useMemo(() => {
        let filtrados = recursos;
        if (filtroFuncionario) {
            if (filtroFuncionario === 'sem-vinculacao') {
                filtrados = filtrados.filter(r => !r.funcionarioId);
            } else {
                filtrados = filtrados.filter(r => r.funcionarioId === filtroFuncionario);
            }
        }
        return filtrados;
    }, [recursos, filtroFuncionario]);

    const handleAbrirModalNovo = () => {
        setEditandoRecurso(null);
        setRecursoForm({
            nomeItem: '',
            quantidade: '',
            valorUnitario: '',
            valorTotal: '',
            funcionarioId: '',
            observacoes: ''
        });
        setIsModalOpen(true);
    };

    const handleAbrirModalEdicao = (recurso: any) => {
        setEditandoRecurso(recurso.id);
        setRecursoForm({
            nomeItem: recurso.nomeItem,
            quantidade: recurso.quantidade.toString(),
            valorUnitario: recurso.valorUnitario.toString(),
            valorTotal: recurso.valorTotal.toString(),
            funcionarioId: recurso.funcionarioId || '',
            observacoes: recurso.observacoes || ''
        });
        setIsModalOpen(true);
    };

    const handleSubmitRecurso = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                nomeItem: recursoForm.nomeItem,
                quantidade: parseFloat(recursoForm.quantidade),
                valorUnitario: parseFloat(recursoForm.valorUnitario),
                valorTotal: parseFloat(recursoForm.valorTotal),
                funcionarioId: recursoForm.funcionarioId || undefined,
                observacoes: recursoForm.observacoes || undefined
            };

            if (editandoRecurso) {
                await axiosApiService.put(`/api/recursos-humanos/${editandoRecurso}`, data);
                toast.success('Recurso atualizado com sucesso!');
            } else {
                await axiosApiService.post('/api/recursos-humanos', data);
                toast.success('Recurso adicionado ao estoque com sucesso!');
            }
            setIsModalOpen(false);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao salvar recurso:', error);
            toast.error('Erro ao salvar recurso', {
                description: error.response?.data?.message || 'Tente novamente'
            });
        }
    };

    const handleExcluir = (recurso: any) => {
        setRecursoParaExcluir({ id: recurso.id, nomeItem: recurso.nomeItem });
        setShowExcluirRecursoDialog(true);
    };

    const confirmarExcluirRecurso = async () => {
        if (!recursoParaExcluir) return;
        try {
            await axiosApiService.delete(`/api/recursos-humanos/${recursoParaExcluir.id}`);
            toast.success('Recurso excluído com sucesso!');
            setShowExcluirRecursoDialog(false);
            setRecursoParaExcluir(null);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao excluir recurso:', error);
            toast.error('Erro ao excluir recurso');
        }
    };

    const cancelarExcluirRecurso = () => {
        setShowExcluirRecursoDialog(false);
        setRecursoParaExcluir(null);
    };

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);
    useEscapeKey(() => { setIsModalVinculacaoOpen(false); setRecursoParaVincular(null); }, isModalVinculacaoOpen);
    useEscapeKey(() => setIsModalHistoricoOpen(false), isModalHistoricoOpen);
    useEscapeKey(() => setShowConfirmDialog(false), showConfirmDialog);
    useEscapeKey(cancelarExcluirRecurso, showExcluirRecursoDialog);
    useEscapeKey(() => {
        setIsModalDetalhesKitOpen(false);
        setKitDetalhesSelecionado(null);
    }, isModalDetalhesKitOpen);

    const handleAbrirModalVinculacao = (recurso: any) => {
        setRecursoParaVincular(recurso);
        setBuscaFuncionario('');
        setFuncionariosSelecionados([]);
        setQuantidadeVinculacao('1');
        setDataEntregaVinculacao(new Date().toISOString().split('T')[0]);
        setObservacoesEntrega('');
        setIsModalVinculacaoOpen(true);
    };

    const handleAbrirModalHistorico = async (recursoId: string) => {
        try {
            const response = await axiosApiService.get(`/api/recursos-humanos/${recursoId}/historico`);
            setHistoricoRecurso(Array.isArray(response?.data) ? (response.data as any[]) : (response?.data ?? []) as any[]);
            setIsModalHistoricoOpen(true);
        } catch (error: any) {
            console.error('Erro ao carregar histórico:', error);
            toast.error('Erro ao carregar histórico');
        }
    };

    const funcionariosFiltrados = useMemo(() => {
        if (!buscaFuncionario.trim()) return funcionarios;
        const termo = buscaFuncionario.toLowerCase();
        return funcionarios.filter(f => 
            f.nome.toLowerCase().includes(termo) ||
            f.cargo.toLowerCase().includes(termo) ||
            (f.cpf && f.cpf.includes(termo))
        );
    }, [buscaFuncionario, funcionarios]);

    const toggleFuncionarioSelecionado = (funcionarioId: string) => {
        setFuncionariosSelecionados((prev) =>
            prev.includes(funcionarioId)
                ? prev.filter((id) => id !== funcionarioId)
                : [...prev, funcionarioId]
        );
    };

    const normalizarTexto = (valor: string) =>
        String(valor || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();

    const carregarHistoricoUniformesKit = async (kit: any) => {
        setLoadingHistoricoKit(true);
        setAvisoHistoricoKit('');
        setHistoricoUniformesKit([]);
        try {
            const funcionarioCorrespondente = funcionarios.find(
                (f) => normalizarTexto(f.nome) === normalizarTexto(kit.eletricistaNome)
            );

            if (!funcionarioCorrespondente) {
                setAvisoHistoricoKit('Não foi encontrado um funcionário de RH com este nome para carregar os EPIs/uniformes.');
                return;
            }

            const historicoResp = await axiosApiService.get(
                `/api/recursos-humanos/funcionario/${funcionarioCorrespondente.id}/historico`
            );

            if (!historicoResp.success) {
                setAvisoHistoricoKit(historicoResp.error || 'Falha ao carregar histórico de EPIs/uniformes.');
                return;
            }

            const historico = Array.isArray(historicoResp.data) ? historicoResp.data : [];
            const entregas = historico.filter(
                (mov: any) =>
                    mov.tipoMovimentacao === 'VINCULACAO' &&
                    Number(mov.quantidade || 0) > 0
            );

            setHistoricoUniformesKit(entregas);
            if (entregas.length === 0) {
                setAvisoHistoricoKit('Nenhuma entrega de uniforme/EPI registrada para este colaborador até o momento.');
            }
        } catch (error) {
            console.error('Erro ao carregar histórico de uniformes/EPI do kit:', error);
            setAvisoHistoricoKit('Erro ao carregar histórico de uniforme/EPI.');
        } finally {
            setLoadingHistoricoKit(false);
        }
    };

    const handleAbrirDetalhesKit = async (kit: any) => {
        setKitDetalhesSelecionado(kit);
        setAbaDetalhesKit('ferramentas');
        setIsModalDetalhesKitOpen(true);
        await carregarHistoricoUniformesKit(kit);
    };

    const handleConfirmarVinculacao = async () => {
        if (!recursoParaVincular) return;
        if (funcionariosSelecionados.length === 0) {
            toast.error('Selecione pelo menos um funcionário para registrar a entrega.');
            return;
        }

        const quantidade = parseFloat(quantidadeVinculacao);
        if (!quantidade || quantidade <= 0) {
            toast.error('Informe uma quantidade válida por funcionário.');
            return;
        }

        const quantidadeTotal = quantidade * funcionariosSelecionados.length;
        if (quantidadeTotal > Number(recursoParaVincular.quantidade || 0)) {
            toast.error('Quantidade insuficiente no estoque para esta entrega múltipla.');
            return;
        }
        
        try {
            const response = await axiosApiService.post(`/api/recursos-humanos/${recursoParaVincular.id}/entregas`, {
                funcionarioIds: funcionariosSelecionados,
                quantidadePorFuncionario: quantidade,
                dataEntrega: dataEntregaVinculacao,
                observacoes: observacoesEntrega || undefined
            });

            if (!response.success) {
                throw new Error(response.error || 'Falha ao registrar entrega');
            }

            toast.success('Entrega registrada com sucesso!', {
                description: `${quantidadeTotal} item(ns) baixados para ${funcionariosSelecionados.length} colaborador(es).`
            });
            setIsModalVinculacaoOpen(false);
            setShowConfirmDialog(false);
            setRecursoParaVincular(null);
            setFuncionariosSelecionados([]);
            setQuantidadeVinculacao('1');
            setObservacoesEntrega('');
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao vincular recurso:', error);
            toast.error('Erro ao vincular recurso', {
                description: error?.message || error.response?.data?.message || 'Tente novamente'
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando estoque de recursos humanos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Estoque de Recursos Humanos</h2>
                    <p className="text-sm text-gray-600 mt-1">Gerencie EPIs, uniformes e equipamentos para funcionários</p>
                </div>
                <button
                    onClick={handleAbrirModalNovo}
                    className="btn-success flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar Recurso
                </button>
            </div>

            {/* Seção de Kits de Ferramentas */}
            {kitsFerramentas.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border-2 border-indigo-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Kits de Ferramentas dos Eletricistas</h3>
                            <p className="text-sm text-gray-600">Ferramentas entregues aos eletricistas</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kitsFerramentas.map((kit: any) => (
                            <button
                                key={kit.id}
                                type="button"
                                onClick={() => handleAbrirDetalhesKit(kit)}
                                className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm text-left hover:shadow-md hover:border-indigo-300 transition-all"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{kit.nome}</h4>
                                        <p className="text-sm text-gray-600">{kit.eletricistaNome}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                        {kit.itens?.length || 0} itens
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    Entregue em: {new Date(kit.dataEntrega).toLocaleDateString('pt-BR')}
                                </div>
                                {kit.descricao && (
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{kit.descricao}</p>
                                )}
                                <p className="text-xs text-indigo-600 mt-3 font-medium">Clique para ver detalhes do kit</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex gap-4 items-center">
                    <label className="text-sm font-semibold text-gray-700">Filtrar por funcionário:</label>
                    <select
                        value={filtroFuncionario}
                        onChange={(e) => setFiltroFuncionario(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos</option>
                        <option value="sem-vinculacao">Sem vinculação</option>
                        {funcionarios.map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {recursosFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p className="text-gray-500 font-medium">Nenhum recurso no estoque</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Quantidade</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor Unitário</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data da Compra</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data de Entrega</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Eletricista</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recursosFiltrados.map((recurso) => (
                                    <tr key={recurso.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">{recurso.nomeItem}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{recurso.quantidade}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                            R$ {recurso.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                            R$ {recurso.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {recurso.compra?.dataCompra ? (() => {
                                                const s = recurso.compra.dataCompra;
                                                if (typeof s === 'string' && s.includes('T')) {
                                                    const [d] = s.split('T');
                                                    const [a, m, dia] = d.split('-');
                                                    return `${dia}/${m}/${a}`;
                                                }
                                                const d = new Date(s);
                                                return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
                                            })() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {recurso.compra?.dataRecebimento ? (() => {
                                                const s = recurso.compra.dataRecebimento;
                                                if (typeof s === 'string' && s.includes('T')) {
                                                    const [d] = s.split('T');
                                                    const [a, m, dia] = d.split('-');
                                                    return `${dia}/${m}/${a}`;
                                                }
                                                const d = new Date(s);
                                                return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
                                            })() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {recurso.funcionario ? (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                                    {recurso.funcionario.nome}
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm">Sem vinculação</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleAbrirModalHistorico(recurso.id)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50"
                                                    title="Ver histórico"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Histórico
                                                </button>
                                                <button
                                                    onClick={() => handleAbrirModalVinculacao(recurso)}
                                                    className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50"
                                                    title="Registrar entrega para funcionário(s)"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    Entregar
                                                </button>
                                                <button
                                                    onClick={() => handleAbrirModalEdicao(recurso)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleExcluir(recurso)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Adicionar/Editar Recurso */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-gray-900">
                                {editandoRecurso ? 'Editar Recurso' : 'Adicionar Recurso'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmitRecurso} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Item *</label>
                                <input
                                    type="text"
                                    value={recursoForm.nomeItem}
                                    onChange={(e) => setRecursoForm({ ...recursoForm, nomeItem: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Uniforme, EPI, Ferramenta"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantidade *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={recursoForm.quantidade}
                                        onChange={(e) => {
                                            const qtd = e.target.value;
                                            const valorUnit = parseFloat(recursoForm.valorUnitario) || 0;
                                            setRecursoForm({
                                                ...recursoForm,
                                                quantidade: qtd,
                                                valorTotal: (parseFloat(qtd) * valorUnit).toString()
                                            });
                                        }}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Unitário *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={recursoForm.valorUnitario}
                                        onChange={(e) => {
                                            const valorUnit = e.target.value;
                                            const qtd = parseFloat(recursoForm.quantidade) || 0;
                                            setRecursoForm({
                                                ...recursoForm,
                                                valorUnitario: valorUnit,
                                                valorTotal: (parseFloat(valorUnit) * qtd).toString()
                                            });
                                        }}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Total</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={recursoForm.valorTotal}
                                    readOnly
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Funcionário (opcional)</label>
                                <select
                                    value={recursoForm.funcionarioId}
                                    onChange={(e) => setRecursoForm({ ...recursoForm, funcionarioId: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Selecione um funcionário</option>
                                    {funcionarios.map(f => (
                                        <option key={f.id} value={f.id}>{f.nome} - {f.cargo}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Observações</label>
                                <textarea
                                    value={recursoForm.observacoes}
                                    onChange={(e) => setRecursoForm({ ...recursoForm, observacoes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Observações adicionais..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 font-semibold shadow-md"
                                >
                                    {editandoRecurso ? 'Atualizar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Vinculação com Pesquisa */}
            {isModalVinculacaoOpen && recursoParaVincular && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-gray-900">
                                Registrar Entrega para Funcionários
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalVinculacaoOpen(false);
                                    setRecursoParaVincular(null);
                                    setFuncionariosSelecionados([]);
                                    setBuscaFuncionario('');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-semibold">Recurso:</span> {recursoParaVincular.nomeItem}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Quantidade disponível em estoque: <span className="font-semibold">{recursoParaVincular.quantidade}</span>
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar Funcionário</label>
                                <input
                                    type="text"
                                    value={buscaFuncionario}
                                    onChange={(e) => setBuscaFuncionario(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Digite o nome, cargo ou CPF do funcionário..."
                                />
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
                                {funcionariosFiltrados.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">Nenhum funcionário encontrado</div>
                                ) : (
                                    funcionariosFiltrados.map((func) => {
                                        const selecionado = funcionariosSelecionados.includes(func.id);
                                        return (
                                            <label
                                                key={func.id}
                                                className={`w-full p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                                                    selecionado ? 'bg-blue-50 border-blue-200' : ''
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selecionado}
                                                    onChange={() => toggleFuncionarioSelecionado(func.id)}
                                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <div className="font-semibold text-gray-900">{func.nome}</div>
                                                    <div className="text-sm text-gray-600">{func.cargo}</div>
                                                    {func.cpf && <div className="text-xs text-gray-500">CPF: {func.cpf}</div>}
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            {funcionariosSelecionados.length > 0 && (
                                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                    <p className="text-sm font-semibold text-blue-900">
                                        Colaboradores selecionados: {funcionariosSelecionados.length}
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Quantidade por funcionário
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={quantidadeVinculacao}
                                    onChange={(e) => setQuantidadeVinculacao(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ex: 1"
                                />
                            </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Data da entrega
                                        </label>
                                        <input
                                            type="date"
                                            value={dataEntregaVinculacao}
                                            onChange={(e) => setDataEntregaVinculacao(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Observações da entrega (opcional)</label>
                                <textarea
                                    value={observacoesEntrega}
                                    onChange={(e) => setObservacoesEntrega(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: Entrega inicial de uniforme para equipe do turno da manhã"
                                />
                            </div>
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                <p className="text-sm text-green-900">
                                    Baixa total prevista no estoque:{' '}
                                    <span className="font-bold">
                                        {(parseFloat(quantidadeVinculacao) > 0
                                            ? parseFloat(quantidadeVinculacao)
                                            : 0) * funcionariosSelecionados.length}
                                    </span>{' '}
                                    unidade(s)
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                    Estoque atual: {recursoParaVincular.quantidade} unidade(s)
                                </p>
                                </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalVinculacaoOpen(false);
                                        setRecursoParaVincular(null);
                                        setFuncionariosSelecionados([]);
                                        setBuscaFuncionario('');
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (funcionariosSelecionados.length > 0) {
                                            setShowConfirmDialog(true);
                                        }
                                    }}
                                    disabled={funcionariosSelecionados.length === 0}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Entrega
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes do Kit (Ferramentas | Uniforme/EPI) */}
            {isModalDetalhesKitOpen && kitDetalhesSelecionado && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-600 to-green-500">
                            <div>
                                <h3 className="text-2xl font-bold text-white">📦 Detalhes do Kit</h3>
                                <p className="text-green-100 text-sm mt-1">{kitDetalhesSelecionado.nome}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalDetalhesKitOpen(false);
                                    setKitDetalhesSelecionado(null);
                                }}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                                    <p className="text-sm text-blue-700 font-semibold mb-1">👤 Eletricista</p>
                                    <p className="font-bold text-gray-900 text-lg">{kitDetalhesSelecionado.eletricistaNome}</p>
                                </div>
                                <div className="bg-emerald-50 p-5 rounded-xl border-2 border-emerald-200 shadow-sm">
                                    <p className="text-sm text-emerald-700 font-semibold mb-1">📅 Data de entrega do kit (criação)</p>
                                    <p className="font-bold text-gray-900 text-lg">
                                        {new Date(kitDetalhesSelecionado.dataEntrega).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-emerald-600 mt-0.5">Data em que o kit foi entregue ao colaborador</p>
                                </div>
                            </div>

                            <div className="inline-flex bg-gray-100 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => setAbaDetalhesKit('ferramentas')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                        abaDetalhesKit === 'ferramentas'
                                            ? 'bg-white text-green-700 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Ferramentas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAbaDetalhesKit('uniformes')}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                        abaDetalhesKit === 'uniformes'
                                            ? 'bg-white text-green-700 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Uniforme | EPI
                                </button>
                            </div>

                            {abaDetalhesKit === 'ferramentas' ? (
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg mb-4">
                                        🔧 Ferramentas do Kit ({kitDetalhesSelecionado.itens?.length || 0})
                                    </h4>
                                    <div className="space-y-4">
                                        {(kitDetalhesSelecionado.itens || []).map((item: any, index: number) => (
                                            <div key={item.id} className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-11 h-11 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-gray-900 text-base mb-1">{item.ferramenta?.nome}</h5>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            Código: <span className="font-medium text-gray-800">{item.ferramenta?.codigo}</span>
                                                            <span className="mx-2">|</span>
                                                            Categoria: <span className="font-medium text-gray-800">{item.ferramenta?.categoria}</span>
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600 font-medium">Quantidade:</span>
                                                                <span className="font-bold text-gray-900">x{item.quantidade}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600 font-medium">Estado:</span>
                                                                <span className="px-2.5 py-1 rounded font-semibold text-xs bg-green-100 text-green-800">
                                                                    {item.estadoEntrega}
                                                                </span>
                                                            </div>
                                                            {item.dataAdicao && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-600 font-medium">Adicionado em:</span>
                                                                    <span className="font-semibold text-gray-900">
                                                                        {new Date(item.dataAdicao).toLocaleDateString('pt-BR', {
                                                                            day: '2-digit',
                                                                            month: '2-digit',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg mb-4">🦺 Uniforme | EPI entregues</h4>
                                    {loadingHistoricoKit ? (
                                        <div className="text-center py-10 text-gray-500">Carregando histórico de uniformes e EPIs...</div>
                                    ) : historicoUniformesKit.length === 0 ? (
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                                            <p className="text-sm text-gray-700">{avisoHistoricoKit || 'Nenhuma entrega de uniforme/EPI para este colaborador.'}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {historicoUniformesKit.map((mov: any) => (
                                                <div key={mov.id} className="bg-white border border-gray-200 rounded-xl p-4">
                                                    <p className="font-semibold text-gray-900">
                                                        {mov.recursoHumano?.nomeItem || 'Recurso sem nome'}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        Quantidade: <span className="font-semibold">{mov.quantidade}</span>
                                                        <span className="mx-2">|</span>
                                                        Entregue em: {new Date(mov.dataMovimentacao).toLocaleDateString('pt-BR')}
                                                    </p>
                                                    {mov.descricao && <p className="text-sm text-gray-700 mt-1">{mov.descricao}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog de Confirmação de Entrega */}
            {showConfirmDialog && (
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Entrega</AlertDialogTitle>
                            <AlertDialogDescription className="pt-4">
                                <div className="space-y-3">
                                    <p className="text-gray-700">
                                        Confirmar a entrega do recurso{' '}
                                        <span className="font-bold text-gray-900">{recursoParaVincular?.nomeItem}</span> para{' '}
                                        <span className="font-bold text-gray-900">{funcionariosSelecionados.length}</span> colaborador(es)?
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        Quantidade por colaborador: <span className="font-bold">{quantidadeVinculacao}</span>
                                    </p>
                                    <p className="text-sm text-gray-700">
                                        Baixa total no estoque:{' '}
                                        <span className="font-bold">
                                            {(parseFloat(quantidadeVinculacao) > 0 ? parseFloat(quantidadeVinculacao) : 0) *
                                                funcionariosSelecionados.length}
                                        </span>
                                    </p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmarVinculacao}
                                className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            >
                                Confirmar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Modal de Histórico */}
            {isModalHistoricoOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                            <h3 className="text-2xl font-bold text-gray-900">Histórico de Movimentações</h3>
                            <button
                                type="button"
                                onClick={() => setIsModalHistoricoOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            {historicoRecurso.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-gray-500 font-medium">Nenhum histórico registrado</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {historicoRecurso.map((item: any, index: number) => (
                                        <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                            item.tipoMovimentacao === 'VINCULACAO' ? 'bg-green-100 text-green-700' :
                                                            item.tipoMovimentacao === 'DESVINCULACAO' ? 'bg-red-100 text-red-700' :
                                                            item.tipoMovimentacao === 'RECEBIMENTO' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {item.tipoMovimentacao === 'VINCULACAO' ? 'VINCULAÇÃO' :
                                                             item.tipoMovimentacao === 'DESVINCULACAO' ? 'DESVINCULAÇÃO' :
                                                             item.tipoMovimentacao === 'RECEBIMENTO' ? 'RECEBIMENTO' :
                                                             item.tipoMovimentacao}
                                                        </span>
                                                        <span className="text-sm text-gray-600">
                                                            {new Date(item.dataMovimentacao).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    {item.funcionario && (
                                                        <p className="text-sm font-semibold text-gray-900 mb-1">
                                                            Funcionário: {item.funcionario.nome} - {item.funcionario.cargo}
                                                        </p>
                                                    )}
                                                {typeof item.quantidade === 'number' && (
                                                    <p className="text-sm text-gray-700">
                                                        Quantidade movimentada: <span className="font-semibold">{item.quantidade}</span>
                                                    </p>
                                                )}
                                                    {item.descricao && (
                                                        <p className="text-sm text-gray-700">{item.descricao}</p>
                                                    )}
                                                    {item.observacoes && (
                                                        <p className="text-xs text-gray-500 mt-1 italic">{item.observacoes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AlertDialog de Confirmação de Exclusão de Recurso */}
            <AlertDialog open={showExcluirRecursoDialog} onOpenChange={(open) => { setShowExcluirRecursoDialog(open); if (!open) setRecursoParaExcluir(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Confirmar Exclusão
                        </AlertDialogTitle>
                            <AlertDialogDescription>
                            <p className="text-gray-700">
                                Tem certeza que deseja excluir o recurso{' '}
                                <span className="font-bold text-gray-900">{recursoParaExcluir?.nomeItem || 'selecionado'}</span>?
                                Esta ação não pode ser desfeita.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelarExcluirRecurso}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmarExcluirRecurso} className="bg-red-600 hover:bg-red-700">
                            Sim, Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== CARROS VIEW ====================
const CarrosView: React.FC = () => {
    const [veiculos, setVeiculos] = useState<any[]>([]);
    const [metricas, setMetricas] = useState({ gastosMes: 0, combustivel: 0, manutencao: 0, totalVeiculos: 0 });
    const [loading, setLoading] = useState(true);
    const [isVeiculoModalOpen, setIsVeiculoModalOpen] = useState(false);
    const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
    const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState<any | null>(null);
    const [gastosVeiculo, setGastosVeiculo] = useState<any[]>([]);
    const [filtroGastoPeriodo, setFiltroGastoPeriodo] = useState<'semana' | 'mes' | 'ano'>('mes');
    const [gastoVisualizando, setGastoVisualizando] = useState<any | null>(null);
    const [veiculoForm, setVeiculoForm] = useState({
        modelo: '',
        placa: '',
        tipo: 'Carro',
        ano: new Date().getFullYear(),
        kmAtual: 0
    });
    const [gastoForm, setGastoForm] = useState({
        veiculoId: '',
        tipo: 'Combustível',
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        km: '',
        responsavel: ''
    });
    
    // Estados para dialog de confirmação de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [veiculoParaDeletar, setVeiculoParaDeletar] = useState<{ id: string; modelo: string; placa: string } | null>(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [veicResp, metricasResp] = await Promise.all([
                veiculosService.listar(),
                veiculosService.obterMetricas()
            ]);
            setVeiculos(Array.isArray(veicResp?.data) ? (veicResp.data as any[]) : (veicResp?.data ?? []) as any[]);
            setMetricas((metricasResp?.data as any) ?? { gastosMes: 0, combustivel: 0, manutencao: 0, totalVeiculos: 0 });
        } catch (error) {
            console.error('Erro ao carregar dados da frota:', error);
            toast.error('Erro ao carregar veículos');
        } finally {
            setLoading(false);
        }
    };

    const handleVisualizarVeiculo = async (veiculo: any) => {
        setVeiculoSelecionado(veiculo);
        setIsVisualizarModalOpen(true);
        await carregarGastosVeiculo(veiculo.id);
    };

    const handleFecharVisualizacao = () => {
        setIsVisualizarModalOpen(false);
        setVeiculoSelecionado(null);
        setGastosVeiculo([]);
        setGastoVisualizando(null);
    };

    const carregarGastosVeiculo = async (veiculoId: string) => {
        try {
            const response = await gastosVeiculoService.listar() as any;
            const lista = (response?.data ?? response) as any[];
            const gastosDoVeiculo = Array.isArray(lista) ? lista.filter(
                (gasto: any) => gasto.veiculoId === veiculoId
            ) : [];
            setGastosVeiculo(gastosDoVeiculo);
        } catch (error) {
            console.error('Erro ao carregar gastos do veículo:', error);
        }
    };

    const filtrarGastosPorPeriodo = () => {
        const agora = new Date();
        const filtrados = gastosVeiculo.filter(gasto => {
            const dataGasto = new Date(gasto.data);
            
            if (filtroGastoPeriodo === 'semana') {
                const umaSemanaAtras = new Date(agora);
                umaSemanaAtras.setDate(agora.getDate() - 7);
                return dataGasto >= umaSemanaAtras;
            } else if (filtroGastoPeriodo === 'mes') {
                return dataGasto.getMonth() === agora.getMonth() && 
                       dataGasto.getFullYear() === agora.getFullYear();
            } else { // ano
                return dataGasto.getFullYear() === agora.getFullYear();
            }
        });
        return filtrados;
    };

    const handleExcluirVeiculo = (veiculoId: string, modelo: string, placa: string) => {
        setVeiculoParaDeletar({ id: veiculoId, modelo, placa });
        setShowDeleteDialog(true);
    };

    const confirmarDelecaoVeiculo = async () => {
        if (!veiculoParaDeletar) return;

        try {
            await veiculosService.deletar(veiculoParaDeletar.id);
            toast.success('Veículo excluído com sucesso!', {
                description: `${veiculoParaDeletar.modelo} (${veiculoParaDeletar.placa}) foi removido da frota`,
                duration: 4000,
            });
            setShowDeleteDialog(false);
            setVeiculoParaDeletar(null);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao excluir veículo:', error);
            toast.error('Erro ao excluir veículo', {
                description: error.response?.data?.message || 'Não foi possível excluir o veículo. Tente novamente.',
                duration: 4000,
            });
        }
    };

    const cancelarDelecaoVeiculo = () => {
        setShowDeleteDialog(false);
        setVeiculoParaDeletar(null);
    };

    useEscapeKey(() => setIsVeiculoModalOpen(false), isVeiculoModalOpen);
    useEscapeKey(() => setIsGastoModalOpen(false), isGastoModalOpen);
    useEscapeKey(() => setIsVisualizarModalOpen(false), isVisualizarModalOpen);
    useEscapeKey(() => setGastoVisualizando(null), !!gastoVisualizando);
    useEscapeKey(cancelarDelecaoVeiculo, showDeleteDialog);

    const handleRegistrarPagamentoGastoFrota = async () => {
        if (!gastoVisualizando || !veiculoSelecionado) return;

        const valor = parseFloat(gastoVisualizando.valor);
        const descricao = `Frota - ${gastoVisualizando.tipo} | ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`;
        const dataVencimento = new Date(gastoVisualizando.data).toISOString().split('T')[0];

        try {
            // Criar conta a pagar tipo FROTA (não despesa fixa) e dar baixa = registra só nas movimentações
            const criarRes = await financeiroService.criarContaPagar({
                tipo: 'FROTA',
                descricao,
                valor,
                dataVencimento,
                observacoes: gastoVisualizando.descricao || `${gastoVisualizando.tipo} - ${veiculoSelecionado.modelo}`
            });

            if (!criarRes.success || !criarRes.data?.id) {
                toast.error(criarRes.error || 'Erro ao registrar pagamento');
                return;
            }

            const hoje = new Date().toISOString().split('T')[0];
            const pagarRes = await financeiroService.pagarContaPagar(criarRes.data.id, {
                dataPagamento: hoje,
                valorPago: valor,
                meioPagamento: 'PIX',
                observacoes: `Pagamento gasto frota - ${veiculoSelecionado.placa}`
            });

            if (!pagarRes.success) {
                toast.error(pagarRes.error || 'Conta criada, mas falha ao registrar pagamento');
                return;
            }

            toast.success('Pagamento registrado nas movimentações.', {
                description: 'O gasto permanece no histórico do veículo e aparece no extrato (Financeiro > Movimentações).',
            });
            setGastoVisualizando(null);
        } catch (error) {
            console.error('Erro ao registrar pagamento do gasto da frota:', error);
            toast.error('Erro ao registrar pagamento.');
        }
    };

    const handleSubmitVeiculo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await veiculosService.criar(veiculoForm);
            toast.success('Veículo cadastrado com sucesso!', {
                description: `${veiculoForm.modelo} (${veiculoForm.placa}) foi adicionado à frota`,
                duration: 4000,
            });
            setIsVeiculoModalOpen(false);
            setVeiculoForm({
                modelo: '',
                placa: '',
                tipo: 'Carro',
                ano: new Date().getFullYear(),
                kmAtual: 0
            });
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao cadastrar veículo:', error);
            toast.error('Erro ao cadastrar veículo', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    const handleSubmitGasto = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await gastosVeiculoService.criar({
                ...gastoForm,
                valor: parseFloat(gastoForm.valor),
                km: gastoForm.km ? parseInt(gastoForm.km) : undefined
            });
            const veiculo = veiculos.find(v => v.id === gastoForm.veiculoId);
            toast.success('Gasto registrado com sucesso!', {
                description: `${gastoForm.tipo} de R$ ${parseFloat(gastoForm.valor).toFixed(2)} - ${veiculo?.modelo || 'Veículo'}`,
                duration: 4000,
            });
            setIsGastoModalOpen(false);
            setGastoForm({
                veiculoId: '',
                tipo: 'Combustível',
                descricao: '',
                valor: '',
                data: new Date().toISOString().split('T')[0],
                km: '',
                responsavel: ''
            });
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao registrar gasto:', error);
            toast.error('Erro ao registrar gasto', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Gestão de Frota</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsGastoModalOpen(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Registrar Gasto
                    </button>
                    <button
                        onClick={() => setIsVeiculoModalOpen(true)}
                        className="btn-success flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Adicionar Veículo
                    </button>
                </div>
            </div>

            {/* Métricas Frota */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-orange-700">Gastos do Mês</p>
                    <p className="text-2xl font-bold text-orange-900">
                        R$ {(metricas.gastosMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-700">Combustível</p>
                    <p className="text-2xl font-bold text-blue-900">
                        R$ {(metricas.combustivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700">Manutenção</p>
                    <p className="text-2xl font-bold text-red-900">
                        R$ {(metricas.manutencao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-purple-700">Veículos Ativos</p>
                    <p className="text-2xl font-bold text-purple-900">{metricas.totalVeiculos || 0}</p>
                </div>
            </div>

            {/* Lista de Veículos */}
            <div className="card-primary">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Veículos Cadastrados</h3>
                {veiculos.length === 0 ? (
                    <div className="text-center py-12">
                        <TruckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum veículo cadastrado</p>
                        <button
                            onClick={() => setIsVeiculoModalOpen(true)}
                            className="mt-4 btn-success inline-flex items-center gap-2"
                        >
                            Cadastrar Primeiro Veículo
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {veiculos.map((veiculo) => (
                            <div key={veiculo.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all">
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900">{veiculo.modelo} - {veiculo.placa}</h4>
                                        <p className="text-sm text-gray-600">{veiculo.tipo} | {veiculo.ano}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Gasto Total</p>
                                            <p className="text-lg font-bold text-orange-600">R$ {veiculo.gastoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleVisualizarVeiculo(veiculo)}
                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                title="Visualizar veículo"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleExcluirVeiculo(veiculo.id, veiculo.modelo, veiculo.placa)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Excluir veículo"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Adicionar Veículo */}
            {isVeiculoModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                                    <TruckIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Adicionar Veículo</h3>
                                    <p className="text-sm text-gray-600">Cadastre um novo veículo na frota</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleSubmitVeiculo} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Marca/Modelo *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Toyota Hilux"
                                        value={veiculoForm.modelo}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Placa *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ABC-1234"
                                        value={veiculoForm.placa}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, placa: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                                    <select
                                        required
                                        value={veiculoForm.tipo}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, tipo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="Carro">Carro</option>
                                        <option value="Caminhonete">Caminhonete</option>
                                        <option value="Van">Van</option>
                                        <option value="Caminhão">Caminhão</option>
                                        <option value="Moto">Moto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ano *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                        value={veiculoForm.ano}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, ano: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Quilometragem Atual (KM)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={veiculoForm.kmAtual}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, kmAtual: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsVeiculoModalOpen(false)} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    Cadastrar Veículo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Registrar Gasto */}
            {isGastoModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Registrar Gasto</h3>
                                    <p className="text-sm text-gray-600">Adicione uma despesa do veículo</p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleSubmitGasto} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Veículo *</label>
                                <select
                                    required
                                    value={gastoForm.veiculoId}
                                    onChange={(e) => setGastoForm({ ...gastoForm, veiculoId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Selecione um veículo...</option>
                                    {veiculos.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.modelo} - {v.placa}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Gasto *</label>
                                    <select
                                        required
                                        value={gastoForm.tipo}
                                        onChange={(e) => setGastoForm({ ...gastoForm, tipo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Combustível">⛽ Combustível</option>
                                        <option value="Manutenção">🔧 Manutenção</option>
                                        <option value="Seguro">🛡️ Seguro</option>
                                        <option value="IPVA">💳 IPVA</option>
                                        <option value="Multa">🚨 Multa</option>
                                        <option value="Pedágio">🛣️ Pedágio</option>
                                        <option value="Lavagem">🧼 Lavagem</option>
                                        <option value="Outros">📝 Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0,00"
                                        value={gastoForm.valor}
                                        onChange={(e) => setGastoForm({ ...gastoForm, valor: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                                    <input
                                        type="date"
                                        required
                                        value={gastoForm.data}
                                        onChange={(e) => setGastoForm({ ...gastoForm, data: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">KM (Hodômetro)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Quilometragem atual"
                                        value={gastoForm.km}
                                        onChange={(e) => setGastoForm({ ...gastoForm, km: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
                                <input
                                    type="text"
                                    placeholder="Nome do responsável pelo gasto"
                                    value={gastoForm.responsavel}
                                    onChange={(e) => setGastoForm({ ...gastoForm, responsavel: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição/Observações</label>
                                <textarea
                                    placeholder="Descreva o gasto (ex: Troca de óleo, Abastecimento completo, etc.)"
                                    value={gastoForm.descricao}
                                    onChange={(e) => setGastoForm({ ...gastoForm, descricao: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsGastoModalOpen(false)} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    Registrar Gasto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Visualizar Veículo */}
            {isVisualizarModalOpen && veiculoSelecionado && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 max-h-[95vh] overflow-y-auto">
                        {/* Header do Modal */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <TruckIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Detalhes do Veículo</h3>
                                        <p className="text-sm text-orange-100 mt-1">Informações completas</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleFecharVisualizacao}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6 space-y-6">
                            {/* Informações Principais */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                                    <p className="text-sm font-medium text-orange-700 mb-1">Modelo</p>
                                    <p className="text-lg font-bold text-orange-900">{veiculoSelecionado.modelo}</p>
                                </div>
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                                    <p className="text-sm font-medium text-orange-700 mb-1">Placa</p>
                                    <p className="text-lg font-bold text-orange-900">{veiculoSelecionado.placa}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">🚗 Tipo</p>
                                    <p className="text-lg font-semibold text-gray-900">{veiculoSelecionado.tipo}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">📅 Ano</p>
                                    <p className="text-lg font-semibold text-gray-900">{veiculoSelecionado.ano}</p>
                                </div>
                            </div>

                            {/* Métricas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">📏 Quilometragem Atual</p>
                                    <p className="text-xl font-semibold text-gray-900">
                                        {veiculoSelecionado.kmAtual?.toLocaleString('pt-BR') || '0'} km
                                    </p>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                    <p className="text-sm text-orange-700 mb-1">💰 Gasto Total</p>
                                    <p className="text-xl font-bold text-orange-600">
                                        R$ {veiculoSelecionado.gastoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                    </p>
                                </div>
                            </div>

                            {/* Histórico de Gastos */}
                            <div className="border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Histórico de Gastos
                                    </h4>
                                    {/* Filtros de Período */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setFiltroGastoPeriodo('semana')}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                filtroGastoPeriodo === 'semana'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Semana
                                        </button>
                                        <button
                                            onClick={() => setFiltroGastoPeriodo('mes')}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                filtroGastoPeriodo === 'mes'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Mês
                                        </button>
                                        <button
                                            onClick={() => setFiltroGastoPeriodo('ano')}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                filtroGastoPeriodo === 'ano'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Ano
                                        </button>
                                    </div>
                                </div>

                                {/* Tabela de Gastos */}
                                {filtrarGastosPorPeriodo().length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-gray-500 font-medium">Nenhum gasto registrado neste período</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {filtrarGastosPorPeriodo().map((gasto) => (
                                                    <tr key={gasto.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {new Date(gasto.data).toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                                                gasto.tipo === 'Combustível' ? 'bg-blue-100 text-blue-700' :
                                                                gasto.tipo === 'Manutenção' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {gasto.tipo}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                                            {gasto.descricao || 'Sem descrição'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                                                            R$ {parseFloat(gasto.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => setGastoVisualizando(gasto)}
                                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                                title="Ver detalhes"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Total do Período */}
                                {filtrarGastosPorPeriodo().length > 0 && (
                                    <div className="mt-4 flex justify-end">
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                            <p className="text-sm text-orange-700 mb-1">Total no período</p>
                                            <p className="text-2xl font-bold text-orange-600">
                                                R$ {filtrarGastosPorPeriodo()
                                                    .reduce((sum, g) => sum + parseFloat(g.valor || 0), 0)
                                                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer do Modal */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={handleFecharVisualizacao}
                                className="w-full btn-secondary"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalhes do Gasto */}
            {gastoVisualizando && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Detalhes do Gasto</h3>
                                </div>
                                <button
                                    onClick={() => setGastoVisualizando(null)}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                    <p className="text-sm text-orange-700 mb-1">💰 Valor</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        R$ {parseFloat(gastoVisualizando.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">📅 Data</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {new Date(gastoVisualizando.data).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">🏷️ Tipo</p>
                                    <p className="text-lg font-semibold text-gray-900">{gastoVisualizando.tipo}</p>
                                </div>
                                {gastoVisualizando.km && (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-sm text-gray-600 mb-1">📏 Quilometragem</p>
                                        <p className="text-lg font-semibold text-gray-900">{gastoVisualizando.km} km</p>
                                    </div>
                                )}
                            </div>

                            {gastoVisualizando.responsavel && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">👤 Responsável</p>
                                    <p className="text-lg font-semibold text-gray-900">{gastoVisualizando.responsavel}</p>
                                </div>
                            )}

                            {gastoVisualizando.descricao && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-2">📝 Descrição</p>
                                    <p className="text-gray-900">{gastoVisualizando.descricao}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setGastoVisualizando(null)}
                                className="flex-1 btn-secondary"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={handleRegistrarPagamentoGastoFrota}
                                className="flex-1 btn-success"
                            >
                                💳 Registrar pagamento (movimentações)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog de Confirmação de Exclusão */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-3">
                                <p className="text-gray-700">
                                    Tem certeza que deseja excluir o veículo{' '}
                                    <span className="font-bold text-gray-900">{veiculoParaDeletar?.modelo}</span>
                                    {' '}({veiculoParaDeletar?.placa})?
                                </p>
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                    <p className="text-sm text-red-800 font-medium">
                                        ⚠️ Esta ação não pode ser desfeita!
                                    </p>
                                    <p className="text-sm text-red-700 mt-2">
                                        Todos os dados relacionados ao veículo, incluindo histórico de gastos e manutenções, serão permanentemente removidos.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelarDelecaoVeiculo}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarDelecaoVeiculo}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Sim, Excluir Veículo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== PLANOS VIEW ====================
const PlanosView: React.FC = () => {
    const [planos, setPlanos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
    const [planoSelecionado, setPlanoSelecionado] = useState<any>(null);
    const [planoForm, setPlanoForm] = useState({
        titulo: '',
        descricao: '',
        prazo: '',
        responsavel: '',
        prioridade: 'Média',
        status: 'Pendente'
    });
    const [editingPlanoId, setEditingPlanoId] = useState<string | null>(null);
    // Estados para confirmação de exclusão de plano
    const [showDeletePlanoDialog, setShowDeletePlanoDialog] = useState(false);
    const [planoParaDeletar, setPlanoParaDeletar] = useState<{ id: string; titulo?: string } | null>(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const resp = await planosService.listar();
            setPlanos(Array.isArray(resp?.data) ? (resp.data as any[]) : (resp?.data ?? []) as any[]);
        } catch (error) {
            console.error('Erro ao carregar planos:', error);
            toast.error('Erro ao carregar planos estratégicos');
        } finally {
            setLoading(false);
        }
    };

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);
    useEscapeKey(() => setPlanoSelecionado(null), !!planoSelecionado);

    const handleTogglePlano = async (id: string) => {
        try {
            await planosService.toggleStatus(id);
            toast.success('Status atualizado!');
            carregarDados();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast.error('Erro ao atualizar status do plano');
        }
    };

    const handleDeletarPlano = (id: string, titulo?: string) => {
        setPlanoParaDeletar({ id, titulo });
        setShowDeletePlanoDialog(true);
    };

    const confirmarDelecaoPlano = async () => {
        if (!planoParaDeletar) return;

        try {
            await planosService.deletar(planoParaDeletar.id);
            toast.success('Plano excluído com sucesso!', {
                description: `${planoParaDeletar.titulo || ''} foi removido.`,
                duration: 4000,
            });
            setShowDeletePlanoDialog(false);
            setPlanoParaDeletar(null);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao excluir plano:', error);
            toast.error('Erro ao excluir plano', {
                description: error.response?.data?.message || 'Não foi possível excluir. Tente novamente.',
            });
        }
    };

    const cancelarDelecaoPlano = () => {
        setShowDeletePlanoDialog(false);
        setPlanoParaDeletar(null);
    };

    const handleSubmitPlano = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPlanoId) {
                await planosService.atualizar(editingPlanoId, planoForm);
                toast.success('Plano atualizado com sucesso!');
            } else {
                await planosService.criar(planoForm);
                toast.success('Plano criado com sucesso!');
            }

            setIsModalOpen(false);
            setPlanoForm({
                titulo: '',
                descricao: '',
                prazo: '',
                responsavel: '',
                prioridade: 'Média',
                status: 'Pendente'
            });
            setEditingPlanoId(null);
            carregarDados();
        } catch (error) {
            console.error('Erro ao salvar plano:', error);
            toast.error('Erro ao salvar plano estratégico');
        }
    };

    const handleEditarPlano = (plano: any) => {
        // Preenche o formulário com os dados do plano para edição
        setPlanoForm({
            titulo: plano.titulo || '',
            descricao: plano.descricao || '',
            prazo: plano.prazo ? new Date(plano.prazo).toISOString().slice(0, 10) : '',
            responsavel: plano.responsavel || '',
            prioridade: plano.prioridade || 'Média',
            status: plano.status || 'Pendente'
        });
        setEditingPlanoId(plano.id);
        setIsModalOpen(true);
    };

    

    const handleVisualizarPlano = (plano: any) => {
        setPlanoSelecionado(plano);
        setIsVisualizarModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Planos Estratégicos</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-success flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Plano
                </button>
            </div>

            {/* Categorias de Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700">Alta Prioridade</p>
                    <p className="text-2xl font-bold text-red-900">
                        {planos.filter(p => p.prioridade === 'Alta' && p.status !== 'Concluído').length}
                    </p>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-yellow-700">Média Prioridade</p>
                    <p className="text-2xl font-bold text-yellow-900">
                        {planos.filter(p => p.prioridade === 'Média' && p.status !== 'Concluído').length}
                    </p>
                </div>
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-700">Concluídos</p>
                    <p className="text-2xl font-bold text-green-900">
                        {planos.filter(p => p.status === 'Concluído').length}
                    </p>
                </div>
            </div>

            {/* Lista de Planos */}
            <div className="card-primary">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Lista de Planos</h3>
                {planos.length === 0 ? (
                    <div className="text-center py-12">
                        <ClipboardDocumentListIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum plano cadastrado</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 btn-success inline-flex items-center gap-2"
                        >
                            Criar Primeiro Plano
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {planos.map((plano) => (
                            <div
                                key={plano.id}
                                className={`border-2 rounded-xl p-4 transition-all ${
                                    plano.status === 'Concluído'
                                        ? 'bg-green-50 border-green-200 opacity-75'
                                        : 'border-gray-200 hover:border-green-300'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <input
                                        type="checkbox"
                                        checked={plano.status === 'Concluído'}
                                        onChange={() => handleTogglePlano(plano.id)}
                                        className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className={`font-bold text-gray-900 ${plano.status === 'Concluído' ? 'line-through' : ''}`}>
                                                {plano.titulo}
                                            </h4>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                plano.prioridade === 'Alta' ? 'bg-red-100 text-red-700' :
                                                plano.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {plano.prioridade}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{plano.descricao}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span>📅 Prazo: {new Date(plano.prazo).toLocaleDateString('pt-BR')}</span>
                                            <span>👤 Responsável: {plano.responsavel}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleEditarPlano(plano)}
                                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                        title="Editar plano"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleVisualizarPlano(plano)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Visualizar detalhes"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeletarPlano(plano.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir plano"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Criar Plano */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-900">Criar Plano Estratégico</h3>
                        </div>
                        <form onSubmit={handleSubmitPlano} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                                <input
                                    type="text"
                                    required
                                    value={planoForm.titulo}
                                    onChange={(e) => setPlanoForm({ ...planoForm, titulo: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                                <textarea
                                    required
                                    value={planoForm.descricao}
                                    onChange={(e) => setPlanoForm({ ...planoForm, descricao: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Prazo *</label>
                                    <input
                                        type="date"
                                        required
                                        value={planoForm.prazo}
                                        onChange={(e) => setPlanoForm({ ...planoForm, prazo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Responsável *</label>
                                    <input
                                        type="text"
                                        required
                                        value={planoForm.responsavel}
                                        onChange={(e) => setPlanoForm({ ...planoForm, responsavel: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade *</label>
                                <select
                                    required
                                    value={planoForm.prioridade}
                                    onChange={(e) => setPlanoForm({ ...planoForm, prioridade: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="Alta">Alta</option>
                                    <option value="Média">Média</option>
                                    <option value="Baixa">Baixa</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    Criar Plano
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Visualizar Plano */}
            {isVisualizarModalOpen && planoSelecionado && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                                        <ClipboardDocumentListIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">Detalhes do Plano</h3>
                                        <p className="text-sm text-gray-600">Informações completas</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsVisualizarModalOpen(false)}
                                    className="p-2 hover:bg-white rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status e Prioridade */}
                            <div className="flex gap-3">
                                <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                    planoSelecionado.status === 'Concluído' 
                                        ? 'bg-green-100 text-green-700' 
                                        : planoSelecionado.status === 'Em Andamento'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {planoSelecionado.status === 'Concluído' ? '✓ ' : ''}
                                    {planoSelecionado.status}
                                </span>
                                <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                    planoSelecionado.prioridade === 'Alta' ? 'bg-red-100 text-red-700' :
                                    planoSelecionado.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {planoSelecionado.prioridade === 'Alta' ? '🔴 ' : planoSelecionado.prioridade === 'Média' ? '🟡 ' : '🔵 '}
                                    Prioridade {planoSelecionado.prioridade}
                                </span>
                            </div>

                            {/* Título */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-500 mb-2">TÍTULO DO PLANO</label>
                                <h4 className="text-xl font-bold text-gray-900">{planoSelecionado.titulo}</h4>
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-500 mb-2">DESCRIÇÃO</label>
                                <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 whitespace-pre-wrap">
                                    {planoSelecionado.descricao}
                                </p>
                            </div>

                            {/* Grid de Informações */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Prazo */}
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <label className="text-xs font-semibold text-blue-700 uppercase">Prazo</label>
                                    </div>
                                    <p className="text-lg font-bold text-blue-900">
                                        {new Date(planoSelecionado.prazo).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>

                                {/* Responsável */}
                                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <label className="text-xs font-semibold text-purple-700 uppercase">Responsável</label>
                                    </div>
                                    <p className="text-lg font-bold text-purple-900">{planoSelecionado.responsavel}</p>
                                </div>
                            </div>

                            {/* Categoria (se existir) */}
                            {planoSelecionado.categoria && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-500 mb-2">CATEGORIA</label>
                                    <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold">
                                        {planoSelecionado.categoria}
                                    </span>
                                </div>
                            )}

                            {/* Datas de Criação e Atualização */}
                            <div className="border-t border-gray-200 pt-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Criado em: </span>
                                        <span className="font-semibold text-gray-700">
                                            {new Date(planoSelecionado.createdAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Última atualização: </span>
                                        <span className="font-semibold text-gray-700">
                                            {new Date(planoSelecionado.updatedAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setIsVisualizarModalOpen(false)}
                                className="w-full btn-secondary"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* AlertDialog de Confirmação de Exclusão de Plano */}
            <AlertDialog open={showDeletePlanoDialog} onOpenChange={setShowDeletePlanoDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-3">
                                <p className="text-gray-700">
                                    Tem certeza que deseja excluir o plano{' '}
                                    <span className="font-bold text-gray-900">{planoParaDeletar?.titulo}</span>?
                                </p>
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                    <p className="text-sm text-red-800 font-medium">
                                        ⚠️ Esta ação não pode ser desfeita!
                                    </p>
                                    <p className="text-sm text-red-700 mt-2">
                                        O plano será removido permanentemente do sistema.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelarDelecaoPlano}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmarDelecaoPlano} className="bg-red-600 hover:bg-red-700">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Sim, Excluir Plano
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ==================== DESPESAS FIXAS VIEW ====================
const DespesasFixasView: React.FC = () => {
    const [despesas, setDespesas] = useState<any[]>([]);
    const [metricas, setMetricas] = useState({ totalMensal: 0, totalAnual: 0, totalDespesas: 0, porCategoria: {} });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
    const [despesaEditando, setDespesaEditando] = useState<any>(null);
    const [despesaForm, setDespesaForm] = useState({
        descricao: '',
        categoria: 'Aluguel',
        valor: '',
        diaVencimento: 5,
        fornecedor: '',
        observacoes: ''
    });
    const [pagamentoForm, setPagamentoForm] = useState({
        despesaFixaId: '',
        mesReferencia: new Date().toISOString().slice(0, 7),
        valorPago: '',
        dataPagamento: new Date().toISOString().split('T')[0],
        observacoes: ''
    });
    
    // Estados para dialog de confirmação de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [despesaParaDeletar, setDespesaParaDeletar] = useState<{ id: string; descricao: string } | null>(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [despResp, metricasResp] = await Promise.all([
                despesasFixasService.listar(),
                despesasFixasService.obterMetricas()
            ]);
            setDespesas(Array.isArray(despResp?.data) ? (despResp.data as any[]) : (despResp?.data ?? []) as any[]);
            setMetricas((metricasResp?.data as any) ?? { totalMensal: 0, totalAnual: 0, totalDespesas: 0, porCategoria: {} });
        } catch (error) {
            console.error('Erro ao carregar despesas fixas:', error);
            toast.error('Erro ao carregar despesas fixas');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitDespesa = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dados = {
                ...despesaForm,
                valor: parseFloat(despesaForm.valor)
            };

            if (despesaEditando) {
                await despesasFixasService.atualizar(despesaEditando.id, dados);
                toast.success('Despesa atualizada com sucesso!', {
                    description: `${despesaForm.descricao} - R$ ${parseFloat(despesaForm.valor).toFixed(2)}`,
                    duration: 4000,
                });
            } else {
                await despesasFixasService.criar(dados);
                toast.success('Despesa cadastrada com sucesso!', {
                    description: `${despesaForm.descricao} - Vencimento dia ${despesaForm.diaVencimento}`,
                    duration: 4000,
                });
            }

            setIsModalOpen(false);
            setDespesaEditando(null);
            setDespesaForm({
                descricao: '',
                categoria: 'Aluguel',
                valor: '',
                diaVencimento: 5,
                fornecedor: '',
                observacoes: ''
            });
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao salvar despesa:', error);
            toast.error('Erro ao salvar despesa fixa', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    const handleEditarDespesa = (despesa: any) => {
        setDespesaEditando(despesa);
        setDespesaForm({
            descricao: despesa.descricao,
            categoria: despesa.categoria,
            valor: despesa.valor.toString(),
            diaVencimento: despesa.diaVencimento,
            fornecedor: despesa.fornecedor || '',
            observacoes: despesa.observacoes || ''
        });
        setIsModalOpen(true);
    };

    const handleToggleAtiva = async (id: string, ativa: boolean) => {
        try {
            await despesasFixasService.atualizar(id, { ativa: !ativa });
            toast.success(`Despesa ${!ativa ? 'ativada' : 'desativada'} com sucesso!`, {
                description: !ativa ? 'A despesa voltará a gerar contas mensalmente' : 'A despesa não gerará mais contas automáticas',
                duration: 4000,
            });
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao atualizar status:', error);
            toast.error('Erro ao atualizar despesa', {
                description: error.response?.data?.message || 'Tente novamente',
                duration: 4000,
            });
        }
    };

    const handleDeletarDespesa = (id: string, descricao: string) => {
        setDespesaParaDeletar({ id, descricao });
        setShowDeleteDialog(true);
    };

    const confirmarDelecaoDespesa = async () => {
        if (!despesaParaDeletar) return;

        try {
            await despesasFixasService.deletar(despesaParaDeletar.id);
            toast.success('Despesa fixa excluída com sucesso!', {
                description: `${despesaParaDeletar.descricao} foi removida. As contas a pagar relacionadas também foram excluídas.`,
                duration: 5000,
            });
            setShowDeleteDialog(false);
            setDespesaParaDeletar(null);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao excluir despesa:', error);
            toast.error('Erro ao excluir despesa fixa', {
                description: error.response?.data?.message || 'Não foi possível excluir a despesa. Tente novamente.',
                duration: 4000,
            });
        }
    };

    const cancelarDelecaoDespesa = () => {
        setShowDeleteDialog(false);
        setDespesaParaDeletar(null);
    };

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);
    useEscapeKey(() => setIsPagamentoModalOpen(false), isPagamentoModalOpen);
    useEscapeKey(cancelarDelecaoDespesa, showDeleteDialog);

    const handleSubmitPagamento = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const despesa = despesas.find(d => d.id === pagamentoForm.despesaFixaId);
            await despesasFixasService.registrarPagamento(pagamentoForm.despesaFixaId, {
                mesReferencia: pagamentoForm.mesReferencia,
                valorPago: parseFloat(pagamentoForm.valorPago),
                dataPagamento: pagamentoForm.dataPagamento,
                observacoes: pagamentoForm.observacoes
            });
            toast.success('Pagamento registrado com sucesso!', {
                description: `${despesa?.descricao} - R$ ${parseFloat(pagamentoForm.valorPago).toFixed(2)}`,
                duration: 4000,
            });
            setIsPagamentoModalOpen(false);
            setPagamentoForm({
                despesaFixaId: '',
                mesReferencia: new Date().toISOString().slice(0, 7),
                valorPago: '',
                dataPagamento: new Date().toISOString().split('T')[0],
                observacoes: ''
            });
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao registrar pagamento:', error);
            toast.error('Erro ao registrar pagamento', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    const handleRegistrarPagamento = (despesa: any) => {
        setPagamentoForm({
            ...pagamentoForm,
            despesaFixaId: despesa.id,
            valorPago: despesa.valor.toString()
        });
        setIsPagamentoModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Despesas Fixas da Sede</h2>
                <button
                    onClick={() => {
                        setDespesaEditando(null);
                        setDespesaForm({
                            descricao: '',
                            categoria: 'Aluguel',
                            valor: '',
                            diaVencimento: 5,
                            fornecedor: '',
                            observacoes: ''
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn-success flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nova Despesa
                </button>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700">Total Mensal</p>
                    <p className="text-2xl font-bold text-red-900">
                        R$ {(metricas.totalMensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-700">Total Anual</p>
                    <p className="text-2xl font-bold text-blue-900">
                        R$ {(metricas.totalAnual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-purple-700">Despesas Ativas</p>
                    <p className="text-2xl font-bold text-purple-900">{metricas.totalDespesas || 0}</p>
                </div>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-orange-700">Média por Despesa</p>
                    <p className="text-2xl font-bold text-orange-900">
                        R$ {metricas.totalDespesas > 0 
                            ? ((metricas.totalMensal || 0) / metricas.totalDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                            : '0,00'
                        }
                    </p>
                </div>
            </div>

            {/* Tabela de Despesas */}
            <div className="card-primary">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Despesas Cadastradas</h3>
                {despesas.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-gray-500 font-medium">Nenhuma despesa fixa cadastrada</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 btn-success inline-flex items-center gap-2"
                        >
                            Cadastrar Primeira Despesa
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Categoria</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Vencimento</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despesas.map((despesa) => (
                                    <tr key={despesa.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-gray-900 font-medium">{despesa.descricao}</p>
                                                {despesa.fornecedor && (
                                                    <p className="text-xs text-gray-500">{despesa.fornecedor}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                despesa.categoria === 'Frota' 
                                                    ? 'bg-orange-100 text-orange-700' 
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {despesa.categoria === 'Frota' ? '🚗' : ''} {despesa.categoria}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            R$ {Number(despesa.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600">
                                            Dia {despesa.diaVencimento}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleAtiva(despesa.id, despesa.ativa)}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                                    despesa.ativa 
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {despesa.ativa ? 'Ativa' : 'Inativa'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => handleRegistrarPagamento(despesa)}
                                                    className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-1"
                                                    title="Registrar pagamento"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Pagar
                                                </button>
                                                <button
                                                    onClick={() => handleEditarDespesa(despesa)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDeletarDespesa(despesa.id, despesa.descricao)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Deletar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Criar/Editar Despesa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                            <h3 className="text-2xl font-bold text-gray-900">
                                {despesaEditando ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmitDespesa} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Aluguel do Escritório"
                                    value={despesaForm.descricao}
                                    onChange={(e) => setDespesaForm({ ...despesaForm, descricao: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                                    <select
                                        required
                                        value={despesaForm.categoria}
                                        onChange={(e) => setDespesaForm({ ...despesaForm, categoria: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="Aluguel">🏢 Aluguel</option>
                                        <option value="Energia">⚡ Energia Elétrica</option>
                                        <option value="Água">💧 Água</option>
                                        <option value="Internet">🌐 Internet</option>
                                        <option value="Telefone">📞 Telefone</option>
                                        <option value="Limpeza">🧹 Limpeza</option>
                                        <option value="Segurança">🛡️ Segurança</option>
                                        <option value="Contador">📊 Contador</option>
                                        <option value="Software">💻 Software/Sistemas</option>
                                        <option value="Frota">🚗 Frota (Veículos)</option>
                                        <option value="Outros">📝 Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor Mensal (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0,00"
                                        value={despesaForm.valor}
                                        onChange={(e) => setDespesaForm({ ...despesaForm, valor: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Dia do Vencimento *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        required
                                        value={despesaForm.diaVencimento}
                                        onChange={(e) => setDespesaForm({ ...despesaForm, diaVencimento: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor/Empresa</label>
                                    <input
                                        type="text"
                                        placeholder="Nome do fornecedor"
                                        value={despesaForm.fornecedor}
                                        onChange={(e) => setDespesaForm({ ...despesaForm, fornecedor: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                                <textarea
                                    placeholder="Informações adicionais sobre esta despesa"
                                    value={despesaForm.observacoes}
                                    onChange={(e) => setDespesaForm({ ...despesaForm, observacoes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    {despesaEditando ? 'Atualizar' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Registrar Pagamento */}
            {isPagamentoModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                            <h3 className="text-2xl font-bold text-gray-900">Registrar Pagamento</h3>
                        </div>
                        <form onSubmit={handleSubmitPagamento} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Mês de Referência *</label>
                                <input
                                    type="month"
                                    required
                                    value={pagamentoForm.mesReferencia}
                                    onChange={(e) => setPagamentoForm({ ...pagamentoForm, mesReferencia: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Pago (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={pagamentoForm.valorPago}
                                    onChange={(e) => setPagamentoForm({ ...pagamentoForm, valorPago: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Data do Pagamento *</label>
                                <input
                                    type="date"
                                    required
                                    value={pagamentoForm.dataPagamento}
                                    onChange={(e) => setPagamentoForm({ ...pagamentoForm, dataPagamento: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                                <textarea
                                    value={pagamentoForm.observacoes}
                                    onChange={(e) => setPagamentoForm({ ...pagamentoForm, observacoes: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsPagamentoModalOpen(false)} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    Confirmar Pagamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dialog de Confirmação de Exclusão */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-3">
                                <p className="text-gray-700">
                                    Tem certeza que deseja excluir a despesa fixa{' '}
                                    <span className="font-bold text-gray-900">{despesaParaDeletar?.descricao}</span>?
                                </p>
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                    <p className="text-sm text-red-800 font-medium">
                                        ⚠️ Esta ação não pode ser desfeita!
                                    </p>
                                    <p className="text-sm text-red-700 mt-2">
                                        A despesa fixa será permanentemente removida e{' '}
                                        <span className="font-bold">todas as contas a pagar relacionadas também serão excluídas automaticamente</span>.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelarDelecaoDespesa}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarDelecaoDespesa}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Sim, Excluir Despesa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default GestaoEmpresarial;

