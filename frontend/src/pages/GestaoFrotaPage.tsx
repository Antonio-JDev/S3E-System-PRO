import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { veiculosService, gastosVeiculoService } from '../services/gerenciamentoService';
import { financeiroService } from '../services/financeiroService';
import { useAuth } from '../hooks/useAuth';
import { hasPermission } from '../utils/permissions';
import { FleetIcon } from '../constants';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';

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

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

interface GestaoFrotaPageProps {
    toggleSidebar: () => void;
}

function formatYmdForInput(raw: unknown): string {
    if (raw == null || raw === '') return '';
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
        if (t.length >= 10) return t.slice(0, 10);
    }
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
    return '';
}

function formatLabelDiasVencimento(dias: number | null | undefined): string {
    if (dias == null) return 'Sem data';
    if (dias < 0) return `Vencido há ${Math.abs(dias)} dia(s)`;
    if (dias === 0) return 'Vence hoje';
    if (dias === 1) return '1 dia para vencer';
    return `${dias} dias para vencer`;
}

function badgeVencimentoClass(dias: number | null | undefined): string {
    if (dias == null) return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-elevated';
    if (dias < 0) return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40';
    if (dias <= 30) return 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40';
    return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40';
}

const veiculoFormVazio = () => ({
    modelo: '',
    placa: '',
    tipo: 'Carro',
    ano: new Date().getFullYear(),
    kmAtual: 0,
    dataVencimentoIpva: '',
    dataVencimentoLicenciamento: '',
});

const gastoFormVazio = (veiculoId = '') => ({
    veiculoId,
    tipo: 'Combustível',
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    km: '',
    litros: '',
    responsavel: '',
});

