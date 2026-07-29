import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { financeiroService } from '../services/financeiroService';
import { axiosApiService } from '../services/axiosApi';
import { toast } from 'sonner';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { AuthContext } from '../contexts/AuthContext';
import { calcValorARegistrar, formatBRL, parseMoney } from '../utils/financeiroValor';
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

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.268-.268-1.268-.732 0-.464.543-.732 1.268-.732.725 0 1.268.268 1.268.732" />
    </svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
);

const ShoppingCartIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
);

const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
    </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-10.5 0V6a1.5 1.5 0 011.5-1.5h6A1.5 1.5 0 0116.5 6v1.5m-9 0l.643 10.029A2.25 2.25 0 0010.387 19.5h3.226a2.25 2.25 0 002.244-1.971L16.5 7.5M10.5 10.5v6m3-6v6" />
    </svg>
);

// ==================== TYPES ====================
interface CompraBasica {
    id: string;
    numeroSequencial: number;
    numeroNF: string;
}

interface ContaPagar {
    id: string;
    compraId?: string;
    despesaFixaId?: string; // ✅ NOVO: ID da despesa fixa que gerou a parcela
    fornecedorId?: string;
    funcionario?: { id: string; nome: string } | null;
    fornecedorNome: string;
    numeroParcela: number;
    descricao: string;
    dataVencimento: string;
    dataAgendamento?: string;
    valor: number;
    valorPago?: number;
    dataPagamento?: string;
    status: 'Pendente' | 'Pago' | 'Atrasado';
    observacoes?: string;
    compra?: CompraBasica;
    tipo?: string; // FORNECEDOR, RH, DESPESA_FIXA
    meioPagamento?: string | null;
    cartaoCreditoId?: string | null;
}

interface ItemCompra {
    id: string;
    nomeProduto: string;
    quantidade: number;
    valorUnit: number;
    valorTotal: number;
    ncm?: string;
    sku?: string;
}

interface Duplicata {
    numero: string;
    dataVencimento: string;
    valor: number;
}

interface CompraDetalhada {
    id: string;
    numeroNF: string;
    dataCompra: string;
    dataEmissaoNF: string;
    dataRecebimento?: string;
    valorSubtotal: number;
    valorFrete: number;
    outrasDespesas: number;
    valorIPI?: number;
    valorTotalProdutos?: number;
    valorTotalNota?: number;
    valorTotal: number;
    status: string;
    observacoes?: string;
    condicoesPagamento?: string;
    parcelas?: number;
    fornecedor: {
        id: string;
        nome: string;
        cnpj: string;
        telefone?: string;
        email?: string;
        endereco?: string;
    };
    items: ItemCompra[];
    duplicatas?: Duplicata[];
}

interface FornecedorOption {
    id: string;
    nome: string;
    ativo?: boolean;
}

interface FuncionarioOption {
    id: string;
    nome: string;
    status?: string;
}

interface ContasAPagarProps {
    toggleSidebar?: () => void;
    setAbaAtiva?: (aba: string) => void;
    initialContaId?: string | null;
    onClearInitialContaId?: () => void;
}

/** Nome do colaborador em conta RH: relação `funcionario` ou texto "Salário NOME - AAAA-MM" */
function nomeColaboradorContaRh(conta: { funcionario?: { nome?: string } | null; descricao?: string }): string | null {
    const n = conta.funcionario?.nome?.trim();
    if (n) return n;
    const d = (conta.descricao || '').trim();
    const m = d.match(/^Salário\s+(.+?)\s*-\s*\d{4}-\d{2}/i);
    return m ? m[1].trim() : null;
}

