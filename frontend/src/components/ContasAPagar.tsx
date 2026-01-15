import React, { useState, useEffect, useMemo } from 'react';
import { financeiroService } from '../services/financeiroService';
import { axiosApiService } from '../services/axiosApi';
import { toast } from 'sonner';
import { useEscapeKey } from '../hooks/useEscapeKey';
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

// ==================== TYPES ====================
interface CompraBasica {
    id: string;
    numeroSequencial: number;
    numeroNF: string;
}

interface ContaPagar {
    id: string;
    compraId?: string;
    fornecedorId?: string;
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

interface ContasAPagarProps {
    toggleSidebar?: () => void;
    setAbaAtiva?: (aba: string) => void;
}

// ==================== COMPONENT ====================
const ContasAPagar: React.FC<ContasAPagarProps> = ({ toggleSidebar, setAbaAtiva }) => {
    // Estados
    const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('Todos');
    const [filterPeriodo, setFilterPeriodo] = useState<string>('Todos');
    const [filterTipo, setFilterTipo] = useState<string>('TODOS'); // TODOS, FORNECEDOR, RH, DESPESA_FIXA
    const [gerandoContas, setGerandoContas] = useState(false);
    
    // Modal de Pagamento
    const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | null>(null);
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [valorPago, setValorPago] = useState('0');
    const [observacoesPagamento, setObservacoesPagamento] = useState('');
    
    // Modal de Visualização de Compra
    const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
    const [compraDetalhada, setCompraDetalhada] = useState<CompraDetalhada | null>(null);
    const [loadingCompra, setLoadingCompra] = useState(false);
    
    // Modal de Atualização de Conta
    const [isAtualizarModalOpen, setIsAtualizarModalOpen] = useState(false);
    const [novaDataVencimento, setNovaDataVencimento] = useState('');
    const [novasObservacoes, setNovasObservacoes] = useState('');
    
    // AlertDialog de Confirmação
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'pagar' | 'atualizar' | null>(null);
    
    // Modal de Agendamento
    const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false);
    const [dataAgendamento, setDataAgendamento] = useState(new Date().toISOString().split('T')[0]);