const GestaoFrotaPage: React.FC<GestaoFrotaPageProps> = ({ toggleSidebar }) => {
    const [veiculos, setVeiculos] = useState<any[]>([]);
    const auth = useAuth();
    const canViewFrota = hasPermission(auth.user, 'view_frota');
    const [metricas, setMetricas] = useState({ gastosMes: 0, combustivel: 0, manutencao: 0, totalVeiculos: 0, alertasIpva: [] as any[] });
    const [consumoDetalhe, setConsumoDetalhe] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isVeiculoModalOpen, setIsVeiculoModalOpen] = useState(false);
    const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
    const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
    const [veiculoSelecionado, setVeiculoSelecionado] = useState<any | null>(null);
    const [gastosVeiculo, setGastosVeiculo] = useState<any[]>([]);
    const [filtroGastoPeriodo, setFiltroGastoPeriodo] = useState<'semana' | 'mes' | 'ano'>('mes');
    const [gastoVisualizando, setGastoVisualizando] = useState<any | null>(null);
    const [veiculoForm, setVeiculoForm] = useState(veiculoFormVazio());
    const [editingVeiculoId, setEditingVeiculoId] = useState<string | null>(null);
    const [gastoForm, setGastoForm] = useState(gastoFormVazio());
    const [editingGastoId, setEditingGastoId] = useState<string | null>(null);
    
    // Estados para dialog de confirmação de exclusão
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [veiculoParaDeletar, setVeiculoParaDeletar] = useState<{ id: string; modelo: string; placa: string } | null>(null);
    const [showDeleteGastoDialog, setShowDeleteGastoDialog] = useState(false);
    const [gastoParaDeletar, setGastoParaDeletar] = useState<{
        id: string;
        veiculoId: string;
        tipo: string;
        valor: number;
        data: string;
    } | null>(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const [veicResp, metricasResp, alertasResp] = await Promise.all([
                veiculosService.listar(),
                veiculosService.obterMetricas(),
                veiculosService.obterAlertasIpva()
            ]);
            setVeiculos(Array.isArray(veicResp?.data) ? (veicResp.data as any[]) : (veicResp?.data ?? []) as any[]);
            const m = (metricasResp?.data as any) ?? { gastosMes: 0, combustivel: 0, manutencao: 0, totalVeiculos: 0 };
            setMetricas({ ...m, alertasIpva: (alertasResp?.data as any[]) ?? m.alertasIpva ?? [] });
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
        try {
            const consumoResp = await veiculosService.obterConsumo(veiculo.id);
            setConsumoDetalhe((consumoResp?.data as any) ?? null);
        } catch {
            setConsumoDetalhe(null);
        }
    };

    const handleFecharVisualizacao = () => {
        setIsVisualizarModalOpen(false);
        setVeiculoSelecionado(null);
        setGastosVeiculo([]);
        setConsumoDetalhe(null);
        setGastoVisualizando(null);
    };

    const carregarGastosVeiculo = async (veiculoId: string) => {
        try {
            const response = await gastosVeiculoService.listar(veiculoId) as any;
            const lista = (response?.data ?? response) as any[];
            setGastosVeiculo(Array.isArray(lista) ? lista : []);
        } catch (error) {
            console.error('Erro ao carregar gastos do veículo:', error);
        }
    };

    const refrescarContextoVeiculo = async (veiculoId: string) => {
        await carregarDados();
        if (isVisualizarModalOpen && veiculoSelecionado?.id === veiculoId) {
            await carregarGastosVeiculo(veiculoId);
            try {
                const [consumoResp, veicResp] = await Promise.all([
                    veiculosService.obterConsumo(veiculoId),
                    veiculosService.buscar(veiculoId),
                ]);
                setConsumoDetalhe((consumoResp?.data as any) ?? null);
                if (veicResp?.data) setVeiculoSelecionado(veicResp.data as any);
            } catch {
                /* mantém dados atuais */
            }
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
            const payload = {
                ...veiculoForm,
                dataVencimentoIpva: veiculoForm.dataVencimentoIpva || undefined,
                dataVencimentoLicenciamento: veiculoForm.dataVencimentoLicenciamento || undefined,
            };
            if (editingVeiculoId) {
                await veiculosService.atualizar(editingVeiculoId, payload);
                toast.success('Veículo atualizado com sucesso!', {
                    description: `${veiculoForm.modelo} (${veiculoForm.placa})`,
                    duration: 4000,
                });
            } else {
                await veiculosService.criar(payload);
                toast.success('Veículo cadastrado com sucesso!', {
                    description: `${veiculoForm.modelo} (${veiculoForm.placa}) foi adicionado à frota`,
                    duration: 4000,
                });
            }
            setIsVeiculoModalOpen(false);
            setEditingVeiculoId(null);
            setVeiculoForm(veiculoFormVazio());
            carregarDados();
        } catch (error: any) {
            console.error('Erro ao salvar veículo:', error);
            toast.error(editingVeiculoId ? 'Erro ao atualizar veículo' : 'Erro ao cadastrar veículo', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    const abrirModalVeiculo = (veiculo?: any) => {
        if (veiculo) {
            setEditingVeiculoId(veiculo.id);
            setVeiculoForm({
                modelo: veiculo.modelo || '',
                placa: veiculo.placa || '',
                tipo: veiculo.tipo || 'Carro',
                ano: veiculo.ano || new Date().getFullYear(),
                kmAtual: veiculo.kmAtual ?? 0,
                dataVencimentoIpva: formatYmdForInput(veiculo.dataVencimentoIpva),
                dataVencimentoLicenciamento: formatYmdForInput(veiculo.dataVencimentoLicenciamento),
            });
        } else {
            setEditingVeiculoId(null);
            setVeiculoForm(veiculoFormVazio());
        }
        setIsVeiculoModalOpen(true);
    };

    const fecharModalVeiculo = () => {
        setIsVeiculoModalOpen(false);
        setEditingVeiculoId(null);
        setVeiculoForm(veiculoFormVazio());
    };

    const abrirModalGasto = (gasto?: any, veiculoId?: string) => {
        if (gasto) {
            setEditingGastoId(gasto.id);
            setGastoForm({
                veiculoId: gasto.veiculoId || '',
                tipo: gasto.tipo || 'Combustível',
                descricao: gasto.descricao || '',
                valor: String(gasto.valor ?? ''),
                data: formatYmdForInput(gasto.data) || new Date().toISOString().split('T')[0],
                km: gasto.km != null ? String(gasto.km) : '',
                litros: gasto.litros != null ? String(gasto.litros) : '',
                responsavel: gasto.responsavel || '',
            });
        } else {
            setEditingGastoId(null);
            setGastoForm(gastoFormVazio(veiculoId || ''));
        }
        setIsGastoModalOpen(true);
    };

    const fecharModalGasto = () => {
        setIsGastoModalOpen(false);
        setEditingGastoId(null);
        setGastoForm(gastoFormVazio());
    };

    const handleExcluirGasto = (gasto: any) => {
        setGastoParaDeletar({
            id: gasto.id,
            veiculoId: gasto.veiculoId,
            tipo: gasto.tipo,
            valor: parseFloat(gasto.valor || 0),
            data: gasto.data,
        });
        setShowDeleteGastoDialog(true);
    };

    const confirmarDelecaoGasto = async () => {
        if (!gastoParaDeletar) return;

        try {
            await gastosVeiculoService.deletar(gastoParaDeletar.id);
            toast.success('Gasto excluído com sucesso!', {
                description: `${gastoParaDeletar.tipo} — R$ ${gastoParaDeletar.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                duration: 4000,
            });
            if (gastoVisualizando?.id === gastoParaDeletar.id) setGastoVisualizando(null);
            setShowDeleteGastoDialog(false);
            const veiculoId = gastoParaDeletar.veiculoId;
            setGastoParaDeletar(null);
            await refrescarContextoVeiculo(veiculoId);
        } catch (error: any) {
            console.error('Erro ao excluir gasto:', error);
            toast.error('Erro ao excluir gasto', {
                description: error.response?.data?.message || 'Não foi possível excluir o gasto. Tente novamente.',
                duration: 4000,
            });
        }
    };

    const cancelarDelecaoGasto = () => {
        setShowDeleteGastoDialog(false);
        setGastoParaDeletar(null);
    };

    useEscapeKey(fecharModalVeiculo, isVeiculoModalOpen);
    useEscapeKey(fecharModalGasto, isGastoModalOpen);
    useEscapeKey(() => setIsVisualizarModalOpen(false), isVisualizarModalOpen);
    useEscapeKey(() => setGastoVisualizando(null), !!gastoVisualizando);
    useEscapeKey(cancelarDelecaoVeiculo, showDeleteDialog);
    useEscapeKey(cancelarDelecaoGasto, showDeleteGastoDialog);

    const handleSubmitGasto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (gastoForm.tipo === 'Combustível') {
            if (!gastoForm.km || !gastoForm.litros) {
                toast.error('Para combustível, KM e litros são obrigatórios');
                return;
            }
        }
        const payload = {
            tipo: gastoForm.tipo,
            descricao: gastoForm.descricao || undefined,
            valor: parseFloat(gastoForm.valor),
            data: gastoForm.data,
            km: gastoForm.km ? parseInt(gastoForm.km, 10) : undefined,
            litros: gastoForm.litros ? parseFloat(gastoForm.litros) : undefined,
            responsavel: gastoForm.responsavel || undefined,
        };
        const veiculoId = gastoForm.veiculoId;
        const veiculo = veiculos.find(v => v.id === veiculoId);
        try {
            if (editingGastoId) {
                await gastosVeiculoService.atualizar(editingGastoId, payload);
                toast.success('Gasto atualizado com sucesso!', {
                    description: `${gastoForm.tipo} de R$ ${payload.valor.toFixed(2)} — ${veiculo?.modelo || 'Veículo'}`,
                    duration: 4000,
                });
            } else {
                if (!veiculoId) {
                    toast.error('Selecione um veículo');
                    return;
                }
                await gastosVeiculoService.criar({ ...payload, veiculoId });
                toast.success('Gasto registrado com sucesso!', {
                    description: `${gastoForm.tipo} de R$ ${payload.valor.toFixed(2)} — ${veiculo?.modelo || 'Veículo'}`,
                    duration: 4000,
                });
            }
            fecharModalGasto();
            await refrescarContextoVeiculo(veiculoId);
        } catch (error: any) {
            console.error('Erro ao salvar gasto:', error);
            toast.error(editingGastoId ? 'Erro ao atualizar gasto' : 'Erro ao registrar gasto', {
                description: error.response?.data?.message || 'Verifique os dados e tente novamente',
                duration: 4000,
            });
        }
    };

    if (!canViewFrota) {
        return (
            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
                <p className="text-gray-600 dark:text-dark-text-secondary">Você não tem permissão para acessar a Gestão de Frota.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    const alertasIpvaMes = metricas.alertasIpva ?? [];
    const formatKmL = (v: number | null | undefined) =>
        v != null && Number.isFinite(v) ? v.toFixed(1) + ' km/L' : 'Dados insuficientes';

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Gestão de Frota</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Veículos, combustível e alertas IPVA</p>
                    </div>
                </div>
            </header>
        <div className="space-y-6">
            {alertasIpvaMes.length > 0 && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4">
                    <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-2">IPVA cota única — vencimento este mês</h3>
                    <ul className="space-y-2 text-sm">
                        {alertasIpvaMes.map((a: any) => (
                            <li key={a.id} className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-dark-text">{a.placa}</span>
                                <span className="text-gray-600 dark:text-gray-300">{a.modelo}</span>
                                <span className={a.ipvaPago ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded' : 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded'}>
                                    {a.ipvaPago ? 'IPVA pago no ano' : 'Pagamento pendente'}
                                </span>
                                {a.diasAteVencimentoIpva != null && (
                                    <span className={`px-2 py-0.5 rounded text-xs ${badgeVencimentoClass(a.diasAteVencimentoIpva)}`}>
                                        IPVA: {formatLabelDiasVencimento(a.diasAteVencimentoIpva)}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Frota</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => abrirModalGasto()}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Registrar Gasto
                    </button>
                    <button
                        onClick={() => abrirModalVeiculo()}
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
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">Veículos Cadastrados</h3>
                {veiculos.length === 0 ? (
                    <div className="text-center py-12">
                        <FleetIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum veículo cadastrado</p>
                        <button
                            onClick={() => abrirModalVeiculo()}
                            className="mt-4 btn-success inline-flex items-center gap-2"
                        >
                            Cadastrar Primeiro Veículo
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {veiculos.map((veiculo) => (
                            <div key={veiculo.id} className="border border-gray-200 dark:border-dark-border rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-dark-elevated transition-all">
                                <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-dark-text">{veiculo.modelo} - {veiculo.placa}</h4>
                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{veiculo.tipo} | {veiculo.ano}</p>
                                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                            <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                                Mês: {formatKmL(veiculo.consumoMedioMesAtualKmL)}
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-elevated px-2 py-1 rounded">
                                                Histórico: {formatKmL(veiculo.consumoMedioTotalKmL)}
                                            </span>
                                            {veiculo.desempenhoQueda && (
                                                <span className="text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">
                                                    Queda de desempenho
                                                </span>
                                            )}
                                            <span className={`px-2 py-1 rounded ${badgeVencimentoClass(veiculo.diasAteVencimentoIpva)}`}>
                                                IPVA: {formatLabelDiasVencimento(veiculo.diasAteVencimentoIpva)}
                                            </span>
                                            <span className={`px-2 py-1 rounded ${badgeVencimentoClass(veiculo.diasAteVencimentoLicenciamento)}`}>
                                                Licenciamento: {formatLabelDiasVencimento(veiculo.diasAteVencimentoLicenciamento)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Gasto Total</p>
                                            <p className="text-lg font-bold text-orange-600">R$ {veiculo.gastoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => abrirModalVeiculo(veiculo)}
                                                className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-all"
                                                title="Editar veículo"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleVisualizarVeiculo(veiculo)}
                                                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-all"
                                                title="Visualizar veículo"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleExcluirVeiculo(veiculo.id, veiculo.modelo, veiculo.placa)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50] p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-50 to-red-50 dark:from-dark-elevated dark:to-dark-card">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                                    <FleetIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                        {editingVeiculoId ? 'Editar Veículo' : 'Adicionar Veículo'}
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                        {editingVeiculoId ? 'Atualize os dados do veículo' : 'Cadastre um novo veículo na frota'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleSubmitVeiculo} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Marca/Modelo *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Toyota Hilux"
                                        value={veiculoForm.modelo}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Placa *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ABC-1234"
                                        value={veiculoForm.placa}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, placa: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Tipo *</label>
                                    <select
                                        required
                                        value={veiculoForm.tipo}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, tipo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="Carro">Carro</option>
                                        <option value="Caminhonete">Caminhonete</option>
                                        <option value="Van">Van</option>
                                        <option value="Caminhão">Caminhão</option>
                                        <option value="Moto">Moto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Ano *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1900"
                                        max={new Date().getFullYear() + 1}
                                        value={veiculoForm.ano}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, ano: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Vencimento IPVA</label>
                                    <input
                                        type="date"
                                        value={veiculoForm.dataVencimentoIpva}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, dataVencimentoIpva: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Vencimento Licenciamento</label>
                                    <input
                                        type="date"
                                        value={veiculoForm.dataVencimentoLicenciamento}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, dataVencimentoLicenciamento: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Quilometragem Atual (KM)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={veiculoForm.kmAtual}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, kmAtual: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={fecharModalVeiculo} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    {editingVeiculoId ? 'Salvar alterações' : 'Cadastrar Veículo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Registrar Gasto */}
            {isGastoModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-blue-600">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl sm:text-2xl font-bold text-white truncate">
                                            {editingGastoId ? 'Editar Gasto' : 'Registrar Gasto'}
                                        </h3>
                                        <p className="text-sm text-blue-100">
                                            {editingGastoId ? 'Corrija os dados do lançamento' : 'Adicione uma despesa do veículo'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={fecharModalGasto}
                                    className="flex-shrink-0 text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                                    aria-label="Fechar"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSubmitGasto} className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Veículo *</label>
                                <select
                                    required={!editingGastoId}
                                    disabled={!!editingGastoId}
                                    value={gastoForm.veiculoId}
                                    onChange={(e) => setGastoForm({ ...gastoForm, veiculoId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <option value="">Selecione um veículo...</option>
                                    {veiculos.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.modelo} - {v.placa}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Tipo de Gasto *</label>
                                    <select
                                        required
                                        value={gastoForm.tipo}
                                        onChange={(e) => setGastoForm({ ...gastoForm, tipo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Combustível">⛽ Combustível</option>
                                        <option value="Manutenção">🔧 Manutenção</option>
                                        <option value="Seguro">🛡️ Seguro</option>
                                        <option value="IPVA">💳 IPVA</option>
                                        <option value="Licenciamento">📋 Licenciamento</option>
                                        <option value="Multa">🚨 Multa</option>
                                        <option value="Pedágio">🛣️ Pedágio</option>
                                        <option value="Lavagem">🧼 Lavagem</option>
                                        <option value="Outros">📝 Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0,00"
                                        value={gastoForm.valor}
                                        onChange={(e) => setGastoForm({ ...gastoForm, valor: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Data *</label>
                                    <input
                                        type="date"
                                        required
                                        value={gastoForm.data}
                                        onChange={(e) => setGastoForm({ ...gastoForm, data: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">KM (Hodômetro){gastoForm.tipo === 'Combustível' ? ' *' : ''}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required={gastoForm.tipo === 'Combustível'}
                                        placeholder="Quilometragem atual"
                                        value={gastoForm.km}
                                        onChange={(e) => setGastoForm({ ...gastoForm, km: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                {gastoForm.tipo === 'Combustível' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Litros abastecidos *</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        required
                                        placeholder="Litros"
                                        value={gastoForm.litros}
                                        onChange={(e) => setGastoForm({ ...gastoForm, litros: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Responsável</label>
                                <input
                                    type="text"
                                    placeholder="Nome do responsável pelo gasto"
                                    value={gastoForm.responsavel}
                                    onChange={(e) => setGastoForm({ ...gastoForm, responsavel: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Descrição/Observações</label>
                                <textarea
                                    placeholder="Descreva o gasto (ex: Troca de óleo, Abastecimento completo, etc.)"
                                    value={gastoForm.descricao}
                                    onChange={(e) => setGastoForm({ ...gastoForm, descricao: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 p-4 sm:px-6 sm:pb-6 pt-2 border-t border-gray-200 dark:border-dark-border flex-shrink-0 bg-white dark:bg-dark-card">
                                <button type="button" onClick={fecharModalGasto} className="flex-1 btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="flex-1 btn-success">
                                    {editingGastoId ? 'Salvar alterações' : 'Registrar Gasto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Visualizar Veículo */}
            {isVisualizarModalOpen && veiculoSelecionado && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-3 sm:p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header do Modal */}
                        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-500 to-orange-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <FleetIcon className="w-7 h-7 text-white" />
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
                        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {/* Informações Principais */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Modelo</p>
                                    <p className="text-lg font-bold text-orange-900 dark:text-orange-200">{veiculoSelecionado.modelo}</p>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Placa</p>
                                    <p className="text-lg font-bold text-orange-900 dark:text-orange-200">{veiculoSelecionado.placa}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">🚗 Tipo</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">{veiculoSelecionado.tipo}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">📅 Ano</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">{veiculoSelecionado.ano}</p>
                                </div>
                            </div>

                            {/* Métricas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">📏 Quilometragem Atual</p>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-dark-text">
                                        {veiculoSelecionado.kmAtual?.toLocaleString('pt-BR') || '0'} km
                                    </p>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">💰 Gasto Total</p>
                                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                        R$ {veiculoSelecionado.gastoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">💳 Vencimento IPVA</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                                        {formatYmdForInput(veiculoSelecionado.dataVencimentoIpva)
                                            ? new Date(formatYmdForInput(veiculoSelecionado.dataVencimentoIpva)).toLocaleDateString('pt-BR')
                                            : 'Não informado'}
                                    </p>
                                    <p className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${badgeVencimentoClass(veiculoSelecionado.diasAteVencimentoIpva)}`}>
                                        {formatLabelDiasVencimento(veiculoSelecionado.diasAteVencimentoIpva)}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">📋 Vencimento Licenciamento</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                                        {formatYmdForInput(veiculoSelecionado.dataVencimentoLicenciamento)
                                            ? new Date(formatYmdForInput(veiculoSelecionado.dataVencimentoLicenciamento)).toLocaleDateString('pt-BR')
                                            : 'Não informado'}
                                    </p>
                                    <p className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${badgeVencimentoClass(veiculoSelecionado.diasAteVencimentoLicenciamento)}`}>
                                        {formatLabelDiasVencimento(veiculoSelecionado.diasAteVencimentoLicenciamento)}
                                    </p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 sm:col-span-2">
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">⛽ Consumo médio (km/L)</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-800 dark:text-gray-200">
                                        <span>Mês atual: <strong>{formatKmL(veiculoSelecionado.consumoMedioMesAtualKmL)}</strong></span>
                                        <span>Histórico: <strong>{formatKmL(veiculoSelecionado.consumoMedioTotalKmL)}</strong></span>
                                    </div>
                                </div>
                            </div>

                            
                            {consumoDetalhe && consumoDetalhe.historicoMensal?.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-dark-border pt-6">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">Consumo de combustível</h4>
                                    {consumoDetalhe.desempenhoQueda && (
                                        <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40 rounded-lg p-3 mb-4">Tendência de queda de desempenho no mês atual.</p>
                                    )}
                                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-dark-elevated">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-gray-700 dark:text-dark-text-secondary">Mês</th>
                                                    <th className="px-4 py-2 text-right text-gray-700 dark:text-dark-text-secondary">Km rodados</th>
                                                    <th className="px-4 py-2 text-right text-gray-700 dark:text-dark-text-secondary">Litros</th>
                                                    <th className="px-4 py-2 text-right text-gray-700 dark:text-dark-text-secondary">km/L</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                                                {consumoDetalhe.historicoMensal.map((m: any) => (
                                                    <tr key={m.mes}>
                                                        <td className="px-4 py-2 text-gray-900 dark:text-dark-text">{m.mes}</td>
                                                        <td className="px-4 py-2 text-right">{m.kmRodados?.toLocaleString('pt-BR')}</td>
                                                        <td className="px-4 py-2 text-right">{m.litros?.toLocaleString('pt-BR')}</td>
                                                        <td className="px-4 py-2 text-right font-semibold">{m.kmPorLitro != null ? m.kmPorLitro.toFixed(1) : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
{/* Histórico de Gastos */}
                            <div className="border-t border-gray-200 dark:border-dark-border pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
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
                                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-card'
                                            }`}
                                        >
                                            Semana
                                        </button>
                                        <button
                                            onClick={() => setFiltroGastoPeriodo('mes')}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                filtroGastoPeriodo === 'mes'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-card'
                                            }`}
                                        >
                                            Mês
                                        </button>
                                        <button
                                            onClick={() => setFiltroGastoPeriodo('ano')}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                filtroGastoPeriodo === 'ano'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-card'
                                            }`}
                                        >
                                            Ano
                                        </button>
                                    </div>
                                </div>

                                {/* Tabela de Gastos */}
                                {filtrarGastosPorPeriodo().length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 dark:bg-dark-elevated rounded-xl">
                                        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum gasto registrado neste período</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-border">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-dark-elevated border-b border-gray-200 dark:border-dark-border">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Data</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Tipo</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">KM</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Litros</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Descrição</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Valor</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                                                {filtrarGastosPorPeriodo().map((gasto) => (
                                                    <tr key={gasto.id} className="hover:bg-gray-50 dark:hover:bg-dark-elevated transition-colors">
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text">
                                                            {new Date(gasto.data).toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                                                gasto.tipo === 'Combustível' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' :
                                                                gasto.tipo === 'Manutenção' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' :
                                                                'bg-gray-100 dark:bg-dark-elevated text-gray-700 dark:text-gray-300'
                                                            }`}>
                                                                {gasto.tipo}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text text-right tabular-nums">
                                                            {gasto.km != null && gasto.km !== ''
                                                                ? `${Number(gasto.km).toLocaleString('pt-BR')} km`
                                                                : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text text-right tabular-nums">
                                                            {gasto.litros != null && gasto.litros !== ''
                                                                ? `${Number(gasto.litros).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} L`
                                                                : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-text-secondary max-w-xs truncate">
                                                            {gasto.descricao || 'Sem descrição'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                                                            R$ {parseFloat(gasto.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => setGastoVisualizando(gasto)}
                                                                    className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-all"
                                                                    title="Ver detalhes"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => abrirModalGasto(gasto)}
                                                                    className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all"
                                                                    title="Editar gasto"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleExcluirGasto(gasto)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                                    title="Excluir gasto"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
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
                                        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                                            <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">Total no período</p>
                                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
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
                        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated">
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[75] p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-1">💰 Valor</p>
                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                        R$ {parseFloat(gastoVisualizando.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">📅 Data</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                                        {new Date(gastoVisualizando.data).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">🏷️ Tipo</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">{gastoVisualizando.tipo}</p>
                                </div>
                                {gastoVisualizando.km != null && (
                                    <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">📏 KM (hodômetro)</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                                            {Number(gastoVisualizando.km).toLocaleString('pt-BR')} km
                                        </p>
                                    </div>
                                )}
                                {gastoVisualizando.litros != null && (
                                    <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">⛽ Litros abastecidos</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                                            {Number(gastoVisualizando.litros).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 })} L
                                        </p>
                                    </div>
                                )}
                            </div>

                            {gastoVisualizando.responsavel && (
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">👤 Responsável</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">{gastoVisualizando.responsavel}</p>
                                </div>
                            )}

                            {gastoVisualizando.descricao && (
                                <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4">
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">📝 Descrição</p>
                                    <p className="text-gray-900 dark:text-dark-text">{gastoVisualizando.descricao}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setGastoVisualizando(null)}
                                    className="flex-1 btn-secondary"
                                >
                                    Fechar
                                </button>
                                <button
                                    onClick={() => {
                                        const g = gastoVisualizando;
                                        setGastoVisualizando(null);
                                        abrirModalGasto(g);
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleExcluirGasto(gastoVisualizando)}
                                    className="flex-1 px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                                >
                                    Excluir
                                </button>
                            </div>
                            <button
                                onClick={handleRegistrarPagamentoGastoFrota}
                                className="w-full btn-success"
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

            {/* Dialog de Confirmação de Exclusão de Gasto */}
            <AlertDialog open={showDeleteGastoDialog} onOpenChange={setShowDeleteGastoDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Excluir gasto
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-3">
                                <p className="text-gray-700 dark:text-dark-text-secondary">
                                    Tem certeza que deseja excluir o gasto de{' '}
                                    <span className="font-bold text-gray-900 dark:text-dark-text">{gastoParaDeletar?.tipo}</span>
                                    {' '}({new Date(gastoParaDeletar?.data || '').toLocaleDateString('pt-BR')})?
                                </p>
                                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    R$ {gastoParaDeletar?.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                                        Esta ação não pode ser desfeita.
                                    </p>
                                    <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                                        O consumo médio e totais do veículo serão recalculados.
                                    </p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelarDelecaoGasto}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmarDelecaoGasto}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Sim, excluir gasto
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        </div>
    );
};

export default GestaoFrotaPage;
