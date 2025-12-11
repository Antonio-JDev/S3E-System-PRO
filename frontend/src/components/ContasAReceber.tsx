import React, { useState, useEffect, useMemo, useContext } from 'react';
import { financeiroService } from '../services/financeiroService';
import { axiosApiService } from '../services/axiosApi';
import { vendasService, type Venda } from '../services/vendasService';
import { orcamentosService } from '../services/orcamentosService';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'sonner';
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

// ==================== TYPES ====================
interface ContaReceber {
    id: string;
    vendaId: string;
    numeroParcela: number;
    numeroDuplicata: string;
    clienteNome: string;
    projetoTitulo: string;
    dataVencimento: string;
    valor: number;
    valorRecebido?: number;
    dataPagamento?: string;
    status: 'Pendente' | 'Recebido' | 'Atrasado';
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
    };
}

interface ContasAReceberProps {
    toggleSidebar?: () => void;
    setAbaAtiva?: (aba: string) => void;
}

// ==================== COMPONENT ====================
const ContasAReceber: React.FC<ContasAReceberProps> = ({ toggleSidebar, setAbaAtiva }) => {
    const { user } = useContext(AuthContext)!;
    
    // Estados
    const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('Todos');
    const [filterPeriodo, setFilterPeriodo] = useState<string>('Todos');
    
    // Modal de Baixa
    const [isBaixaModalOpen, setIsBaixaModalOpen] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState<ContaReceber | null>(null);
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [valorRecebido, setValorRecebido] = useState('0');
    const [observacoesBaixa, setObservacoesBaixa] = useState('');
    
    // Modal de Visualização de Venda (usando o mesmo formato do componente Vendas)
    const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);
    const [vendaParaVisualizar, setVendaParaVisualizar] = useState<Venda | null>(null);
    const [detalhesVenda, setDetalhesVenda] = useState<any>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    
    // Lista de vendas para calcular número sequencial
    const [vendas, setVendas] = useState<Venda[]>([]);
    
    // AlertDialog de Confirmação
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    // Carregar dados
    useEffect(() => {
        loadContasReceber();
        loadVendas();
    }, []);

    const loadContasReceber = async () => {
        setLoading(true);
        try {
            console.log('📥 Carregando contas a receber do backend...');
            const response = await financeiroService.listarContasReceber();
            
            if (response.success && response.data) {
                // Processar e enriquecer dados
                const contasProcessadas = response.data.map((conta: any) => {
                    // Detectar atraso
                    const isAtrasada = new Date(conta.dataVencimento) < new Date() && conta.status === 'Pendente';
                    
                    return {
                        id: conta.id,
                        vendaId: conta.vendaId || conta.venda?.id || 'N/A',
                        numeroParcela: conta.numeroParcela || 1,
                        numeroDuplicata: `DUP-${(conta.numeroParcela || 1).toString().padStart(3, '0')}`,
                        clienteNome: conta.cliente?.nome || conta.venda?.cliente?.nome || conta.venda?.orcamento?.cliente?.nome || 'Cliente não informado',
                        projetoTitulo: conta.descricao || conta.venda?.orcamento?.titulo || 'Projeto',
                        dataVencimento: conta.dataVencimento,
                        valor: conta.valorParcela || conta.valor || 0,
                        valorRecebido: conta.valorRecebido,
                        dataPagamento: conta.dataPagamento,
                        status: isAtrasada ? 'Atrasado' : (conta.status === 'Pago' ? 'Recebido' : conta.status),
                        observacoes: conta.observacoes,
                        venda: conta.venda // Salvar objeto venda para usar depois
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

    const loadVendas = async () => {
        try {
            const response = await vendasService.listarVendas({ limit: 1000 });
            if (response.success && response.data) {
                setVendas(response.data.vendas || []);
            }
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
        }
    };

    // Filtrar contas
    const contasFiltradas = useMemo(() => {
        let filtered = [...contasReceber];

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
                    return vencimento < hoje && conta.status !== 'Recebido';
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
                conta.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conta.projetoTitulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conta.numeroDuplicata.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [contasReceber, filterStatus, filterPeriodo, searchTerm]);

    // Estatísticas
    const estatisticas = useMemo(() => {
        const totalReceber = contasFiltradas
            .filter(c => c.status === 'Pendente' || c.status === 'Atrasado')
            .reduce((sum, c) => sum + c.valor, 0);
        
        const totalRecebido = contasReceber
            .filter(c => c.status === 'Recebido')
            .reduce((sum, c) => sum + (c.valorRecebido || 0), 0);
        
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
        setValorRecebido(conta.valor.toString());
        setDataPagamento(new Date().toISOString().split('T')[0]);
        setObservacoesBaixa('');
        setIsBaixaModalOpen(true);
    };

    const handleCloseBaixaModal = () => {
        setIsBaixaModalOpen(false);
        setContaSelecionada(null);
        setValorRecebido('0');
        setObservacoesBaixa('');
    };

    const handleOpenConfirmBaixa = () => {
        setIsConfirmDialogOpen(true);
    };

    const handleBaixaRecebimento = async () => {
        if (!contaSelecionada) return;

        try {
            console.log('💰 Registrando recebimento...');
            const response = await financeiroService.darBaixaRecebimento(contaSelecionada.id, {
                dataPagamento,
                valorRecebido: parseFloat(valorRecebido),
                observacoes: observacoesBaixa
            });

            if (response.success) {
                toast.success('✅ Recebimento registrado com sucesso!', {
                    description: `Recebido R$ ${parseFloat(valorRecebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de ${contaSelecionada.clienteNome}.`
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
            
            // Criar conteúdo HTML para impressão
            const conteudoHTML = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>Venda - ${detalhesVenda.numeroVenda || detalhesVenda.id}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #16a34a; padding-bottom: 20px; }
                        .header h1 { margin: 0; color: #15803d; font-size: 28px; }
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
                        @media print { 
                            body { margin: 0; } 
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>💰 VENDA - RECIBO</h1>
                        <p><strong>Venda Nº:</strong> ${detalhesVenda.numeroVenda || detalhesVenda.id}</p>
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
                return 'bg-green-100 text-green-800 ring-1 ring-green-200';
            case 'Pendente':
                return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
            case 'Atrasado':
                return 'bg-red-100 text-red-800 ring-1 ring-red-200';
            default:
                return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
        }
    };

    const isVencida = (dataVencimento: string, status: string) => {
        if (status === 'Recebido') return false;
        return new Date(dataVencimento) < new Date();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando contas a receber...</p>
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
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Contas a Receber</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gestão de recebimentos e parcelas</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="select-field"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Recebido">Recebido</option>
                            <option value="Atrasado">Atrasado</option>
                        </select>
                    </div>
                    <div>
                        <select
                            value={filterPeriodo}
                            onChange={(e) => setFilterPeriodo(e.target.value)}
                            className="select-field"
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
                                    Duplicata
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Cliente / Projeto
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
                                                <p className="font-semibold text-gray-900">{conta.numeroDuplicata}</p>
                                                <p className="text-xs text-gray-500">Parcela {conta.numeroParcela}</p>
                                                <p className="text-xs text-blue-600 mt-1">Venda: {conta.vendaId}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {conta.clienteNome}
                                                </p>
                                                <p className="text-sm text-gray-600">{conta.projetoTitulo}</p>
                                                {conta.vendaId && conta.vendaId !== 'N/A' && (
                                                    <p className="text-xs text-blue-600 mt-1">
                                                        Venda #{(vendas.findIndex(v => v.id === conta.vendaId) >= 0 ? vendas.findIndex(v => v.id === conta.vendaId) + 1 : contasFiltradas.findIndex(c => c.id === conta.id) + 1)}
                                                    </p>
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
                                                        className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                        Dar Baixa
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleVisualizarVenda(conta.vendaId)}
                                                    className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                    title="Visualizar Venda"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
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
                                                {detalhesVenda.orcamento?.usuarioNome || detalhesVenda.orcamento?.criadoPorNome || user?.name || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Número Sequencial da Venda
                                            </h4>
                                            <p className="text-lg text-gray-900 dark:text-white font-semibold">
                                                #{vendas.findIndex(v => v.id === detalhesVenda.id) + 1 || 1}
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
                                                            const precoUnit = item.precoUnit || item.precoUnitario || (item.subtotal / (item.quantidade || 1)) || 0;
                                                            const valorTotal = item.subtotal || (quantidade * precoUnit);
                                                            return (
                                                                <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        {item.material?.nome || item.servico?.nome || item.kit?.nome || item.descricao || 'Item sem nome'}
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

                                    {/* Condições de Pagamento */}
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                            <span>💳</span>
                                            Condições de Pagamento
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Forma de Pagamento:</p>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {detalhesVenda.formaPagamento}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Número de Parcelas:</p>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {detalhesVenda.numeroParcelas || 1} parcela(s)
                                                </p>
                                            </div>
                                            {detalhesVenda.orcamento?.condicoesEspeciaisPagamento && (
                                                <div className="md:col-span-2">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Condições Especiais:</p>
                                                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                                                        {detalhesVenda.orcamento.condicoesEspeciaisPagamento}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
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
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Dar Baixa no Recebimento</h2>
                                <p className="text-sm text-gray-600 mt-1">Registrar o recebimento da parcela</p>
                            </div>
                            <button
                                onClick={handleCloseBaixaModal}
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
                                        <span className="text-blue-700 font-medium">Duplicata:</span>
                                        <p className="text-blue-900 font-semibold">{contaSelecionada.numeroDuplicata}</p>
                                    </div>
                                    <div>
                                        <span className="text-blue-700 font-medium">Cliente:</span>
                                        <p className="text-blue-900">{contaSelecionada.clienteNome}</p>
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
                                        value={valorRecebido}
                                        onChange={(e) => setValorRecebido(e.target.value)}
                                        min="0"
                                        max={contaSelecionada.valor}
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                                        R$ {parseFloat(valorRecebido || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
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

            {/* AlertDialog de Confirmação */}
            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
                        <AlertDialogDescription>
                            {contaSelecionada && (
                                <>
                                    Confirmar o recebimento de{' '}
                                    <span className="font-bold text-green-600">
                                        R$ {parseFloat(valorRecebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    {' '}de {contaSelecionada.clienteNome}?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                setIsConfirmDialogOpen(false);
                                handleBaixaRecebimento();
                            }}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Confirmar Recebimento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ContasAReceber;

