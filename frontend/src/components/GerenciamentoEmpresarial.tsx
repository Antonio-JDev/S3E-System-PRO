import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { 
    funcionariosService, 
    valesService, 
    veiculosService, 
    gastosVeiculoService, 
    planosService,
    despesasFixasService 
} from '../services/gerenciamentoService';
import { financeiroService } from '../services/financeiroService';
import { axiosApiService } from '../services/axiosApi';
import BIDashboard from './BIDashboard';
import ResumoAdministrativo from './ResumoAdministrativo';
import { DollarSign } from 'lucide-react';
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

interface GerenciamentoEmpresarialProps {
    toggleSidebar: () => void;
}

type SubPage = 'dashboard' | 'resumo-administrativo' | 'rh' | 'carros' | 'planos' | 'despesas';

const GerenciamentoEmpresarial: React.FC<GerenciamentoEmpresarialProps> = ({ toggleSidebar }) => {
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
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Gerenciamento Empresarial</h1>
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
    const [metricas, setMetricas] = useState({ folhaPagamento: 0, valesMes: 0, custoTotal: 0 });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isValeModalOpen, setIsValeModalOpen] = useState(false);
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
        uniformeSapato: ''
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
    
    // Estados para dialog de confirmação de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [funcionarioParaDeletar, setFuncionarioParaDeletar] = useState<{ id: string; nome: string } | null>(null);

    // Modal Ver dados do colaborador
    const [funcionarioVerDados, setFuncionarioVerDados] = useState<any | null>(null);
    // Modal Histórico de pagamentos
    const [funcionarioHistorico, setFuncionarioHistorico] = useState<any | null>(null);
    const [historicoPagamentosLista, setHistoricoPagamentosLista] = useState<any[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [funcResp, metricasResp] = await Promise.all([
                funcionariosService.listar(),
                funcionariosService.obterMetricas()
            ]);
            setFuncionarios(Array.isArray(funcResp?.data) ? (funcResp.data as any[]) : (funcResp?.data ?? []) as any[]);
            setMetricas((metricasResp?.data as any) ?? { folhaPagamento: 0, valesMes: 0, custoTotal: 0 });
        } catch (error) {
            console.error('Erro ao carregar dados de RH:', error);
            toast.error('Erro ao carregar funcionários');
        } finally {
            setLoading(false);
        }
    };

    const handleAbrirModalEdicao = (funcionario: any) => {
        setEditandoFuncionario(funcionario.id);
        setFuncionarioForm({
            nome: funcionario.nome,
            cargo: funcionario.cargo,
            salario: funcionario.salario.toString(),
            dataAdmissao: funcionario.dataAdmissao || new Date().toISOString().split('T')[0],
            cpf: funcionario.cpf || '',
            telefone: funcionario.telefone || '',
            email: funcionario.email || '',
            status: funcionario.status,
            diaPagamento: funcionario.diaPagamento != null ? String(funcionario.diaPagamento) : '5',
            uniformeCamisa: funcionario.uniformeCamisa || '',
            uniformeCalca: funcionario.uniformeCalca || '',
            uniformeBermuda: funcionario.uniformeBermuda || '',
            uniformeSapato: funcionario.uniformeSapato || ''
        });
        setIsModalOpen(true);
    };

    const handleDeletarFuncionario = (id: string, nome: string) => {
        setFuncionarioParaDeletar({ id, nome });
        setShowDeleteDialog(true);
    };

    const handleVerDadosColaborador = (func: any) => {
        setFuncionarioVerDados(func);
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
            uniformeSapato: ''
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
            uniformeSapato: ''
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
            uniformeSapato: ''
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
            if (editandoFuncionario) {
                // Modo de edição
                await funcionariosService.atualizar(editandoFuncionario, {
                    ...funcionarioForm,
                    salario: parseFloat(funcionarioForm.salario),
                    diaPagamento: funcionarioForm.diaPagamento ? parseInt(funcionarioForm.diaPagamento, 10) : undefined
                });
                toast.success('Funcionário atualizado com sucesso!', {
                    description: `${funcionarioForm.nome} foi atualizado no sistema`,
                    duration: 4000,
                });
            } else {
                // Modo de criação
                await funcionariosService.criar({
                    ...funcionarioForm,
                    salario: parseFloat(funcionarioForm.salario),
                    diaPagamento: funcionarioForm.diaPagamento ? parseInt(funcionarioForm.diaPagamento, 10) : undefined
                });
                toast.success('Funcionário cadastrado com sucesso!', {
                    description: `${funcionarioForm.nome} foi adicionado ao quadro de funcionários`,
                    duration: 4000,
                });
            }
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
                        <div className="bg-blue-50 dark:bg-dark-elevated border-2 border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Folha de Pagamento</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                                R$ {(metricas.folhaPagamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400/80 mt-1">Mensal</p>
                        </div>
                        <div className="bg-green-50 dark:bg-dark-elevated border-2 border-green-200 dark:border-green-800/40 rounded-xl p-4">
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">Vales do Mês</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                                R$ {(metricas.valesMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-dark-elevated border-2 border-purple-200 dark:border-purple-800/40 rounded-xl p-4">
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Custo Total</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                                R$ {(metricas.custoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
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
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Salário</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {funcionarios.map((func) => (
                                    <tr key={func.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">{func.nome}</td>
                                        <td className="px-6 py-4 text-gray-600">{func.cargo}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                            R$ {func.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                ))}
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
                                  uniformeSapato: ''
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Salário *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={funcionarioForm.salario}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, salario: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
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
                        required
                        value={funcionarioForm.cpf}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, cpf: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={funcionarioForm.telefone}
                        onChange={(e) => setFuncionarioForm({ ...funcionarioForm, telefone: e.target.value })}
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

            {/* Modal Ver dados do colaborador */}
            {funcionarioVerDados && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
                            <h3 className="text-xl font-bold text-white pr-10">Dados do colaborador</h3>
                            <p className="text-sm text-blue-100 mt-1">{funcionarioVerDados.nome}</p>
                            <button type="button" onClick={() => setFuncionarioVerDados(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">Nome:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.nome}</p></div>
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">Cargo:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.cargo}</p></div>
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">Salário:</span><p className="text-gray-900 dark:text-gray-100">R$ {Number(funcionarioVerDados.salario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">Dia pagamento:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.diaPagamento ?? 5}º do mês</p></div>
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">Data admissão:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.dataAdmissao ? new Date(funcionarioVerDados.dataAdmissao).toLocaleDateString('pt-BR') : '-'}</p></div>
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">Status:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.status}</p></div>
                                <div className="col-span-2"><span className="font-semibold text-gray-600 dark:text-gray-400">CPF:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.cpf || '-'}</p></div>
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">Telefone:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.telefone || '-'}</p></div>
                                <div><span className="font-semibold text-gray-600 dark:text-gray-400">E-mail:</span><p className="text-gray-900 dark:text-gray-100">{funcionarioVerDados.email || '-'}</p></div>
                            </div>
                            <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Uniforme</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
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
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<any | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showExcluirRecursoDialog, setShowExcluirRecursoDialog] = useState(false);
    const [recursoParaExcluir, setRecursoParaExcluir] = useState<{ id: string; nomeItem?: string } | null>(null);
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
                toast.error('Para criar recursos, use a opção de criar a partir de uma compra');
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

    const handleAbrirModalVinculacao = (recurso: any) => {
        setRecursoParaVincular(recurso);
        setBuscaFuncionario('');
        setFuncionarioSelecionado(null);
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

    const handleConfirmarVinculacao = async () => {
        if (!recursoParaVincular || !funcionarioSelecionado) return;
        
        try {
            await axiosApiService.put(`/api/recursos-humanos/${recursoParaVincular.id}`, {
                funcionarioId: funcionarioSelecionado.id
            });
            toast.success(`Recurso vinculado a ${funcionarioSelecionado.nome} com sucesso!`);
            setIsModalVinculacaoOpen(false);
            setShowConfirmDialog(false);
            setRecursoParaVincular(null);
            setFuncionarioSelecionado(null);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao vincular recurso:', error);
            toast.error('Erro ao vincular recurso', {
                description: error.response?.data?.message || 'Tente novamente'
            });
        }
    };

    const handleDesvincular = async () => {
        if (!recursoParaVincular) return;
        
        try {
            await axiosApiService.put(`/api/recursos-humanos/${recursoParaVincular.id}`, {
                funcionarioId: null
            });
            toast.success('Recurso desvinculado com sucesso!');
            setIsModalVinculacaoOpen(false);
            setShowConfirmDialog(false);
            setRecursoParaVincular(null);
            setFuncionarioSelecionado(null);
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao desvincular recurso:', error);
            toast.error('Erro ao desvincular recurso');
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
                            <div key={kit.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
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
                            </div>
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
                                                    title={recurso.funcionario ? "Alterar vinculação" : "Vincular funcionário"}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    {recurso.funcionario ? "Alterar" : "Vincular"}
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
                                {recursoParaVincular.funcionario ? 'Alterar Vinculação' : 'Vincular Funcionário'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalVinculacaoOpen(false);
                                    setRecursoParaVincular(null);
                                    setFuncionarioSelecionado(null);
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
                                <p className="text-sm text-gray-600 mb-4">
                                    <span className="font-semibold">Recurso:</span> {recursoParaVincular.nomeItem}
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
                            {buscaFuncionario && (
                                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
                                    {funcionariosFiltrados.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">Nenhum funcionário encontrado</div>
                                    ) : (
                                        funcionariosFiltrados.map((func) => (
                                            <button
                                                key={func.id}
                                                type="button"
                                                onClick={() => setFuncionarioSelecionado(func)}
                                                className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 ${
                                                    funcionarioSelecionado?.id === func.id ? 'bg-blue-50 border-blue-200' : ''
                                                }`}
                                            >
                                                <div className="font-semibold text-gray-900">{func.nome}</div>
                                                <div className="text-sm text-gray-600">{func.cargo}</div>
                                                {func.cpf && <div className="text-xs text-gray-500">CPF: {func.cpf}</div>}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                            {funcionarioSelecionado && (
                                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                    <p className="text-sm font-semibold text-blue-900 mb-1">Funcionário Selecionado:</p>
                                    <p className="font-bold text-blue-900">{funcionarioSelecionado.nome}</p>
                                    <p className="text-sm text-blue-700">{funcionarioSelecionado.cargo}</p>
                                </div>
                            )}
                            {recursoParaVincular.funcionario && (
                                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                                    <p className="text-sm font-semibold text-yellow-900 mb-1">Vinculado atualmente a:</p>
                                    <p className="font-bold text-yellow-900">{recursoParaVincular.funcionario.nome}</p>
                                    <button
                                        type="button"
                                        onClick={handleDesvincular}
                                        className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                                    >
                                        Desvincular
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalVinculacaoOpen(false);
                                        setRecursoParaVincular(null);
                                        setFuncionarioSelecionado(null);
                                        setBuscaFuncionario('');
                                    }}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (funcionarioSelecionado) {
                                            setShowConfirmDialog(true);
                                        }
                                    }}
                                    disabled={!funcionarioSelecionado}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Vinculação
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog de Confirmação de Vinculação */}
            {showConfirmDialog && (
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Vinculação</AlertDialogTitle>
                            <AlertDialogDescription className="pt-4">
                                <div className="space-y-3">
                                    <p className="text-gray-700">
                                        Tem certeza que deseja vincular o recurso{' '}
                                        <span className="font-bold text-gray-900">{recursoParaVincular?.nomeItem}</span> ao funcionário{' '}
                                        <span className="font-bold text-gray-900">{funcionarioSelecionado?.nome}</span>?
                                    </p>
                                    {recursoParaVincular?.funcionario && (
                                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                                            <p className="text-sm text-yellow-800 font-medium">
                                                ⚠️ Este recurso já está vinculado a {recursoParaVincular.funcionario.nome}. A vinculação será alterada.
                                            </p>
                                        </div>
                                    )}
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
                <div className="bg-orange-50 dark:bg-dark-elevated border-2 border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Gastos do Mês</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                        R$ {(metricas.gastosMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-blue-50 dark:bg-dark-elevated border-2 border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Combustível</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                        R$ {(metricas.combustivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-red-50 dark:bg-dark-elevated border-2 border-red-200 dark:border-red-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Manutenção</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                        R$ {(metricas.manutencao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-purple-50 dark:bg-dark-elevated border-2 border-purple-200 dark:border-purple-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Veículos Ativos</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{metricas.totalVeiculos || 0}</p>
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
                <div className="bg-red-50 dark:bg-dark-elevated border-2 border-red-200 dark:border-red-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Alta Prioridade</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                        {planos.filter(p => p.prioridade === 'Alta' && p.status !== 'Concluído').length}
                    </p>
                </div>
                <div className="bg-yellow-50 dark:bg-dark-elevated border-2 border-yellow-200 dark:border-yellow-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Média Prioridade</p>
                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
                        {planos.filter(p => p.prioridade === 'Média' && p.status !== 'Concluído').length}
                    </p>
                </div>
                <div className="bg-green-50 dark:bg-dark-elevated border-2 border-green-200 dark:border-green-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Concluídos</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-300">
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
                <div className="bg-red-50 dark:bg-dark-elevated border-2 border-red-200 dark:border-red-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Total Mensal</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                        R$ {(metricas.totalMensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-blue-50 dark:bg-dark-elevated border-2 border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Anual</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                        R$ {(metricas.totalAnual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-purple-50 dark:bg-dark-elevated border-2 border-purple-200 dark:border-purple-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Despesas Ativas</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{metricas.totalDespesas || 0}</p>
                </div>
                <div className="bg-orange-50 dark:bg-dark-elevated border-2 border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Média por Despesa</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
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

export default GerenciamentoEmpresarial;