// ==================== COMPONENT ====================
const ContasAPagar: React.FC<ContasAPagarProps> = ({ toggleSidebar, setAbaAtiva, initialContaId, onClearInitialContaId }) => {
    const { user } = useContext(AuthContext)!;
    const userRole = user?.role?.toLowerCase();
    const isAdminOrDev = Boolean(
        user?.isAdmin ||
        userRole === 'admin' ||
        userRole === 'administrador' ||
        userRole === 'desenvolvedor'
    );

    const toISODate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const getMesAtualRange = () => {
        const hoje = new Date();
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        return { dataInicio: toISODate(inicio), dataFim: toISODate(fim) };
    };
    
    // Estados
    const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchValorExato, setSearchValorExato] = useState('');
    const [searchValorMin, setSearchValorMin] = useState('');
    const [searchValorMax, setSearchValorMax] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('Em aberto'); // Padrão: apenas Pendente e Atrasado
    const [filterPeriodo, setFilterPeriodo] = useState<string>('MesAtual');
    const [{ dataInicio, dataFim }, setFiltroDatas] = useState(() => getMesAtualRange());
    const [filterTipo, setFilterTipo] = useState<string>('TODOS'); // TODOS, FORNECEDOR, RH, DESPESA_FIXA
    const [gerandoContas, setGerandoContas] = useState(false);
    
    // Modal de Pagamento
    const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | null>(null);
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [valorPago, setValorPago] = useState('0');
    const [observacoesPagamento, setObservacoesPagamento] = useState('');
    const [meioPagamento, setMeioPagamento] = useState<string>('PIX');
    
    // Modal de Visualização de Compra
    const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
    const [compraDetalhada, setCompraDetalhada] = useState<CompraDetalhada | null>(null);
    const [loadingCompra, setLoadingCompra] = useState(false);
    // Highlighting / foco em parcela vinda de outra página
    const [highlightedContaId, setHighlightedContaId] = useState<string | null>(null);
    const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

    // Quando highlightedContaId é setado, aguardar render e scrollar até a linha
    useEffect(() => {
        if (!highlightedContaId) return;
        // Limpar sinal do pai para não repetir ao trocar de aba
        if (onClearInitialContaId) onClearInitialContaId();
        // Aguardar o DOM renderizar a linha
        const timer = setTimeout(() => {
            const el = rowRefs.current[highlightedContaId];
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        // Remover destaque após 10s
        const clearTimer = setTimeout(() => {
            setHighlightedContaId(null);
        }, 10000);
        return () => {
            clearTimeout(timer);
            clearTimeout(clearTimer);
        };
    }, [highlightedContaId]);
    
    // Modal de Atualização de Conta
    const [isAtualizarModalOpen, setIsAtualizarModalOpen] = useState(false);
    const [novaDataVencimento, setNovaDataVencimento] = useState('');
    const [meioPagamentoEdit, setMeioPagamentoEdit] = useState<string>('');
    const [cartaoCreditoIdEdit, setCartaoCreditoIdEdit] = useState<string>('');
    const [cartoesCredito, setCartoesCredito] = useState<Array<{ id: string; nomeOuBanco: string; ultimosQuatroDigitos: string; bandeira: string }>>([]);
    const [novaContaMeioPagamento, setNovaContaMeioPagamento] = useState<string>('');
    const [novaContaCartaoId, setNovaContaCartaoId] = useState<string>('');
    const [novasObservacoes, setNovasObservacoes] = useState('');
    const [novoCredorNome, setNovoCredorNome] = useState('');
    
    // AlertDialog de Confirmação
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'pagar' | 'atualizar' | 'excluir' | null>(null);
    const [contaParaExcluir, setContaParaExcluir] = useState<ContaPagar | null>(null);
    const [excluindoConta, setExcluindoConta] = useState(false);
    
    // Modal de Agendamento
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [dataAgendamento, setDataAgendamento] = useState(new Date().toISOString().split('T')[0]);

    // Modal Nova Conta a Pagar (manual, sem compra)
    const [isNovaContaModalOpen, setIsNovaContaModalOpen] = useState(false);
    const [novaContaCredor, setNovaContaCredor] = useState('');
    const [novaContaDescricao, setNovaContaDescricao] = useState('');
    const [novaContaValor, setNovaContaValor] = useState('');
    const [novaContaJuros, setNovaContaJuros] = useState('0');
    const [novaContaDesconto, setNovaContaDesconto] = useState('0');
    const [novaContaVencimento, setNovaContaVencimento] = useState(new Date().toISOString().split('T')[0]);
    const [novaContaObservacoes, setNovaContaObservacoes] = useState('');
    const [novaContaClassificacao, setNovaContaClassificacao] = useState<string>('');
    const [novaContaTipoDespesa, setNovaContaTipoDespesa] = useState<'FORNECEDOR' | 'RH' | 'DESPESA_FIXA'>('FORNECEDOR');
    const [novaContaFornecedorModo, setNovaContaFornecedorModo] = useState<'CADASTRADO' | 'NOVO'>('NOVO');
    const [novaContaFornecedorId, setNovaContaFornecedorId] = useState('');
    const [novaContaRhSubtipo, setNovaContaRhSubtipo] = useState<'ADIANTAMENTO' | 'VALE'>('ADIANTAMENTO');
    const [novaContaFuncionarioId, setNovaContaFuncionarioId] = useState('');
    const [novaContaRhDescontoTipo, setNovaContaRhDescontoTipo] = useState<'UMA_VEZ' | 'PARCELADO'>('UMA_VEZ');
    const [novaContaRhParcelas, setNovaContaRhParcelas] = useState('2');
    const [novaContaRhReferencia, setNovaContaRhReferencia] = useState(new Date().toISOString().slice(0, 7));
    const [fornecedoresOptions, setFornecedoresOptions] = useState<FornecedorOption[]>([]);
    const [funcionariosOptions, setFuncionariosOptions] = useState<FuncionarioOption[]>([]);
    const [salvandoNovaConta, setSalvandoNovaConta] = useState(false);

    const CLASSIFICACOES_CONTA_PAGAR = [
        { value: '', label: 'Selecione a classificação...' },
        { value: 'Cartão de crédito', label: 'Cartão de crédito' },
        { value: 'Impostos', label: 'Impostos' },
        { value: 'TRT-ART', label: 'TRT-ART' },
        { value: 'Serviço mão de obra eletricista', label: 'Serviço mão de obra eletricista' },
        { value: 'Brindes', label: 'Brindes' },
        { value: 'Combustíveis e pedagios', label: 'Combustíveis e pedagios' },
        { value: 'Frete', label: 'Frete' },
        { value: 'Material de escritório', label: 'Material de escritório' },
        { value: 'Outras Despesas', label: 'Outras Despesas' },
        { value: 'Saídas', label: 'Saídas' },
        { value: 'Tarifas Bancarias', label: 'Tarifas Bancarias' }
    ] as const;

    // Modal Pagamento: Juros e Descontos
    const [jurosPagamento, setJurosPagamento] = useState('0');
    const [descontosPagamento, setDescontosPagamento] = useState('0');

    const valorARegistrarPagamento = useMemo(
        () => calcValorARegistrar(valorPago, jurosPagamento, descontosPagamento),
        [valorPago, jurosPagamento, descontosPagamento]
    );

    const valorARegistrarNovaConta = useMemo(
        () => calcValorARegistrar(novaContaValor, novaContaJuros, novaContaDesconto),
        [novaContaValor, novaContaJuros, novaContaDesconto]
    );

    // Handlers de Modal - Declarados antes do useEscapeKey para evitar erro de inicialização
    const handleClosePagamentoModal = () => {
        setIsPagamentoModalOpen(false);
        setContaSelecionada(null);
        setValorPago('0');
        setObservacoesPagamento('');
        setJurosPagamento('0');
        setDescontosPagamento('0');
    };

    const handleOpenPagamentoModal = (conta: ContaPagar) => {
        if (conta.meioPagamento === 'CARTAO_CREDITO' || conta.cartaoCreditoId) {
            toast.error('Este lançamento está no cartão de crédito', {
                description: 'Liquide pela aba Financeiro → Cartão de Crédito (Fechar e Pagar Fatura).',
            });
            return;
        }
        setContaSelecionada(conta);
        setDataPagamento(new Date().toISOString().split('T')[0]);
        setValorPago(conta.valor.toString());
        setObservacoesPagamento('');
        setMeioPagamento('PIX');
        setJurosPagamento('0');
        setDescontosPagamento('0');
        setIsPagamentoModalOpen(true);
    };

    const handleCloseNovaContaModal = () => {
        setIsNovaContaModalOpen(false);
        setNovaContaCredor('');
        setNovaContaDescricao('');
        setNovaContaValor('');
        setNovaContaJuros('0');
        setNovaContaDesconto('0');
        setNovaContaVencimento(new Date().toISOString().split('T')[0]);
        setNovaContaObservacoes('');
        setNovaContaClassificacao('');
        setNovaContaTipoDespesa('FORNECEDOR');
        setNovaContaFornecedorModo('NOVO');
        setNovaContaFornecedorId('');
        setNovaContaRhSubtipo('ADIANTAMENTO');
        setNovaContaFuncionarioId('');
        setNovaContaRhDescontoTipo('UMA_VEZ');
        setNovaContaRhParcelas('2');
        setNovaContaRhReferencia(new Date().toISOString().slice(0, 7));
    };

    const handleCloseVisualizarModal = () => {
        setIsVisualizarModalOpen(false);
        setCompraDetalhada(null);
    };

    const handleCloseAtualizarModal = () => {
        setIsAtualizarModalOpen(false);
        setContaSelecionada(null);
        setNovaDataVencimento('');
        setNovasObservacoes('');
        setNovoCredorNome('');
    };

    const handleCloseAgendamentoModal = () => {
        setIsAgendamentoModalOpen(false);
        setContaSelecionada(null);
        setDataAgendamento(new Date().toISOString().split('T')[0]);
    };

    const handleOpenAgendamentoModal = (conta: ContaPagar) => {
        setContaSelecionada(conta);
        setDataAgendamento(new Date().toISOString().split('T')[0]);
        setIsAgendamentoModalOpen(true);
    };

    const handleAgendarPagamento = async () => {
        if (!contaSelecionada) return;

        try {
            console.log('📅 Agendando pagamento...');
            const response = await axiosApiService.put<any>(`/api/contas-pagar/${contaSelecionada.id}/agendar`, {
                dataAgendamento
            });

            if (response.success) {
                toast.success('✅ Pagamento agendado com sucesso!', {
                    description: `Data: ${new Date(dataAgendamento).toLocaleDateString('pt-BR')}`
                });
                handleCloseAgendamentoModal();
                await loadContasPagar();
            } else {
                toast.error('❌ Erro ao agendar pagamento', {
                    description: response.error || 'Tente novamente.'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao agendar pagamento:', error);
            toast.error('❌ Erro ao agendar pagamento', {
                description: 'Erro de conexão com o servidor.'
            });
        }
    };

    const handleRemoverAgendamento = async (contaId: string) => {
        try {
            console.log('🗑️ Removendo agendamento...');
            const response = await axiosApiService.put<any>(`/api/contas-pagar/${contaId}/remover-agendamento`);

            if (response.success) {
                toast.success('✅ Agendamento removido com sucesso!');
                await loadContasPagar();
            } else {
                toast.error('❌ Erro ao remover agendamento', {
                    description: response.error || 'Tente novamente.'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao remover agendamento:', error);
            toast.error('❌ Erro ao remover agendamento', {
                description: 'Erro de conexão com o servidor.'
            });
        }
    };

    // Verificar se pode excluir a parcela
    const podeExcluirParcela = (conta: ContaPagar): boolean => {
        if (!isAdminOrDev) {
            return false;
        }

        // Parcela deve estar paga
        if (conta.status !== 'Pago') {
            return false;
        }

        // Se tem compraId, verificar se a compra foi excluída (não existe mais)
        if (conta.compraId) {
            // Se compra existe (tem dados), não pode excluir
            if (conta.compra) {
                return false;
            }
            // Se compraId existe mas compra não tem dados, significa que foi excluída
            return true;
        }

        // Se tem despesaFixaId, verificar se a despesa fixa foi excluída
        if (conta.despesaFixaId) {
            // Se despesaFixa existe (tem dados), não pode excluir
            if ((conta as any).despesaFixa) {
                return false;
            }
            // Se despesaFixaId existe mas despesaFixa não tem dados, significa que foi excluída
            return true;
        }

        // Se não tem nem compraId nem despesaFixaId, é uma conta manual e pode excluir se estiver paga
        return true;
    };

    const getDeleteTooltip = (conta: ContaPagar): string => {
        const contaManual = !conta.compraId && !conta.despesaFixaId;
        if (contaManual) {
            return 'Excluir conta manual';
        }
        return 'Excluir parcela com origem (somente paga e com origem removida)';
    };

    const handleOpenConfirmExcluir = (conta: ContaPagar) => {
        setContaParaExcluir(conta);
        setConfirmAction('excluir');
        setIsConfirmDialogOpen(true);
    };

    const executarExclusaoConta = async () => {
        if (!contaParaExcluir) return;
        setExcluindoConta(true);
        try {
            await axiosApiService.delete(`/api/contas-pagar/${contaParaExcluir.id}`);
            toast.success('Conta excluída com sucesso!');
            setIsConfirmDialogOpen(false);
            setConfirmAction(null);
            setContaParaExcluir(null);
            await loadContasPagar();
        } catch (error: any) {
            console.error('Erro ao excluir conta:', error);
            toast.error('Erro ao excluir conta', {
                description: error.response?.data?.message || 'Tente novamente'
            });
        } finally {
            setExcluindoConta(false);
        }
    };

    // Carregar dados
    useEffect(() => {
        loadContasPagar();
        carregarOpcoesNovaConta();
    }, []);

    useEffect(() => {
        const carregarCartoes = async () => {
            const res = await financeiroService.listarCartoes(true);
            if (res.success && res.data) setCartoesCredito(res.data);
        };
        carregarCartoes();
    }, []);

    // Sincronizar “atalhos” de período com os campos de data (calendário)
    useEffect(() => {
        const hoje = new Date();
        if (filterPeriodo === 'MesAtual') {
            setFiltroDatas(getMesAtualRange());
            return;
        }
        if (filterPeriodo === 'Todos') {
            // manter vazio = sem filtro por data
            setFiltroDatas({ dataInicio: '', dataFim: '' });
            return;
        }
        if (filterPeriodo === 'Próximo30Dias') {
            const inicio = toISODate(hoje);
            const fim = toISODate(new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000));
            setFiltroDatas({ dataInicio: inicio, dataFim: fim });
            return;
        }
        if (filterPeriodo === 'Vencidas') {
            // até ontem
            const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
            setFiltroDatas({ dataInicio: '', dataFim: toISODate(ontem) });
            return;
        }
    }, [filterPeriodo]);

    const carregarOpcoesNovaConta = async () => {
        try {
            const [fornecedoresResp, funcionariosResp] = await Promise.all([
                axiosApiService.get<any>('/api/fornecedores?ativo=true'),
                axiosApiService.get<any>('/api/funcionarios')
            ]);

            const fornecedores = (fornecedoresResp.success ? (fornecedoresResp.data?.data || fornecedoresResp.data || []) : [])
                .filter((f: any) => f && f.id && f.nome)
                .map((f: any) => ({ id: String(f.id), nome: String(f.nome), ativo: f.ativo !== false }));
            const funcionarios = (funcionariosResp.success ? (funcionariosResp.data?.data || funcionariosResp.data || []) : [])
                .filter((f: any) => f && f.id && f.nome)
                .map((f: any) => ({ id: String(f.id), nome: String(f.nome), status: f.status }));

            setFornecedoresOptions(fornecedores);
            setFuncionariosOptions(funcionarios.filter((f: FuncionarioOption) => !f.status || f.status === 'Ativo'));
        } catch (err) {
            console.warn('Não foi possível carregar opções de fornecedores/funcionários para nova conta.', err);
        }
    };

    const loadContasPagar = async () => {
        setLoading(true);
        try {
            console.log('📤 Carregando contas a pagar do backend...');
            const response = await financeiroService.listarContasPagar();
            
            if (response.success && response.data) {
                // Debug: verificar estrutura dos dados recebidos
                console.log('📦 Dados recebidos do backend:', {
                    tipo: Array.isArray(response.data) ? 'array' : typeof response.data,
                    primeiraConta: Array.isArray(response.data) ? response.data[0] : null,
                    temCompra: Array.isArray(response.data) && (response.data[0] as any)?.compra ? 'sim' : 'não'
                });
                
                // Processar e enriquecer dados
                const contasProcessadas = response.data.map((conta: any) => {
                    // Detectar atraso
                    const isAtrasada = new Date(conta.dataVencimento) < new Date() && conta.status === 'Pendente';
                    const tipoConta = (conta.tipo || 'FORNECEDOR') as string;
                    const rawCredor = (conta.fornecedorNome || conta.fornecedor?.nome || conta.credorNome || '').trim();
                    const nomeColabRh = tipoConta === 'RH' ? nomeColaboradorContaRh(conta) : null;
                    /** RH: "Pagamento Colaborador [nome]" (ex.: Pagamento Colaborador Marcello) */
                    const fornecedorNome =
                        tipoConta === 'RH'
                            ? nomeColabRh
                                ? `Pagamento Colaborador ${nomeColabRh}`
                                : 'Pagamento Colaborador'
                            : rawCredor || 'Fornecedor não informado';
                    
                    // Debug: verificar se compra está vindo do backend
                    if (conta.compraId && !conta.compra) {
                        console.warn(`⚠️ Conta ${conta.id} tem compraId (${conta.compraId}) mas não tem objeto compra`);
                    }
                    
                    return {
                        id: conta.id,
                        compraId: conta.compraId,
                        despesaFixaId: conta.despesaFixaId, // ✅ NOVO: ID da despesa fixa
                        fornecedorId: conta.fornecedorId,
                        fornecedorNome,
                        numeroParcela: conta.numeroParcela || 1,
                        descricao: conta.descricao || `Parcela ${conta.numeroParcela || 1}`,
                        dataVencimento: conta.dataVencimento,
                        dataAgendamento: conta.dataAgendamento,
                        valor: conta.valorParcela || conta.valor || 0,
                        valorPago: conta.valorPago,
                        dataPagamento: conta.dataPagamento,
                        status: isAtrasada ? 'Atrasado' : conta.status,
                        observacoes: conta.observacoes,
                        tipo: tipoConta,
                        funcionario: conta.funcionario ?? null,
                        compra: conta.compra, // Incluir dados da compra (numeroSequencial, numeroNF, etc)
                        despesaFixa: (conta as any).despesaFixa, // ✅ NOVO: Dados da despesa fixa (se existir)
                        meioPagamento: conta.meioPagamento || null,
                        cartaoCreditoId: conta.cartaoCreditoId || null,
                    };
                });
                
                setContasPagar(contasProcessadas);
                console.log(`✅ ${contasProcessadas.length} contas a pagar carregadas`);
                console.log('📦 Exemplo de conta com compra:', contasProcessadas.find(c => c.compra));

                // Se foi solicitado foco em uma conta específica (vinda de outra página), destacar
                try {
                    if (initialContaId) {
                        const found = contasProcessadas.find(c => c.id === initialContaId);
                        if (found) {
                            setHighlightedContaId(found.id);
                        }
                    }
                } catch (err) {
                    // ignore
                }
            } else {
                console.warn('⚠️ Erro ao carregar contas:', response.error);
                setContasPagar([]);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar contas a pagar:', error);
            setContasPagar([]);
        } finally {
            setLoading(false);
        }
    };

    const gerarContasSalarios = async () => {
        try {
            setGerandoContas(true);
            const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
            const response = await axiosApiService.post('/api/contas-pagar/gerar/salarios', {
                mesReferencia: mesAtual
            });
            
            if (response.success) {
                const message = (response.data as any)?.message || response.message || 'Contas de salários geradas!';
                toast.success(message);
                loadContasPagar();
            }
        } catch (error) {
            console.error('Erro ao gerar contas de salários:', error);
            toast.error('Erro ao gerar contas de salários');
        } finally {
            setGerandoContas(false);
        }
    };

    const gerarContasDespesasFixas = async () => {
        try {
            setGerandoContas(true);
            const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
            const response = await axiosApiService.post('/api/contas-pagar/gerar/despesas-fixas', {
                mesReferencia: mesAtual
            });
            
            if (response.success) {
                const message = (response.data as any)?.message || response.message || 'Contas de despesas fixas geradas!';
                toast.success(message);
                loadContasPagar();
            }
        } catch (error) {
            console.error('Erro ao gerar contas de despesas fixas:', error);
            toast.error('Erro ao gerar contas de despesas fixas');
        } finally {
            setGerandoContas(false);
        }
    };

    // Filtrar contas
    const contasFiltradas = useMemo(() => {
        let filtered = [...contasPagar];

        // Filtro por tipo (FORNECEDOR, RH, DESPESA_FIXA)
        if (filterTipo !== 'TODOS') {
            filtered = filtered.filter(conta => {
                // Verificar se a conta tem o campo tipo
                const contaTipo = (conta as any).tipo || 'FORNECEDOR';
                return contaTipo === filterTipo;
            });
        }

        // Filtro por status
        // Filtro por status: "Em aberto" = apenas Pendente e Atrasado (o que ainda precisa ser pago)
        if (filterStatus === 'Em aberto') {
            filtered = filtered.filter(conta => conta.status === 'Pendente' || conta.status === 'Atrasado');
        } else if (filterStatus !== 'Todos') {
            filtered = filtered.filter(conta => conta.status === filterStatus);
        }

        // Filtro por período
        {
            const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
            const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;
            if (inicio || fim) {
                filtered = filtered.filter((conta) => {
                    const vencimento = new Date(conta.dataVencimento);
                    if (inicio && vencimento < inicio) return false;
                    if (fim && vencimento > fim) return false;
                    return true;
                });
            }

            // Regras complementares do “atalho” Vencidas (mantém o comportamento atual)
            if (filterPeriodo === 'Vencidas') {
                const hoje = new Date();
                filtered = filtered.filter((conta) => new Date(conta.dataVencimento) < hoje && conta.status !== 'Pago');
            }
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(conta =>
                conta.fornecedorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conta.descricao.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const valorExato = searchValorExato ? parseFloat(searchValorExato.replace(',', '.')) : undefined;
        const valorMin = searchValorMin ? parseFloat(searchValorMin.replace(',', '.')) : undefined;
        const valorMax = searchValorMax ? parseFloat(searchValorMax.replace(',', '.')) : undefined;

        if (valorExato !== undefined && !isNaN(valorExato)) {
            filtered = filtered.filter(conta => Math.abs(conta.valor - valorExato) < 0.0001);
        } else {
            if (valorMin !== undefined && !isNaN(valorMin)) {
                filtered = filtered.filter(conta => conta.valor >= valorMin);
            }
            if (valorMax !== undefined && !isNaN(valorMax)) {
                filtered = filtered.filter(conta => conta.valor <= valorMax);
            }
        }

        return filtered;
    }, [contasPagar, filterStatus, filterPeriodo, dataInicio, dataFim, searchTerm, filterTipo, searchValorExato, searchValorMin, searchValorMax]);

    // Estatísticas
    const estatisticas = useMemo(() => {
        const totalPagar = contasFiltradas
            .filter(c => c.status === 'Pendente' || c.status === 'Atrasado')
            .reduce((sum, c) => sum + c.valor, 0);

        // Pago: respeita período/tipo (não usa contasFiltradas — "Em aberto" exclui status Pago)
        const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
        const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;
        const totalPago = contasPagar
            .filter((c) => {
                if (c.status !== 'Pago') return false;
                if (filterTipo !== 'TODOS') {
                    const contaTipo = (c as any).tipo || 'FORNECEDOR';
                    if (contaTipo !== filterTipo) return false;
                }
                // Preferir data do pagamento; fallback no vencimento
                const dataRef = c.dataPagamento || c.dataVencimento;
                const d = new Date(dataRef);
                if (inicio && d < inicio) return false;
                if (fim && d > fim) return false;
                return true;
            })
            .reduce((sum, c) => sum + (c.valorPago || c.valor || 0), 0);
        
        const totalAtrasado = contasFiltradas
            .filter(c => c.status === 'Atrasado')
            .reduce((sum, c) => sum + c.valor, 0);
        
        const qtdPendente = contasFiltradas.filter(c => c.status === 'Pendente').length;
        const qtdAtrasado = contasFiltradas.filter(c => c.status === 'Atrasado').length;

        return {
            totalPagar,
            totalPago,
            totalAtrasado,
            qtdPendente,
            qtdAtrasado
        };
    }, [contasPagar, contasFiltradas, dataInicio, dataFim, filterTipo]);

    // Handlers (handleOpenPagamentoModal já definido acima com setMeioPagamento)
    const handleOpenConfirmPagamento = () => {
        setConfirmAction('pagar');
        setIsConfirmDialogOpen(true);
    };

    const handleCriarNovaConta = async () => {
        const credor = novaContaCredor.trim();
        const descricao = novaContaDescricao.trim();
        const valor = parseMoney(novaContaValor);
        const juros = parseMoney(novaContaJuros);
        const desconto = parseMoney(novaContaDesconto);
        const total = calcValorARegistrar(valor, juros, desconto);
        if (!descricao || !novaContaVencimento) {
            toast.error('Preencha Descrição e Vencimento.');
            return;
        }
        if (valor <= 0) {
            toast.error('Informe um valor válido.');
            return;
        }
        if (total <= 0) {
            toast.error('Valor a registrar deve ser maior que zero.');
            return;
        }

        if (novaContaTipoDespesa === 'FORNECEDOR') {
            if (novaContaFornecedorModo === 'CADASTRADO' && !novaContaFornecedorId) {
                toast.error('Selecione um fornecedor cadastrado.');
                return;
            }
            if (novaContaFornecedorModo === 'NOVO' && !credor) {
                toast.error('Informe o nome do novo fornecedor/credor.');
                return;
            }
        }

        if (novaContaTipoDespesa === 'RH') {
            if (!novaContaFuncionarioId) {
                toast.error('Selecione o funcionário.');
                return;
            }
            if (!novaContaRhReferencia || !/^\d{4}-\d{2}$/.test(novaContaRhReferencia)) {
                toast.error('Informe a competência de desconto da folha no formato AAAA-MM.');
                return;
            }
            if (novaContaRhDescontoTipo === 'PARCELADO') {
                const parcelas = parseInt(novaContaRhParcelas, 10);
                if (!Number.isFinite(parcelas) || parcelas < 2) {
                    toast.error('Para parcelado, informe no mínimo 2 parcelas.');
                    return;
                }
            }
        }

        if (novaContaMeioPagamento === 'CARTAO_CREDITO' && !novaContaCartaoId) {
            toast.error('Selecione o cartão de crédito');
            return;
        }

        const [descontoAno, descontoMes] = novaContaRhReferencia.split('-').map(Number);
        const isFornecedorCadastrado = novaContaTipoDespesa === 'FORNECEDOR' && novaContaFornecedorModo === 'CADASTRADO';
        const fornecedorSelecionado = isFornecedorCadastrado
            ? fornecedoresOptions.find((f) => f.id === novaContaFornecedorId)
            : null;
        const funcionarioSelecionado = novaContaTipoDespesa === 'RH'
            ? funcionariosOptions.find((f) => f.id === novaContaFuncionarioId)
            : null;

        const nomeCredorFinal = novaContaTipoDespesa === 'FORNECEDOR'
            ? (isFornecedorCadastrado ? (fornecedorSelecionado?.nome || '') : credor)
            : (novaContaTipoDespesa === 'RH' ? (funcionarioSelecionado?.nome || '') : (credor || 'Despesa fixa'));

        const descricaoFinal = novaContaTipoDespesa === 'RH'
            ? `${novaContaRhSubtipo === 'VALE' ? 'Vale' : 'Adiantamento'} - ${nomeCredorFinal} - ${descricao}`
            : `${nomeCredorFinal ? `${nomeCredorFinal} - ` : ''}${descricao}`;

        setSalvandoNovaConta(true);
        try {
            const response = await financeiroService.criarContaPagar({
                fornecedorId: isFornecedorCadastrado ? novaContaFornecedorId : undefined,
                credorNome: !isFornecedorCadastrado ? nomeCredorFinal : undefined,
                origemCadastro: novaContaTipoDespesa === 'FORNECEDOR'
                    ? (isFornecedorCadastrado ? 'FORNECEDOR_CADASTRADO' : 'FORNECEDOR_NOVO')
                    : (novaContaTipoDespesa === 'RH' ? 'RH' : 'DESPESA_FIXA'),
                descricao: descricaoFinal,
                valor,
                valorJuros: juros > 0 ? juros : undefined,
                valorDesconto: desconto > 0 ? desconto : undefined,
                dataVencimento: novaContaVencimento,
                tipo: novaContaTipoDespesa,
                subtipo: novaContaTipoDespesa === 'RH' ? novaContaRhSubtipo : undefined,
                funcionarioId: novaContaTipoDespesa === 'RH' ? novaContaFuncionarioId : undefined,
                descontoFolhaTipo: novaContaTipoDespesa === 'RH' ? novaContaRhDescontoTipo : undefined,
                descontoFolhaParcelas: novaContaTipoDespesa === 'RH' && novaContaRhDescontoTipo === 'PARCELADO'
                    ? parseInt(novaContaRhParcelas, 10)
                    : undefined,
                descontoFolhaReferenciaAno: novaContaTipoDespesa === 'RH' ? descontoAno : undefined,
                descontoFolhaReferenciaMes: novaContaTipoDespesa === 'RH' ? descontoMes : undefined,
                observacoes: novaContaObservacoes || undefined,
                classificacao: novaContaClassificacao.trim() || undefined,
                meioPagamento: novaContaMeioPagamento || undefined,
                cartaoCreditoId:
                    novaContaMeioPagamento === 'CARTAO_CREDITO' ? novaContaCartaoId || undefined : undefined,
            });
            if (response.success) {
                toast.success('Conta a pagar criada com sucesso!', {
                    description: 'Você já pode registrar o pagamento na lista.'
                });
                handleCloseNovaContaModal();
                await loadContasPagar();
            } else {
                toast.error(response.error || 'Erro ao criar conta.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Erro ao criar conta a pagar.');
        } finally {
            setSalvandoNovaConta(false);
        }
    };

    const handlePagarConta = async () => {
        if (!contaSelecionada) return;

        const valorBase = parseMoney(valorPago);
        const juros = parseMoney(jurosPagamento);
        const descontos = parseMoney(descontosPagamento);
        const valorARegistrar = calcValorARegistrar(valorBase, juros, descontos);
        if (valorARegistrar <= 0) {
            toast.error('Valor a registrar deve ser maior que zero.');
            return;
        }

        try {
            console.log('💳 Registrando pagamento...');
            const response = await financeiroService.pagarContaPagar(contaSelecionada.id, {
                dataPagamento,
                valorPago: valorBase,
                valorJuros: juros > 0 ? juros : undefined,
                valorDesconto: descontos > 0 ? descontos : undefined,
                observacoes: observacoesPagamento,
                meioPagamento
            });

            if (response.success) {
                toast.success('✅ Pagamento registrado com sucesso!', {
                    description: `Conta de ${contaSelecionada.fornecedorNome} foi paga.`
                });
                handleClosePagamentoModal();
                // Recarregar lista
                await loadContasPagar();
            } else {
                toast.error('❌ Erro ao registrar pagamento', {
                    description: response.error || 'Tente novamente.'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao pagar conta:', error);
            toast.error('❌ Erro ao registrar pagamento', {
                description: 'Erro de conexão com o servidor.'
            });
        }
    };

    const handleVisualizarCompra = async (compraId: string) => {
        setLoadingCompra(true);
        setIsVisualizarModalOpen(true);
        
        try {
            console.log('🔍 Buscando detalhes da compra:', compraId);
            
            // Buscar compra com todos os relacionamentos
            const response = await axiosApiService.get<any>(`/api/compras/${compraId}`);
            
            if (response.success && response.data) {
                const compra = response.data;
                
                // Montar estrutura de dados
                const compraDetalhes: CompraDetalhada = {
                    id: compra.id,
                    numeroNF: compra.numeroNF,
                    dataCompra: compra.dataCompra,
                    dataEmissaoNF: compra.dataEmissaoNF,
                    dataRecebimento: compra.dataRecebimento,
                    valorSubtotal: compra.valorSubtotal || 0,
                    valorFrete: compra.valorFrete || 0,
                    outrasDespesas: compra.outrasDespesas || 0,
                    valorIPI: compra.valorIPI || 0,
                    valorTotalProdutos: compra.valorTotalProdutos || 0,
                    valorTotalNota: compra.valorTotalNota || 0,
                    valorTotal: compra.valorTotal || 0,
                    status: compra.status,
                    observacoes: compra.observacoes,
                    condicoesPagamento: compra.condicoesPagamento,
                    parcelas: compra.parcelas,
                    fornecedor: {
                        id: compra.fornecedor?.id || compra.fornecedorId,
                        nome: compra.fornecedorNome || compra.fornecedor?.nome || 'Fornecedor não informado',
                        cnpj: compra.fornecedorCNPJ || compra.fornecedor?.cnpj || '',
                        telefone: compra.fornecedorTel || compra.fornecedor?.telefone,
                        email: compra.fornecedor?.email,
                        endereco: compra.fornecedor?.endereco
                    },
                    items: (compra.items || []).map((item: any) => ({
                        id: item.id,
                        nomeProduto: item.nomeProduto,
                        quantidade: item.quantidade,
                        valorUnit: item.valorUnit,
                        valorTotal: item.quantidade * item.valorUnit,
                        ncm: item.ncm,
                        sku: item.sku
                    })),
                    duplicatas: compra.duplicatas || []
                };

                setCompraDetalhada(compraDetalhes);
                console.log('✅ Detalhes da compra carregados:', compraDetalhes);
            } else {
                toast.error('❌ Erro ao buscar detalhes da compra');
                setIsVisualizarModalOpen(false);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar compra:', error);
            toast.error('❌ Erro ao buscar detalhes da compra', {
                description: 'Verifique sua conexão e tente novamente.'
            });
            setIsVisualizarModalOpen(false);
        } finally {
            setLoadingCompra(false);
        }
    };

    const handleOpenAtualizarModal = (conta: ContaPagar) => {
        setContaSelecionada(conta);
        setNovaDataVencimento(conta.dataVencimento.split('T')[0]);
        setNovasObservacoes(conta.observacoes || '');
        setNovoCredorNome(conta.fornecedorNome || '');
        setMeioPagamentoEdit((conta as any).meioPagamento || '');
        setCartaoCreditoIdEdit((conta as any).cartaoCreditoId || '');
        setIsAtualizarModalOpen(true);
    };

    const handleOpenConfirmAtualizar = () => {
        setConfirmAction('atualizar');
        setIsConfirmDialogOpen(true);
    };

    const handleAtualizarConta = async () => {
        if (!contaSelecionada) return;

        try {
            console.log('✏️ Atualizando conta a pagar...');
            const response = await axiosApiService.put<any>(`/api/contas-pagar/${contaSelecionada.id}`, {
                credorNome: (novoCredorNome || '').trim() || null,
                dataVencimento: novaDataVencimento,
                observacoes: novasObservacoes,
                meioPagamento: meioPagamentoEdit || null,
                cartaoCreditoId:
                    meioPagamentoEdit === 'CARTAO_CREDITO' ? cartaoCreditoIdEdit || null : null,
            });

            if (response.success) {
                toast.success('✅ Conta atualizada com sucesso!', {
                    description: `Novo vencimento: ${new Date(novaDataVencimento).toLocaleDateString('pt-BR')}`
                });
                handleCloseAtualizarModal();
                // Recarregar lista
                await loadContasPagar();
            } else {
                toast.error('❌ Erro ao atualizar conta', {
                    description: (response as any).message || response.error || 'Tente novamente.'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar conta:', error);
            toast.error('❌ Erro ao atualizar conta', {
                description: 'Erro de conexão com o servidor.'
            });
        }
    };

    const handleConfirmAction = () => {
        if (confirmAction === 'excluir') {
            executarExclusaoConta();
            return;
        }
        setIsConfirmDialogOpen(false);
        if (confirmAction === 'pagar') {
            handlePagarConta();
        } else if (confirmAction === 'atualizar') {
            handleAtualizarConta();
        }
    };

    const handleCloseConfirmDialog = (open: boolean) => {
        setIsConfirmDialogOpen(open);
        if (!open) {
            setConfirmAction(null);
            setContaParaExcluir(null);
        }
    };

    const handleGerarPDFCompra = () => {
        if (!compraDetalhada) return;

        try {
            // Criar conteúdo HTML para impressão
            const conteudoHTML = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>Compra - NF ${compraDetalhada.numeroNF}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
                        .header h1 { margin: 0; color: #1e40af; font-size: 28px; }
                        .header p { margin: 5px 0; color: #64748b; }
                        .section { margin: 20px 0; padding: 15px; border: 2px solid #e5e7eb; border-radius: 8px; }
                        .section h2 { margin: 0 0 15px 0; color: #1e40af; font-size: 18px; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                        .field { margin-bottom: 10px; }
                        .field label { font-weight: bold; color: #475569; display: block; font-size: 12px; }
                        .field p { margin: 3px 0 0 0; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; border: 1px solid #cbd5e1; }
                        td { padding: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
                        .total { background: #dbeafe; font-weight: bold; }
                        .resumo { background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
                        .resumo-item { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; }
                        .resumo-total { border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 10px; font-size: 18px; font-weight: bold; color: #1e40af; }
                        @media print { 
                            body { margin: 0; } 
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>📄 COMPRA - NOTA FISCAL</h1>
                        <p><strong>NF Nº:</strong> ${compraDetalhada.numeroNF}</p>
                        <p><strong>Data da Compra:</strong> ${new Date(compraDetalhada.dataCompra).toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div class="section">
                        <h2>🏢 Dados do Fornecedor</h2>
                        <div class="grid">
                            <div class="field">
                                <label>Nome/Razão Social:</label>
                                <p>${compraDetalhada.fornecedor.nome}</p>
                            </div>
                            <div class="field">
                                <label>CNPJ:</label>
                                <p>${compraDetalhada.fornecedor.cnpj}</p>
                            </div>
                            ${compraDetalhada.fornecedor.telefone ? `
                                <div class="field">
                                    <label>Telefone:</label>
                                    <p>${compraDetalhada.fornecedor.telefone}</p>
                                </div>
                            ` : ''}
                            ${compraDetalhada.fornecedor.email ? `
                                <div class="field">
                                    <label>Email:</label>
                                    <p>${compraDetalhada.fornecedor.email}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${compraDetalhada.fornecedor.endereco ? `
                            <div class="field">
                                <label>Endereço:</label>
                                <p>${compraDetalhada.fornecedor.endereco}</p>
                            </div>
                        ` : ''}
                    </div>

                    <div class="section">
                        <h2>📦 Itens da Compra</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 40%;">Produto</th>
                                    <th style="width: 15%; text-align: center;">SKU</th>
                                    <th style="width: 15%; text-align: center;">NCM</th>
                                    <th style="width: 10%; text-align: center;">Qtd</th>
                                    <th style="width: 10%; text-align: right;">Valor Unit.</th>
                                    <th style="width: 10%; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${compraDetalhada.items.map(item => `
                                    <tr>
                                        <td>${item.nomeProduto}</td>
                                        <td style="text-align: center; font-size: 11px; color: #64748b;">${item.sku || '-'}</td>
                                        <td style="text-align: center; font-size: 11px; color: #64748b;">${item.ncm || '-'}</td>
                                        <td style="text-align: center;">${item.quantidade}</td>
                                        <td style="text-align: right;">R$ ${item.valorUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td style="text-align: right; font-weight: bold;">R$ ${item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    ${compraDetalhada.duplicatas && compraDetalhada.duplicatas.length > 0 ? `
                        <div class="section">
                            <h2>💳 Duplicatas / Parcelas</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Duplicata</th>
                                        <th style="text-align: center;">Vencimento</th>
                                        <th style="text-align: right;">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${compraDetalhada.duplicatas.map(dup => `
                                        <tr>
                                            <td>${dup.numero}</td>
                                            <td style="text-align: center;">${new Date(dup.dataVencimento).toLocaleDateString('pt-BR')}</td>
                                            <td style="text-align: right; font-weight: bold;">R$ ${dup.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <div class="resumo">
                        <h2 style="margin: 0 0 15px 0; color: #1e40af;">💰 Resumo Financeiro</h2>
                        <div class="resumo-item">
                            <span>Subtotal Produtos:</span>
                            <span>R$ ${(compraDetalhada.valorTotalProdutos || compraDetalhada.valorSubtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="resumo-item">
                            <span>Frete:</span>
                            <span>R$ ${compraDetalhada.valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        ${compraDetalhada.valorIPI && compraDetalhada.valorIPI > 0 ? `
                            <div class="resumo-item">
                                <span>IPI:</span>
                                <span>R$ ${compraDetalhada.valorIPI.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        ` : ''}
                        <div class="resumo-item">
                            <span>Outras Despesas:</span>
                            <span>R$ ${compraDetalhada.outrasDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="resumo-item resumo-total">
                            <span>TOTAL DA NOTA:</span>
                            <span>R$ ${(compraDetalhada.valorTotalNota || compraDetalhada.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    ${compraDetalhada.observacoes ? `
                        <div class="section" style="background: #fef3c7; border-color: #fbbf24;">
                            <h2 style="color: #92400e;">📝 Observações</h2>
                            <p style="margin: 0;">${compraDetalhada.observacoes}</p>
                        </div>
                    ` : ''}

                    <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
                        <p>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                        <p>S3E Engenharia - Sistema de Gestão</p>
                    </div>
                </body>
                </html>
            `;

            // Abrir nova janela para impressão
            const janelaImpressao = window.open('', '_blank');
            if (janelaImpressao) {
                janelaImpressao.document.write(conteudoHTML);
                janelaImpressao.document.close();
                
                // Aguardar carregamento e abrir dialog de impressão
                janelaImpressao.onload = () => {
                    janelaImpressao.focus();
                    janelaImpressao.print();
                };

                toast.success('📄 PDF gerado com sucesso!', {
                    description: 'Abrindo janela de impressão...'
                });
            } else {
                toast.error('❌ Erro ao gerar PDF', {
                    description: 'Permita pop-ups no navegador.'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            toast.error('❌ Erro ao gerar PDF');
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Pago':
                return 'bg-green-100 text-green-800 ring-1 ring-green-200';
            case 'Pendente':
                return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
            case 'Atrasado':
                return 'bg-red-100 text-red-800 ring-1 ring-red-200';
            default:
                return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700';
        }
    };

    const isVencida = (dataVencimento: string, status: string) => {
        if (status === 'Pago') return false;
        return new Date(dataVencimento) < new Date();
    };

    // Aplicar hook useEscapeKey em todos os modais (depois de todas as declarações de handlers)
    useEscapeKey(isPagamentoModalOpen, handleClosePagamentoModal);
    useEscapeKey(isVisualizarModalOpen, handleCloseVisualizarModal);
    useEscapeKey(isAtualizarModalOpen, handleCloseAtualizarModal);
    useEscapeKey(isAgendamentoModalOpen, handleCloseAgendamentoModal);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 dark:border-red-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando contas a pagar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    {toggleSidebar && (
                        <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Contas a Pagar</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gestão de pagamentos e fornecedores</p>
                    </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {setAbaAtiva && (
                        <button
                            onClick={() => setAbaAtiva('dashboard')}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Voltar ao Dashboard
                        </button>
                    )}
                    <button
                        onClick={() => setIsNovaContaModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shadow-soft"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nova Conta a Pagar
                    </button>
                    <button
                        onClick={loadContasPagar}
                        className="btn-danger flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Atualizar
                    </button>
                </div>
            </header>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                            <CurrencyDollarIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">A Pagar</p>
                            <p className="text-2xl font-bold text-red-600">
                                R$ {estatisticas.totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{estatisticas.qtdPendente} pendente(s)</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Pago</p>
                            <p className="text-2xl font-bold text-green-600">
                                R$ {estatisticas.totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                            <CalendarIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Atrasado</p>
                            <p className="text-2xl font-bold text-orange-600">
                                R$ {estatisticas.totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{estatisticas.qtdAtrasado} conta(s)</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total de Contas</p>
                            <p className="text-2xl font-bold text-purple-600">{contasFiltradas.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards de Classificação/Filtro por Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <button
                    onClick={() => setFilterTipo('FORNECEDOR')}
                    className={`card-primary text-left transition-all transform hover:scale-105 ${
                        filterTipo === 'FORNECEDOR' ? 'ring-4 ring-blue-300 bg-blue-50' : 'hover:shadow-lg'
                    }`}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-600 uppercase">Fornecedores</p>
                            <p className="text-3xl font-bold text-blue-600">
                                {contasPagar.filter(c => ((c as any).tipo || 'FORNECEDOR') === 'FORNECEDOR').length}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Materiais e Insumos</p>
                        </div>
                    </div>
                </button>

                <div
                    onClick={() => setFilterTipo('RH')}
                    className={`card-primary text-left transition-all transform hover:scale-105 relative cursor-pointer ${
                        filterTipo === 'RH' ? 'ring-4 ring-green-300 bg-green-50' : 'hover:shadow-lg'
                    }`}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-600 uppercase">Recursos Humanos</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {contasPagar.filter(c => ((c as any).tipo) === 'RH').length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Salários e Vales</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); gerarContasSalarios(); }}
                            disabled={gerandoContas}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                            title="Gerar contas do mês atual"
                        >
                            {gerandoContas ? '...' : '+ Gerar'}
                        </button>
                    </div>
                </div>

                <div
                    onClick={() => setFilterTipo('DESPESA_FIXA')}
                    className={`card-primary text-left transition-all transform hover:scale-105 relative cursor-pointer ${
                        filterTipo === 'DESPESA_FIXA' ? 'ring-4 ring-orange-300 bg-orange-50' : 'hover:shadow-lg'
                    }`}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-600 uppercase">Despesas Variadas</p>
                                <p className="text-3xl font-bold text-orange-600">
                                    {contasPagar.filter(c => ((c as any).tipo) === 'DESPESA_FIXA').length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Sede e Estrutura</p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); gerarContasDespesasFixas(); }}
                            disabled={gerandoContas}
                            className="px-3 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
                            title="Gerar contas do mês atual"
                        >
                            {gerandoContas ? '...' : '+ Gerar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Botão para ver todas */}
            {filterTipo !== 'TODOS' && (
                <div className="mb-6 text-center">
                    <button
                        onClick={() => setFilterTipo('TODOS')}
                        className="btn-secondary inline-flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        Ver Todas as Contas
                    </button>
                </div>
            )}

            {/* Filtros */}
            <div className="card-primary mb-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por fornecedor ou descrição..."
                                className="input-field pl-10 focus:ring-red-500 focus:border-red-500"
                            />
                        </div>
                    </div>
                    <div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={searchValorExato}
                            onChange={(e) => setSearchValorExato(e.target.value)}
                            placeholder="Valor exato"
                            className="select-field focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    <div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={searchValorMin}
                            onChange={(e) => setSearchValorMin(e.target.value)}
                            placeholder="Valor mínimo"
                            className="select-field focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    <div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={searchValorMax}
                            onChange={(e) => setSearchValorMax(e.target.value)}
                            placeholder="Valor máximo"
                            className="select-field focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="select-field focus:ring-red-500"
                        >
                            <option value="Em aberto">Em aberto (Pendente + Atrasado)</option>
                            <option value="Todos">Todos os Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                            <option value="Atrasado">Atrasado</option>
                        </select>
                    </div>
                    <div>
                        <select
                            value={filterPeriodo}
                            onChange={(e) => setFilterPeriodo(e.target.value)}
                            className="select-field focus:ring-red-500"
                        >
                            <option value="MesAtual">Mês Atual</option>
                            <option value="Todos">Todos os Períodos</option>
                            <option value="Vencidas">Vencidas</option>
                            <option value="Próximo30Dias">Próximos 30 Dias</option>
                            <option value="Personalizado">Personalizado</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">De</label>
                                <input
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => {
                                        setFiltroDatas((prev) => ({ ...prev, dataInicio: e.target.value }));
                                        setFilterPeriodo('Personalizado');
                                    }}
                                    className="select-field focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Até</label>
                                <input
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => {
                                        setFiltroDatas((prev) => ({ ...prev, dataFim: e.target.value }));
                                        setFilterPeriodo('Personalizado');
                                    }}
                                    className="select-field focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Alterar o período atualiza automaticamente as estatísticas e a lista.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabela de Contas */}
            {/* Estilos para destaque piscante da parcela selecionada */}
            <style>{`
                @keyframes s3e-blink {
                    0% { box-shadow: 0 0 0 2px rgba(59,130,246,1); }
                    50% { box-shadow: 0 0 0 2px rgba(59,130,246,0); }
                    100% { box-shadow: 0 0 0 2px rgba(59,130,246,1); }
                }
                .animated-highlight {
                    animation: s3e-blink 1s linear infinite;
                }
            `}</style>
            <div className="card-primary overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Parcela / Compra
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Fornecedor / Descrição
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Vencimento
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Agendamento
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Valor
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {contasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <CurrencyDollarIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 font-medium">Nenhuma conta encontrada</p>
                                            <p className="text-sm text-gray-400 mt-1">Ajuste os filtros ou aguarde novas compras</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                contasFiltradas.map((conta) => (
                                    <tr
                                        key={conta.id}
                                        ref={(el) => { rowRefs.current[conta.id] = el; }}
                                        className={`hover:bg-gray-50 transition-colors ${highlightedContaId === conta.id ? 'animated-highlight' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-gray-900">Parcela {conta.numeroParcela}</p>
                                                {conta.compraId && (
                                                    conta.compra?.numeroSequencial ? (
                                                        <p className="text-xs text-blue-600 mt-1 hover:underline cursor-pointer" title={`NF: ${conta.compra.numeroNF || 'N/A'}`}>
                                                            Compra #{conta.compra.numeroSequencial}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-500 mt-1">Compra: {conta.compraId.slice(0, 8)}...</p>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{conta.fornecedorNome}</p>
                                                <p className="text-sm text-gray-600">{conta.descricao}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div>
                                                <p className={`text-sm font-medium ${isVencida(conta.dataVencimento, conta.status) ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}
                                                </p>
                                                {conta.dataPagamento && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        Pago: {new Date(conta.dataPagamento).toLocaleDateString('pt-BR')}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div>
                                                {conta.dataAgendamento ? (
                                                    <>
                                                        <p className="text-sm font-medium text-blue-600">
                                                            📅 {new Date(conta.dataAgendamento).toLocaleDateString('pt-BR')}
                                                        </p>
                                                        <button
                                                            onClick={() => handleRemoverAgendamento(conta.id)}
                                                            className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
                                                            title="Remover agendamento"
                                                        >
                                                            Remover
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenAgendamentoModal(conta)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                                                        title="Agendar pagamento"
                                                        disabled={conta.status === 'Pago'}
                                                    >
                                                        Agendar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-lg font-bold text-gray-900">
                                                R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            {conta.valorPago && conta.valorPago !== conta.valor && (
                                                <p className="text-xs text-green-600 mt-1">
                                                    Pago: R$ {conta.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusClass(conta.status)}`}>
                                                {conta.status === 'Pago' && '✅ '}
                                                {conta.status === 'Pendente' && '⏳ '}
                                                {conta.status === 'Atrasado' && '⚠️ '}
                                                {conta.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {conta.status !== 'Pago' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenPagamentoModal(conta)}
                                                            className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                            title="Pagar Conta"
                                                        >
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                        </button>
                                                        {isAdminOrDev && (
                                                            <button
                                                                onClick={() => handleOpenAtualizarModal(conta)}
                                                                className="p-2 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {conta.compraId && (
                                                    <button
                                                        onClick={() => handleVisualizarCompra(conta.compraId!)}
                                                        className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                        title="Visualizar Compra"
                                                    >
                                                        <ShoppingCartIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {podeExcluirParcela(conta) && (
                                                    <button
                                                        onClick={() => handleOpenConfirmExcluir(conta)}
                                                        className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors"
                                                        title={getDeleteTooltip(conta)}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Visualização de Compra */}
            {isVisualizarModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {loadingCompra ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Carregando detalhes da compra...</p>
                            </div>
                        ) : compraDetalhada ? (
                            <>
                                {/* Header */}
                                <div className="modal-header bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Detalhes da Compra</h2>
                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">NF {compraDetalhada.numeroNF}</p>
                                    </div>
                                    <button
                                        onClick={handleCloseVisualizarModal}
                                        className="p-2 text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-dark-text hover:bg-white/80 dark:hover:bg-white/10 rounded-xl"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="modal-body space-y-6">
                                    {/* Informações da Compra */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Informações da Compra</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-400 font-medium">Nota Fiscal:</span>
                                                <p className="text-blue-900 dark:text-blue-300 font-semibold">{compraDetalhada.numeroNF}</p>
                                            </div>
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-400 font-medium">Emissão:</span>
                                                <p className="text-blue-900 dark:text-blue-300">{new Date(compraDetalhada.dataEmissaoNF).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-400 font-medium">Data da Compra:</span>
                                                <p className="text-blue-900 dark:text-blue-300">{new Date(compraDetalhada.dataCompra).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-400 font-medium">Status:</span>
                                                <p className="text-blue-900 dark:text-blue-300 font-semibold">{compraDetalhada.status}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Informações do Fornecedor */}
                                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
                                        <h3 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                                            🏢 Dados do Fornecedor
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-green-700 dark:text-green-400 font-medium">Nome:</span>
                                                <p className="text-green-900 dark:text-green-300 font-semibold">{compraDetalhada.fornecedor.nome}</p>
                                            </div>
                                            <div>
                                                <span className="text-green-700 dark:text-green-400 font-medium">CNPJ:</span>
                                                <p className="text-green-900 dark:text-green-300">{compraDetalhada.fornecedor.cnpj}</p>
                                            </div>
                                            {compraDetalhada.fornecedor.telefone && (
                                                <div>
                                                    <span className="text-green-700 dark:text-green-400 font-medium">Telefone:</span>
                                                    <p className="text-green-900 dark:text-green-300">{compraDetalhada.fornecedor.telefone}</p>
                                                </div>
                                            )}
                                            {compraDetalhada.fornecedor.email && (
                                                <div>
                                                    <span className="text-green-700 dark:text-green-400 font-medium">Email:</span>
                                                    <p className="text-green-900 dark:text-green-300">{compraDetalhada.fornecedor.email}</p>
                                                </div>
                                            )}
                                            {compraDetalhada.fornecedor.endereco && (
                                                <div className="md:col-span-2">
                                                    <span className="text-green-700 dark:text-green-400 font-medium">Endereço:</span>
                                                    <p className="text-green-900 dark:text-green-300">{compraDetalhada.fornecedor.endereco}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Itens da Compra */}
                                    {compraDetalhada.items && compraDetalhada.items.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-3 flex items-center gap-2">
                                                📦 Itens da Compra
                                            </h3>
                                            <div className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-dark-border">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-dark-text">Produto</th>
                                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-dark-text">SKU</th>
                                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-dark-text">NCM</th>
                                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-dark-text">Qtd</th>
                                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-text">Valor Unit.</th>
                                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-dark-text">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                                                        {compraDetalhada.items.map((item) => (
                                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                                                                <td className="px-4 py-3 text-gray-900 dark:text-dark-text">{item.nomeProduto}</td>
                                                                <td className="px-4 py-3 text-center text-gray-600 dark:text-dark-text-secondary text-xs">{item.sku || '-'}</td>
                                                                <td className="px-4 py-3 text-center text-gray-600 dark:text-dark-text-secondary text-xs">{item.ncm || '-'}</td>
                                                                <td className="px-4 py-3 text-center text-gray-900 dark:text-dark-text">{item.quantidade}</td>
                                                                <td className="px-4 py-3 text-right text-gray-900 dark:text-dark-text">
                                                                    R$ {item.valorUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-dark-text">
                                                                    R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Resumo Financeiro */}
                                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Resumo Financeiro</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-blue-700 dark:text-blue-400">Subtotal Produtos:</span>
                                                <span className="text-blue-900 dark:text-blue-300 font-semibold">
                                                    R$ {(compraDetalhada.valorTotalProdutos || compraDetalhada.valorSubtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-700 dark:text-blue-400">Frete:</span>
                                                <span className="text-blue-900 dark:text-blue-300">
                                                    R$ {compraDetalhada.valorFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {compraDetalhada.valorIPI !== undefined && compraDetalhada.valorIPI > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-blue-700 dark:text-blue-400">IPI:</span>
                                                    <span className="text-blue-900 dark:text-blue-300">
                                                        R$ {compraDetalhada.valorIPI.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-blue-700 dark:text-blue-400">Outras Despesas:</span>
                                                <span className="text-blue-900 dark:text-blue-300">
                                                    R$ {compraDetalhada.outrasDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="border-t-2 border-blue-300 dark:border-blue-700 pt-2 mt-2 flex justify-between">
                                                <span className="text-blue-900 dark:text-blue-300 font-bold text-base">TOTAL DA NOTA:</span>
                                                <span className="text-blue-900 dark:text-blue-300 font-bold text-lg">
                                                    R$ {(compraDetalhada.valorTotalNota || compraDetalhada.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Condições de Pagamento */}
                                    {(compraDetalhada.condicoesPagamento || compraDetalhada.duplicatas) && (
                                        <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-4">
                                            <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                                                💳 Condições de Pagamento
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                                {compraDetalhada.condicoesPagamento && (
                                                    <div>
                                                        <span className="text-purple-700 font-medium">Condição:</span>
                                                        <p className="text-purple-900 font-semibold">{compraDetalhada.condicoesPagamento}</p>
                                                    </div>
                                                )}
                                                {compraDetalhada.parcelas && (
                                                    <div>
                                                        <span className="text-purple-700 font-medium">Parcelas:</span>
                                                        <p className="text-purple-900 font-semibold">{compraDetalhada.parcelas}x</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {compraDetalhada.duplicatas && compraDetalhada.duplicatas.length > 0 && (
                                                <div className="border border-purple-200 rounded-lg overflow-hidden mt-3">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-purple-100 border-b border-purple-200">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900">Duplicata</th>
                                                                <th className="px-3 py-2 text-center text-xs font-semibold text-purple-900">Vencimento</th>
                                                                <th className="px-3 py-2 text-right text-xs font-semibold text-purple-900">Valor</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-purple-100">
                                                            {compraDetalhada.duplicatas.map((dup, idx) => (
                                                                <tr key={idx} className="hover:bg-purple-50">
                                                                    <td className="px-3 py-2 text-purple-900">{dup.numero}</td>
                                                                    <td className="px-3 py-2 text-center text-purple-900">
                                                                        {new Date(dup.dataVencimento).toLocaleDateString('pt-BR')}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-semibold text-purple-900">
                                                                        R$ {dup.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Observações */}
                                    {compraDetalhada.observacoes && (
                                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                                            <h3 className="font-semibold text-yellow-900 mb-2">Observações</h3>
                                            <p className="text-yellow-800 text-sm">{compraDetalhada.observacoes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-100">
                                    <button
                                        onClick={handleGerarPDFCompra}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        Gerar PDF / Imprimir
                                    </button>
                                    <button
                                        onClick={handleCloseVisualizarModal}
                                        className="btn-secondary"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Modal de Atualização de Conta */}
            {isAtualizarModalOpen && contaSelecionada && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="modal-header bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Atualizar Conta a Pagar</h2>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Alterar vencimento e observações</p>
                            </div>
                            <button
                                onClick={handleCloseAtualizarModal}
                                className="p-2 text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-dark-text hover:bg-white/80 dark:hover:bg-white/10 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-body space-y-6">
                            {/* Informações da Conta */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Informações da Conta</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-blue-700 dark:text-blue-400 font-medium">Fornecedor:</span>
                                        <p className="text-blue-900 dark:text-blue-300 font-semibold">{contaSelecionada.fornecedorNome}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 dark:text-blue-400 font-medium">Descrição:</span>
                                        <p className="text-blue-900 dark:text-blue-300">{contaSelecionada.descricao}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 dark:text-blue-400 font-medium">Vencimento Atual:</span>
                                        <p className="text-blue-900 dark:text-blue-300">{new Date(contaSelecionada.dataVencimento).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 dark:text-blue-400 font-medium">Valor:</span>
                                        <p className="text-blue-900 dark:text-blue-300 font-bold">
                                            R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Formulário */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Nome do Fornecedor/Credor
                                    </label>
                                    <input
                                        type="text"
                                        value={novoCredorNome}
                                        onChange={(e) => setNovoCredorNome(e.target.value)}
                                        className="input-field"
                                        placeholder="Ex: Concessionária, locador, prestador..."
                                    />
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        Para contas com fornecedor cadastrado, este campo atualiza o nome do credor (contas manuais).
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Nova Data de Vencimento *
                                    </label>
                                    <input
                                        type="date"
                                        value={novaDataVencimento}
                                        onChange={(e) => setNovaDataVencimento(e.target.value)}
                                        required
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Método de Pagamento
                                    </label>
                                    <select
                                        value={meioPagamentoEdit}
                                        onChange={(e) => {
                                            setMeioPagamentoEdit(e.target.value);
                                            if (e.target.value !== 'CARTAO_CREDITO') setCartaoCreditoIdEdit('');
                                        }}
                                        className="select-field"
                                    >
                                        <option value="">Não informado</option>
                                        <option value="PIX">PIX</option>
                                        <option value="DINHEIRO">Cédulas</option>
                                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                        <option value="BOLETO">Boleto</option>
                                        <option value="TRANSFERENCIA">Transferência</option>
                                    </select>
                                </div>

                                {meioPagamentoEdit === 'CARTAO_CREDITO' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Cartão de Crédito *
                                        </label>
                                        <select
                                            value={cartaoCreditoIdEdit}
                                            onChange={(e) => setCartaoCreditoIdEdit(e.target.value)}
                                            className="select-field"
                                        >
                                            <option value="">Selecione...</option>
                                            {cartoesCredito.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nomeOuBanco} ({c.bandeira}) •••• {c.ultimosQuatroDigitos}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-amber-600 mt-1">
                                            A liquidação será feita pela fatura consolidada em Financeiro → Cartão de Crédito.
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Observações
                                    </label>
                                    <textarea
                                        value={novasObservacoes}
                                        onChange={(e) => setNovasObservacoes(e.target.value)}
                                        rows={4}
                                        className="textarea-field"
                                        placeholder="Motivo da alteração, novos acordos, etc..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button
                                onClick={handleCloseAtualizarModal}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleOpenConfirmAtualizar}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded-xl transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmar Atualização
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Conta a Pagar (manual, sem compra) */}
            {isNovaContaModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-dark-border bg-emerald-50 dark:bg-dark-elevated">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Nova Conta a Pagar</h2>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Conta que não vem de compra (mesma rota de contas fixas)</p>
                            </div>
                            <button
                                onClick={handleCloseNovaContaModal}
                                className="p-2 text-gray-400 dark:text-dark-muted hover:text-gray-600 dark:hover:text-dark-text hover:bg-white/80 dark:hover:bg-dark-hover rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de despesa *</label>
                                <select
                                    value={novaContaTipoDespesa}
                                    onChange={(e) => setNovaContaTipoDespesa(e.target.value as 'FORNECEDOR' | 'RH' | 'DESPESA_FIXA')}
                                    className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="FORNECEDOR">Fornecedores</option>
                                    <option value="RH">Recursos Humanos</option>
                                    <option value="DESPESA_FIXA">Despesas Variadas</option>
                                </select>
                            </div>

                            {novaContaTipoDespesa === 'FORNECEDOR' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Origem do fornecedor *</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNovaContaFornecedorModo('CADASTRADO')}
                                            className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                                                novaContaFornecedorModo === 'CADASTRADO'
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white text-gray-700 border-gray-300'
                                            }`}
                                        >
                                            Fornecedor cadastrado
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNovaContaFornecedorModo('NOVO')}
                                            className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                                                novaContaFornecedorModo === 'NOVO'
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : 'bg-white text-gray-700 border-gray-300'
                                            }`}
                                        >
                                            Novo fornecedor
                                        </button>
                                    </div>

                                    {novaContaFornecedorModo === 'CADASTRADO' ? (
                                        <select
                                            value={novaContaFornecedorId}
                                            onChange={(e) => setNovaContaFornecedorId(e.target.value)}
                                            className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                        >
                                            <option value="">Selecione o fornecedor...</option>
                                            {fornecedoresOptions.map((fornecedor) => (
                                                <option key={fornecedor.id} value={fornecedor.id}>
                                                    {fornecedor.nome}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Beneficiário / Credor *</label>
                                            <input
                                                type="text"
                                                value={novaContaCredor}
                                                onChange={(e) => setNovaContaCredor(e.target.value)}
                                                placeholder="Nome do novo fornecedor ou credor"
                                                className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {novaContaTipoDespesa === 'RH' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo RH *</label>
                                            <select
                                                value={novaContaRhSubtipo}
                                                onChange={(e) => setNovaContaRhSubtipo(e.target.value as 'ADIANTAMENTO' | 'VALE')}
                                                className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                            >
                                                <option value="ADIANTAMENTO">Adiantamento</option>
                                                <option value="VALE">Vale</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Funcionário *</label>
                                            <select
                                                value={novaContaFuncionarioId}
                                                onChange={(e) => setNovaContaFuncionarioId(e.target.value)}
                                                className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                            >
                                                <option value="">Selecione o funcionário...</option>
                                                {funcionariosOptions.map((funcionario) => (
                                                    <option key={funcionario.id} value={funcionario.id}>
                                                        {funcionario.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Desconto futuro *</label>
                                            <select
                                                value={novaContaRhDescontoTipo}
                                                onChange={(e) => setNovaContaRhDescontoTipo(e.target.value as 'UMA_VEZ' | 'PARCELADO')}
                                                className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                            >
                                                <option value="UMA_VEZ">1x</option>
                                                <option value="PARCELADO">Várias vezes</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Competência inicial *</label>
                                            <input
                                                type="month"
                                                value={novaContaRhReferencia}
                                                onChange={(e) => setNovaContaRhReferencia(e.target.value)}
                                                className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                        </div>
                                        {novaContaRhDescontoTipo === 'PARCELADO' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Parcelas *</label>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    step="1"
                                                    value={novaContaRhParcelas}
                                                    onChange={(e) => setNovaContaRhParcelas(e.target.value)}
                                                    className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {novaContaTipoDespesa === 'DESPESA_FIXA' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Beneficiário / Credor</label>
                                    <input
                                        type="text"
                                        value={novaContaCredor}
                                        onChange={(e) => setNovaContaCredor(e.target.value)}
                                        placeholder="Ex: Concessionária, locador, prestador..."
                                        className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição *</label>
                                <input
                                    type="text"
                                    value={novaContaDescricao}
                                    onChange={(e) => setNovaContaDescricao(e.target.value)}
                                    placeholder="Ex: Serviço de manutenção, Aluguel..."
                                    className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Classificação</label>
                                <select
                                    value={novaContaClassificacao}
                                    onChange={(e) => setNovaContaClassificacao(e.target.value)}
                                    className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    title="Usado em movimentações, fluxo de caixa e DRE (ex.: Impostos)"
                                >
                                    {CLASSIFICACOES_CONTA_PAGAR.map((op) => (
                                        <option key={op.value || 'vazio'} value={op.value}>{op.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Importante para movimentações, fluxo de caixa e DRE (ex.: Impostos)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento</label>
                                <select
                                    value={novaContaMeioPagamento}
                                    onChange={(e) => {
                                        setNovaContaMeioPagamento(e.target.value);
                                        if (e.target.value !== 'CARTAO_CREDITO') setNovaContaCartaoId('');
                                    }}
                                    className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="">Não informado</option>
                                    <option value="PIX">PIX</option>
                                    <option value="DINHEIRO">Cédulas</option>
                                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                    <option value="BOLETO">Boleto</option>
                                    <option value="TRANSFERENCIA">Transferência</option>
                                </select>
                            </div>
                            {novaContaMeioPagamento === 'CARTAO_CREDITO' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cartão de Crédito *</label>
                                    <select
                                        value={novaContaCartaoId}
                                        onChange={(e) => setNovaContaCartaoId(e.target.value)}
                                        className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="">Selecione...</option>
                                        {cartoesCredito.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.nomeOuBanco} ({c.bandeira}) •••• {c.ultimosQuatroDigitos}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={novaContaValor}
                                        onChange={(e) => setNovaContaValor(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0,00"
                                        className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vencimento *</label>
                                    <input
                                        type="date"
                                        value={novaContaVencimento}
                                        onChange={(e) => setNovaContaVencimento(e.target.value)}
                                        className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Juros (R$)</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={novaContaJuros}
                                        onChange={(e) => setNovaContaJuros(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0,00"
                                        className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Desconto (R$)</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={novaContaDesconto}
                                        onChange={(e) => setNovaContaDesconto(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0,00"
                                        className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800/60 p-4 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Valor a Registrar:</span>
                                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">R$ {formatBRL(valorARegistrarNovaConta)}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Observações</label>
                                <textarea
                                    value={novaContaObservacoes}
                                    onChange={(e) => setNovaContaObservacoes(e.target.value)}
                                    rows={2}
                                    className="select-field focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                            <button onClick={handleCloseNovaContaModal} className="btn-secondary">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCriarNovaConta}
                                disabled={salvandoNovaConta}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {salvandoNovaConta ? 'Salvando...' : 'Criar Conta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pagamento */}
            {isPagamentoModalOpen && contaSelecionada && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Registrar Pagamento</h2>
                                <p className="text-sm text-gray-600 mt-1">Dar baixa na conta a pagar</p>
                            </div>
                            <button
                                onClick={handleClosePagamentoModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Informações da Conta */}
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                                <h3 className="font-semibold text-blue-900 mb-3">Informações da Conta</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-blue-700 font-medium">Fornecedor:</span>
                                        <p className="text-blue-900 font-semibold">{contaSelecionada.fornecedorNome}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Descrição:</span>
                                        <p className="text-blue-900">{contaSelecionada.descricao}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Vencimento:</span>
                                        <p className="text-blue-900">{new Date(contaSelecionada.dataVencimento).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Valor Original:</span>
                                        <p className="text-blue-900 font-bold">
                                            R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Formulário */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Data do Pagamento *
                                    </label>
                                    <input
                                        type="date"
                                        value={dataPagamento}
                                        onChange={(e) => setDataPagamento(e.target.value)}
                                        required
                                        className="select-field focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Valor Pago (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        value={valorPago}
                                        onChange={(e) => setValorPago(e.target.value)}
                                        min="0"
                                        max={(contaSelecionada as any).tipo === 'RH' ? undefined : contaSelecionada.valor}
                                        step="0.01"
                                        required
                                        className="select-field focus:ring-red-500 focus:border-red-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Valor original: R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    {(contaSelecionada as any).tipo === 'RH' && (
                                        <p className="text-xs text-amber-700 mt-1">
                                            Para funcionário: pode registrar com desconto (ex.: faltas) e informar a justificativa no campo abaixo.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Meio de Pagamento
                                    </label>
                                    <select
                                        value={meioPagamento}
                                        onChange={(e) => setMeioPagamento(e.target.value)}
                                        className="select-field focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="PIX">PIX</option>
                                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                        <option value="BOLETO">Boleto</option>
                                        <option value="TRANSFERENCIA">Transferência</option>
                                        <option value="DINHEIRO">Cédulas</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Cartão de crédito: liquide pela aba Financeiro → Cartão de Crédito.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Juros (R$)
                                        </label>
                                        <input
                                            type="number"
                                            value={jurosPagamento}
                                            onChange={(e) => setJurosPagamento(e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="select-field focus:ring-red-500 focus:border-red-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Descontos (R$)
                                        </label>
                                        <input
                                            type="number"
                                            value={descontosPagamento}
                                            onChange={(e) => setDescontosPagamento(e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="select-field focus:ring-red-500 focus:border-red-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {(contaSelecionada as any).tipo === 'RH' ? 'Justificativa / Observações' : 'Observações'}
                                    </label>
                                    <textarea
                                        value={observacoesPagamento}
                                        onChange={(e) => setObservacoesPagamento(e.target.value)}
                                        rows={3}
                                        className="select-field focus:ring-red-500 focus:border-red-500"
                                        placeholder={(contaSelecionada as any).tipo === 'RH' ? 'Ex.: Desconto por falta no dia X; obrigatório se houver desconto' : 'Informações adicionais sobre o pagamento...'}
                                    />
                                </div>
                            </div>

                            {/* Resumo: Valor a Registrar = Valor Pago + Juros - Descontos */}
                            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 p-4 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-red-700">Valor a Registrar:</span>
                                    <span className="text-2xl font-bold text-red-700">
                                        R$ {formatBRL(valorARegistrarPagamento)}
                                    </span>
                                </div>
                                {(parseMoney(jurosPagamento) > 0 || parseMoney(descontosPagamento) > 0) && (
                                    <p className="text-xs text-red-600 mt-1">
                                        {formatBRL(parseMoney(valorPago))}
                                        {parseMoney(jurosPagamento) > 0 ? ` + ${formatBRL(parseMoney(jurosPagamento))} (juros)` : ''}
                                        {parseMoney(descontosPagamento) > 0 ? ` - ${formatBRL(parseMoney(descontosPagamento))} (descontos)` : ''}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                            <button
                                onClick={handleClosePagamentoModal}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleOpenConfirmPagamento}
                                className="btn-danger flex items-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AlertDialog de Confirmação */}
            <AlertDialog open={isConfirmDialogOpen} onOpenChange={handleCloseConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction === 'excluir'
                                ? 'Excluir conta'
                                : confirmAction === 'pagar'
                                    ? 'Confirmar Pagamento'
                                    : 'Confirmar Atualização'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction === 'excluir' && contaParaExcluir && (
                                <>
                                    Tem certeza que deseja apagar essa conta?
                                    <span className="block mt-2 text-sm">
                                        <span className="font-semibold">{contaParaExcluir.descricao}</span>
                                        {' '}— esta ação não pode ser desfeita.
                                    </span>
                                </>
                            )}
                            {confirmAction === 'pagar' && contaSelecionada && (
                                <>
                                    Confirmar o pagamento de{' '}
                                    <span className="font-bold text-red-600">
                                        R$ {formatBRL(valorARegistrarPagamento)}
                                    </span>
                                    {' '}para {contaSelecionada.fornecedorNome}?
                                </>
                            )}
                            {confirmAction === 'atualizar' && contaSelecionada && (
                                <>
                                    Confirmar a atualização da conta de {contaSelecionada.fornecedorNome}?
                                    <br />
                                    <span className="text-sm mt-2 block">
                                        Novo vencimento: <span className="font-semibold">{new Date(novaDataVencimento).toLocaleDateString('pt-BR')}</span>
                                    </span>
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={excluindoConta}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            disabled={excluindoConta}
                            className={
                                confirmAction === 'excluir'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : confirmAction === 'pagar'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-yellow-600 hover:bg-yellow-700'
                            }
                        >
                            {confirmAction === 'excluir'
                                ? (excluindoConta ? 'Excluindo...' : 'Sim, apagar')
                                : confirmAction === 'pagar'
                                    ? 'Confirmar Pagamento'
                                    : 'Confirmar Atualização'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de Agendamento de Pagamento */}
            {isAgendamentoModalOpen && contaSelecionada && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-md w-full">
                        {/* Header */}
                        <div className="modal-header bg-gradient-to-r from-blue-50 to-cyan-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Agendar Pagamento</h2>
                                <p className="text-sm text-gray-600 mt-1">Defina uma data para o pagamento</p>
                            </div>
                            <button
                                onClick={handleCloseAgendamentoModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="modal-body space-y-4">
                            {/* Informações da Conta */}
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                                <h3 className="font-semibold text-blue-900 mb-3">Informações da Conta</h3>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <div>
                                        <span className="text-blue-700 font-medium">Fornecedor:</span>
                                        <p className="text-blue-900 font-semibold">{contaSelecionada.fornecedorNome}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Descrição:</span>
                                        <p className="text-blue-900">{contaSelecionada.descricao}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Vencimento:</span>
                                        <p className="text-blue-900">{new Date(contaSelecionada.dataVencimento).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Valor:</span>
                                        <p className="text-blue-900 font-bold">
                                            R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Formulário */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Data de Agendamento *
                                </label>
                                <input
                                    type="date"
                                    value={dataAgendamento}
                                    onChange={(e) => setDataAgendamento(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    required
                                    className="select-field focus:ring-blue-500 focus:border-blue-500 w-full"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Selecione uma data futura para agendar o pagamento
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                            <button
                                onClick={handleCloseAgendamentoModal}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAgendarPagamento}
                                className="btn-primary flex items-center gap-2"
                                disabled={!dataAgendamento || new Date(dataAgendamento) < new Date()}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Agendar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContasAPagar;

