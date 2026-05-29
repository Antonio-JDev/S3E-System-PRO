import React, { useState, useEffect, useMemo, useContext } from 'react';
import { financeiroService } from '../services/financeiroService';
import { axiosApiService } from '../services/axiosApi';
import { vendasService, type Venda } from '../services/vendasService';
import { orcamentosService } from '../services/orcamentosService';
import { AuthContext } from '../contexts/AuthContext';
import { getUploadUrl } from '../config/api';
import { toast } from 'sonner';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { calcValorARegistrar, calcValorBaseFromEfetivo, formatBRL, parseMoney } from '../utils/financeiroValor';
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

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
interface ContaReceber {
    id: string;
    vendaId?: string;
    contaManual?: boolean;
    tipoManual?: 'ENTRADA' | 'OUTRAS_RECEITAS';
    pagadorNome?: string;
    numeroParcela: number;
    numeroDuplicata: string;
    numeroVenda?: string; // Número da venda (ex: VND-1234567890)
    numeroSequencialVenda?: number | null; // Número sequencial da venda (1, 2, 3...)
    numeroOS?: number | null; // Número sequencial da OS
    clienteNome: string;
    projetoTitulo: string;
    dataVencimento: string;
    valor: number;
    valorJuros?: number;
    valorDesconto?: number;
    valorRecebido?: number;
    dataPagamento?: string;
    status: 'Pendente' | 'Recebido' | 'Recebido Parcial' | 'Atrasado';
    observacoes?: string;
    statusObra?: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO' | null;
    projetoId?: string;
    venda?: any; // Objeto venda completo (opcional, usado internamente)
}

interface ItemVenda {
    id: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
}

interface VendaDetalhada {
    id: string;
    numeroVenda: string;
    dataVenda: string;
    valorTotal: number;
    formaPagamento: string;
    parcelas: number;
    vendedorNome?: string | null;
    cliente: {
        id: string;
        nome: string;
        email?: string;
        telefone?: string;
        endereco?: string;
        cidade?: string;
        estado?: string;
        cep?: string;
    };
    projeto?: {
        id: string;
        titulo: string;
        descricao?: string;
        dataInicio?: string;
        endereco?: string;
    };
    obra?: {
        id: string;
        nomeObra: string;
        status: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';
        dataInicioReal?: string;
        dataPrevistaFim?: string;
    };
    orcamento?: {
        id: string;
        items: ItemVenda[];
        orcamentistaNome?: string | null;
    };
}

interface ContasAReceberProps {
    toggleSidebar?: () => void;
    setAbaAtiva?: (aba: string) => void;
}