    // Handlers de Modal - Declarados antes do useEscapeKey para evitar erro de inicialização
    const handleClosePagamentoModal = () => {
        setIsPagamentoModalOpen(false);
        setContaSelecionada(null);
        setValorPago('0');
        setObservacoesPagamento('');
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

    // Carregar dados
    useEffect(() => {
        loadContasPagar();
    }, []);

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
                    temCompra: Array.isArray(response.data) && response.data[0]?.compra ? 'sim' : 'não'
                });
                
                // Processar e enriquecer dados
                const contasProcessadas = response.data.map((conta: any) => {
                    // Detectar atraso
                    const isAtrasada = new Date(conta.dataVencimento) < new Date() && conta.status === 'Pendente';
                    
                    // Debug: verificar se compra está vindo do backend
                    if (conta.compraId && !conta.compra) {
                        console.warn(`⚠️ Conta ${conta.id} tem compraId (${conta.compraId}) mas não tem objeto compra`);
                    }
                    
                    return {
                        id: conta.id,
                        compraId: conta.compraId,
                        fornecedorId: conta.fornecedorId,
                        fornecedorNome: conta.fornecedorNome || conta.fornecedor?.nome || 'Fornecedor não informado',
                        numeroParcela: conta.numeroParcela || 1,
                        descricao: conta.descricao || `Parcela ${conta.numeroParcela || 1}`,
                        dataVencimento: conta.dataVencimento,
                        dataAgendamento: conta.dataAgendamento,
                        valor: conta.valorParcela || conta.valor || 0,
                        valorPago: conta.valorPago,
                        dataPagamento: conta.dataPagamento,
                        status: isAtrasada ? 'Atrasado' : conta.status,
                        observacoes: conta.observacoes,
                        tipo: conta.tipo || 'FORNECEDOR', // Adicionar tipo
                        compra: conta.compra // Incluir dados da compra (numeroSequencial, numeroNF, etc)
                    };
                });
                
                setContasPagar(contasProcessadas);
                console.log(`✅ ${contasProcessadas.length} contas a pagar carregadas`);
                console.log('📦 Exemplo de conta com compra:', contasProcessadas.find(c => c.compra));
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
        if (filterStatus !== 'Todos') {
            filtered = filtered.filter(conta => conta.status === filterStatus);
        }

        // Filtro por período
        if (filterPeriodo !== 'Todos') {
            const hoje = new Date();
            filtered = filtered.filter(conta => {
                const vencimento = new Date(conta.dataVencimento);
                if (filterPeriodo === 'Vencidas') {
                    return vencimento < hoje && conta.status !== 'Pago';
                } else if (filterPeriodo === 'Próximo30Dias') {
                    const proximos30 = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
                    return vencimento >= hoje && vencimento <= proximos30;
                }
                return true;
            });
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(conta =>
                conta.fornecedorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conta.descricao.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [contasPagar, filterStatus, filterPeriodo, searchTerm, filterTipo]);

    // Estatísticas
    const estatisticas = useMemo(() => {
        const totalPagar = contasFiltradas
            .filter(c => c.status === 'Pendente' || c.status === 'Atrasado')
            .reduce((sum, c) => sum + c.valor, 0);
        
        const totalPago = contasPagar
            .filter(c => c.status === 'Pago')
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
    }, [contasPagar, contasFiltradas]);

    // Handlers
    const handleOpenPagamentoModal = (conta: ContaPagar) => {
        setContaSelecionada(conta);
        setValorPago(conta.valor.toString());
        setDataPagamento(new Date().toISOString().split('T')[0]);
        setObservacoesPagamento('');
        setIsPagamentoModalOpen(true);
    };

    const handleOpenConfirmPagamento = () => {
        setConfirmAction('pagar');
        setIsConfirmDialogOpen(true);
    };

    const handlePagarConta = async () => {
        if (!contaSelecionada) return;

        try {
            console.log('💳 Registrando pagamento...');
            const response = await financeiroService.pagarContaPagar(contaSelecionada.id, {
                dataPagamento,
                valorPago: parseFloat(valorPago),
                observacoes: observacoesPagamento
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
            const response = await axiosApiService.put<any>(`/api/contas-pagar/${contaSelecionada.id}/vencimento`, {
                dataVencimento: novaDataVencimento,
                observacoes: novasObservacoes
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
                    description: response.error || 'Tente novamente.'
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
        setIsConfirmDialogOpen(false);
        if (confirmAction === 'pagar') {
            handlePagarConta();
        } else if (confirmAction === 'atualizar') {
            handleAtualizarConta();
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando contas a pagar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    {toggleSidebar && (
                        <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft">
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Contas a Pagar</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gestão de pagamentos e fornecedores</p>
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

            {/* Alerta informativo sobre geração de contas */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h4 className="font-bold text-blue-900 mb-1">💡 Como Funciona a Classificação</h4>
                        <p className="text-sm text-blue-800">
                            <strong>FORNECEDORES:</strong> Contas geradas automaticamente ao importar compras XML. <br/>
                            <strong>RECURSOS HUMANOS:</strong> Clique em "+ Gerar" para criar contas de salários dos funcionários cadastrados. <br/>
                            <strong>DESPESAS FIXAS:</strong> Clique em "+ Gerar" para criar contas das despesas fixas cadastradas.
                        </p>
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
                                <p className="text-sm font-semibold text-gray-600 uppercase">Despesas Fixas</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="select-field focus:ring-red-500"
                        >
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
                            <option value="Todos">Todos os Períodos</option>
                            <option value="Vencidas">Vencidas</option>
                            <option value="Próximo30Dias">Próximos 30 Dias</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabela de Contas */}
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
                                    <tr key={conta.id} className="hover:bg-gray-50 transition-colors">
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
                                                        <button
                                                            onClick={() => handleOpenAtualizarModal(conta)}
                                                            className="flex items-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-semibold"
                                                            title="Atualizar Conta"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
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
                                        max={contaSelecionada.valor}
                                        step="0.01"
                                        required
                                        className="select-field focus:ring-red-500 focus:border-red-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Valor original: R$ {contaSelecionada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Observações
                                    </label>
                                    <textarea
                                        value={observacoesPagamento}
                                        onChange={(e) => setObservacoesPagamento(e.target.value)}
                                        rows={3}
                                        className="select-field focus:ring-red-500 focus:border-red-500"
                                        placeholder="Informações adicionais sobre o pagamento..."
                                    />
                                </div>
                            </div>

                            {/* Resumo */}
                            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 p-4 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-red-700">Valor a Registrar:</span>
                                    <span className="text-2xl font-bold text-red-700">
                                        R$ {parseFloat(valorPago || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
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
            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction === 'pagar' ? 'Confirmar Pagamento' : 'Confirmar Atualização'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction === 'pagar' && contaSelecionada && (
                                <>
                                    Confirmar o pagamento de{' '}
                                    <span className="font-bold text-red-600">
                                        R$ {parseFloat(valorPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                        <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirmAction}
                            className={confirmAction === 'pagar' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                        >
                            {confirmAction === 'pagar' ? 'Confirmar Pagamento' : 'Confirmar Atualização'}
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