// ==================== COMPONENT ====================
const ContasAReceber: React.FC<ContasAReceberProps> = ({ toggleSidebar, setAbaAtiva }) => {
    const { user } = useContext(AuthContext)!;
    const userRole = user?.role?.toLowerCase();
    const canManageManualReceber = Boolean(
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
    const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchValorExato, setSearchValorExato] = useState('');
    const [searchValorMin, setSearchValorMin] = useState('');
    const [searchValorMax, setSearchValorMax] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('Em aberto'); // Padrão: apenas Pendente e Atrasado
    const [filterPeriodo, setFilterPeriodo] = useState<string>('MesAtual');
    const [{ dataInicio, dataFim }, setFiltroDatas] = useState(() => getMesAtualRange());
    
    // Modal de Baixa
    const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState<ContaReceber | null>(null);
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [valorRecebido, setValorRecebido] = useState('0');
    const [jurosBaixa, setJurosBaixa] = useState('0');
    const [descontoBaixa, setDescontoBaixa] = useState('0');
    const [observacoesBaixa, setObservacoesBaixa] = useState('');
    const [meioPagamentoBaixa, setMeioPagamentoBaixa] = useState<string>('PIX');
    
    // Modal de Visualização de Venda (usando o mesmo formato do componente Vendas)
    const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
    const [vendaParaVisualizar, setVendaParaVisualizar] = useState<Venda | null>(null);
    const [detalhesVenda, setDetalhesVenda] = useState<any>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    
    // Lista de vendas para calcular número sequencial
    const [vendas, setVendas] = useState<Venda[]>([]);
    
    // AlertDialog de Confirmação (recebimento / exclusão)
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmDialogTipo, setConfirmDialogTipo] = useState<'receber' | 'excluir' | null>(null);
    const [contaParaExcluir, setContaParaExcluir] = useState<ContaReceber | null>(null);
    const [excluindoConta, setExcluindoConta] = useState(false);

    // Modal Histórico de recebimentos da duplicata
    const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
    const [historicoConta, setHistoricoConta] = useState<ContaReceber | null>(null);
    const [historicoData, setHistoricoData] = useState<{ conta: any; recebimentos: any[] } | null>(null);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    // Modal Nova Conta a Receber (receita manual: Entradas / Outras Receitas)
    const [isNovaContaModalOpen, setIsNovaContaModalOpen] = useState(false);
    const [novaContaClassificacao, setNovaContaClassificacao] = useState<'ENTRADA' | 'OUTRAS_RECEITAS'>('ENTRADA');
    const [novaContaPagador, setNovaContaPagador] = useState('');
    const [novaContaDescricao, setNovaContaDescricao] = useState('');
    const [novaContaValor, setNovaContaValor] = useState('');
    const [novaContaJuros, setNovaContaJuros] = useState('0');
    const [novaContaDesconto, setNovaContaDesconto] = useState('0');
    const [novaContaVencimento, setNovaContaVencimento] = useState(new Date().toISOString().split('T')[0]);
    const [novaContaObservacoes, setNovaContaObservacoes] = useState('');
    const [salvandoNovaConta, setSalvandoNovaConta] = useState(false);
    const [isEditarContaModalOpen, setIsEditarContaModalOpen] = useState(false);
    const [contaEditando, setContaEditando] = useState<ContaReceber | null>(null);
    const [editContaClassificacao, setEditContaClassificacao] = useState<'ENTRADA' | 'OUTRAS_RECEITAS'>('ENTRADA');
    const [editContaPagador, setEditContaPagador] = useState('');
    const [editContaDescricao, setEditContaDescricao] = useState('');
    const [editContaValor, setEditContaValor] = useState('');
    const [editContaVencimento, setEditContaVencimento] = useState(new Date().toISOString().split('T')[0]);
    const [editContaObservacoes, setEditContaObservacoes] = useState('');
    const [salvandoEdicaoConta, setSalvandoEdicaoConta] = useState(false);

    // Carregar dados
    useEffect(() => {
        // Carregar vendas primeiro para calcular número sequencial
        loadVendas().then(() => {
            loadContasReceber();
        });
    }, []);

    // Sincronizar “atalhos” de período com os campos de data (calendário)
    useEffect(() => {
        const hoje = new Date();
        if (filterPeriodo === 'MesAtual') {
            setFiltroDatas(getMesAtualRange());
            return;
        }
        if (filterPeriodo === 'Todos') {
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
            const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
            setFiltroDatas({ dataInicio: '', dataFim: toISODate(ontem) });
            return;
        }
    }, [filterPeriodo]);

    const loadContasReceber = async () => {
        setLoading(true);
        try {
            console.log('📥 Carregando contas a receber do backend...');
            
            // Garantir que as vendas estão carregadas
            let vendasParaCalcular = vendas;
            if (vendas.length === 0) {
                vendasParaCalcular = await loadVendas();
            }
            
            const response = await financeiroService.listarContasReceber();
            
            if (response.success && response.data) {
                // Ordenar vendas por data de criação para calcular número sequencial
                const vendasOrdenadas = [...vendasParaCalcular].sort((a, b) => {
                    const dataA = new Date(a.dataVenda || a.createdAt || 0).getTime();
                    const dataB = new Date(b.dataVenda || b.createdAt || 0).getTime();
                    return dataA - dataB; // Mais antiga primeiro
                });

                // Processar e enriquecer dados
                const contasProcessadas = response.data.map((conta: any) => {
                    // Detectar atraso
                    const isAtrasada = new Date(conta.dataVencimento) < new Date() && conta.status === 'Pendente';

                    // Extrair informações da venda e orçamento (contas de venda) ou pagador (contas manuais)
                    const venda = conta.venda || {};
                    const orcamento = venda.orcamento || {};
                    const cliente = conta.clientePagador || conta.cliente || venda.cliente || orcamento.cliente || {};
                    const clienteNome = cliente?.nome ?? conta.pagadorNome ?? 'Cliente não informado';

                    // Número do pedido de venda: usar numeroSequencial da venda (igual à coluna N° na lista de vendas)
                    const vendaId = conta.vendaId || venda.id;
                    const numeroSequencialVenda = venda?.numeroSequencial != null
                        ? venda.numeroSequencial
                        : (vendaId ? (() => {
                            const indiceVenda = vendasOrdenadas.findIndex((v: any) => v.id === vendaId);
                            return indiceVenda >= 0 ? indiceVenda + 1 : null;
                        })() : null);

                    // Identificar se é entrada (numeroParcela = 0) ou parcela normal; contas manuais tipo ENTRADA
                    const isEntrada = conta.tipo === 'ENTRADA' || conta.numeroParcela === 0 || conta.descricao?.includes('Entrada');
                    const numeroParcela = conta.numeroParcela ?? 1;

                    return {
                        id: conta.id,
                        vendaId: vendaId || undefined,
                        contaManual: !vendaId,
                        tipoManual: conta.tipo === 'OUTRAS_RECEITAS' ? 'OUTRAS_RECEITAS' : 'ENTRADA',
                        pagadorNome: conta.pagadorNome || undefined,
                        numeroParcela: numeroParcela,
                        isEntrada: isEntrada,
                        numeroDuplicata: isEntrada ? 'ENTRADA' : `DUP-${numeroParcela.toString().padStart(3, '0')}`,
                        numeroVenda: venda.numeroVenda || (conta.tipo !== 'VENDA' ? conta.tipo : 'N/A'),
                        numeroSequencialVenda: numeroSequencialVenda,
                        numeroOS: orcamento.numeroSequencial || null,
                        clienteNome,
                        projetoTitulo: conta.descricao || orcamento.titulo || 'Projeto',
                        dataVencimento: conta.dataVencimento,
                        valor: conta.valorParcela || conta.valor || 0,
                        valorJuros: conta.valorJuros ?? 0,
                        valorDesconto: conta.valorDesconto ?? 0,
                        valorRecebido: conta.valorRecebido ?? (conta.status === 'Pago' ? conta.valorParcela : undefined),
                        dataPagamento: conta.dataPagamento,
                        status: isAtrasada ? 'Atrasado' : (conta.status === 'Pago' ? 'Recebido' : (conta.status === 'Recebido Parcial' ? 'Recebido Parcial' : conta.status)),
                        observacoes: conta.observacoes,
                        venda: conta.venda,
                        totalParcelas: conta.totalParcelas || venda.parcelas || 1
                    };
                });
                
                setContasReceber(contasProcessadas);
                console.log(`✅ ${contasProcessadas.length} contas a receber carregadas`);
            } else {
                console.warn('⚠️ Erro ao carregar contas:', response.error);
                setContasReceber([]);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar contas a receber:', error);
            setContasReceber([]);
        } finally {
            setLoading(false);
        }
    };

    const loadVendas = async (): Promise<Venda[]> => {
        try {
            const response = await vendasService.listarVendas({ limit: 1000 });
            if (response.success && response.data) {
                const vendasList = response.data.vendas || [];
                setVendas(vendasList);
                return vendasList; // Retornar para uso imediato
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            return [];
        }
    };

    // Filtrar contas
    const contasFiltradas = useMemo(() => {
        let filtered = [...contasReceber];
        const valorExato = searchValorExato ? parseFloat(searchValorExato.replace(',', '.')) : undefined;
        const valorMin = searchValorMin ? parseFloat(searchValorMin.replace(',', '.')) : undefined;
        const valorMax = searchValorMax ? parseFloat(searchValorMax.replace(',', '.')) : undefined;
        const hasFiltroValor =
            (valorExato !== undefined && !isNaN(valorExato)) ||
            (valorMin !== undefined && !isNaN(valorMin)) ||
            (valorMax !== undefined && !isNaN(valorMax));

        // Filtro por status: "Em aberto" = Pendente, Atrasado e Recebido Parcial (ainda tem saldo a receber)
        if (filterStatus === 'Em aberto') {
            filtered = filtered.filter(conta => conta.status === 'Pendente' || conta.status === 'Atrasado' || conta.status === 'Recebido Parcial');
        } else if (filterStatus !== 'Todos') {
            filtered = filtered.filter(conta => conta.status === filterStatus);
        }

        // Filtro por período (calendário)
        // Quando há filtro por valor, o período é ignorado para buscar em todos os períodos.
        if (!hasFiltroValor) {
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

            // Regra complementar do “atalho” Vencidas
            if (filterPeriodo === 'Vencidas') {
                const hoje = new Date();
                filtered = filtered.filter((conta) => new Date(conta.dataVencimento) < hoje && conta.status !== 'Recebido');
            }
        }

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

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(conta =>
                conta.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conta.projetoTitulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conta.numeroDuplicata.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [
        contasReceber,
        filterStatus,
        filterPeriodo,
        dataInicio,
        dataFim,
        searchTerm,
        searchValorExato,
        searchValorMin,
        searchValorMax
    ]);

    // Estatísticas
    const estatisticas = useMemo(() => {
        const totalReceber = contasFiltradas
            .filter(c => c.status === 'Pendente' || c.status === 'Atrasado' || c.status === 'Recebido Parcial')
            .reduce((sum, c) => sum + (c.valor - (c.valorRecebido || 0)), 0);
        
        const totalRecebido = contasReceber
            .filter(c => c.status === 'Recebido')
            .reduce((sum, c) => sum + (c.valorRecebido ?? c.valor), 0);
        
        const totalAtrasado = contasFiltradas
            .filter(c => c.status === 'Atrasado')
            .reduce((sum, c) => sum + c.valor, 0);
        
        const qtdPendente = contasFiltradas.filter(c => c.status === 'Pendente').length;
        const qtdAtrasado = contasFiltradas.filter(c => c.status === 'Atrasado').length;

        return {
            totalReceber,
            totalRecebido,
            totalAtrasado,
            qtdPendente,
            qtdAtrasado
        };
    }, [contasReceber, contasFiltradas]);

    // Handlers
    const handleOpenBaixaModal = (conta: ContaReceber) => {
        setContaSelecionada(conta);
        const saldoRestante = conta.valor - (conta.valorRecebido || 0);
        const jurosPrevistos = conta.valorJuros ?? 0;
        const descontoPrevisto = conta.valorDesconto ?? 0;
        const valorBaseSaldo = calcValorBaseFromEfetivo(
            saldoRestante > 0 ? saldoRestante : conta.valor,
            jurosPrevistos,
            descontoPrevisto
        );
        setValorRecebido(valorBaseSaldo > 0 ? valorBaseSaldo.toFixed(2) : '0');
        setJurosBaixa(jurosPrevistos > 0 ? String(jurosPrevistos) : '0');
        setDescontoBaixa(descontoPrevisto > 0 ? String(descontoPrevisto) : '0');
        setDataPagamento(new Date().toISOString().split('T')[0]);
        setObservacoesBaixa('');
        setMeioPagamentoBaixa('PIX');
        setIsBaixaModalOpen(true);
    };

    const handleCloseBaixaModal = () => {
        setIsBaixaModalOpen(false);
        setContaSelecionada(null);
        setValorRecebido('0');
        setJurosBaixa('0');
        setDescontoBaixa('0');
        setObservacoesBaixa('');
    };

    const valorARegistrarBaixa = useMemo(
        () => calcValorARegistrar(valorRecebido, jurosBaixa, descontoBaixa),
        [valorRecebido, jurosBaixa, descontoBaixa]
    );

    const valorARegistrarNovaConta = useMemo(
        () => calcValorARegistrar(novaContaValor, novaContaJuros, novaContaDesconto),
        [novaContaValor, novaContaJuros, novaContaDesconto]
    );

    const handleOpenConfirmBaixa = () => {
        setConfirmDialogTipo('receber');
        setIsConfirmDialogOpen(true);
    };

    const handleOpenConfirmExcluir = (conta: ContaReceber) => {
        if (!conta.contaManual) {
            toast.error('Somente contas manuais podem ser excluídas.');
            return;
        }
        setContaParaExcluir(conta);
        setConfirmDialogTipo('excluir');
        setIsConfirmDialogOpen(true);
    };

    const handleCloseConfirmDialog = (open: boolean) => {
        setIsConfirmDialogOpen(open);
        if (!open) {
            setConfirmDialogTipo(null);
            setContaParaExcluir(null);
        }
    };

    const executarExclusaoConta = async () => {
        if (!contaParaExcluir) return;
        setExcluindoConta(true);
        try {
            const response = await financeiroService.excluirContaReceber(contaParaExcluir.id);
            if (!response.success) {
                toast.error(response.error || 'Não foi possível excluir a conta.');
                return;
            }
            toast.success('Conta a receber excluída com sucesso!');
            handleCloseConfirmDialog(false);
            await loadContasReceber();
        } catch (error) {
            console.error('Erro ao excluir conta a receber:', error);
            toast.error('Erro ao excluir conta a receber.');
        } finally {
            setExcluindoConta(false);
        }
    };

    const handleCloseNovaContaModal = () => {
        setIsNovaContaModalOpen(false);
        setNovaContaClassificacao('ENTRADA');
        setNovaContaPagador('');
        setNovaContaDescricao('');
        setNovaContaValor('');
        setNovaContaJuros('0');
        setNovaContaDesconto('0');
        setNovaContaVencimento(new Date().toISOString().split('T')[0]);
        setNovaContaObservacoes('');
    };

    const handleOpenEditarContaModal = (conta: ContaReceber) => {
        if (!conta.contaManual) {
            toast.error('Somente contas manuais podem ser editadas.');
            return;
        }
        setContaEditando(conta);
        setEditContaClassificacao(conta.tipoManual || 'ENTRADA');
        setEditContaPagador(conta.pagadorNome || conta.clienteNome || '');
        setEditContaDescricao(conta.projetoTitulo || '');
        setEditContaValor(String(conta.valor ?? ''));
        setEditContaVencimento(conta.dataVencimento ? new Date(conta.dataVencimento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setEditContaObservacoes(conta.observacoes || '');
        setIsEditarContaModalOpen(true);
    };

    const handleCloseEditarContaModal = () => {
        setIsEditarContaModalOpen(false);
        setContaEditando(null);
        setEditContaClassificacao('ENTRADA');
        setEditContaPagador('');
        setEditContaDescricao('');
        setEditContaValor('');
        setEditContaVencimento(new Date().toISOString().split('T')[0]);
        setEditContaObservacoes('');
    };

    const handleSalvarEdicaoConta = async () => {
        if (!contaEditando) return;
        const descricao = editContaDescricao.trim();
        const valor = parseFloat(String(editContaValor).replace(',', '.'));
        if (!descricao || !editContaVencimento) {
            toast.error('Preencha descrição e data de vencimento.');
            return;
        }
        if (isNaN(valor) || valor <= 0) {
            toast.error('Informe um valor válido.');
            return;
        }

        setSalvandoEdicaoConta(true);
        try {
            const response = await financeiroService.atualizarContaReceber(contaEditando.id, {
                tipo: editContaClassificacao,
                pagadorNome: editContaPagador.trim() || undefined,
                descricao,
                valorParcela: valor,
                dataVencimento: editContaVencimento,
                observacoes: editContaObservacoes.trim() || undefined
            });
            if (!response.success) {
                toast.error(response.error || 'Não foi possível atualizar a conta.');
                return;
            }
            toast.success('Conta a receber atualizada com sucesso!');
            handleCloseEditarContaModal();
            await loadContasReceber();
        } catch (error) {
            console.error('Erro ao atualizar conta a receber:', error);
            toast.error('Erro ao atualizar conta a receber.');
        } finally {
            setSalvandoEdicaoConta(false);
        }
    };

    const handleCriarNovaContaReceber = async () => {
        const descricao = novaContaDescricao.trim();
        const valor = parseMoney(novaContaValor);
        const juros = parseMoney(novaContaJuros);
        const desconto = parseMoney(novaContaDesconto);
        const total = calcValorARegistrar(valor, juros, desconto);
        if (!descricao || !novaContaVencimento) {
            toast.error('Preencha Descrição e Data de vencimento.');
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
        setSalvandoNovaConta(true);
        try {
            const response = await financeiroService.criarContaReceber({
                tipo: novaContaClassificacao,
                pagadorNome: novaContaPagador.trim() || undefined,
                descricao,
                valorParcela: valor,
                valorJuros: juros > 0 ? juros : undefined,
                valorDesconto: desconto > 0 ? desconto : undefined,
                dataVencimento: novaContaVencimento,
                observacoes: novaContaObservacoes.trim() || undefined
            });
            if (response.success) {
                toast.success('Conta a receber criada com sucesso!', {
                    description: 'Você já pode registrar o recebimento na lista.'
                });
                handleCloseNovaContaModal();
                await loadContasReceber();
            } else {
                toast.error(response.error || 'Erro ao criar conta a receber.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Erro ao criar conta a receber.');
        } finally {
            setSalvandoNovaConta(false);
        }
    };

    const handleBaixaRecebimento = async () => {
        if (!contaSelecionada) return;

        const base = parseMoney(valorRecebido);
        const juros = parseMoney(jurosBaixa);
        const desconto = parseMoney(descontoBaixa);
        const total = calcValorARegistrar(base, juros, desconto);
        if (total <= 0) {
            toast.error('Valor a registrar deve ser maior que zero.');
            return;
        }

        try {
            console.log('💰 Registrando recebimento...');
            const response = await financeiroService.darBaixaRecebimento(contaSelecionada.id, {
                dataPagamento,
                valorRecebido: base,
                valorJuros: juros > 0 ? juros : undefined,
                valorDesconto: desconto > 0 ? desconto : undefined,
                observacoes: observacoesBaixa,
                meioPagamento: meioPagamentoBaixa
            });

            if (response.success) {
                toast.success('✅ Recebimento registrado com sucesso!', {
                    description: `Recebido R$ ${formatBRL(total)} de ${contaSelecionada.clienteNome}.`
                });
                handleCloseBaixaModal();
                // Recarregar lista
                await loadContasReceber();
            } else {
                toast.error('❌ Erro ao registrar recebimento', {
                    description: response.error || 'Tente novamente.'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao dar baixa:', error);
            toast.error('❌ Erro ao registrar recebimento', {
                description: 'Erro de conexão com o servidor.'
            });
        }
    };

    // Função para abrir modal de visualização e buscar detalhes da venda (mesma do componente Vendas)
    const handleVisualizarVenda = async (vendaId: string) => {
        // Encontrar a venda na lista
        const vendaEncontrada = vendas.find(v => v.id === vendaId);
        if (vendaEncontrada) {
            setVendaParaVisualizar(vendaEncontrada);
        } else {
            // Se não encontrar na lista, buscar diretamente
            const response = await vendasService.buscarVenda(vendaId);
            if (response.success && response.data) {
                setVendaParaVisualizar(response.data);
            } else {
                toast.error('Erro ao carregar venda');
                return;
            }
        }
        
        setIsVisualizarModalOpen(true);
        setLoadingDetalhes(true);

        try {
            // Buscar detalhes completos da venda
            const vendaRes = await vendasService.buscarVenda(vendaId);
            
            if (vendaRes.success && vendaRes.data) {
                const vendaCompleta = vendaRes.data;
                
                // Buscar detalhes do orçamento se necessário
                let orcamentoCompleto = vendaCompleta.orcamento;
                if (vendaCompleta.orcamentoId && !orcamentoCompleto?.items) {
                    try {
                        const orcamentoRes = await orcamentosService.buscar(vendaCompleta.orcamentoId);
                        if (orcamentoRes.success && orcamentoRes.data) {
                            orcamentoCompleto = orcamentoRes.data;
                        }
                    } catch (error) {
                        console.error('Erro ao buscar detalhes do orçamento:', error);
                    }
                }

                setDetalhesVenda({
                    ...vendaCompleta,
                    orcamento: orcamentoCompleto
                });
            } else {
                toast.error('Erro ao carregar detalhes da venda');
                setDetalhesVenda(null);
            }
        } catch (error) {
            console.error('Erro ao buscar detalhes da venda:', error);
            toast.error('Erro ao carregar detalhes da venda');
            setDetalhesVenda(null);
        } finally {
            setLoadingDetalhes(false);
        }
    };

    const handleCloseVisualizarModal = () => {
        setIsVisualizarModalOpen(false);
        setVendaParaVisualizar(null);
        setDetalhesVenda(null);
    };

    const handleAbrirHistorico = async (conta: ContaReceber) => {
        setHistoricoConta(conta);
        setIsHistoricoModalOpen(true);
        setLoadingHistorico(true);
        setHistoricoData(null);
        try {
            const res = await financeiroService.historicoRecebimentos(conta.id);
            if (res.success && res.data) {
                setHistoricoData(res.data);
            } else {
                toast.error(res.error || 'Erro ao carregar histórico');
            }
        } catch (e) {
            toast.error('Erro ao carregar histórico');
        } finally {
            setLoadingHistorico(false);
        }
    };

    const handleCloseHistoricoModal = () => {
        setIsHistoricoModalOpen(false);
        setHistoricoConta(null);
        setHistoricoData(null);
    };

    // Fechar modais com ESC
    useEscapeKey(isBaixaModalOpen, handleCloseBaixaModal);
    useEscapeKey(isVisualizarModalOpen, handleCloseVisualizarModal);
    useEscapeKey(isHistoricoModalOpen, handleCloseHistoricoModal);
    useEscapeKey(isConfirmDialogOpen, () => setIsConfirmDialogOpen(false));
    useEscapeKey(isNovaContaModalOpen, handleCloseNovaContaModal);
    useEscapeKey(isEditarContaModalOpen, handleCloseEditarContaModal);

    const getStatusObraDisplay = (statusObra?: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO' | null) => {
        if (!statusObra) {
            return { text: 'Sem Obra', class: 'bg-gray-100 text-gray-600', icon: '—' };
        }
        
        switch (statusObra) {
            case 'BACKLOG':
                return { text: 'Backlog', class: 'bg-gray-100 text-gray-700', icon: '📋' };
            case 'A_FAZER':
                return { text: 'A Fazer', class: 'bg-blue-100 text-blue-700', icon: '📝' };
            case 'ANDAMENTO':
                return { text: 'Em Andamento', class: 'bg-orange-100 text-orange-700', icon: '🚧' };
            case 'CONCLUIDO':
                return { text: 'Concluída', class: 'bg-green-100 text-green-700', icon: '✅' };
            default:
                return { text: 'Sem Obra', class: 'bg-gray-100 text-gray-600', icon: '—' };
        }
    };

    const handleGerarPDFVenda = () => {
        if (!detalhesVenda) return;

        try {
            const statusObra = detalhesVenda.obra ? getStatusObraDisplay(detalhesVenda.obra.status) : null;
            // Número igual ao da lista de vendas (coluna Nº): numeroSequencial, fallback numeroVenda/id
            const numeroPedido = detalhesVenda.numeroSequencial ?? detalhesVenda.numeroVenda ?? detalhesVenda.id;
            const nomePedido = detalhesVenda.orcamento?.titulo || 'Pedido de Venda';
            // Logo: path relativo ao backend (em produção /app/uploads no servidor → servido como /uploads)
            const logoUrl = getUploadUrl('/uploads/logos/logo-1762808549243-748106383.png');

            const conteudoHTML = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>Venda - N° ${numeroPedido}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                        .brand { text-align: center; margin-bottom: 24px; }
                        .brand img { max-height: 64px; max-width: 200px; object-fit: contain; }
                        .brand h2 { margin: 8px 0 2px 0; font-size: 18px; color: #1e293b; }
                        .brand .tagline { margin: 0; font-size: 12px; color: #64748b; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #16a34a; padding-bottom: 20px; }
                        .header .numero-pedido { font-size: 24px; font-weight: bold; color: #15803d; margin: 0 0 4px 0; }
                        .header .nome-pedido { font-size: 14px; color: #475569; margin: 0 0 12px 0; }
                        .header p { margin: 5px 0; color: #64748b; }
                        .section { margin: 20px 0; padding: 15px; border: 2px solid #e5e7eb; border-radius: 8px; }
                        .section h2 { margin: 0 0 15px 0; color: #15803d; font-size: 18px; border-bottom: 2px solid #dcfce7; padding-bottom: 8px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                        .field { margin-bottom: 10px; }
                        .field label { font-weight: bold; color: #475569; display: block; font-size: 12px; }
                        .field p { margin: 3px 0 0 0; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; border: 1px solid #cbd5e1; }
                        td { padding: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
                        .resumo { background: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 20px; }
                        .resumo-item { display: flex; justify-content: space-between; margin: 8px 0; padding: 5px 0; }
                        .resumo-total { border-top: 2px solid #16a34a; padding-top: 10px; margin-top: 10px; font-size: 18px; font-weight: bold; color: #15803d; }
                        .badge { display: inline-block; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; }
                        .badge-obra { background: #fed7aa; color: #9a3412; }
                        @media print { body { margin: 0; } .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="brand">
                        ${logoUrl ? `<img src="${logoUrl}" alt="S3E" onerror="this.style.display='none'" />` : ''}
                        <h2>S3E ENGENHARIA LTDA.</h2>
                        <p class="tagline">Soluções em Eficiência de Energia Elétrica</p>
                    </div>
                    <div class="header">
                        <h1>💰 VENDA - RECIBO</h1>
                        <p class="numero-pedido">Nº ${numeroPedido}</p>
                        <p class="nome-pedido">${nomePedido}</p>
                        <p><strong>Data da Venda:</strong> ${new Date(detalhesVenda.dataVenda).toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div class="section">
                        <h2>👤 Dados do Cliente</h2>
                        <div class="grid">
                            <div class="field">
                                <label>Nome:</label>
                                <p>${detalhesVenda.cliente?.nome || detalhesVenda.orcamento?.cliente?.nome || 'N/A'}</p>
                            </div>
                            ${detalhesVenda.cliente?.telefone ? `
                                <div class="field">
                                    <label>Telefone:</label>
                                    <p>${detalhesVenda.cliente.telefone}</p>
                                </div>
                            ` : ''}
                            ${detalhesVenda.cliente?.email ? `
                                <div class="field">
                                    <label>Email:</label>
                                    <p>${detalhesVenda.cliente.email}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${detalhesVenda.cliente?.endereco ? `
                            <div class="field">
                                <label>Endereço:</label>
                                <p>${detalhesVenda.cliente.endereco}${detalhesVenda.cliente.cidade ? ', ' + detalhesVenda.cliente.cidade : ''}${detalhesVenda.cliente.estado ? ' - ' + detalhesVenda.cliente.estado : ''}${detalhesVenda.cliente.cep ? ' | CEP: ' + detalhesVenda.cliente.cep : ''}</p>
                            </div>
                        ` : ''}
                    </div>

                    ${detalhesVenda.projeto ? `
                        <div class="section">
                            <h2>📋 Informações do Projeto</h2>
                            <div class="field">
                                <label>Título:</label>
                                <p>${detalhesVenda.projeto.titulo}</p>
                            </div>
                            ${detalhesVenda.projeto.descricao ? `
                                <div class="field">
                                    <label>Descrição:</label>
                                    <p>${detalhesVenda.projeto.descricao}</p>
                                </div>
                            ` : ''}
                            ${detalhesVenda.projeto.dataInicio ? `
                                <div class="field">
                                    <label>Data de Início:</label>
                                    <p>${new Date(detalhesVenda.projeto.dataInicio).toLocaleDateString('pt-BR')}</p>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    ${detalhesVenda.obra ? `
                        <div class="section" style="background: #fff7ed; border-color: #fb923c;">
                            <h2 style="color: #9a3412;">🏗️ Status da Obra</h2>
                            <div class="grid">
                                <div class="field">
                                    <label>Nome da Obra:</label>
                                    <p>${detalhesVenda.obra.nomeObra}</p>
                                </div>
                                <div class="field">
                                    <label>Status:</label>
                                    <p><span class="badge badge-obra">${statusObra?.icon} ${statusObra?.text}</span></p>
                                </div>
                                ${detalhesVenda.obra.dataInicioReal ? `
                                    <div class="field">
                                        <label>Data de Início Real:</label>
                                        <p>${new Date(detalhesVenda.obra.dataInicioReal).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                ` : ''}
                                ${detalhesVenda.obra.dataPrevistaFim ? `
                                    <div class="field">
                                        <label>Previsão de Término:</label>
                                        <p>${new Date(detalhesVenda.obra.dataPrevistaFim).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}

                    ${detalhesVenda.orcamento && detalhesVenda.orcamento.items && detalhesVenda.orcamento.items.length > 0 ? `
                        <div class="section">
                            <h2>📦 Itens Vendidos</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 50%;">Item</th>
                                        <th style="width: 15%; text-align: center;">Qtd</th>
                                        <th style="width: 17.5%; text-align: right;">Valor Unit.</th>
                                        <th style="width: 17.5%; text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${detalhesVenda.orcamento.items.map((item: any) => {
                                        const quantidade = item.quantidade || 0;
                                        const precoUnit = item.precoUnit || item.precoUnitario || (item.subtotal / (item.quantidade || 1)) || 0;
                                        const valorTotal = item.subtotal || (quantidade * precoUnit);
                                        return `
                                            <tr>
                                                <td>${item.material?.nome || item.servico?.nome || item.kit?.nome || item.descricao || 'Item sem nome'}</td>
                                                <td style="text-align: center;">${quantidade}</td>
                                                <td style="text-align: right;">R$ ${precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                <td style="text-align: right; font-weight: bold;">R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <div class="resumo">
                        <h2 style="margin: 0 0 15px 0; color: #15803d;">💰 Resumo da Venda</h2>
                        <div class="resumo-item">
                            <span>Forma de Pagamento:</span>
                            <span style="font-weight: bold;">${detalhesVenda.formaPagamento}</span>
                        </div>
                        <div class="resumo-item">
                            <span>Parcelas:</span>
                            <span style="font-weight: bold;">${detalhesVenda.numeroParcelas || 1}x</span>
                        </div>
                        <div class="resumo-item resumo-total">
                            <span>VALOR TOTAL:</span>
                            <span>R$ ${detalhesVenda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

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
            case 'Recebido':
                return 'bg-green-100 text-green-800 ring-1 ring-green-200 dark:bg-green-900/30 dark:text-green-300';
            case 'Recebido Parcial':
                return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
            case 'Pendente':
                return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'Atrasado':
                return 'bg-red-100 text-red-800 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const isVencida = (dataVencimento: string, status: string) => {
        if (status === 'Recebido') return false;
        return new Date(dataVencimento) < new Date();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 dark:border-green-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando contas a receber...</p>
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
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Contas a Receber</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gestão de recebimentos e parcelas</p>
                    </div>
                </div>
                <div className="flex gap-3">
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
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2"
                    >
                        <CurrencyDollarIcon className="w-4 h-4" />
                        Nova Conta a Receber
                    </button>
                    <button
                        onClick={loadContasReceber}
                        className="btn-success flex items-center gap-2"
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
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">A Receber</p>
                            <p className="text-2xl font-bold text-green-600">
                                R$ {estatisticas.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{estatisticas.qtdPendente} pendente(s)</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Recebido</p>
                            <p className="text-2xl font-bold text-blue-600">
                                R$ {estatisticas.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                            <CalendarIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Atrasado</p>
                            <p className="text-2xl font-bold text-red-600">
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

            {/* Filtros */}
            <div className="card-primary mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="md:col-span-1">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por cliente, projeto ou duplicata..."
                                className="input-field pl-10"
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <input
                            type="text"
                            value={searchValorExato}
                            onChange={(e) => setSearchValorExato(e.target.value)}
                            placeholder="Valor exato"
                            className="input-field"
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <input
                            type="text"
                            value={searchValorMin}
                            onChange={(e) => setSearchValorMin(e.target.value)}
                            placeholder="Valor mínimo"
                            className="input-field"
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <input
                            type="text"
                            value={searchValorMax}
                            onChange={(e) => setSearchValorMax(e.target.value)}
                            placeholder="Valor máximo"
                            className="input-field"
                        />
                    </div>
                    <div className="lg:col-span-1">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="select-field"
                        >
                            <option value="Em aberto">Em aberto (Pendente + Atrasado + Parcial)</option>
                            <option value="Todos">Todos os Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Recebido Parcial">Recebido Parcial</option>
                            <option value="Recebido">Recebido</option>
                            <option value="Atrasado">Atrasado</option>
                        </select>
                    </div>
                    <div className="lg:col-span-1">
                        <select
                            value={filterPeriodo}
                            onChange={(e) => setFilterPeriodo(e.target.value)}
                            className="select-field"
                            disabled={Boolean(searchValorExato || searchValorMin || searchValorMax)}
                        >
                            <option value="MesAtual">Mês Atual</option>
                            <option value="Todos">Todos os Períodos</option>
                            <option value="Vencidas">Vencidas</option>
                            <option value="Próximo30Dias">Próximos 30 Dias</option>
                            <option value="Personalizado">Personalizado</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">De</label>
                        <input
                            type="date"
                            value={dataInicio}
                            onChange={(e) => {
                                setFiltroDatas((prev) => ({ ...prev, dataInicio: e.target.value }));
                                setFilterPeriodo('Personalizado');
                            }}
                            className="select-field"
                            disabled={Boolean(searchValorExato || searchValorMin || searchValorMax)}
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
                            className="select-field"
                            disabled={Boolean(searchValorExato || searchValorMin || searchValorMax)}
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {searchValorExato || searchValorMin || searchValorMax
                        ? 'Com filtro de valor preenchido, o período é ignorado e a busca considera todos os períodos.'
                        : 'Alterar o período atualiza automaticamente as estatísticas e a lista.'}
                </p>
            </div>

            {/* Tabela de Contas */}
            <div className="card-primary overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Parcela / Venda
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Cliente / OS
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Vencimento
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Valor
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Status Obra
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
                                            <p className="text-sm text-gray-400 mt-1">Ajuste os filtros ou aguarde novas vendas</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                contasFiltradas.map((conta) => (
                                    <tr key={conta.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {conta.isEntrada ? (
                                                        <span className="flex items-center gap-1">
                                                            <span className="text-blue-600">💰</span>
                                                            <span>ENTRADA</span>
                                                        </span>
                                                    ) : (
                                                        conta.numeroDuplicata
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {conta.isEntrada 
                                                        ? 'Entrada da venda' 
                                                        : `Parcela ${conta.numeroParcela}${conta.totalParcelas ? `/${conta.totalParcelas}` : ''}`}
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                                    {conta.numeroSequencialVenda 
                                                        ? `Venda #${conta.numeroSequencialVenda}` 
                                                        : conta.numeroVenda && conta.numeroVenda !== 'N/A' 
                                                            ? conta.numeroVenda 
                                                            : conta.vendaId ? `Venda: ${conta.vendaId}` : 'Conta manual'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {conta.clienteNome}
                                                </p>
                                                {conta.numeroOS ? (
                                                    <p className="text-sm text-blue-600 font-semibold mt-1">
                                                        OS-{conta.numeroOS}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-gray-600">{conta.projetoTitulo}</p>
                                                )}
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
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-lg font-bold text-gray-900">
                                                R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            {conta.valorRecebido && conta.valorRecebido !== conta.valor && (
                                                <p className="text-xs text-green-600 mt-1">
                                                    Recebido: R$ {conta.valorRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusClass(conta.status)}`}>
                                                {conta.status === 'Recebido' && '✅ '}
                                                {conta.status === 'Recebido Parcial' && '💳 '}
                                                {conta.status === 'Pendente' && '⏳ '}
                                                {conta.status === 'Atrasado' && '⚠️ '}
                                                {conta.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {(() => {
                                                const statusObra = getStatusObraDisplay(conta.statusObra);
                                                return (
                                                    <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${statusObra.class}`}>
                                                        {statusObra.icon} {statusObra.text}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {conta.status !== 'Recebido' && (
                                                    <button
                                                        onClick={() => handleOpenBaixaModal(conta)}
                                                        className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-semibold"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                        Dar Baixa
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleAbrirHistorico(conta)}
                                                    className="flex items-center gap-1 px-3 py-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors text-sm font-semibold"
                                                    title="Histórico de recebimentos"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Histórico
                                                </button>
                                                <button
                                                    onClick={() => conta.vendaId && handleVisualizarVenda(conta.vendaId)}
                                                    disabled={!conta.vendaId}
                                                    className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-semibold"
                                                    title="Visualizar Venda"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                                {canManageManualReceber && conta.contaManual && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditarContaModal(conta)}
                                                            className="p-2 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 transition-colors"
                                                            title="Editar conta manual"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenConfirmExcluir(conta)}
                                                            className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors"
                                                            title="Excluir conta manual"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </>
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

            {/* Modal de Visualização de Venda - Modal Completo (igual ao componente Vendas) */}
            {isVisualizarModalOpen && vendaParaVisualizar && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-4">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <EyeIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Detalhes da Venda</h3>
                                    <p className="text-green-100 text-sm mt-1">Informações completas da venda</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseVisualizarModal}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6 space-y-6">
                            {loadingDetalhes ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Carregando detalhes da venda...</p>
                                </div>
                            ) : detalhesVenda ? (
                                <>
                                    {/* Informações Gerais */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Nome Completo do Cliente
                                            </h4>
                                            <p className="text-lg text-gray-900 dark:text-white font-semibold">
                                                {detalhesVenda.cliente?.nome || detalhesVenda.orcamento?.cliente?.nome || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Número do Orçamento
                                            </h4>
                                            <p className="text-lg text-gray-900 dark:text-white font-semibold">
                                                {detalhesVenda.orcamento?.numeroSequencial 
                                                    ? `Orçamento ${detalhesVenda.orcamento.numeroSequencial}` 
                                                    : detalhesVenda.orcamento?.numero || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Data de Emissão
                                            </h4>
                                            <p className="text-lg text-gray-900 dark:text-white font-semibold">
                                                {new Date(detalhesVenda.dataVenda).toLocaleDateString('pt-BR', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Vendedor
                                            </h4>
                                            <p className="text-lg text-gray-900 dark:text-white font-semibold">
                                                {detalhesVenda.vendedorNome || detalhesVenda.orcamento?.orcamentistaNome || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Número do Pedido de Venda
                                            </h4>
                                            <p className="text-lg text-gray-900 dark:text-white font-semibold">
                                                N° {detalhesVenda.numeroSequencial ?? detalhesVenda.numeroVenda ?? '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Endereço da Obra */}
                                    {(detalhesVenda.orcamento?.enderecoObra || detalhesVenda.cliente?.endereco) && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                <span>📍</span>
                                                Endereço da Obra
                                            </h4>
                                            <p className="text-gray-900 dark:text-white">
                                                {detalhesVenda.orcamento?.enderecoObra || detalhesVenda.cliente?.endereco || 'N/A'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Tabela de Materiais */}
                                    {detalhesVenda.orcamento?.items && detalhesVenda.orcamento.items.length > 0 && (
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                                                Materiais do Orçamento
                                            </h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 dark:bg-gray-700">
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                                Material/Serviço
                                                            </th>
                                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                                NCM
                                                            </th>
                                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                                Quantidade
                                                            </th>
                                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                                Valor Unitário
                                                            </th>
                                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                                Valor Total
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detalhesVenda.orcamento.items.map((item: any, index: number) => {
                                                            const quantidade = item.quantidade || 0;
                                                            const valorVenda = item.material?.valorVenda;
                                                            const precoUnit = valorVenda || item.precoUnit || item.precoUnitario || (item.subtotal / (item.quantidade || 1)) || 0;
                                                            const valorTotal = item.subtotal || (quantidade * precoUnit);
                                                            const ncm = item.cotacao?.ncm || item.material?.ncm || '-';
                                                            const vendaDireta = item.vendaDiretaFornecedor;
                                                            return (
                                                                <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        <div>
                                                                            {item.material?.nome || item.servico?.nome || item.kit?.nome || item.descricao || 'Item sem nome'}
                                                                            {vendaDireta && (
                                                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded text-xs font-medium" title="Não entra em contas a receber, estoque nem NF-e">
                                                                                    Venda direta fornecedor
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        {ncm}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        {quantidade} {item.unidadeMedida || 'UN'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        R$ {precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Totais e Frete */}
                                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Subtotal:
                                                </span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    R$ {(detalhesVenda.orcamento?.precoVenda || detalhesVenda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Custo de Frete:
                                                </span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    R$ {(detalhesVenda.orcamento?.custoFrete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="pt-3 border-t-2 border-green-300 dark:border-green-700 flex justify-between items-center">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    Valor Total:
                                                </span>
                                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    R$ {detalhesVenda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Condições de Pagamento - ATUALIZADO */}
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6">
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <span className="text-2xl">💳</span>
                                            Condições de Pagamento Registradas
                                        </h4>
                                        
                                        {/* Resumo Financeiro */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Forma de Pagamento</p>
                                                <p className="text-base font-bold text-gray-900 dark:text-white">
                                                    {detalhesVenda.formaPagamento || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Valor Total</p>
                                                <p className="text-base font-bold text-green-600 dark:text-green-400">
                                                    R$ {detalhesVenda.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Valor de Entrada</p>
                                                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                                                    R$ {(detalhesVenda.valorEntrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Valor de Venda</p>
                                                <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                                                    R$ {((detalhesVenda.valorTotal || 0) - (detalhesVenda.valorEntrada || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Informações de Parcelamento */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Número de Parcelas</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {detalhesVenda.numeroParcelas || detalhesVenda.parcelas || 1}x
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Valor por Parcela</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                    R$ {(((detalhesVenda.valorTotal || 0) - (detalhesVenda.valorEntrada || 0)) / (detalhesVenda.numeroParcelas || detalhesVenda.parcelas || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Status da Venda</p>
                                                {(() => {
                                                    const contas = detalhesVenda.contasReceber || [];
                                                    const totalContas = contas.length;
                                                    const qtdTotalmentePagas = contas.filter((c: any) => c.status === 'Pago' || c.status === 'Recebido').length;
                                                    const temPagoOuParcial = contas.some((c: any) => c.status === 'Pago' || c.status === 'Recebido' || c.status === 'Recebido Parcial');
                                                    let statusExibicao = 'Pendente';
                                                    let statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
                                                    if (totalContas > 0) {
                                                        if (qtdTotalmentePagas === totalContas) {
                                                            statusExibicao = 'Concluída';
                                                            statusClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
                                                        } else if (temPagoOuParcial) {
                                                            statusExibicao = 'Pago Parcial';
                                                            statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${statusClass}`}>
                                                            {statusExibicao === 'Concluída' && '✅ '}
                                                            {statusExibicao === 'Pago Parcial' && '💳 '}
                                                            {statusExibicao === 'Pendente' && '⏳ '}
                                                            {statusExibicao}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Tabela de Entrada e Parcelas (Contas a Receber) */}
                                        {detalhesVenda.contasReceber && detalhesVenda.contasReceber.length > 0 && (
                                            <div className="mt-4">
                                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                                    📋 Detalhamento da Entrada e Parcelas
                                                </h5>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-lg">
                                                        <thead>
                                                            <tr className="bg-purple-100 dark:bg-purple-900/50">
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                                                                    Parcela
                                                                </th>
                                                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                                                                    Valor
                                                                </th>
                                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                                                                    Vencimento
                                                                </th>
                                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                                                                    Status
                                                                </th>
                                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 border border-purple-200 dark:border-purple-700">
                                                                    Data Pagamento
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {detalhesVenda.contasReceber
                                                                .sort((a: any, b: any) => {
                                                                    // Ordenar: entrada (numeroParcela = 0) primeiro, depois parcelas normais
                                                                    const parcelaA = a.numeroParcela || 0;
                                                                    const parcelaB = b.numeroParcela || 0;
                                                                    return parcelaA - parcelaB;
                                                                })
                                                                .map((conta: any, index: number) => {
                                                                    const isEntrada = conta.numeroParcela === 0 || conta.descricao?.includes('Entrada');
                                                                    const isPago = conta.status === 'Pago' || conta.status === 'Recebido';
                                                                    const isAtrasado = !isPago && new Date(conta.dataVencimento) < new Date();
                                                                    const statusClass = isPago
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                        : isAtrasado
                                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
                                                                    const statusText = isPago ? 'Pago' : isAtrasado ? 'Atrasado' : 'Pendente';
                                                                    const totalParcelas = detalhesVenda.numeroParcelas || detalhesVenda.parcelas || 
                                                                        detalhesVenda.contasReceber.filter((c: any) => (c.numeroParcela || 0) > 0).length;
                                                                    
                                                                    return (
                                                                        <tr key={conta.id || index} className={`hover:bg-purple-50 dark:hover:bg-purple-900/20 ${isEntrada ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                                                            <td className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white border border-purple-200 dark:border-purple-700">
                                                                                {isEntrada ? (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <span className="text-blue-600 dark:text-blue-400">💰</span>
                                                                                        <span>Entrada</span>
                                                                                    </span>
                                                                                ) : (
                                                                                    `Parcela ${conta.numeroParcela || index + 1}${totalParcelas ? `/${totalParcelas}` : ''}`
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-white text-right border border-purple-200 dark:border-purple-700">
                                                                                R$ {(conta.valorParcela || conta.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-center border border-purple-200 dark:border-purple-700">
                                                                                {new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-center border border-purple-200 dark:border-purple-700">
                                                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${statusClass}`}>
                                                                                    {isPago && '✅ '}
                                                                                    {isAtrasado && '⚠️ '}
                                                                                    {!isPago && !isAtrasado && '⏳ '}
                                                                                    {statusText}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 text-center border border-purple-200 dark:border-purple-700">
                                                                                {conta.dataPagamento 
                                                                                    ? new Date(conta.dataPagamento).toLocaleDateString('pt-BR')
                                                                                    : '-'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Condições Especiais (se houver) */}
                                        {detalhesVenda.orcamento?.condicoesEspeciaisPagamento && (
                                            <div className="mt-4 pt-4 border-t border-purple-300 dark:border-purple-700">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📝 Condições Especiais de Pagamento:</p>
                                                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700 whitespace-pre-wrap">
                                                    {detalhesVenda.orcamento.condicoesEspeciaisPagamento}
                                                </p>
                                            </div>
                                        )}

                                        {/* Observações da Venda (se houver) */}
                                        {detalhesVenda.observacoes && (
                                            <div className="mt-4 pt-4 border-t border-purple-300 dark:border-purple-700">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📌 Observações da Venda:</p>
                                                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700 whitespace-pre-wrap">
                                                    {detalhesVenda.observacoes}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Observações */}
                                    {(detalhesVenda.observacoes || detalhesVenda.orcamento?.observacoesComerciais) && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                <span>📝</span>
                                                Observações
                                            </h4>
                                            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                                {detalhesVenda.observacoes || detalhesVenda.orcamento?.observacoesComerciais}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-600 dark:text-gray-400">Erro ao carregar detalhes da venda</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={handleCloseVisualizarModal}
                                className="px-6 py-3 bg-white dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 transition-all font-semibold"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Baixa */}
            {isBaixaModalOpen && contaSelecionada && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-100" style={{ backgroundColor: '#0a1a2f' }}>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Dar Baixa no Recebimento</h2>
                                <p className="text-sm text-gray-200 mt-1">Registrar o recebimento da parcela</p>
                            </div>
                            <button
                                onClick={handleCloseBaixaModal}
                                className="p-2 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl"
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
                                        <span className="text-blue-700 font-medium">Parcela:</span>
                                        <p className="text-blue-900 font-semibold">{contaSelecionada.numeroDuplicata}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Cliente:</span>
                                        <p className="text-blue-900 font-semibold">{contaSelecionada.clienteNome}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Vencimento:</span>
                                        <p className="text-blue-900">{new Date(contaSelecionada.dataVencimento).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Valor da parcela:</span>
                                        <p className="text-blue-900 font-bold">
                                            R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                                {((contaSelecionada.valorJuros ?? 0) > 0 || (contaSelecionada.valorDesconto ?? 0) > 0) && (
                                    <p className="text-xs text-blue-800 mt-2 pt-2 border-t border-blue-200">
                                        Previsto na conta:{' '}
                                        {(contaSelecionada.valorJuros ?? 0) > 0 && (
                                            <span>+ R$ {formatBRL(contaSelecionada.valorJuros!)} juros </span>
                                        )}
                                        {(contaSelecionada.valorDesconto ?? 0) > 0 && (
                                            <span>- R$ {formatBRL(contaSelecionada.valorDesconto!)} desconto </span>
                                        )}
                                        (campos abaixo já preenchidos; você pode alterar)
                                    </p>
                                )}
                            </div>

                            {/* Formulário */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Data do Recebimento *
                                    </label>
                                    <input
                                        type="date"
                                        value={dataPagamento}
                                        onChange={(e) => setDataPagamento(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Valor Recebido (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={valorRecebido}
                                        onChange={(e) => setValorRecebido(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {contaSelecionada.valorRecebido ? (
                                            <>Valor da parcela: R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Já recebido: R$ {(contaSelecionada.valorRecebido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Saldo restante: R$ {(contaSelecionada.valor - (contaSelecionada.valorRecebido || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                                        ) : (
                                            <>Valor da parcela: R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Meio de Pagamento
                                    </label>
                                    <select
                                        value={meioPagamentoBaixa}
                                        onChange={(e) => setMeioPagamentoBaixa(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                        <option value="PIX">PIX</option>
                                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                        <option value="BOLETO">Boleto</option>
                                        <option value="TRANSFERENCIA">Transferência</option>
                                        <option value="DINHEIRO">Dinheiro</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Juros (R$)
                                        </label>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={jurosBaixa}
                                            onChange={(e) => setJurosBaixa(e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Desconto (R$)
                                        </label>
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            value={descontoBaixa}
                                            onChange={(e) => setDescontoBaixa(e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Observações
                                    </label>
                                    <textarea
                                        value={observacoesBaixa}
                                        onChange={(e) => setObservacoesBaixa(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="Informações adicionais sobre o recebimento..."
                                    />
                                </div>
                            </div>

                            {/* Resumo */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-4 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-green-700">Valor a Registrar:</span>
                                    <span className="text-2xl font-bold text-green-700">
                                        R$ {formatBRL(valorARegistrarBaixa)}
                                    </span>
                                </div>
                                {(parseMoney(jurosBaixa) > 0 || parseMoney(descontoBaixa) > 0) && (
                                    <p className="text-xs text-green-600 mt-1">
                                        {formatBRL(parseMoney(valorRecebido))}
                                        {parseMoney(jurosBaixa) > 0 ? ` + ${formatBRL(parseMoney(jurosBaixa))} (juros)` : ''}
                                        {parseMoney(descontoBaixa) > 0 ? ` - ${formatBRL(parseMoney(descontoBaixa))} (desconto)` : ''}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                            <button
                                onClick={handleCloseBaixaModal}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleOpenConfirmBaixa}
                                className="btn-success flex items-center gap-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                Confirmar Recebimento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Histórico de recebimentos da duplicata */}
            {isHistoricoModalOpen && historicoConta && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100" style={{ backgroundColor: '#0a1a2f' }}>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Histórico de Recebimentos</h2>
                                <p className="text-sm text-gray-200 mt-1">
                                    {historicoConta.numeroDuplicata} • {historicoConta.clienteNome}
                                </p>
                            </div>
                            <button
                                onClick={handleCloseHistoricoModal}
                                className="p-2 text-gray-300 hover:text-white hover:bg-white/20 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {loadingHistorico ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Carregando histórico...</p>
                                </div>
                            ) : historicoData ? (
                                <>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300 font-medium">Valor da parcela:</span>
                                                <p className="text-blue-900 dark:text-white font-bold">R$ {Number(historicoData.conta?.valorParcela || historicoConta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300 font-medium">Já recebido:</span>
                                                <p className="text-green-700 dark:text-green-400 font-bold">R$ {Number(historicoData.conta?.valorRecebido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300 font-medium">Saldo restante:</span>
                                                <p className="text-amber-700 dark:text-amber-400 font-bold">R$ {Number(historicoData.conta?.saldoRestante ?? (historicoConta.valor - (historicoConta.valorRecebido || 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Registro de pagamentos</h3>
                                        {historicoData.recebimentos && historicoData.recebimentos.length > 0 ? (
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Data</th>
                                                            <th className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">Valor</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Meio</th>
                                                            <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Observação</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {historicoData.recebimentos.map((rec: any) => (
                                                            <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="px-4 py-3 text-gray-900 dark:text-white">
                                                                    {new Date(rec.dataPagamento).toLocaleDateString('pt-BR')}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-semibold text-green-700 dark:text-green-400">
                                                                    R$ {Number(rec.valorPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{rec.meioPagamento || '-'}</td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={rec.observacoes}>{rec.observacoes || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 dark:text-gray-400 py-4">Nenhum recebimento registrado ainda.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 py-4">Não foi possível carregar o histórico.</p>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end">
                            <button onClick={handleCloseHistoricoModal} className="btn-secondary">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Conta a Receber (receita manual: Entradas / Outras Receitas) */}
            {isNovaContaModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Nova Conta a Receber</h2>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Receita que não vem de venda (Entradas / Outras Receitas)</p>
                            </div>
                            <button
                                onClick={handleCloseNovaContaModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 dark:hover:bg-dark-card rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Classificação *</label>
                                <select
                                    value={novaContaClassificacao}
                                    onChange={(e) => setNovaContaClassificacao(e.target.value as 'ENTRADA' | 'OUTRAS_RECEITAS')}
                                    className="select-field focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="ENTRADA">Entradas</option>
                                    <option value="OUTRAS_RECEITAS">Outras Receitas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Pagador (opcional)</label>
                                <input
                                    type="text"
                                    value={novaContaPagador}
                                    onChange={(e) => setNovaContaPagador(e.target.value)}
                                    placeholder="Nome de quem vai pagar"
                                    className="select-field focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Descrição *</label>
                                <input
                                    type="text"
                                    value={novaContaDescricao}
                                    onChange={(e) => setNovaContaDescricao(e.target.value)}
                                    placeholder="Ex: Reembolso, Rendimento, Serviço avulso..."
                                    className="select-field focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={novaContaValor}
                                        onChange={(e) => setNovaContaValor(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0,00"
                                        className="select-field focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Vencimento *</label>
                                    <input
                                        type="date"
                                        value={novaContaVencimento}
                                        onChange={(e) => setNovaContaVencimento(e.target.value)}
                                        className="select-field focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Juros (R$)</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={novaContaJuros}
                                        onChange={(e) => setNovaContaJuros(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0,00"
                                        className="select-field focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Desconto (R$)</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={novaContaDesconto}
                                        onChange={(e) => setNovaContaDesconto(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        placeholder="0,00"
                                        className="select-field focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-4 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-green-700">Valor a Registrar:</span>
                                    <span className="text-xl font-bold text-green-700">R$ {formatBRL(valorARegistrarNovaConta)}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Observação</label>
                                <textarea
                                    value={novaContaObservacoes}
                                    onChange={(e) => setNovaContaObservacoes(e.target.value)}
                                    rows={2}
                                    className="select-field focus:ring-green-500 focus:border-green-500"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-dark-border">
                            <button onClick={handleCloseNovaContaModal} className="btn-secondary">
                                Cancelar
                            </button>
                            <button
                                onClick={handleCriarNovaContaReceber}
                                disabled={salvandoNovaConta}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {salvandoNovaConta ? 'Salvando...' : 'Criar Conta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditarContaModalOpen && contaEditando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-teal-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Editar Conta a Receber</h2>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Atualize os dados da conta manual</p>
                            </div>
                            <button
                                onClick={handleCloseEditarContaModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 dark:hover:bg-dark-card rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Classificação *</label>
                                <select
                                    value={editContaClassificacao}
                                    onChange={(e) => setEditContaClassificacao(e.target.value as 'ENTRADA' | 'OUTRAS_RECEITAS')}
                                    className="select-field focus:ring-cyan-500 focus:border-cyan-500"
                                >
                                    <option value="ENTRADA">Entradas</option>
                                    <option value="OUTRAS_RECEITAS">Outras Receitas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Pagador (opcional)</label>
                                <input
                                    type="text"
                                    value={editContaPagador}
                                    onChange={(e) => setEditContaPagador(e.target.value)}
                                    className="select-field focus:ring-cyan-500 focus:border-cyan-500"
                                    placeholder="Nome do pagador"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Descrição *</label>
                                <input
                                    type="text"
                                    value={editContaDescricao}
                                    onChange={(e) => setEditContaDescricao(e.target.value)}
                                    className="select-field focus:ring-cyan-500 focus:border-cyan-500"
                                    placeholder="Descrição da conta"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        value={editContaValor}
                                        onChange={(e) => setEditContaValor(e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className="select-field focus:ring-cyan-500 focus:border-cyan-500"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Vencimento *</label>
                                    <input
                                        type="date"
                                        value={editContaVencimento}
                                        onChange={(e) => setEditContaVencimento(e.target.value)}
                                        className="select-field focus:ring-cyan-500 focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Observação</label>
                                <textarea
                                    value={editContaObservacoes}
                                    onChange={(e) => setEditContaObservacoes(e.target.value)}
                                    rows={2}
                                    className="select-field focus:ring-cyan-500 focus:border-cyan-500"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-dark-border">
                            <button onClick={handleCloseEditarContaModal} className="btn-secondary">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSalvarEdicaoConta}
                                disabled={salvandoEdicaoConta}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {salvandoEdicaoConta ? 'Salvando...' : 'Salvar Alterações'}
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
                            {confirmDialogTipo === 'excluir' ? 'Excluir conta' : 'Confirmar Recebimento'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialogTipo === 'excluir' && contaParaExcluir && (
                                <>
                                    Tem certeza que deseja apagar essa conta?
                                    <span className="block mt-2 text-sm">
                                        <span className="font-semibold">{contaParaExcluir.projetoTitulo}</span>
                                        {' '}— esta ação não pode ser desfeita.
                                    </span>
                                </>
                            )}
                            {confirmDialogTipo === 'receber' && contaSelecionada && (
                                <>
                                    Confirmar o recebimento de{' '}
                                    <span className="font-bold text-green-600">
                                        R$ {formatBRL(valorARegistrarBaixa)}
                                    </span>
                                    {' '}de {contaSelecionada.clienteNome}?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={excluindoConta}>
                            Cancelar
                        </AlertDialogCancel>
                        {confirmDialogTipo === 'excluir' ? (
                            <AlertDialogAction
                                onClick={executarExclusaoConta}
                                disabled={excluindoConta}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {excluindoConta ? 'Excluindo...' : 'Sim, apagar'}
                            </AlertDialogAction>
                        ) : (
                            <AlertDialogAction
                                onClick={() => {
                                    handleCloseConfirmDialog(false);
                                    handleBaixaRecebimento();
                                }}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Confirmar Recebimento
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ContasAReceber;

